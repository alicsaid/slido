var pg = require('pg');
var dbConnection = require('../db-connection');
var encryptPassword = require('../encrypt-password');
var moment = require('moment');

var pool = new pg.Pool(dbConnection);

/* Get all events */
exports.getAllEvents = (req, res, next) => {
    const rowsPerPage = 5;
    const page = req.query.page || 1;
    const offset = (page - 1) * rowsPerPage;

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT count(*) FROM Events WHERE archived = false`, [], function (err, result) {
            if(err){
                return res.send(err);
            }
            const totalRows = result.rows[0].count;
            const totalPages = Math.ceil(totalRows / rowsPerPage);
            client.query(`SELECT DISTINCT Events.code, Events.title, Events.start_date, Events.end_date, Events.time, Events.repetition, Events.bg_image, Events.duration, Instructors.instructor_id, Instructors.email
                            FROM Events
                            INNER JOIN Instructors ON Events.instructor_id = Instructors.instructor_id
                            WHERE Events.archived = false
                            ORDER BY Events.start_date
                            LIMIT $1 OFFSET $2;`, [rowsPerPage, offset], function (err, result) {
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
                    return res.redirect('/admin/no-events');
                }
                next();
            });
        });
    });
};

exports.getAllArchivedEvents = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT * from events WHERE archived = true ORDER BY end_date`, [], function (err, result) {
            done()

            if (result.rows.length > 0) {
                if (err) {
                    return res.send(err)
                } else {
                    req.events = result.rows;
                }
            } else {
                return res.render('admin-views/events/no-archived-events', {
                    title: 'Archived vents',
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

    //console.info(data);

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

/* Get event details */
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
                //console.info(req.details);
                next();
            }
        });
    });
};

exports.getMails = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT email, instructor_id FROM instructors;`, [], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                //console.info(result.rows);
                let ids = [];
                let emails = [];
                for (let i = 0; i<result.rows.length; i++) {
                    if (!ids.includes(result.rows[i].instructor_id))
                        ids.push(result.rows[i].instructor_id);
                    if (!emails.includes(result.rows[i].email))
                        emails.push(result.rows[i].email);
                }

                //console.info(ids);
                //console.info(emails);
                req.ids = ids;
                req.emails = emails;

                next();
            }
        });
    });
}

exports.addNewEvent = (req, res, next) => {

    //console.info(req.body);
    //console.info(req.query.code);

    const pathCover = req.file ? '/images/eventCovers/' + req.file.filename : '';

    var data = {
        code: req.body.code,
        title: req.body.title,
        start_date: moment(req.body.start_date).format('YYYY-MM-DD'),
        end_date: moment(req.body.end_date).format('YYYY-MM-DD'),
        time: req.body.time,
        duration: req.body.duration,
        repetition: req.body.repetition,
        bg_image: pathCover,
        instructor: req.body.instructor,
    }

    /*
    if (moment(data.end_date).isBefore(data.start_date)) {
        req.flash('error',  'You cannot enter have end date before start date!');
        res.redirect('/admin/events');
    }
    */

    //console.info(data);

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`insert into events(code, title, start_date, end_date, time, repetition, bg_image, instructor_id, duration) values($1, $2, $3, $4, $5, $6, $7, $8, $9);`, [data.code, data.title, data.start_date, data.end_date, data.time, data.repetition, data.bg_image, data.instructor, data.duration], function (err, result) {
            done()

            if (err) {
                if (err.code === '23505' && err.constraint === 'events_pkey') {
                    req.flash('error',  'Event with entered code already exists. Try another code!');
                    res.redirect('/admin/events');
                    //console.info('check code');
                }
                else {
                    return res.send(err);
                }
            }
            next()
        });
    });
};

exports.eventEdit = (req, res, next) => {

    //console.info(req.body);
    let data = {
        code: req.body.code,
        title: req.body.title,
        start_date: moment(req.body.start_date).format('YYYY-MM-DD'),
        end_date: moment(req.body.end_date).format('YYYY-MM-DD'),
        time: req.body.time,
        duration: req.body.duration,
        repetition: req.body.repetition,
        instructor: req.body.instructor,
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
                next();}
        });
    });
};

exports.getEventQuestions = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT Questions.question_id, Questions.q_text, Questions.likes, Questions.event_code, Questions.timestamp, Events.code, Events.title FROM questions 
                       INNER JOIN Events ON Questions.event_code = Events.code WHERE code = $1`, [req.params.code], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                req.questions = result.rows;
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

        client.query(`delete from questions where question_id = $1;`, [req.params.id], function (err, result) {
            done()

            if (err) {
                return res.send(err)
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

exports.getAllInstructors = (req, res, next) => {
    const rowsPerPage = 5;
    const page = req.query.page || 1;
    const offset = (page - 1) * rowsPerPage;

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT count(*) FROM instructors`, [], function (err, result) {
            if(err){
                return res.send(err);
            }
            const totalRows = result.rows[0].count;
            const totalPages = Math.ceil(totalRows / rowsPerPage);
            client.query(`SELECT Instructors.instructor_id, Instructors.first_name, Instructors.last_name, Instructors.date_of_birth, Instructors.username, Instructors.email, Instructors.password, Instructors.blocked, Instructors.blocked_until, Countries.id as countryID, Countries.name as countryNAME FROM instructors
                       INNER JOIN countries ON instructors.country = countries.id ORDER BY instructors.instructor_id LIMIT $1 OFFSET $2;`, [rowsPerPage, offset], function (err, result) {
                done()

                if (err) {
                    return res.send(err)
                } else {
                    req.instructors = result.rows;
                    req.page = page;
                    req.totalPages = totalPages;
                }
                next();
            });
        });
    });
};

exports.getAllInstructorsForDiagram = (req, res, next) => {
    let xValues = [];
    let yValues = [];

    pool.connect((err, client, done) => {
        if (err) {
            return next(err);
        }

        client.query(`SELECT countries.name, COUNT(instructors.country) FROM instructors
            JOIN countries ON instructors.country = countries.id
            GROUP BY countries.name`, (err, result) => {
            done();

            if (err) {
                return next(err);
            }

            for (let row of result.rows) {
                xValues.push(row.name);
                yValues.push(Number(row.count));
            }

            //console.info('x' ,xValues)
            //console.info('y' ,yValues)

            req.xValues = xValues;
            req.yValues = yValues;
            next();
        });
    });
};

exports.getAllEventsForDiagram = (req, res, next) => {
    let yValues = [];

    pool.connect((err, client, done) => {
        if (err) {
            return next(err);
        }

        /* little help from chatGPT */
        client.query(`WITH months AS (
                        SELECT 1 AS month UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12
                    )
                    SELECT months.month, COALESCE(COUNT(events.end_date), 0) as count
                    FROM months
                    LEFT JOIN events ON months.month = extract(month from events.end_date)
                    GROUP BY months.month
                    ORDER BY months.month;`, (err, result) => {
            done();

            if (err) {
                return next(err);
            }

            //console.info(result.rows);

            for (let row of result.rows) {
                yValues.push(Number(row.count));
            }

            //console.info('y' ,yValues)

            req.yValuesE = yValues;
            next();
        });
    });
};



exports.getOneInstructor = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT * FROM instructors WHERE instructor_id = $1;`, [req.params.id], function (err, result) {
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

exports.addNewInstructors = (req, res, next) => {

    let data = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        username: req.body.username,
        date_of_birth: req.body.date_of_birth,
        country: req.body.country,
        email : req.body.email,
        password : encryptPassword.encryptPassword(req.body.password)
    };

    pool.connect(function (err, client, done) {
        if (err) {
            res.send(err);
        }

        client.query(`insert into instructors(first_name, last_name, username, date_of_birth, country, email, password) values($1, $2, $3, $4, $5, $6, $7);`, [data.first_name, data.last_name, data.username, data.date_of_birth, data.country, data.email, data.password], function (err, result) {
            done()

            if (err) {
                if (err.code === '23505' && err.constraint === 'instructors_username_key') {
                    req.flash('error',  'Username already exists. Try another one!');
                    //console.info('check username');
                }
                else if (err.code === '23505' && err.constraint === 'instructors_email_key') {
                    req.flash('error', 'Email address already exists. Try another one!');
                    //console.info('check email');
                }
                else {
                    return res.send(err);
                }
            }
            next();
        });
    });
};

exports.editInstructors = (req, res, next) => {

    let data = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        username: req.body.username,
        date_of_birth: req.body.date_of_birth,
        country: req.body.country,
        email : req.body.email,
        password : encryptPassword.encryptPassword(req.body.password)
    };

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }
        client.query(`UPDATE instructors SET first_name = $1, last_name = $2, username = $3, date_of_birth = $4, country = $5, email = $6, password = $7 WHERE instructor_id = $8;`, [data.first_name, data.last_name, data.username, data.date_of_birth, data.country, data.email, data.password, req.params.id], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            }
            next();
        });
    });
};

