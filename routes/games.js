var express = require('express');
var router = express.Router();
var createError = require('http-errors');

var usersdb = require('../private/usersdb');
var gamesdb = require('../private/gamesdb');
var songsdb = require('../private/songsdb');

function customSort(a, b)
{
    function customTf(input)
    {
        // Make lowercase
        var str = input.toLowerCase();

        // Remove starting "The "
        const the = 'the ';
        if (str.search(the) == 0)
        {
            str = str.substring(the.length);
        }

        // Remove colons
        str = str.replace(':', '');

        return str;
    }

    var a2 = customTf(a);
    var b2 = customTf(b);

    if (a2 < b2)
        return -1;
    else if (a2 > b2)
        return 1;
    else
        return 0;
}

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
    
    // Apply custom sort
    games = games.sort(function(a, b)
        {
            return customSort(a.game_name, b.game_name);
        }
    );

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
    var game_name = decodeURIComponent(req.params["name"]);

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
                num = 5;

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

    try
    {
        // Get the game
        var game = await gamesdb.get(game_name);

        // Get all the songs for the game
        var songs = await songsdb.find(game.songs);

        var content =
        {
            currentuser: currentuser,
            game: game,
            songs: songs
        }

        res.render('game', content);
    }
    catch (err)  // Game not found
    {
        console.log(err);
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
        var playlist_id = require('../private/yt').playlistUrlToId(req.body.playlist_url);

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

/* POST to block a song */
async function blockSong(req, res, next)
{
    try
    {
        await usersdb.auth(req.session.username, req.session.password);
        await gamesdb.addBlockedId(req.body.game_name, req.body.video_id);
        res.redirect(req.body.source_url);
    }
    catch (err)
    {
        var string = encodeURIComponent(err);
        res.redirect(req.body.source_url + '?err=' + err);
    }
}
router.post('/block', blockSong);

/* POST to unblock a song */
async function unblockSong(req, res, next)
{
    try
    {
        await usersdb.auth(req.session.username, req.session.password);
        await gamesdb.removeBlockedId(req.body.game_name, req.body.video_id);
        res.redirect(req.body.source_url);
    }
    catch (err)
    {
        var string = encodeURIComponent(err);
        res.redirect(req.body.source_url + '?err=' + err);
    }
}
router.post('/unblock', unblockSong);

module.exports = router;
