var dbConnection = require('../helpers/db-connection');
var pg = require('pg');
const moment = require('moment');

var pool = new pg.Pool(dbConnection);
var io = null;
var likedQuestions = {};

exports.sockets = (req, res, next) => {

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
            }
        });
    });

    if (!io) {
        io = require('socket.io')(req.socket.server);

        io.sockets.on('connection', (socket) => {

            socket.on('join', (data) => {
                socket.join(data.code);
                console.info(socket.id, 'connected to room:', data.code);

                socket.on('sendQuestionClient', (question) => {
                    //console.info('ServerSideReceived');
                    console.log('Emitting to room:', data.code)

                    pool.query("SELECT MAX(question_id) FROM questions", (err, result) => {
                        if (err) throw err;

                        const maxId = result.rows[0].max;
                        const question_id = maxId ? maxId + 1 : 1;

                        //console.info('max', maxId, 'space', 'q', question_id);

                    let includes = false;
                    for (let i = 0; i < req.forbiddenWords.length; i++) {
                        if (question.includes(req.forbiddenWords[i].word)) {
                            includes = true;
                            break;
                        }
                    }

                        let dataQ;

                        if (!includes) {
                            let timestamp = moment(new Date()).format('DD-MMM-YYYY [ - ] HH:mm:ss');
                            pool.query('insert into questions(q_text, likes, event_code, timestamp) values($1, $2, $3, $4)', [question, 0, data.code, timestamp]);
                            io.sockets.to(data.code).emit('sendQuestionServer', dataQ = {
                                question: question,
                                question_id: question_id,
                                timestamp: timestamp
                            })
                            //console.info('ServerSideSent');
                        } else {
                            let timestamp = moment(new Date()).format('DD-MMM-YYYY [ - ] HH:mm:ss');
                            pool.query('insert into questions_archived(q_text, event_code, timestamp) values($1, $2, $3)', [question, data.code, timestamp]);
                            io.sockets.to(data.code).emit('sendQuestionServerForbidden')
                        }
                    });
                })

                socket.on('likeQuestionClient', (id) => {
                    if (!likedQuestions[socket.id]) {
                        likedQuestions[socket.id] = [];
                    }
                    if (!likedQuestions[socket.id].includes(id)) {
                        likedQuestions[socket.id].push(id);
                        pool.query(`UPDATE questions SET likes = likes + 1 where question_id = ${id}`);
                        io.sockets.to(data.code).emit('likeQuestionServer', id)
                        console.info(socket.id, 'liked question', id)
                    } else {
                        console.info(socket.id, 'already liked question', id)
                    }
                });

                socket.on('endedEventInstructor', function () {
                    io.sockets.to(data.code).emit('endedEventServer')
                })

                socket.on('deleteQuestionInstructor', function (id) {
                    pool.query(`DELETE from questions WHERE question_id = ${id}`);
                    io.sockets.to(data.code).emit('deleteQuestionServer', id)
                })

                socket.on('answerQuestionInstructor', function (id) {
                    pool.query(`DELETE from questions WHERE question_id = ${id}`);
                    io.sockets.to(data.code).emit('answerQuestionServer', id)
                })

                socket.on('archiveQuestionInstructor', function (id) {
                    pool.query(`DELETE from questions WHERE question_id = ${id}`);
                    io.sockets.to(data.code).emit('archiveQuestionServer', id)
                })

                socket.on('disconnect', function () {
                    console.info(socket.id, 'disconnected from room:', data.code)
                })
            });
        });
    }
    next();
};
