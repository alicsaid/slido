var express = require('express');
var router = express.Router();
var instructorQueries = require('../helpers/queries/instructor-queries');
var sockets = require('../helpers/sockets');
const checkAuth = require('../helpers/check-auth');
const passport = require("passport");
const multer = require('multer');
const moment = require('moment');
const qr = require('qr-image');
const fs = require('fs');
const path = require("path");
const nodemailer = require('nodemailer');

/* multer */
/* https://www.youtube.com/watch?v=wIOpe8S2Mk8 */
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

/* passport */
const initializeInstructor = require('../helpers/passport-instructor');
initializeInstructor(passport);

/* HOME INSTRUCTOR */

router.get('/', checkAuth.isInstructorAuthenticated, instructorQueries.getInstructorEvents, instructorQueries.getAllCodes, function(req, res, next) {
    //console.info(req.user);
    res.render('instructor-views/home-instructor', { title: 'Events', fullUser: req.user, user: req.user.email, date_of_birth: moment(req.user.date_of_birth).format('YYYY-MM-DD'), codes: req.event_codes, events: req.events, moment: moment, messages: req.flash('error'), currentPage: req.page, totalPages: req.totalPages });
});

/* ARCHIVED EVENTS */

router.get('/archived-events', checkAuth.isInstructorAuthenticated, instructorQueries.getInstructorsArchivedEvents, function(req, res, next) {
    res.render('instructor-views/events/archived-events', { title: 'Archived events', fullUser: req.user, user: req.user.email, events: req.events, moment: moment, currentPage: req.page, totalPages: req.totalPages });
});

/* ARCHIVE EVENT */

router.post('/archive-event', checkAuth.isInstructorAuthenticated, instructorQueries.archiveEvent, function(req, res, next) {
    res.sendStatus(200);
});

/* CREATE NEW EVENT */

router.post('/event/create', checkAuth.isInstructorAuthenticated, upload.single('cover') , instructorQueries.addNewEvent, function(req, res, next) {

    let code = req.body.code;
    const data = `http://localhost:3000/event/${code}`; // The data to encode in the QR code
    const path = `public/images/eventQRs/${code}.png`;

    const qr_code = qr.image(data, { type: 'png' });
    qr_code.pipe(fs.createWriteStream(path));

    res.redirect('/instructor' );
});

/* EDIT EVENT  */

router.post('/event/:code/edit', checkAuth.isInstructorAuthenticated, upload.single('cover'), instructorQueries.editEvent, function (req, res, next){
    res.redirect('/instructor');
});

/* DELETE EVENT */

router.get('/event/:code/delete', checkAuth.isInstructorAuthenticated, instructorQueries.deleteEventQuestions, instructorQueries.deleteEventArchivedQuestions, instructorQueries.deleteEventAnsweredQuestions, instructorQueries.deleteEvent, function(req, res, next) {
    res.redirect('/instructor');
});

/* SEND LINK TO MAIL */

router.post('/event/send-invitation', checkAuth.isInstructorAuthenticated, function (req, res, next) {
    //console.info(req.body);
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

    let recipientMails = req.body.email;
    let recipients = recipientMails.split('; ');

    const mailOptions = {
        from: 'slido_test@outlook.com',
        to: recipients,
        subject: `Invitation to slido "${req.body.title}"`,
        html: `${req.user.first_name} ${req.user.last_name} is inviting you to a scheduled Slido - "${req.body.title}". <br><br>
                Date: ${moment(req.body.start_date).format('DD-MMM-YYYY')} | Time: ${moment(req.body.time, 'hh:mm:ss').format('HH:mm')} <br><br>
                Slido code: ${req.body.code}<br>
                LINK: <a>http://localhost:3000/event/${req.body.code}</a>`,
    }

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log(`Email sent: ${info.response}`);
        }
    });

    res.redirect('/instructor');
});

/* EVENT OVERVIEW */

router.get('/event/:code', checkAuth.isInstructorAuthenticated, instructorQueries.getEventDetails, instructorQueries.getEventQuestions, instructorQueries.getArchivedQuestions, instructorQueries.getAnsweredQuestions, sockets.sockets, function(req, res, next) {
    res.render('instructor-views/events/event-instructor', { title: 'Events', user: req.user.email , details: req.details, questions: req.questions, archived_questions: req.archived_questions, answered_questions: req.questions_answered, moment: moment });
});

/* ARCHIVE EVENT */

router.post('/event/:id/archive', checkAuth.isInstructorAuthenticated, instructorQueries.archiveEvent, function(req, res, next) {
    res.sendStatus(200);
});

/* SORT QUESTIONS */

router.get('/event/:code/sort/:parameter', checkAuth.isInstructorAuthenticated, instructorQueries.sortQuestions, instructorQueries.getEventDetails, instructorQueries.getArchivedQuestions, instructorQueries.getAnsweredQuestions, function(req, res, next) {
    res.render('instructor-views/events/event-instructor', { title: 'Events', user: req.user.email , details: req.details, questions: req.questions, archived_questions: req.archived_questions, answered_questions: req.questions_answered, moment: moment });
});

/* ARCHIVE QUESTION */

router.post('/event/questions/:id/archive', checkAuth.isInstructorAuthenticated, instructorQueries.archiveQuestion, instructorQueries.deleteQuestionAJAX, function(req, res, next) {
    res.sendStatus(200);
});

/* ANSWER QUESTION */

router.post('/event/questions/:id/answer', checkAuth.isInstructorAuthenticated, instructorQueries.answerQuestion, instructorQueries.deleteQuestionAJAX, function(req, res, next) {
    res.sendStatus(200);
});

/* ANSWER QUESTION FROM ARCHIVED */

router.post('/event/questions/:id/answer-archived', checkAuth.isInstructorAuthenticated, instructorQueries.answerQuestion, instructorQueries.deleteQuestionFromArchiveAJAX, function(req, res, next) {
    res.sendStatus(200);
});


/* ANSWER QUESTION FROM ARCHIVED */

router.post('/event/archived-questions/:id/delete', checkAuth.isInstructorAuthenticated, instructorQueries.deleteArchivedQuestion, function(req, res, next) {
    res.sendStatus(200);
});

/* DELETE QUESTION */

router.get('/event/questions/:id/delete', checkAuth.isInstructorAuthenticated, instructorQueries.deleteQuestion, function(req, res, next) {
    res.redirect('back');
});

/* PROFILE */

router.get('/my-profile', checkAuth.isInstructorAuthenticated, instructorQueries.getOneInstructor, instructorQueries.getCountries, function (req, res) {
    res.render('instructor-views/my-profile', { title: 'Profile', user: req.user.email, instructor: req.instructor, countries: req.countries, moment: moment, messages: req.flash('success') });
});

/* EDIT PROFILE */

router.post('/my-profile/edit', checkAuth.isInstructorAuthenticated, instructorQueries.editProfile, function (req, res) {
    res.redirect('/instructor/my-profile');
});

/* UPDATE BDAY SHOWN */

router.post('/instructors/updatebdayshown', instructorQueries.updateBdayShown, (req, res) => {
    //console.info(req.user);
    res.sendStatus(200);
});

/* START EVENT */

router.post('/event/:code/started', checkAuth.isInstructorAuthenticated, instructorQueries.started, function(req, res, next) {
    res.sendStatus(200);
});

/* END EVENT */

router.post('/event/:code/ended', checkAuth.isInstructorAuthenticated, instructorQueries.ended, function(req, res, next) {
    res.sendStatus(200);
});

/* LOGOUT - clear session */

router.post('/logout', function (req, res) {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/login/instructor-login');
    });
});

module.exports = router;