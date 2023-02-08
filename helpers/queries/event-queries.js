var pg = require('pg');
var dbConnection = require('../db-connection');
const moment = require('moment');
const nodemailer = require("nodemailer");

var pool = new pg.Pool(dbConnection);

exports.getEvent = async (req, res, next) => {
    try {
        const client = await pool.connect();
        const result = await client.query(`SELECT * FROM events WHERE code = $1`, [req.params.code]);
        client.release();

        if(result.rows.length === 0) {
            res.render('feedback-views/no-code', { title: "Invalid code" });
        } else if(moment(result.rows[0].end_date).isBefore(moment().subtract(1, 'days'))) {
            res.render('feedback-views/event-finished', { title: "Event finished", start: moment(result.rows[0].start_date).format('DD-MMM-YYYY'), end: moment(result.rows[0].end_date).format('DD-MMM-YYYY'), time: moment(result.rows[0].time, 'hh:mm:ss').format('HH:mm'), repetition: result.rows[0].repetition });
        } else if(moment(result.rows[0].start_date).isAfter(moment())) {
            res.render('feedback-views/event-not-started', { title: "Event not started", start: moment(result.rows[0].start_date).format('DD-MMM-YYYY'), end: moment(result.rows[0].end_date).format('DD-MMM-YYYY'), time: moment(result.rows[0].time, 'hh:mm:ss').format('HH:mm'), repetition: result.rows[0].repetition });
        } else if(result.rows[0].started === false) {
            res.render('feedback-views/event-offline', { title: "Event offline", start: moment(result.rows[0].start_date).format('DD-MMM-YYYY'), end: moment(result.rows[0].end_date).format('DD-MMM-YYYY'), time: moment(result.rows[0].time, 'hh:mm:ss').format('HH:mm'), repetition: result.rows[0].repetition });
        } else {
            req.code = result.rows[0].code;
            req.title = result.rows[0].title;
            req.events = result.rows;
            next();
        }
    } catch (err) {
        res.send(err);
    }
};


exports.getQuestions = (req, res, next) => {

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT Questions.question_id, Questions.q_text, Questions.likes, Questions.event_code,  Questions.timestamp, Events.code FROM questions 
                       INNER JOIN Events ON Questions.event_code = Events.code WHERE code = $1 ORDER BY Questions.timestamp`, [req.params.code], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                //console.info(result.rows);
                //console.info(req.events[0].code);
                //console.info(req.url);
                //console.info(req.query.code)
                req.questions = result.rows;
                //console.info(req.questions.length);
                next();
            }
        });
    })
};

exports.getEventDetails = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT Events.code, Events.title, Events.start_date, Events.end_date, Events.time, Events.repetition, Events.bg_image, Instructors.instructor_id, Instructors.email
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

exports.addLike = (req, res, next) => {

    let id = req.params.id;

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }
        client.query(`UPDATE questions SET likes = likes + 1 WHERE question_id = $1`, [id], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                next();
            }
        });
    });
};

exports.getForbiddenWords = (req, res, next) => {

    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT * FROM forbidden_Words;`, [], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                req.forbiddenWords = result.rows;
                next();
            }
        });
    });
};

exports.sendRating = (req, res, next) => {
    const transporter = nodemailer.createTransport({
        service: 'outlook',
        auth: {
            user: 'slido_test@outlook.com',
            pass: 'Slidopass2023'
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    const mailOptions = {
        from: 'slido_test@outlook.com',
        to: req.body.email,
        subject: `Rating - "${req.body.title}"`,
        html: `You received a ${req.body.rating} out of 5 rating for "${req.body.title}" from a guest!`,
    }

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log(`Email sent: ${info.response}`);
        }
    });
    next();
};