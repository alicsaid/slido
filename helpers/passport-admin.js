const dbConnection = require('./db-connection');
const pg = require("pg");
const bcrypt = require("bcrypt");
const LocalStrategy = require("passport-local").Strategy;

var pool = new pg.Pool(dbConnection);

function initialize(passport) {
    const authenticateUser = (email, password, done) => {

        pool.query(`select * from administrators where email = $1;`, [email], (err, result) => {

            if(err) {
                throw err;
            }

            // if greater than 0, admin exists
            if(result.rows.length > 0) {
                const user = result.rows[0];

                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if(err) {
                        throw err;
                    }

                    if(isMatch) {
                        return done(null, user);
                    } else {
                        return done(null, false, { message: 'Password incorrect!' });
                    }
                })
            } else {
                return done(null, false, { message: 'Email not registered!' });
            }
        })
    }

    passport.use('admin', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    }, authenticateUser));


    passport.serializeUser((user, done) => done(null, user.admin_id));

    passport.deserializeUser((id, done) => {
        pool.query(`select * from administrators where admin_id = $1`, [id], (err, result) => {
            if(err) {
                throw err;
            }
            return done(null, result.rows[0]);
        })
    });
}

module.exports = initialize;