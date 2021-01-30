var express = require('express');
var router = express.Router();

const path = require('path');

var usersdb = require('../private/usersdb');
var exportdb = require('../private/exportdb');

/* GET developer tools landing */
async function devLanding(req, res, next)
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

    // Set the content
    var content = {};

    res.render('dev', content);
}
router.get('/', devLanding);

/* GET users */
async function usersJson(req, res, next)
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

    var fn = await exportdb.export_users();
    var root = path.join(__dirname, '..');

    res.sendFile(fn, {root: root});
}
router.get('/users.json', usersJson);

/* GET games */
async function gamesJson(req, res, next)
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

    var fn = await exportdb.export_games();
    var root = path.join(__dirname, '..');

    res.sendFile(fn, {root: root});
}
router.get('/games.json', gamesJson);

/* GET songs */
async function songsJson(req, res, next)
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

    var fn = await exportdb.export_songs();
    var root = path.join(__dirname, '..');

    res.sendFile(fn, {root: root});
}
router.get('/songs.json', songsJson);

module.exports = router;
