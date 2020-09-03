
// MongoDB database
var mongoose = require('mongoose');
var db = require('../private/database');

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
// Returns a Promise, may throw an error
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
// Returns a Promise, may throw an error
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
// Returns a Promise, may throw an error
function get(username)
{
    return userModel.findOne(
        {
            username: username
        }
    ).exec();
}

// Get all usernames
// Returns a Promise, may throw an error
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
async function removeGameFromUser(game_name, username)
{
    // Get the game to remove
    var game = await gamesdb.get(game_name);
    var game_id = game.id;

    var query = { username: username };
    var update = { $pull: { games: game_id } };

    return userModel.findOneAndUpdate(query, update).exec();
}

module.exports =
{
    create,
    auth,
    get,
    allUsernames,
    addGameToUser,
    removeGameFromUser
}