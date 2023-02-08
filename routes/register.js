var express = require('express');
var router = express.Router();
var registerQueries = require('../helpers/queries/register-queries')
var checkAuth = require('../helpers/check-auth')


/* REGISTER */

router.get('/', checkAuth.instructorNotAuthenticated, registerQueries.getCountries, function(req, res, next) {
  res.render('login-views/register', { title: 'Register', countries: req.countries, messages: req.flash('error') });
});

/* REGISTER POST */

router.post('/', checkAuth.instructorNotAuthenticated, registerQueries.register, function(req, res, next) {
  res.redirect('/login/instructor-login');
});

module.exports = router;