exports.deleteInstructors = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`delete from instructors where instructor_id = $1`, [req.params.id], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            }
            next();
        });
    });
};

/* Get all forbidden words */
exports.getAllForbiddenWords = (req, res, next) => {
    const rowsPerPage = 5;
    const page = req.query.page || 1;
    const offset = (page - 1) * rowsPerPage;
    pool.connect((err, client, done) => {
        if (err) {
            return res.send(err);
        }
        client.query(`SELECT count(*) FROM forbidden_Words`, [], function (err, result) {
            if(err){
                return res.send(err);
            }
            const totalRows = result.rows[0].count;
            const totalPages = Math.ceil(totalRows / rowsPerPage);
            client.query(`SELECT * FROM forbidden_Words ORDER BY word LIMIT $1 OFFSET $2;`, [rowsPerPage, offset], (err, result) => {
                done();

                if (err) {
                    return res.send(err);
                } else {
                    req.forbiddenWords = result.rows;
                    req.page = page;
                    req.totalPages = totalPages;
                }
                next();
            });
        });
    });
};


/* Get one forbidden words ??? */
exports.getOneForbiddenWord = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT * FROM forbidden_Words WHERE word_id = $1;`, [req.params.id], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                req.forbiddenWords = result.rows[0];
                //console.info(req.forbiddenWords);
                next();
            }
        });
    });
};

/* Add new forbidden word */
exports.addNewForbiddenWord = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`insert into forbidden_words(word) values($1);`, [req.body.word], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            }
            next();
        });
    });
};

/* Edit forbidden word */
exports.editForbiddenWord = (req, res, next) => {

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`UPDATE forbidden_words SET word = $1 WHERE word_id = $2;`, [req.body.word, req.params.id], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                req.events = result.rows;
                next();
            }
        });
    });
};

/* Delete forbidden word */
exports.deleteForbiddenWord = (req, res, next) => {

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`delete from forbidden_words where word_id = $1`, [req.params.id], function (err, result) {
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