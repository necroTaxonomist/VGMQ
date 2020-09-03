var express = require('express');
var router = express.Router();

var usersdb = require('../private/usersdb');

/* GET main page. */
async function mainPage(req, res, next)
{
    try
    {
        await usersdb.auth(req.session.username, req.session.password);
        res.render('main', {username: req.session.username});
    }
    catch (err)
    {
        // Go to log in if not logged in
        res.redirect('/');
    }
}
router.get('/', mainPage);

module.exports = router;
