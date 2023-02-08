var bcrypt = require("bcrypt");

exports.encryptPassword = (password) => {

// Encrypt
    return bcrypt.hashSync(password, 10);
};