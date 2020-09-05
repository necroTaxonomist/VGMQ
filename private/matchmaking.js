
// All lobbies
var lobbies = [];

// Create a new lobby with the given player in it
// May throw errors
function createLobbyWithPlayer(name, password, username)
{
    // Check that there isn't a lobby with this name already
    if (lobbies.some(lobby => lobby.name == name))
    {
        throw 'There is already a lobby with this name.';
    }

    // Create the new lobby
    var lobby =
    {
        name: name,
        password: password,
        players: [],
        settings:
        {
            num_games: 20,
            game_selection: 'random',
            song_selection: 'random',
            guess_time: 20
        },
        addPlayer: addPlayer
    };

    // Try to add the player
    // This may throw an error, which will scrap the lobby entirely
    lobby.addPlayer(username);

    // Add to the lobbies list
    lobbies.push(lobby);

    return lobby;
}

// Add a player to a lobby (member function)
// May throw errors
function addPlayer(username)
{
    // Check that this player isn't in a lobby already
    if (lobbies.some(lobby =>
            lobby.players.some(player =>
                player.username == username
            )
        ))
    {
        throw 'This player is already in a lobby.';
    }

    // Create the new player
    var player = 
    {
        username: username,
        host: false,
        spectator: false,
        ready: false,
        gamestate: 'entering'
        // TODO: Additional metadata
    };

    // Set first player added as host
    if (this.players.length == 0)
    {
        player.host = true;
    }

    // Add the player to the lobby
    this.players.push(player);
}

// Get the lobby with the given name
function getLobbyWithName(name)
{
    const found = lobbies.find(lobby => lobby.name == name);

    if (found)
        return found;
    else
        throw 'There is no lobby with that name.';
}

// Get the lobby containing the given player
function getLobbyWithPlayer(username, hostonly = false)
{
    const found = lobbies.find(lobby =>
        lobby.players.some(player =>
            {
                return (player.username == username) && (player.host || !hostonly);
            }
        )
    );

    if (found)
        return found;
    else
        throw 'There is no lobby containing that player';
}

// Export the root structure
module.exports =
{
    lobbies,
    createLobbyWithPlayer,
    getLobbyWithName,
    getLobbyWithPlayer
};