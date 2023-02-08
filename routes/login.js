var express = require('express');
var router = express.Router();
const checkAuth = require('../helpers/check-auth');
const passport = require("passport");

/* LOGIN INSTRUCTOR */

router.get('/instructor-login', checkAuth.instructorNotAuthenticated, function(req, res, next) {
  res.render('login-views/login-instructor', { title: 'Login', messages: req.flash('error'), messages2: req.flash('success') });
});

/* LOGIN INSTRUCTOR POST */

router.post('/instructor-login', passport.authenticate('instructor', {
        successRedirect : '/instructor',
        failureRedirect : '/login/instructor-login',
        failureFlash : true }),
    function(req, res) {
        req.login(req.user, function(err) {
            if (err) { return next(err); }
            res.redirect('/instructor');
        });
    });

/* LOGIN ADMIN */

router.get('/admin-login', checkAuth.adminNotAuthenticated, function(req, res, next) {
  res.render('login-views/login-admin', { title: 'Login' });
});

/* LOGIN ADMIN POST */

router.post('/admin-login', passport.authenticate('admin', {
      successRedirect : '/admin',
      failureRedirect : '/login/admin-login',
      failureFlash : true }),
    function(req, res) {
    req.login(req.user, function(err) {
      if (err) { return next(err); }
      res.redirect('/admin');
  });
});

module.exports = router;