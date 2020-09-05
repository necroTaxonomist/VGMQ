
//================================
// LOCAL DATA
//================================

// Local username
var local_username = '';

// Lobbby information
const lobby =
{
    gamestate: 'queueing',
    name: 'temp',
    round: 1,
    players:
    [
        { username: 'Admin', host: true, score: 0 },
        { username: 'Other', ready: true, score: 0},
        { username: 'Other Guy', spectator: true}
    ],
    settings: {
        num_games: 20,
        game_selection: 'random',
        song_selection: 'random',
        guess_time: 20
    }
}

// Video information
const video =
{
    game_name: 'Secret of Mana',
    video_id: 'pS-ojf2-zjU',
    song_name: 'Distant Thunder'
}

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

    // Get an embedded YouTube video
    vid.src = 'https://www.youtube.com/embed/' + video.video_id + '?autoplay=1&controls=0';
}

function showVideo()
{
    // Get the video
    var vid = document.getElementById("video");

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

    // Get an embedded YouTube video
    document.getElementById("video").src = '';
}

// Show the game name input
function showInput(disabled = false)
{
    // Set disabled
    document.getElementById("inputbox").disabled = disabled;

    // Unhide
    document.getElementById("inputsection").hidden = false;
}

function hideInput()
{
    // Reset values
    document.getElementById("inputbox").value = '';
    document.getElementById("inputconfirm").innerHTML = '';

    // Hide
    document.getElementById("inputsection").hidden = true;
}

function submitInput()
{
    if (document.getElementById("inputbox").value.length != 0)
    {
        console.log('submitted ' + document.getElementById("inputbox").value);
        document.getElementById("inputconfirm").innerHTML = ' ✅';

        // TODO: Send submission to the server
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
        return b.score - a.score;
    }

    // For all non-spectator players, sorted by score
    for (player of lobby.players.filter(player => !player.spectator).sort(sortFunc))
    {
        var li = document.createElement("li");

        if (player.answered)
            li.innerText += '🙂 ';
        else
            li.innerText += '🤔 ';

        li.innerText += player.username;

        li.innerText += '(' + player.score + ' points)';

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
        return b.score - a.score;
    }

    // For all non-spectator players, sorted by score
    for (player of lobby.players.filter(player => !player.spectator).sort(sortFunc))
    {
        var li = document.createElement("li");

        if (player.correct)
            li.innerText += '😄 ';
        else
            li.innerText += '😢 ';

        li.innerText += player.username;

        li.innerText += '(' + player.score + ' points)';

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

            // TODO: Connect to the host over Socket.IO

            // TODO: Ask the host for all the lobby info so we can get caught up
        }
    );
    this.addHandler('lobby_info', function(event)
        {
            // The host has acknowledged us,
            // so we should go to whatever state the game is currently in
            this.parent.goto(lobby.gamestate);
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
    this.addHandler('new_video', function(event)
        {
            // Got the first video, go to guessing
            this.parent.goto('guessing');
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
            document.getElementById("gamestate").innerHTML = 'Round ' + lobby.round + '/' + lobby.settings.num_games;

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
    this.addHandler('round_over', function(event)
        {
            // Round over, go to viewing
            this.parent.goto('viewing');
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
            document.getElementById("gamestate").innerHTML = 'Round ' + lobby.round + '/' + lobby.settings.num_games;

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
        }
    );
    this.addHandler('lobby_info', function(event)
        {
            // Lobby info updated, show new values
            showWinLosePlayers();
            showSpectators();
        }
    );
    this.addHandler('new_video', function(event)
        {
            // Got the next video, go to guessing
            this.parent.goto('guessing');
        }
    );
    this.addHandler('game_over', function(event)
    {
        // Game over, go back to queueing
        this.parent.goto('queueing');
    }
);
}
main.addState(new ViewingState());

//================================
// INTERFACE
//================================

// Start the state machine
function startClientStateMachine(username)
{
    // Set the session information
    local_username = username;

    // Start the state machine in the entering state
    main.goto('entering');
}

// Gracefully stop the state machine
function stopClientStateMachine()
{
    // TODO
}
