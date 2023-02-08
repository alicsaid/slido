var pg = require('pg');
var dbConnection = require('../db-connection');
var encryptPassword = require('../encrypt-password');
const moment = require("moment/moment");
const nodemailer = require("nodemailer");

var pool = new pg.Pool(dbConnection);

exports.getOneInstructor = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT Instructors.instructor_id, Instructors.first_name, Instructors.last_name, Instructors.date_of_birth, Instructors.username, Instructors.email, Instructors.password, Instructors.blocked, Instructors.blocked_until, Countries.id as countryID, Countries.name as countryNAME FROM instructors
                       INNER JOIN countries ON instructors.country = countries.id WHERE instructor_id = $1;`, [req.user.instructor_id], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                req.instructor = result.rows[0];
                next();
            }
        });
    });
};

exports.getInstructorEvents = (req, res, next) => {

    const rowsPerPage = 5;
    const page = req.query.page || 1;
    const offset = (page - 1) * rowsPerPage;
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }
        client.query(`SELECT count(*) FROM events WHERE instructor_id = $1 AND archived = false;`, [req.user.instructor_id], function (err, result) {
            if (err) {
                return res.send(err);
            }
            const totalRows = result.rows[0].count;
            const totalPages = Math.ceil(totalRows / rowsPerPage);
            client.query(`SELECT * FROM events WHERE instructor_id = $1 AND archived = false ORDER BY start_date LIMIT $2 OFFSET $3;`, [req.user.instructor_id, rowsPerPage, offset], function (err, result) {
                done()
                if (result.rows.length > 0) {
                    if (err) {
                        return res.send(err)
                    } else {
                        req.events = result.rows;
                        req.page = page;
                        req.totalPages = totalPages;
                    }
                } else {
                    return res.render('instructor-views/events/no-events', { title: 'Events', fullUser: req.user, user: req.user.email, date_of_birth: moment(req.user.date_of_birth).format('YYYY-MM-DD'), moment: moment, messages: req.flash('error') });
                }
                next();
            });
        });
    });
};

exports.getAllCodes = (req, res, next) => {

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT code FROM Events;`, [], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                req.event_codes = result.rows;
                //console.info(req.event_codes);
                next();
            }
        });
    });
};

exports.getInstructorsArchivedEvents = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT * from events WHERE instructor_id = $1 AND archived = true ORDER BY end_date`, [req.user.instructor_id], function (err, result) {
            done()

            if (result.rows.length > 0) {
                if (err) {
                    return res.send(err)
                } else {
                    req.events = result.rows;
                }
            } else {
                return res.render('instructor-views/events/no-archived-events', {
                    title: 'Archived events',
                    user: req.user.email
                });
            }
            next();
        });
    });
};

exports.archiveEvent = (req, res, next) => {

    let data = {
        code: req.body.code
    }

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }
        client.query(`UPDATE events SET  archived = $1 WHERE code = $2;`, [true, data.code], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            }
            next();
        });
    });
};

exports.addNewEvent = (req, res, next) => {

    const pathCover = req.file ? '/images/eventCovers/' + req.file.filename : '';

    //console.info(req.body);

    var data = {
        code: req.body.code,
        title: req.body.title,
        start_date: moment(req.body.start_date).format('YYYY-MM-DD'),
        end_date: moment(req.body.end_date).format('YYYY-MM-DD'),
        time: req.body.time,
        duration: req.body.duration,
        repetition: req.body.repetition,
        bg_image: pathCover,
        instructor: req.user.instructor_id,
    }

    //console.info(data, 'ok');

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`insert into events(code, title, start_date, end_date, time, repetition, bg_image, instructor_id, duration) values($1, $2, $3, $4, $5, $6, $7, $8, $9);`, [data.code, data.title, data.start_date, data.end_date, data.time, data.repetition, data.bg_image, req.user.instructor_id, data.duration], function (err, result) {
            done()

            if (err) {
                if (err.code === '23505' && err.constraint === 'events_pkey') {
                    req.flash('error', 'Event with entered code already exists. Try another code!');
                    res.redirect('/instructor');
                    //console.info('check code');
                } else {
                    return res.send(err);
                }
            }

            next()
        });
    });
};

exports.editEvent = (req, res, next) => {

    //console.info(req.body);

    let data = {
        code: req.body.code,
        title: req.body.title,
        start_date: moment(req.body.start_date).format('YYYY-MM-DD'),
        end_date: moment(req.body.end_date).format('YYYY-MM-DD'),
        time: req.body.time,
        duration: req.body.duration,
        repetition: req.body.repetition,
        instructor: req.user.instructor_id,
    }
    //console.info(data)
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`UPDATE events SET code = $1, title = $2, start_date = $3, end_date = $4, time = $5, repetition = $6, instructor_id = $7, duration = $8 WHERE code = $9;`, [data.code, data.title, data.start_date, data.end_date, data.time, data.repetition, data.instructor, data.duration, req.params.code], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                next();
            }
        });
    });
};

exports.deleteEvent = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`delete from events where code = $1`, [req.params.code], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            }
            next();
        });
    });
};

exports.getEventDetails = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT Events.code, Events.title, Events.start_date, Events.end_date, Events.time, Events.repetition, Events.bg_image, Events.duration, Instructors.instructor_id, Instructors.email
                    FROM Events
                        INNER JOIN Instructors ON Events.instructor_id = Instructors.instructor_id where code = $1;`, [req.params.code], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                //console.info(result.rows);
                req.details = result.rows[0];
                next();
            }
        });
    });
};

