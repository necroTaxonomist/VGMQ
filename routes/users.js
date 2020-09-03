var express = require('express');
var router = express.Router();
var createError = require('http-errors');

var usersdb = require('../private/usersdb');
var gamesdb = require('../private/gamesdb');

/* GET users listing */
async function usersListing(req, res, next)
{
    try
    {
        await usersdb.auth(req.session.username, req.session.password);

        var usernames = await usersdb.allUsernames();
        res.render('userlist', {usernames: usernames});
    }
    catch (err)
    {
        // Go to log in if not logged in
        res.redirect('/');
    }
}
router.get('/', usersListing);

/* GET specific user page */
async function userPage(req, res, next)
{
    try
    {
        await usersdb.auth(req.session.username, req.session.password);
    }
    catch (err)
    {
        // Go to log in if not logged in
        res.redirect('/');
        return;
    }

    var username = req.params["username"];

    try  // Get the user
    {
        var user = await usersdb.get(username);

        var content = 
        {
            user: user,
            currentusername: req.session.username,
            gamenames: await gamesdb.idsToNames(user.games)
        };

        if (req.query.err)
        {
            content.errortext = decodeURIComponent(req.query.err);
        }

        res.render('user', content);
    }
    catch (err)  // User not found
    {
        next(createError(404));
    }
}
router.get('/:username', userPage);

/* POST to add a game */
async function addGame(req, res, next)
{
    try
    {
        var username = req.params["username"];

        if (req.session.username.valueOf() != username.valueOf())
        {
            throw 'You do not have permission to modify this user.';
        }

        await usersdb.auth(req.session.username, req.session.password);

        var game_name = req.body.game_name;
        await usersdb.addGameToUser(game_name, username);

        res.redirect(req.body.source_url);
    }
    catch (err)
    {
        var string = encodeURIComponent(err);
        res.redirect(req.body.source_url + '?err=' + err);
    }
}
router.post('/:username/add', addGame);

/* POST to remove a game */
async function removeGame(req, res, next)
{
    try
    {
        var username = req.params["username"];

        if (req.session.username.valueOf() != username.valueOf())
        {
            throw 'You do not have permission to modify this user.';
        }

        await usersdb.auth(req.session.username, req.session.password);

        var game_name = req.body.game_name;
        await usersdb.removeGameFromUser(game_name, username);

        res.redirect(req.body.source_url);
    }
    catch (err)
    {
        var string = encodeURIComponent(err);
        res.redirect(req.body.source_url + '?err=' + err);
    }
}
router.post('/:username/remove', removeGame);

module.exports = router;