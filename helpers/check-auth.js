const dbConnection = require('./db-connection');
const pg = require("pg");

var pool = new pg.Pool(dbConnection);

exports.isAdminAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        res.redirect('/login/admin-login');
        return;
    }

    pool.query(`SELECT * FROM administrators WHERE email = $1`, [req.user.email], (err, result) => {
        if (err) {
            res.send(err);
        } else {
            if (result.rows.length > 0) {
                next();
            } else {
                res.render('feedback-views/unauthorized', { title: 'Unauthorized' });
            }
        }
    });
};

exports.isInstructorAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        res.redirect('/login/instructor-login');
        return;
    }

    pool.query(`SELECT * FROM instructors WHERE email = $1`, [req.user.email], (err, result) => {
        //console.info(result);
        if (err) {
            res.send(err);
        } else {
            if (result.rows.length > 0) {
                next();
            } else {
                res.render('feedback-views/unauthorized', { title: 'Unauthorized' });
            }
        }
    });
};

// if logged in as admin, can't go to login page
exports.adminNotAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect('/admin');
    }
    next();
}

// if logged in as instructor, can't go to login page
exports.instructorNotAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect('/instructor');
    }
    next();
}