exports.getEventQuestions = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT Questions.question_id, Questions.q_text, Questions.likes, Questions.timestamp, Questions.event_code, Events.code, Events.title FROM questions 
                       INNER JOIN Events ON Questions.event_code = Events.code WHERE code = $1 ORDER BY questions.timestamp`, [req.params.code], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                req.questions = result.rows;
                //console.info(req.questions)
            }

            next();
        });
    });
};

exports.getArchivedQuestions = (req, res, next) => {

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT * from questions_archived WHERE event_code = $1`, [req.params.code], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                req.archived_questions = result.rows;
                next();
            }
        });
    })
};

exports.getAnsweredQuestions = (req, res, next) => {

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`select * from questions_answered where event_code = $1`, [req.params.code], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                //console.info(result.rows);
                req.questions_answered = result.rows;
            }
            next();
        });
    });
};

exports.deleteArchivedQuestion = (req, res, next) => {

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`delete from questions_archived where question_id = $1`, [req.body.question_id], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            }

            next();
        });
    });
};

exports.deleteEventQuestions = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`delete from questions where event_code = $1;`, [req.params.code], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            }
            next();
        });
    });
};

exports.deleteEventAnsweredQuestions = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`delete from questions_answered where event_code = $1;`, [req.params.code], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            }
            next();
        });
    });
};

exports.deleteEventArchivedQuestions = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`delete from questions_archived where event_code = $1;`, [req.params.code], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            }
            next();
        });
    });
};

exports.deleteQuestion = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`delete from questions where question_id = $1`, [req.params.id], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            }
            next();
        });
    });
};

exports.deleteQuestionAJAX = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        //console.info(req.body.question_id);

        client.query(`delete from questions where question_id = $1`, [req.body.question_id], function (err, result) {
            done()

            //console.info('obrisano AJAXOM');

            if (err) {
                return res.send(err)
            }
            next();
        });
    });
};

exports.deleteQuestionFromArchiveAJAX = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`delete from questions_archived where question_id = $1`, [req.body.question_id], function (err, result) {
            done()

            //console.info('obrisano AJAXOM');

            if (err) {
                return res.send(err)
            }
            next();
        });
    });
};

exports.archiveQuestion = (req, res, next) => {

    let data = {
        text: req.body.q_text,
        code: req.body.event_code,
        timestamp: req.body.timestamp
    }

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }
        client.query(`insert into questions_archived(q_text, event_code, timestamp) VALUES ($1, $2, $3)`, [data.text, data.code, data.timestamp], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            }
            next();
        });
    });
};

exports.answerQuestion = (req, res, next) => {

    let data = {
        text: req.body.q_text,
        code: req.body.event_code,
        timestamp: req.body.timestamp
    }

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }
        client.query(`insert into questions_answered(q_text, event_code, timestamp) VALUES ($1, $2, $3)`, [data.text, data.code, data.timestamp], function (err, result) {
            done()


            if (err) {
                return res.send(err)
            }
            next();
        });
    });
};

exports.sortQuestions = (req, res, next) => {

    let parameter = req.params.parameter;
    //let opt = req.body.opt;
    let code = req.params.code;

    if (parameter === "likes") {
        pool.connect(function (err, client, done) {
            if (err) {
                return res.send(err);
            }

            client.query(`SELECT Questions.question_id, Questions.q_text, Questions.likes, Questions.timestamp, Questions.event_code, Events.code, Events.title FROM questions 
                       INNER JOIN Events ON Questions.event_code = Events.code WHERE code = $1 ORDER BY questions.likes desc`, [code], function (err, result) {
                done()

                if (err) {
                    return res.send(err)
                } else {
                    req.questions = result.rows;
                    next();
                }
            });
        })
    } else if (parameter === 'recent') {
        pool.connect(function (err, client, done) {
            if (err) {
                return res.send(err);
            }

            client.query(`SELECT Questions.question_id, Questions.q_text, Questions.likes, Questions.timestamp, Questions.event_code, Events.code, Events.title FROM questions 
                       INNER JOIN Events ON Questions.event_code = Events.code WHERE code = $1 ORDER BY questions.timestamp asc`, [code], function (err, result) {
                done()

                if (err) {
                    return res.send(err)
                } else {
                    req.questions = result.rows;
                    next();
                }
            });
        })
    }
};

exports.getCountries = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT * from countries;`, [], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                req.countries = result.rows;
                next();
            }
        });
    });
};

exports.editProfile = (req, res, next) => {

    let data = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        username: req.body.username,
        date_of_birth: req.body.date_of_birth,
        country: req.body.country,
        email: req.body.email,
        password: encryptPassword.encryptPassword(req.body.password)
    };

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`UPDATE instructors SET first_name = $1, last_name = $2, username = $3, date_of_birth = $4, country =$5, email = $6, password = $7 WHERE instructor_id = $8;`, [data.first_name, data.last_name, data.username, data.date_of_birth, data.country, data.email, data.password, req.user.instructor_id], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                req.flash('success', 'Profile updated!');
                next();
            }
        });
    });
};

exports.updateBdayShown = (req, res, next) => {

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`UPDATE instructors SET bday_shown = $1 WHERE instructor_id = $2;`, [true, req.user.instructor_id], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                next();
            }
        });
    });
};

exports.started = (req, res, next) => {

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`UPDATE events SET started = $1 WHERE code = $2;`, [true, req.params.code], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                next();
            }
        });
    });
};

exports.ended = (req, res, next) => {

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`UPDATE events SET started = $1 WHERE code = $2;`, [false, req.params.code], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                next();
            }
        });
    });
};