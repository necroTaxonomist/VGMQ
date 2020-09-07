var express = require('express');
var router = express.Router();

var usersdb = require('../private/usersdb');
var newfeatures = require('../private/newfeatures');

/* GET main page. */
async function mainPage(req, res, next)
{
    try
    {
        await usersdb.auth(req.session.username, req.session.password);
    }
    catch (err)
    {
        // Go to log in if not logged in
        res.redirect('/');
    }

    try
    {
        // Get the user
        var user = await usersdb.get(req.session.username);

        // Get all the new features since the last login
        var newFeatures = newfeatures.getSince(user.lastlogin);

        console.log('last login = ' + user.lastlogin);

        // Update the last login
        await usersdb.updateLastLogin(req.session.username);

        // Set the content
        var content =
        {
            username: req.session.username,
            new_features: newFeatures
        };

        res.render('main', content);
    }
    catch (err)
    {
        console.log(err);

        res.render('main', {username: req.session.username});
    }
}
router.get('/', mainPage);

module.exports = router;
