var express = require('express');
var router = express.Router();
var eventQueries = require('../helpers/queries/event-queries');
var sockets = require('../helpers/sockets');
var moment = require('moment')

/* EVENT */

router.get('/:code', eventQueries.getEvent, eventQueries.getQuestions, eventQueries.getEventDetails, sockets.sockets, function(req, res, next) {
    res.render('event-views/event-guest', { title: req.title, code: req.events[0].code, details: req.details, events: req.events, questions: req.questions, forbiddenWords: req.forbiddenWords, moment: moment });
});

/* SORT QUESTIONS */

router.get('/:code/sort/:parameter', eventQueries.sortQuestions, eventQueries.getEventDetails, function(req, res, next) {
    res.render('event-views/event-guest', { title: req.details.title, details: req.details, questions: req.questions, moment: moment });
});

/* SEND RATING TO INSTRUCTOR */

router.post('/rating', eventQueries.sendRating, function (req, res, next) {
    res.redirect('/');
});

module.exports = router;
