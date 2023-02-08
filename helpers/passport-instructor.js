const dbConnection = require('./db-connection');
const pg = require("pg");
const bcrypt = require("bcrypt");
const moment = require("moment");
const LocalStrategy = require("passport-local").Strategy;


var pool = new pg.Pool(dbConnection);

function initialize(passport) {
    const authenticateUser = (email, password, done) => {

        pool.query(`select * from instructors where email = $1;`, [email], (err, result) => {

            if(err) {
                throw err;
            }

            // if greater than 0, instructor exists
            if(result.rows.length > 0) {
                const user = result.rows[0];
                //console.info(user);

                let blocked_until = user.blocked_until
                //console.info(blocked_until);
                var today = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');

                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if(err) {
                        throw err;
                    }

                    if(isMatch) {
                        if(blocked_until == null) {
                            return done(null, user);
                        }
                        let isAfter = moment(today).isAfter(blocked_until);
                        if (isAfter) {
                            return done(null, user);
                        } else {
                            return done(null, false, { message: `Your account has been blocked until ${moment(blocked_until).format('DD-MMM-YYYY')}`});
                        }
                    }else {
                        return done(null, false, { message: "Password incorrect!" });
                    }
                })
            } else {
                return done(null, false, { message: "Email not registered!" });
            }
        })
    }

    passport.use('instructor', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    }, authenticateUser));


    passport.serializeUser((user, done) => done(null, user.instructor_id));

    passport.deserializeUser((id, done) => {
        pool.query(`select * from instructors where instructor_id = $1`, [id], (err, result) => {

            if(err) {
                throw err;
            }
            return done(null, result.rows[0]);
        })
    });
}

module.exports = initialize;