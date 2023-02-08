var pg = require('pg');
var bcrypt = require("bcrypt");
var dbConnection = require('../db-connection');
var encryptPassword = require('../encrypt-password');

var pool = new pg.Pool(dbConnection);

exports.register = (req, res, next) => {

    let data = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        username: req.body.username,
        date_of_birth: req.body.date_of_birth,
        country: req.body.country,
        email : req.body.email,
        password : encryptPassword.encryptPassword(req.body.password)
    };

    pool.connect(function (err, client, done) {
        if (err) {
            res.send(err);
        }

        client.query(`insert into instructors(first_name, last_name, username, date_of_birth, country, email, password) values($1, $2, $3, $4, $5, $6, $7);`, [data.first_name, data.last_name, data.username, data.date_of_birth, data.country, data.email, data.password], function (err, result) {
            done()

            if (err) {
                if (err.code === '23505' && err.constraint === 'instructors_username_key') {
                    req.flash('error', 'Username already exists. Try another one!');
                    //console.info('check username');
                    return res.redirect(req.originalUrl);
                }
                else if (err.code === '23505' && err.constraint === 'instructors_email_key') {
                    req.flash('error', 'Email address already exists. Try another one!');
                    //console.info('check email');
                    return res.redirect(req.originalUrl);
                }
                else {
                    return res.send(err);
                }
            }
            req.flash('success', 'Now log in with your credentials.');
            next();
        });
    });

};

exports.getCountries = (req, res, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            return res.send(err);
        }

        client.query(`SELECT * from countries;`, [], function (err, result) {
            done()

            if (err) {
                return res.send(err)
            } else {
                req.countries = result.rows;
                next();
            }
        });
    });
};