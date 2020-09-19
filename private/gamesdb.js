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
        total_guesses: { type: Number, default: 0 },
        correct_guesses: { type: Number, default: 0 },
        ratings: { type: mongoose.Schema.Types.Mixed, default: {} },
        blocked_ids: []  // Legacy
    },
    { collection: 'games' }
);
gameSchema.virtual('incorrect_guesses').get(function()
    {
        return this.total_guesses - this.correct_guesses;
    }
);
gameSchema.virtual('correct_fraction').get(function()
    {
        return (this.total_guesses == 0) ? 1 : (this.correct_guesses / this.total_guesses);
    }
);
gameSchema.virtual('hard').get(function()
    {
        return this.correct_fraction <= .2;
    }
);
gameSchema.virtual('medium').get(function()
    {
        return this.correct_fraction > .2 && this.correct_fraction < .6;
    }
);
gameSchema.virtual('easy').get(function()
    {
        return this.correct_fraction >= .6;
    }
);
gameSchema.virtual('num_ratings').get(function()
    {
        return Object.values(this.ratings).length;
    }
);
gameSchema.virtual('average_rating').get(function()
    {
        var sum = 0;
        var total = 0;

        for (const rating of Object.values(this.ratings))
        {
            if (rating)  // Valid rating
            {
                if (typeof rating == 'number')
                    sum += rating;
                else
                    sum += parseInt(rating);
                total += 1;
            }
        }

        return (total != 0) ? (sum / total) : (0);
    }
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
    var sanitized = search.replace(/\W+/g, '\\W*');

    function intToRoman(value)
    {
        var s = '';
        while (value >= 1000)  // Convert thousands into Ms
        {
            value -= 1000;
            s += 'M';
        }
        if (value >= 900)  // Convert 900 into CM
        {
            value -= 900;
            s += 'CM';
        }
        if (value >= 500)  // Convert 500 into D
        {
            value -= 500;
            s += 'D';
        }
        if (value >= 400)  // Convert 400 into CD
        {
            value -= 400;
            s += 'CD';
        }
        while (value >= 100)  // Convert hundreds into Cs
        {
            value -= 100;
            s += 'I';
        }
        if (value >= 90)  // Convert 90 into XC
        {
            value -= 90;
            s += 'XC';
        }
        if (value >= 50)  // Convert 50 into L
        {
            value -= 50;
            s += 'L';
        }
        if (value >= 40)  // Convert 40 into XL
        {
            value -= 40;
            s += 'XL';
        }
        while (value >= 10)  // Convert tens into Xs
        {
            value -= 10;
            s += 'X'
        }
        if (value >= 9)  // Convert 9 into IX
        {
            value -= 9;
            s += 'IX';
        }
        if (value >= 5)  // Convert 5 into V
        {
            value -= 5;
            s += 'V';
        }
        if (value >= 4)  // Convert 4 into IV
        {
            value -= 4;
            s += 'IV';
        }
        while (value >= 1)  // Convert ones into Is
        {
            value -= 1;
            s += 'I';
        }

        return s;
    }

    // Numbers can also be read as Roman numerals
    sanitized = sanitized.replace( /\d+/g, (x) => '(' + x + '|' + intToRoman(parseInt(x)) + ')');

    // Database query
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

// Adds some number of correct and incorrect guesses to a song
// Returns a Query
function addGuesses(game_name, correct, incorrect)
{
    var query = { game_name: game_name };
    var update = {  $inc: { total_guesses: correct + incorrect, correct_guesses: correct }  };
    return gameModel.findOneAndUpdate(query, update);
}

// Edits the name of a game
// Returns a Query
function editName(old_game_name, new_game_name)
{
    var query = { game_name: old_game_name };
    var update = {  game_name: new_game_name  };
    return gameModel.findOneAndUpdate(query, update);
}

// Edits the playlist ID of a game
// Returns a Promise
async function editPlaylist(game_name, playlist_id)
{
    // Create all the songs on the playlist
    var songs = await songsdb.createFromPlaylistId(playlist_id);

    // Get the song object ids
    var song_ids = [];
    for (song of songs)
    {
        song_ids.push(song._id);
    }

    var query = { game_name: game_name };
    var update = {  $set: { playlist_id: playlist_id, songs: song_ids }  };
    return gameModel.findOneAndUpdate(query, update).exec();
}

// Rates a game according to a user
// Returns a Query
function rate(game_name, username, rating)
{
    // Query
    var query = { game_name: game_name };

    // Update
    var update;
    if (rating)  // Valid rating
    {
        update = {};
        update['ratings.' + username] = rating;
    }
    else  // Unrate
    {
        var inner = {};
        inner['ratings.' + username] = 1;
        update = {$unset: inner};
    }

    return gameModel.findOneAndUpdate(query, update);
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
    updateSongs,
    addGuesses,
    editName,
    editPlaylist,
    rate
};
