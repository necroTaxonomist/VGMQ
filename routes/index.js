var express = require('express');
var router = express.Router();

var usersdb = require('../private/usersdb');

/* GET home page. */
async function homePage(req, res, next)
{
    try
    {
        await usersdb.auth(req.session.username, req.session.password);
        res.redirect('/main');  // Skip login
    }
    catch (err)
    {
        res.render('index');
    }
}
router.get('/', homePage);

/* Log in user */
async function login(req, res, next)
{
    try
    {
        await usersdb.auth(req.body.username, req.body.password);
        
        req.session.username = req.body.username;
        req.session.password = req.body.password;

        res.redirect('/main');
    }
    catch (err)
    {
        res.render('index', {errortext: err});
    }
}
router.post('/login', login);

/* Log out user */
function logout(req, res, next)
{
    req.session.username = "";
    req.session.password = "";

    res.redirect('/');
}
router.get('/logout', logout);

module.exports = router;
