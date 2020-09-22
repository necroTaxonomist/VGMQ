
// MongoDB database
var mongoose = require('mongoose');

// Games database
var gamesdb = require('../private/gamesdb');

// Current user version
const CURRENT_VERSION = 2;

// User Schema
var userSchema = new mongoose.Schema(
    {
        name: String,
        version: Number,  // Not defaulted
        username: { type: String, index: true, unique: true, required: true },
        password: { type: String, required: true },
        wins: { type: Number, default: 0 },
        exp: { type: Number, default: 0 },
        lastlogin: { type: Date, default: new Date()},
        games: { type: [mongoose.Schema.Types.ObjectId], default: [] },
        items: { type: [mongoose.Mixed], default: [] },
    },
    { collection: 'users' }
);
userSchema.virtual('num_games').get(
    function()
    {
        return this.games.length;
    }
);

// User Model
var userModel = mongoose.model('user', userSchema);

// Fix an entry to use the newest version
async function fixVersion(user, doSave = true)
{
    if (user.null)
        return;  // Can't fix, not a valid entry

    if (user.version == CURRENT_VERSION)
        return;  // Already good

    console.log('Fixing user entry "' + user.username + '"');

    // Set the version
    // The version field is not defaulted so that
    // we pick up entries from before the field existed
    user.version = CURRENT_VERSION;

    // Save to the database
    // This would include any defaults added
    if (doSave)
        await user.save();
}

// Create a new user
// Returns a Query
function create(username, password)
{
    return userModel.create(
        {
            version: CURRENT_VERSION,
            username: username,
            password: password
        }
    );
}

// Try to authenticate for a user
// Returns a Promise
async function auth(username, password)
{
    var found = await userModel.exists(
        {
            username: username,
            password: password
        }
    );

    if (!found)
    {
        throw 'Incorrect username or password.';
    }

    return found;
}

// Get the user with the given username
// Returns a Promise
async function get(username)
{
    // Get the user
    var user = await userModel.findOne({ username: username });

    // Fix the version
    await fixVersion(user);

    // Return the user
    return user;
}

// Get all usernames
// Returns a Promise
async function allUsernames()
{
    const query = await userModel.find({});
    var usernames = [];

    for await (const user of query)
    {
        usernames.push(user.username);
    }

    return usernames;
}

// Adds a game to a user
// Returns a Promise
async function addGameToUser(game_name, username)
{
    // Get the game to add
    var game = await gamesdb.get(game_name);
    var game_id = game.id;

    var query = { username: username };
    var update = { $addToSet: { games: game_id } };

    return userModel.findOneAndUpdate(query, update).exec();
}

// Removes a game from a user
// Returns a Promise
async function removeGameFromUser(game_name, username)
{
    // First, unrate the game
    await gamesdb.rate(game_name, username, 0);

    // Get the game to remove
    var game = await gamesdb.get(game_name);
    var game_id = game.id;

    // Remove the game
    var query = { username: username };
    var update = { $pull: { games: game_id } };
    return userModel.findOneAndUpdate(query, update).exec();
}

// Removes a game from all users who have it
// Returns a Promise
async function removeGameFromAllUsers(game_name)
{
    // Get the game to remove
    var game = await gamesdb.get(game_name);
    var game_id = game.id;

    var query = { games: { $in: game_id } };
    var update = { $pull: { games: game_id } };

    return userModel.findOneAndUpdate(query, update).exec();
}

// Returns all games on a user's list
// Returns a Query
async function getGamesFromUser(username)
{
    // Get the user
    var user = await get(username);

    // Return the games
    return gamesdb.idsToGames(user.games);
}

// Updates the last login time for a user
// Returns a Promise
async function updateLastLogin(username)
{
    var query = { username: username };
    var update = { lastlogin: new Date() };
    return userModel.findOneAndUpdate(query, update).exec();
}

// Returns if a given user has a game on their list
// Returns a Promise
async function hasGame(username, game_name)
{
    // Get the game ID
    var game = await gamesdb.get(game_name);
    var game_id = game.id;

    // Check if the user has the game
    var query =
    {
        username: username,
        games: {  $elemMatch: { $eq: game_id }  }
    };
    return await userModel.exists(query);
}

// Adds experience points to a user
// Returns a Query
function addExp(username, exp)
{
    var query = { username: username };
    var update = {  $inc: { exp: exp }  };
    return userModel.findOneAndUpdate(query, update);
}

// Adds wins to a user
// Returns a Query
function addWins(username, wins)
{
    var query = { username: username };
    var update = {  $inc: { wins: wins }  };
    return userModel.findOneAndUpdate(query, update);
}

module.exports =
{
    create,
    auth,
    get,
    allUsernames,
    addGameToUser,
    removeGameFromUser,
    removeGameFromAllUsers,
    getGamesFromUser,
    updateLastLogin,
    hasGame,
    addExp,
    addWins
};
