
//================================
// LOCAL DATA
//================================

// Local username
var local_username = '';

// Lobbby information
var lobby = {};

// Video information
var video = {};

// Socket
var socket;

// Time remaining
var refTime;

function resetTimeRemaining()
{
    // Get today's date and time
    refTime = new Date().getTime();
}

function getTimeRemaining()
{
    // Get today's date and time
    var now = new Date().getTime();

    // Find the distance from the reference
    var distance = now - refTime;

    // Get the distance in in seconds
    var seconds = (distance % (1000 * 60)) / 1000;

    // Return 
    return Math.ceil(lobby.settings.guess_time - seconds);
}

//================================
// DOCUMENT VIEWS
//================================

function leaveGame()
{
    // Go back to the main menu
    window.location.replace("/main");
}

function abortGame()
{
    // Tell the server to abort
    socket.emit('abort');
}

function showGameSettings()
{
    // Set the values based on lobby.settings
    document.getElementById("num_games").value = lobby.settings.num_games;
    document.getElementById("gamesel_" + lobby.settings.game_selection).checked = true;
    document.getElementById("songsel_" + lobby.settings.song_selection).checked = true;
    document.getElementById("guess_time").value = lobby.settings.guess_time;

    // Get the settings form
    const settings = document.getElementById("settings");

    // Check if host
    var isHost = lobby.players.some(player =>
        {
            return player.username == local_username && player.host;
        }
    );

    // Set disabled if not the host
    for (elem of settings.getElementsByTagName("input"))
    {
        elem.disabled = !isHost;
    }

    // Make the settings form visible
    settings.hidden = false;
}

function hideGameSettings()
{
    // Make the settings form hidden
    document.getElementById("settings").hidden = true;
}

async function submitGameSettings()
{
    // Post to lobby settings
    var postUrl = '/lobby/settings';

    // Get the settings from the form
    const postData = new FormData(document.getElementById("settings"));

    try
    {
        await xhttpAsyncForm(postUrl, postData);
    }
    catch (err)
    {
        // Failed, return to the old settings
        console.log('Failed to post settings: ' + err);
        showGameSettings();
    }
}

function showCountdown()
{
    // Reset the time
    resetTimeRemaining();

    updateCountdown();

    // Unhide
    document.getElementById("countdown").hidden = false;
}

function updateCountdown()
{
    document.getElementById("countdown").innerText = getTimeRemaining();
}

function hideCountdown()
{
    // Hide
    document.getElementById("countdown").hidden = true;
}

function startVideo()
{
    // Hide
    document.getElementById("videosection").hidden = true;

    // Get the video
    var vid = document.getElementById("video");

    // Stop it first
    vid.src = '';

    // Get an embedded YouTube video
    vid.src = 'https://www.youtube.com/embed/' + video.video_id + '?autoplay=1&controls=0';
}

function showVideo()
{
    // Get the video
    var vid = document.getElementById("video");

    // Stop it first
    vid.src = '';

    // Get an embedded YouTube video
    vid.src = 'https://www.youtube.com/embed/' + video.video_id + '?autoplay=1&controls=0';

    // Set the game name
    document.getElementById("videoname").innerHTML = video.game_name;

    // Set the song name
    document.getElementById("songname").innerHTML = video.song_name;

    // Unhide
    document.getElementById("videosection").hidden = false;
}

function hideVideo()
{
    // Hide
    document.getElementById("videosection").hidden = true;

    // Stop the video
    document.getElementById("video").src = '';
}

// Show the game name input
function showInput(disabled = false)
{
    // Set disabled
    document.getElementById("inputbox").disabled = disabled;

    // Reset if enabling
    if (!disabled)
    {
        document.getElementById("inputbox").value = '';
        document.getElementById("inputconfirm").innerHTML = '';
    }

    // Unhide
    document.getElementById("inputsection").hidden = false;
}

function hideInput()
{
    // Hide
    document.getElementById("inputsection").hidden = true;
}

function submitInput()
{
    if (document.getElementById("inputbox").value.length != 0)
    {
        document.getElementById("inputconfirm").innerHTML = ' ✅';

        // Send submission to the server
        var value = document.getElementById("inputbox").value;
        console.log('Submitting ' + value);
        socket.emit('answer', value);
    }
}

