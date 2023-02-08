const express = require('express');
const router = express.Router();
const adminQueries = require('../helpers/queries/admin-queries');
const checkAuth = require('../helpers/check-auth');
const passport = require('passport');
const moment = require('moment');
const qr = require('qr-image');
const fs = require('fs');
const multer = require('multer');
const path = require("path");
const flash = require('connect-flash')
var io = null;

var pg = require('pg');
var dbConnection = require('../helpers/db-connection');

var pool = new pg.Pool(dbConnection);

/* passport */
const initializeAdmin = require('../helpers/passport-admin');
const instructorQueries = require("../helpers/queries/instructor-queries");
initializeAdmin(passport);

/* multer https://www.youtube.com/watch?v=wIOpe8S2Mk8 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images/eventCovers/')
    },
    filename: (req, file, cb) => {
        //console.log(file);
        cb(null, Date.now() + path.extname(file.originalname))
    }
})
const upload = multer({ storage:storage })

/* HOME ADMIN */

router.get('/', checkAuth.isAdminAuthenticated, adminQueries.getAllEventsForDiagram, adminQueries.getAllInstructorsForDiagram, function(req, res, next) {
    //console.info(req.user);
    res.render('admin-views/home-admin', { title: 'Admin Panel', user: req.user.email, xValuesI: req.xValues, yValuesI: req.yValues, yValuesE: req.yValuesE });
});

/* EVENTS */

router.get('/events', checkAuth.isAdminAuthenticated, adminQueries.getAllEvents, adminQueries.getMails, function(req, res, next) {
    res.render('admin-views/events/events-admin', {title: 'Events', events: req.events,  user: req.user.email, code: req.code, ids: req.ids, emails: req.emails, moment: moment, messages: req.flash('error'), currentPage: req.page, totalPages: req.totalPages });
});

/* NO EVENTS */

router.get('/no-events', checkAuth.isAdminAuthenticated, adminQueries.getMails, function(req, res, next) {
    res.render('admin-views/events/no-events', {title: 'Events', events: req.events,  user: req.user.email, code: req.code, ids: req.ids, emails: req.emails, moment: moment, messages: req.flash('error') });
});

/* ARCHIVED EVENTS */

router.get('/archived-events', checkAuth.isAdminAuthenticated, adminQueries.getAllArchivedEvents, function(req, res, next) {
    res.render('admin-views/events/archived-events', { title: 'Archived events', user: req.user.email, events: req.events, moment: moment });
});

/* ARCHIVE EVENT */

router.post('/archive-event', checkAuth.isAdminAuthenticated, adminQueries.archiveEvent, function(req, res, next) {
    res.sendStatus(200);
});

/* CREATE NEW EVENT */

router.post('/event/create', checkAuth.isAdminAuthenticated, upload.single('cover'), adminQueries.addNewEvent, function(req, res, next) {
    //console.info(req.body.code)
    let code = req.body.code;
    const data = `http://localhost:3000/event/${code}`; // The data to encode in the QR code
    const path = `public/images/eventQRs/${code}.png`;

    const qr_code = qr.image(data, { type: 'png' });
    qr_code.pipe(fs.createWriteStream(path));

    res.redirect('/admin/events' );
});

/* EDIT EVENT */

router.post('/event/:code/edit', checkAuth.isAdminAuthenticated, upload.single('cover'), adminQueries.eventEdit, function(req, res, next) {
    res.redirect('/admin/events');
});

/* DELETE EVENT */

router.get('/event/:code/delete', checkAuth.isAdminAuthenticated, adminQueries.deleteEventArchivedQuestions, adminQueries.deleteEventAnsweredQuestions, adminQueries.deleteEventQuestions, adminQueries.deleteEvent, function(req, res, next) {
    res.redirect('/admin/events');
});

/* EVENT OVERVIEW */

router.get('/event/:code', checkAuth.isAdminAuthenticated, adminQueries.getEventDetails, adminQueries.getEventQuestions, adminQueries.getAnsweredQuestions, adminQueries.getArchivedQuestions, function(req, res, next) {
    res.render('admin-views/events/event-admin', { details: req.details, user: req.user.email, questions: req.questions, answered_questions: req.questions_answered, archived_questions: req.archived_questions, moment: moment });
});

/* SORT QUESTIONS */

router.get('/event/:code/sort/:parameter', checkAuth.isAdminAuthenticated, adminQueries.sortQuestions, adminQueries.getEventDetails, adminQueries.getArchivedQuestions, adminQueries.getAnsweredQuestions, function(req, res, next) {
    res.render('admin-views/events/event-admin', { title: 'Events', user: req.user.email , details: req.details, questions: req.questions, archived_questions: req.archived_questions, answered_questions: req.questions_answered, moment: moment });
});

