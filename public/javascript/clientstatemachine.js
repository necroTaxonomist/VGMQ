
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

// YouTube player
var ytPlayer;

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

    // Set the values based on lobby.settings
    document.getElementById("num_games").value = lobby.settings.num_games;
    document.getElementById("gamesel_" + lobby.settings.game_selection).checked = true;
    document.getElementById("songsel_" + lobby.settings.song_selection).checked = true;
    document.getElementById("guess_time").value = lobby.settings.guess_time;

    // Set difficulty settings
    var restrict_difficulty = document.getElementById("restrict_difficulty");
    var difficulty_span = document.getElementById("difficulty_span");
    var allow_easy = document.getElementById("allow_easy");
    var allow_medium = document.getElementById("allow_medium");
    var allow_hard = document.getElementById("allow_hard");

    if (lobby.settings.restrict_difficulty == "on")
    {
        restrict_difficulty.checked = true;
        difficulty_span.style = "opacity:1.0;";
        allow_easy.checked = lobby.settings.allow_easy;
        allow_medium.checked = lobby.settings.allow_medium;
        allow_hard.checked = lobby.settings.allow_hard;
    }
    else
    {
        restrict_difficulty.checked = false;

        difficulty_span.style = "opacity:0.6;";

        allow_easy.checked = true;
        allow_easy.disabled = true;

        allow_medium.checked = true;
        allow_medium.disabled = true;

        allow_hard.checked = true;
        allow_hard.disabled = true;
    }

    // Set rating settings
    var restrict_ratings = document.getElementById("restrict_ratings");
    var ratings_span = document.getElementById("ratings_span");
    var min_rating = document.getElementById("min_rating");
    var max_rating = document.getElementById("max_rating");
    var allow_unrated = document.getElementById("allow_unrated");

    if (lobby.settings.restrict_ratings == "on")
    {
        restrict_ratings.checked = true;
        ratings_span.style = "opacity:1.0;";
        min_rating.value = lobby.settings.min_rating;
        max_rating.value = lobby.settings.max_rating;
        allow_unrated.checked = lobby.settings.allow_unrated;
    }
    else
    {
        restrict_ratings.checked = false;

        ratings_span.style = "opacity:0.6;";

        min_rating.value = 1;
        min_rating.disabled = true;

        max_rating.value = 10;
        max_rating.disabled = true;

        allow_unrated.checked = true;
        allow_unrated.disabled = true;
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

function showVolume()
{
    var volume = document.getElementById('volumecontrols');
    volume.hidden = false;
}

function hideVolume()
{
    var volume = document.getElementById('volumecontrols');
    volume.hidden = true;
}

function updateVolume()
{
    var slider = document.getElementById('volume');
    ytPlayer.setVolume(slider.value);
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

    // Set the video ID, it will play automatically
    ytPlayer.loadVideoById(video.video_id);
}

function showVideo()
{
    // Set the video back to start
    ytPlayer.seekTo(0, true);

    // Set the game name
    document.getElementById("videoname").innerHTML = video.game_name;

    // Set the video title
    document.getElementById("songname").innerHTML = video.title;

    // Enable the report button
    document.getElementById("reportbutton").disabled = false;

    // Unhide
    document.getElementById("videosection").hidden = false;
}

function hideVideo()
{
    // Hide
    document.getElementById("videosection").hidden = true;

    // Stop the video
    ytPlayer.stopVideo();
}

function reportSong()
{
    // Send a report for the current video
    socket.emit('report', video);

    // Disable the report button
    document.getElementById("reportbutton").disabled = true;
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
    var anyoneNotReady = lobby.players.some(player => !player.ready && !player.spectator);

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

        if (player.winner)
            li.innerText += '🏆';

        if (player.correct)
            li.innerText += '😄';
        else
            li.innerText += '😢';

        if (player.blame)
        {
            li.innerText += '📚';

            if (player.rating)
                li.innerText += '(' + player.rating + ')';
        }

        li.innerText += ' ' + player.username;
        li.innerText += ' (' + player.points + ' points)';

        if (player.answer.length != 0)
            li.innerText += ' [' + player.answer + ']';
        else
        li.innerText += ' [...]';

        if (player.exp)
        {
            li.innerHTML += '<span style="color:green;"> +' + player.exp + '</span>';
        }

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
            const gamestate_str = 'Choosing song ' + event.current + ' out of ' + event.total + '...';
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

            // Show the volume slider
            showVolume();

            // Show the countdown
            showCountdown();

            // Set the countdown interval
            setInterval(updateCountdown, 1000);

            // Load the video
            startVideo();

            // Show input box, and disable if spectating
            showInput(lobby.players.some(player => player.username == local_username && player.spectator));

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
            // Hide the volume button
            hideVolume();

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