function changeInput()
{
    var inputconfirm = document.getElementById("inputconfirm");

    if (inputconfirm.innerHTML.length != 0)
        inputconfirm.innerHTML = ' ☑️';
}

// Show ready and start button
function showReadyStart()
{
    // Check if host
    var isHost = lobby.players.some(player =>
        {
            return player.username == local_username && player.host;
        }
    );

    // Check if everyone ready
    var anyoneNotReady = lobby.players.some(player => !player.ready);

    // Disable the start button if not host
    document.getElementById("startbutton").disabled = !isHost || anyoneNotReady;

    // Unhide
    document.getElementById("readystart").hidden = false;
}

function hideReadyStart()
{
    // Hide
    document.getElementById("readystart").hidden = true;
}

function sendReady()
{
    socket.emit('ready');
}

function sendStart()
{
    socket.emit('start');
}

// Show all the players, with ready or unready indicators
function showQueueingPlayers()
{
    // Get the UL and clear it
    var ul = document.getElementById("players");
    ul.innerHTML = "";

    // For all non-spectator players
    for (player of lobby.players.filter(player => !player.spectator))
    {
        var li = document.createElement("li");

        if (player.host)
            li.innerText += '🏠';

        if (player.ready)
            li.innerText += '✔️ ';
        else
            li.innerText += '❌ ';

        li.innerText += player.username;

        ul.appendChild(li);
    }
}

// Show all the players, with score and status indicators
function showActivePlayers()
{
    // Get the UL and clear it
    var ul = document.getElementById("players");
    ul.innerHTML = "";

    // Sort by score
    function sortFunc(a, b)
    {
        return b.points - a.points;
    }

    // For all non-spectator players, sorted by score
    for (player of lobby.players.filter(player => !player.spectator).sort(sortFunc))
    {
        var li = document.createElement("li");

        if (player.answered)
            li.innerText += '🙂';
        else
            li.innerText += '🤔';

        li.innerText += ' ' + player.username;

        li.innerText += ' (' + player.points + ' points)';

        ul.appendChild(li);
    }
}

// Show all the players, with win/lose and score indicators
function showWinLosePlayers()
{
    // Get the UL and clear it
    var ul = document.getElementById("players");
    ul.innerHTML = "";

    // Sort by score
    function sortFunc(a, b)
    {
        return b.points - a.points;
    }

    // For all non-spectator players, sorted by score
    for (player of lobby.players.filter(player => !player.spectator).sort(sortFunc))
    {
        var li = document.createElement("li");

        if (player.correct)
            li.innerText += '😄';
        else
            li.innerText += '😢';

        if (player.blame)
            li.innerText += '📚';

        li.innerText += ' ' + player.username;
        li.innerText += ' (' + player.points + ' points)';
        li.innerText += ' [' + player.answer + ']';

        ul.appendChild(li);
    }
}

// Show spectators
function showSpectators()
{
    // Get the UL and clear it
    var ul = document.getElementById("spectators");
    ul.innerHTML = "";

    // For all non-spectator players
    for (player of lobby.players.filter(player => player.spectator))
    {
        var li = document.createElement("li");
        li.innerText += player.username;
        ul.appendChild(li);
    }
}

//================================
// STATE MACHINE
//================================

// Client-side state machine
const main = new StateMachine();

// Initial state when we first open the game page
function EnteringState()
{
    State.call(this,
        'entering',
        function()  // onEntry
        {
            // Set the game state
            document.getElementById("gamestate").innerHTML = 'Entering the lobby...';

            // Tell the host we've connected, and it will send back lobby info
            socket.emit('setusername', local_username);
        }
    );
    this.addHandler('lobby_info', async function(event)
        {
            // The host has acknowledged us,
            // so we should go to whatever state the game is currently in
            await this.parent.goto(lobby.gamestate);
        }
    );
}
main.addState(new EnteringState());