/* INSTRUCTORS */

router.get('/instructors', checkAuth.isAdminAuthenticated, adminQueries.getAllInstructors, adminQueries.getCountries, function(req, res, next) {
    res.render('admin-views/instructors/instructors', { title: 'Instructors', instructors: req.instructors,  user: req.user.email, countries: req.countries, messages: req.flash('error'), moment: moment, currentPage: req.page, totalPages: req.totalPages });
});

/* CREATE NEW INSTRUCTOR */

router.post('/instructors/create', checkAuth.isAdminAuthenticated, adminQueries.addNewInstructors, function(req, res, next) {
    res.redirect('/admin/instructors');
});

/* EDIT INSTRUCTOR */

router.post('/instructors/:id/edit', checkAuth.isAdminAuthenticated, adminQueries.editInstructors, adminQueries.getAllInstructors, function(req, res, next) {
    res.redirect('/admin/instructors');
});

/* DELETE INSTRUCTOR */

router.get('/instructors/:id/delete', checkAuth.isAdminAuthenticated, adminQueries.deleteInstructors, function(req, res, next) {
    res.redirect('/admin/instructors');
});

/* BLOCK INSTRUCTOR */
/* little help from chatGPT*/

router.post('/instructors/:id/block', checkAuth.isAdminAuthenticated, async (req, res) => {
    try {
        // Get current date and instructor id
        const today = moment().format('DD-MMM-YYYY HH:mm:ss');
        const instructorId = req.params.id;
        let blockedUntil;
        //console.info(req.body.days);

        // Calculate blocked until date
        if (req.body.days === '15') {
            blockedUntil = moment(today, "DD-MMM-YYYY HH:mm:ss").add(15, 'days');
        } else if (req.body.days === '30') {
            blockedUntil = moment(today, "DD-MMM-YYYY HH:mm:ss").add(30, 'days');
        } else {
            console.info('there is error somewhere!');
        }

        // Connect to the database and update instructor's blocked status
        const client = await pool.connect();
        await client.query('UPDATE instructors SET blocked = $1, blocked_until = $2 WHERE instructor_id = $3', [true, blockedUntil, instructorId]);

        // Release the client and log success message
        client.release();
        console.log(`Instructor blocked!`);

        // Send redirect response
        res.redirect('/admin/instructors');
    } catch (err) {
        // Log and send error response
        console.log(err);
        res.status(500).send({
            error: 'Error updating instructor blocked status. Please try again later.'
        });
    }
});

/* UNBLOCK INSTRUCTOR */

router.post('/instructors/:id/unblock', checkAuth.isAdminAuthenticated, async (req, res) => {
    try {
        // Get current date and instructor id
        const instructorId = req.params.id;
        //console.info(req.body.days);

        // Connect to the database and update instructor's blocked status
        const client = await pool.connect();
        await client.query('UPDATE instructors SET blocked = $1, blocked_until = $2 WHERE instructor_id = $3', [false, null, instructorId]);

        // Release the client and log success message
        client.release();
        console.log(`Instructor unblocked!`);

        // Send redirect response
        res.redirect('/admin/instructors');
    } catch (err) {
        // Log and send error response
        console.log(err);
        res.status(500).send({
            error: 'Error updating instructor blocked status. Please try again later.'
        });
    }
});

/* FORBIDDEN WORDS */

router.get('/forbidden-words', checkAuth.isAdminAuthenticated, adminQueries.getAllForbiddenWords, function(req, res, next) {
    res.render('admin-views/words/forbidden-words', { title: 'Forbidden words', forbiddenWords: req.forbiddenWords,  user: req.user.email, currentPage: req.page, totalPages: req.totalPages });
});

/* CREATE NEW FORBIDDEN WORD */

router.post('/forbidden-words/add', checkAuth.isAdminAuthenticated, adminQueries.addNewForbiddenWord, function(req, res, next) {
    res.redirect('/admin/forbidden-words');
});

/* EDIT FORBIDDEN WORD */

router.post('/forbidden-words/:id/edit', checkAuth.isAdminAuthenticated, adminQueries.editForbiddenWord, adminQueries.getOneForbiddenWord, function(req, res, next) {
    res.redirect('/admin/forbidden-words');
});

/* DELETE FORBIDDEN WORDS */

router.get('/forbidden-words/:id/delete', checkAuth.isAdminAuthenticated, adminQueries.deleteForbiddenWord, function(req, res, next) {
    res.redirect('/admin/forbidden-words');
});

/* LOGOUT - clear session */

router.post('/logout', function (req, res) {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/login/admin-login');
    });
});

module.exports = router;
