var express = require('express');
var router = express.Router();

var usersdb = require('../private/usersdb');

/* GET signup page. */
async function signupPage(req, res, next)
{
    try
    {
        await usersdb.auth(req.session.username, req.session.password);
        res.redirect('/main');  // Skip signup
    }
    catch (err)
    {
        res.render('signup');
    }
}
router.get('/', signupPage);

/* Create a new user */
async function newUser(req, res, next)
{
    // Try to create a user
    try
    {
        // Check that the two passwords match
        if (req.body.password.valueOf() != req.body.repeat_password.valueOf())
        {
            throw 'Passwords do not match.';
        }

        await usersdb.create(req.body.username, req.body.password);

        req.session.username = req.body.username;
        req.session.password = req.body.password;

        res.redirect('/main');
    }
    catch (err)
    {
        res.render('signup', {errortext: err});
    }
}
router.post('/', newUser);

module.exports = router;