// Queueing before the game starts
function QueueingState()
{
    State.call(this,
        'queueing',
        function()  // onEntry
        {
            // Set the game state
            const gamestate_str = 'Queueing for lobby "' + lobby.name + '"';
            document.getElementById("gamestate").innerHTML = gamestate_str;

            // Show the game settings
            showGameSettings();

            // Show ready and start buttons
            showReadyStart()

            // Show queueuing players and spectators
            showQueueingPlayers();
            showSpectators();
        },
        function()  // onExit
        {
            // Hide the game settings
            hideGameSettings();

            // Hide the ready and start buttons
            hideReadyStart();
        }
    );
    this.addHandler('lobby_info', function(event)
        {
            // Lobby info updated, show new values
            showGameSettings();
            showReadyStart()
            showQueueingPlayers();
            showSpectators();
        }
    );
    this.addHandler('new_video', async function(event)
        {
            // Got the first video, go to guessing
            await this.parent.goto('guessing');
        }
    );
    this.addHandler('loading', function(event)
        {
            const gamestate_str = 'Loading song ' + event.current + ' out of ' + event.total + '...';
            document.getElementById("gamestate").innerHTML = gamestate_str;

            lobby.num_rounds = event.total;
        }
    );
}
main.addState(new QueueingState());

// Guessing the song
function GuessingState()
{
    State.call(this,
        'guessing',
        function()  // onEntry
        {
            // Set the game state
            document.getElementById("gamestate").innerHTML = 'Round ' + video.round + '/' + lobby.num_rounds;

            // Show the countdown
            showCountdown();

            // Set the countdown interval
            setInterval(updateCountdown, 1000);

            // Load the video
            startVideo();

            // Show input box
            showInput(false);

            // Show active players and spectators
            showActivePlayers();
            showSpectators();
        },
        function()  // onExit
        {
            // Turn off the countdown interval
            clearInterval();

            // Hide the countdown
            hideCountdown();
        }
    );
    this.addHandler('lobby_info', function(event)
        {
            // Lobby info updated, show new values
            showActivePlayers();
            showSpectators();
        }
    );
    this.addHandler('round_over', async function(event)
        {
            // Round over, go to viewing
            await this.parent.goto('viewing');
        }
    );
}
main.addState(new GuessingState());

// Viewing the song
function ViewingState()
{
    State.call(this,
        'viewing',
        function()  // onEntry
        {
            // Set the game state
            document.getElementById("gamestate").innerHTML = 'Round ' + video.round + '/' + lobby.num_rounds;

            // Show the video
            showVideo();

            // Show disabled input box
            showInput(true);

            // Show winning and losing players and spectators
            showWinLosePlayers();
            showSpectators();
        },
        function()  // onExit
        {
            // Hide the video
            hideVideo();

            // Hide the input box
            hideInput();
        }
    );
    this.addHandler('lobby_info', function(event)
        {
            // Lobby info updated, show new values
            showWinLosePlayers();
            showSpectators();
        }
    );
    this.addHandler('new_video', async function(event)
        {
            // Got the next video, go to guessing
            await this.parent.goto('guessing');
        }
    );
    this.addHandler('game_over', async function(event)
    {
        // Game over, go back to queueing
        await this.parent.goto('queueing');
    }
);
}
main.addState(new ViewingState());

//================================
// INTERFACE
//================================

// Start the state machine
async function startClientStateMachine(username, lobbyname)
{
    // Set the session information
    local_username = username;

    // Connect to the host over Socket.IO
    var nsp_name = '/' + encodeURIComponent(lobbyname);
    console.log('connecting to ' + nsp_name);
    socket = io(nsp_name);

    // Listen for events
    socket.on('lobby_info', async (data) =>
        {
            lobby = data;
            await main.handle('lobby_info', data);
        }
    );
    socket.on('loading', async (data) =>
        {
            await main.handle('loading', data);
        }
    );
    socket.on('new_video', async (data) =>
        {
            video = data;
            await main.handle('new_video', data);
        }
    );
    socket.on('round_over', async () =>
        {
            await main.handle('round_over');
        }
    );
    socket.on('game_over', async () =>
        {
            await main.handle('game_over');
        }
    );

    // Start the state machine in the entering state
    await main.goto('entering');
}

// Gracefully stop the state machine
function stopClientStateMachine()
{
    // TODO
}
