var express = require('express');
var router = express.Router();
var createError = require('http-errors');

var yt = require('../private/yt');
var db = require('../private/database');
var usersdb = require('../private/usersdb');
var gamesdb = require('../private/gamesdb');

/* GET games listing */
async function gamesListing(req, res, next)
{
    try
    {
        await usersdb.auth(req.session.username, req.session.password);
    }
    catch (err)
    {
        console.log(err);

        // Go to log in if not logged in
        res.redirect('/');
        return;
    }

    // Get the current user
    var currentuser = await usersdb.get(req.session.username);

    // Get all the games in the database
    var games = await gamesdb.all();

    var content = 
    {
        currentuser: currentuser,
        games: games
    };

    if (req.query.err)
    {
        content.errortext = decodeURIComponent(req.query.err);
    }
    
    res.render('gamelist', content);
}
router.get('/', gamesListing);

/* GET specific game page */
async function gamePage(req, res, next)
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

    // Get the game name from the query
    var game_name = req.params["name"];

    // Return a JSON list instead
    if (game_name == "all")
    {
        if (req.query.search)  // Run a search
        {
            // Get the search string
            var search = decodeURIComponent(req.query.search);

            // Get the number of results to return
            var num;
            if (req.query.num)
                num = parseInt(req.query.num);
            else
                num = 3;

            res.json(await gamesdb.searchNames(search, num));
        }
        else  // Return all the games
        {
            res.json(await gamesdb.allNames());
        }

        return;
    }

    // Get the current user
    var currentuser = await usersdb.get(req.session.username);

    try  // Get the game
    {
        var game = await gamesdb.get(game_name);
        var playlist = await yt.getPlaylistWithSongs(game.playlist_id);

        var content =
        {
            currentuser: currentuser,
            game: game,
            playlist: playlist
        }

        res.render('game', content);
    }
    catch (err)  // Game not found
    {
        next(createError(404));
    }
}
router.get('/:name', gamePage);

/* POST to add a game */
async function addGame(req, res, next)
{
    try
    {
        await usersdb.auth(req.session.username, req.session.password);

        var game_name = req.body.game_name;
        var playlist_id = yt.playlistUrlToId(req.body.playlist_url);

        await gamesdb.create(game_name, playlist_id);

        console.log(req.body.addtouser)
        if (req.body.addtouser == 'on')
        {
            await usersdb.addGameToUser(game_name, req.session.username);
        }

        res.redirect(req.body.source_url);
    }
    catch (err)
    {
        var string = encodeURIComponent(err);
        res.redirect(req.body.source_url + '?err=' + err);
    }
}
router.post('/add', addGame);

/* POST to remove a game */
async function removeGame(req, res, next)
{
    try
    {
        await usersdb.auth(req.session.username, req.session.password);

        var game_name = req.body.game_name;

        // I wanted to do a transaction for this, but Mongo said "fuck you"
        // So we will just do this in a shitty unsafe way

        // First, remove from all users
        await usersdb.removeGameFromAllUsers(game_name);

        // Remove from games
        await gamesdb.remove(game_name);

        res.redirect(req.body.source_url);
    }
    catch (err)
    {
        var string = encodeURIComponent(err);
        res.redirect(req.body.source_url + '?err=' + err);
    }
}
router.post('/remove', removeGame);

module.exports = router;
