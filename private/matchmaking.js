
// All lobbies
var lobbies = [];

// Host state machine
var hoststatemachine = require('./hoststatemachine');

// Registers a lobby for redirects
const registered = new Set();
function registerRedirect(lobby_name)
{
    if (!registered.has(lobby_name))
    {
        // Add to registered names
        registered.add(lobby_name);

        // Add namespace callback
        const nsp = require('../app').io.of('/' + lobby_name);
        nsp.on('connection', redirectConnection);
    }
}

// Redirects an incoming connection to the correct lobby
function redirectConnection(socket, next)
{
    console.log('Redirecting a connection to ' + socket.nsp.name);

    // Namespace regex
    const re = /^\/(?<name>.+)/

    // Get the namespace name
    const nsp_name = socket.nsp.name;

    // Try to parse the lobby name
    const found = nsp_name.match(re);
    const match = found ? found.groups.name : undefined;
    const lobby_name = match ? decodeURIComponent(match) : undefined;

    // If it's for a lobby, redirect
    if (lobby_name)
    {
        // Find a lobby with this name
        const lobby = lobbies.find(lobby => lobby.name == lobby_name);

        // If there is a lobby, call the lobby onConnection function
        if (lobby)
        {
            lobby.onConnection(socket, next);
        }
    }
}

// Create a new lobby with the given player in it
// May throw errors
async function createLobbyWithPlayer(name, password, username)
{
    // Check that there isn't a lobby with this name already
    if (lobbies.some(lobby => lobby.name == name))
    {
        throw 'There is already a lobby with this name.';
    }

    // Create the new lobby (with default settings)
    var lobby = new hoststatemachine.HostStateMachine(name, password);
    lobby.addPlayer = addPlayer;

    // Try to add the player
    // This may throw an error, which will scrap the lobby entirely
    lobby.addPlayer(username);

    // Add to the lobbies list
    lobbies.push(lobby);

    // Register the lobby for connection redirects
    registerRedirect(lobby.name);

    // Start the state machine at queueing
    await lobby.goto('queueing');

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
        connected: false,
        spectator: false,
        ready: false,
        points: 0,
        answer: '',
        answered: false
        // TODO: Additional metadata
    };

    // Set first player added as host
    if (this.players.length == 0)
    {
        player.host = true;
    }
    else if (this.cur_state.name != 'queueing')
    {   // Set spectator if game is ongoing
        player.spectator = true;
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

// Deletes any lobbies with no players in them
function prune()
{
    for (i = 0; i < lobbies.length; i += 1)
    {
        if (lobbies[i].players.length == 0)
        {
            lobbies.splice(i, 1);
            i -= 1;
        }
    }
}

// Export the root structure
module.exports =
{
    lobbies,
    createLobbyWithPlayer,
    getLobbyWithName,
    getLobbyWithPlayer,
    prune
};