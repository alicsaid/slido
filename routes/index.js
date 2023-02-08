var express = require('express');
var router = express.Router();

/* HOME INDEX */

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Slido' });
});

module.exports = router;
