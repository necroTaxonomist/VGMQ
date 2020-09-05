// MongoDB database
var mongoose = require('mongoose');
var db = require('../private/database');
const { names } = require('debug');

// YouTube database
var yt = require('../private/yt');

// Game Schema
var gameSchema = new mongoose.Schema(
    {
        name: String,
        game_name: { type: String, index: true, unique: true, required: true },
        playlist_id:
        {
            type: String,
            required: true,
            validate:
            {
                validator: async function(id)
                {
                    try
                    {
                        await yt.getPlaylist(id);
                        return true;
                    }
                    catch (err)
                    {
                        return false;
                    }
                },
                message: 'Failed to validate playlist ID.'
            }
        }
    },
    { collection: 'games' }
);

// User Model
var gameModel = mongoose.model('game', gameSchema);

// Create a new game
// Returns a Query
function create(name, playlist_id)
{
    return gameModel.create(
        {
            game_name: name,
            playlist_id: playlist_id
        }
    );
}

// Get the game with the given name
// Returns a Query
function get(name)
{
    return gameModel.findOne(
        {
            game_name: name
        }
    );
}

// Remove the game with the given name
// Returns a Query
function remove(name)
{
    return gameModel.deleteOne(
        {
            game_name: name
        }
    );
}

// Gets all games
// Returns a Query
function all()
{
    return gameModel.find({}).sort('game_name');
}

// Get all game names
// Returns a Promise
async function allNames()
{
    const query = await gameModel.find({}).sort('game_name');
    var names = [];

    for await (const game of query)
    {
        names.push(game.game_name);
    }

    return names;
}

// Converts a list of game IDs to game names
// Returns a Promise
async function idsToNames(ids)
{
    const id_objects = ids.map(x => mongoose.Types.ObjectId(x));

    const query = await gameModel.find(
        {
            _id:
            {
                $in: id_objects
            }
        }
    ).sort('game_name');

    var names = [];

    for await (const game of query)
    {
        names.push(game.game_name);
    }

    return names;
}

// Searches all game names for a query string
// Returns a Promise
async function searchNames(search, num)
{
    const re = new RegExp(search, 'i');
    const query = await gameModel.find({game_name: re});
    var names = [];

    for await (const game of query)
    {
        names.push(game.game_name);
    }

    if (names.length > num)
    {
        names = names.slice(0, num);
    }

    return names;
}

module.exports =
{
    create,
    get,
    remove,
    all,
    allNames,
    idsToNames,
    searchNames
}