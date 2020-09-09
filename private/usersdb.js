
// MongoDB database
var mongoose = require('mongoose');

// Games database
var gamesdb = require('../private/gamesdb');

// User Schema
var userSchema = new mongoose.Schema(
    {
        name: String,
        username: { type: String, index: true, unique: true, required: true },
        password: { type: String, required: true },
        wins: { type: Number, default: 0 },
        exp: { type: Number, default: 0 },
        lastlogin: { type: Date, default: new Date()},
        games: { type: [mongoose.Schema.Types.ObjectId], default: [] }
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

// Create a new user
// Returns a Query
function create(username, password)
{
    return userModel.create(
        {
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
// Returns a Query
function get(username)
{
    return userModel.findOne(
        {
            username: username
        }
    );
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
    // Get the game to remove
    var game = await gamesdb.get(game_name);
    var game_id = game.id;

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
    updateLastLogin
}