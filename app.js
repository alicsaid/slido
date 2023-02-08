var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var passport = require('passport');
var flash = require('express-flash');
const flash2 = require('connect-flash');

var indexRouter = require('./routes/index');
var loginRouter = require('./routes/login');
var registerRouter = require('./routes/register');
var adminRouter = require('./routes/admin');
var instructorRouter = require('./routes/instructor');
var eventRouter = require('./routes/event');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/* sessions */
app.use(session({
  secret: 'verygoodsecret',
  resave: false,
  saveUninitialized: false
}));

/* passport */
app.use(passport.initialize());
app.use(passport.session());


/* flash messages */
app.use(flash());
app.use(flash2());

/* routes */
app.use('/', indexRouter);
app.use('/login', loginRouter);
app.use('/register', registerRouter);
app.use('/event', eventRouter);

/* protected routes */
app.use('/admin', adminRouter);
app.use('/instructor', instructorRouter);


//The 404 Route (ALWAYS Keep this as the last route)
app.use(function(req, res, next){
  res.render('feedback-views/not-found', {title: 'Not Found'});
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
