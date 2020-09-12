var express = require('express');
var router = express.Router();

var usersdb = require('../private/usersdb');
var gachadb = require('../private/gachadb');

// Generate random seed
var random = require('seedrandom')(new Date().toString());

/* GET the gacha page */
async function getGacha(req, res, next)
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

    // Get the user
    var user = await usersdb.get(req.session.username);

    // Set the user content
    var content =
    {
        username: user.username,
        exp: user.exp
    };

    // Going rates for rolls
    var unitCost = 50;
    var unitDiscount = .025;
    var maxRolls = 10;

    // Write to content
    content.unitcost = unitCost;
    content.unitdiscount = unitDiscount;
    content.maxrolls = maxRolls;

    try
    {
        // Roll the gacha
        if (req.query.rolls)
        {
            // Get the number of rolls
            var numRolls = req.query.rolls;
            console.log(numRolls);

            // Limit number of rolls at a time
            if (numRolls > maxRolls)
                throw 'Too many rolls at a time.'

            // Calculate the cost of the rolls
            var baseCost = numRolls * unitCost;
            var discount = Math.pow(1 - unitDiscount, numRolls - 1);
            var cost = Math.floor(baseCost * discount);

            // Check that the user has enough exp
            if (cost > user.exp)
                throw 'Not enough experience points.'

            // Collect won items
            var spoils = [];

            // For each roll
            for (i = 0; i < numRolls; i += 1)
            {
                // Choose if this should be a color or an emoji
                var kind = (random() < .05) ? "color" : "emoji";

                // Generate a random rarity value
                var rarity = random() * 5;

                // Get all items of the chosen kind below the generated rarity
                var items = await gachadb.findBelowRarity(kind, rarity);
                console
                
                // Get the item
                var item = undefined;
                if (items.length == 0)  // No items below that rarity
                {
                    // Add dud item
                    item = { kind: "dud" };
                }
                else
                {
                    // Get a random item
                    var index = Math.floor(random() * items.length);
                    item = items[index];

                    // TODO: Add the item to the user
                }

                // Add to the spoils list
                spoils.push(item);
            }

            // TODO: Debit the user's experience points

            // Write to content
            content.spoils = spoils;
        }
    }
    catch (err)
    {
        console.log(err);
        content.errortext = err;
    }

    res.render('gacha', content);
}
router.get('/', getGacha);

/* Get the update items page*/
async function getUpdate(req, res, next)
{
    try
    {
        // Must be Admin
        if (req.session.username != "Admin")
            throw 'Permission denied, not Admin.'

        // Log in
        await usersdb.auth(req.session.username, req.session.password);

        // Show the update gacha page
        res.render('gachaupdate');
    }
    catch (err)
    {
        console.log(err);
        next(createError(404));
    }
}
router.get('/update', getUpdate);

/* Post to update the gacha items database */
async function postUpdate(req, res, next)
{
    try
    {
        // Must be Admin
        if (req.session.username != "Admin")
            throw 'Permission denied, not Admin.'

        // Log in
        await usersdb.auth(req.session.username, req.session.password);

        // TODO: Update the database

        // Show the update gacha page
        res.render('gachaupdate');
    }
    catch (err)
    {
        console.log(err);
        next(createError(404));
    }
}
router.post('/update', postUpdate);

module.exports = router;
