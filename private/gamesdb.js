// MongoDB database
var mongoose = require('mongoose');

// Songs database
var songsdb = require('../private/songsdb');

// Game Schema
var gameSchema = new mongoose.Schema(
    {
        name: String,
        game_name: { type: String, index: true, unique: true, required: true },
        playlist_id: { type: String, required: true },
        songs: { type: [mongoose.Schema.Types.ObjectId], default: undefined },
        blocked_ids: []  // Legacy
    },
    { collection: 'games' }
);

// Game Model
var gameModel = mongoose.model('game', gameSchema);

// Create a new game
// Returns a Promise
async function create(name, playlist_id)
{
    // Create all the songs on the playlist
    var songs = await songsdb.createFromPlaylistId(playlist_id);

    // Get the song object ids
    var ids = [];
    for (song of songs)
    {
        ids.push(song._id);
    }

    // Create the game
    var game = new gameModel(
        {
            game_name: name,
            playlist_id: playlist_id,
            songs: ids
        }
    );

    if (game.songs == undefined)
    {
        throw 'Unable to load songs from YouTube playlist';
    }

    return await game.save();
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
    // Nonword characters are interchangeable
    const sanitized = search.replace(/\W+/g, '\\W*');

    const re = new RegExp(sanitized, 'i');
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

// Converts a list of game IDs to games
// Returns a Query
async function idsToGames(ids)
{
    const id_objects = ids.map(x => mongoose.Types.ObjectId(x));

    return await gameModel.find(
        {
            _id:
            {
                $in: id_objects
            }
        }
    ).sort('game_name');
}

// Informs the database that a given video ID should not play in game
// Returns a Promise
async function addBlockedId(game_name, video_id)
{
    // No longer used
}

// Informs the database that a given video ID should not play in game
// Returns a Promise
async function removeBlockedId(game_name, video_id)
{
    // No longer used
}

// Returns a promise
async function updateSongs(game_name)
{
    // Get the game
    var game = await get(game_name);

    // Create all the songs on the playlist
    var songs = await songsdb.createFromPlaylistId(game.playlist_id);

    // Convert from legacy block method
    if (game.blocked_ids != undefined)
    {
        await songsdb.blockVideoIds(game.blocked_ids);
        await gameModel.updateOne({ game_name: game_name }, { blocked_ids : undefined});
    }

    // Get the song object ids
    var ids = [];
    for (song of songs)
    {
        ids.push(song._id);
    }

    // Clear the array first
    var query = { game_name: game_name };
    var update = {  $set: { songs: ids }  };
    var options = { new: true };
    return gameModel.findOneAndUpdate(query, update, options).exec();
}

module.exports =
{
    create,
    get,
    remove,
    all,
    allNames,
    idsToNames,
    searchNames,
    idsToGames,
    addBlockedId,
    removeBlockedId,
    updateSongs
}