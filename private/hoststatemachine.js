
var statemachine = require('../public/javascript/statemachine');

// Databases
var usersdb = require('../private/usersdb');
var gamesdb = require('../private/gamesdb');
var songsdb = require('../private/songsdb');

// Queueing before the game starts
function QueueingState()
{
    statemachine.State.call(this,
        'queueing',
        function()  // onEntry
        {
            console.log("QueueingState::onEntry");

            // Set the round number to 0
            this.parent.round = 0;

            // Update clients
            this.parent.sendLobbyInfo();
        },
        function()  // onExit
        {
            console.log("QueueingState::onExit");

            // Reset everyone's ready and points
            for (player of this.parent.players)
            {
                player.ready = false;
                player.points = 0;
                player.winner = false;
            }

            // Update clients
            this.parent.sendLobbyInfo();
        }
    );
    this.addHandler('ready', function(event)  // A player toggled ready
        {
            console.log("QueueingState::ready");

            // Find the player that readied
            const found = this.parent.players.find(player => player.username == event.username);

            // Toggle the player's ready
            if (found)
                found.ready = !found.ready;

            // Update clients
            this.parent.sendLobbyInfo();
        }
    );
    this.loading = false;
    this.addHandler('start', async function(event)
        {
            console.log("QueueingState::start");

            if (this.loading)
            {
                console.log("You only load once.");
                return;
            }
            else
            {
                this.loading = true;
            }

            // Don't start unless everyone is ready
            if (!this.parent.players.some(player => !player.ready && !player.spectator))
            {
                
                try
                {
                    // Decide all the videos to use
                    await this.parent.generateVideos();

                    // Go to the first video
                    await this.parent.goto('guessing');
                }
                catch (err)
                {
                    console.log('Failed to start game: ' + err);

                    // Re-enter the state
                    await this.parent.goto('queueing');
                }
            }

            this.loading = false;
        }
    );
}

// Guessing the song
function GuessingState()
{
    statemachine.State.call(this,
        'guessing',
        function()  // onEntry
        {
            console.log("GuessingState::onEntry");

            // Send the video to all clients
            this.parent.sendNewVideo();

            // Reset answers for all players
            for (player of this.parent.players)
            {
                player.answer = '';
                player.answered = false;
            }

            // Update clients
            this.parent.sendLobbyInfo();

            // Set the round start time
            this.roundstart = Date.now();

            // After time runs out, send a timeout event
            var time_left = this.parent.settings.guess_time * 1000;
            setTimeout(async () =>
                {
                    await this.parent.handle('timeout');
                }, time_left);
        },
        async function()  // onExit
        {
            console.log("GuessingState::onExit");

            // Get the current video
            var cur_vid = this.parent.videos[this.parent.round - 1];

            // Get the current game
            const cur_game = await gamesdb.get(cur_vid.game_name);
            console.log(cur_game);

            // Operations on players
            var numCorrect = 0;
            var numIncorrect = 0;
            for (player of this.parent.players)
            {
                // Check if the player is correct or incorrect
                player.correct = player.answered && player.answer.toLowerCase() == cur_vid.game_name.toLowerCase();
                if (player.correct)
                {
                    player.points += 1;
                    numCorrect += 1;
                    
                    // Calculate EXP

                    // Get the time since the round start of this answer
                    var timeTaken = player.answerTime - this.roundstart;

                    // Calculate the experience multiplier
                    var multiplier = Math.min(Math.sqrt(20000 / timeTaken), 4);

                    // Calculate the EXP gain
                    var expGain = Math.floor(multiplier * 50);

                    // Set the visible EXP gain
                    player.exp = expGain;
                }
                else
                {
                    numIncorrect += 1;
                    player.exp = 0;
                }

                // Check if this player should be blamed
                player.blame = await usersdb.hasGame(player.username, cur_vid.game_name);

                // Update the player rating (shown if blamed)
                const rating = cur_game.ratings[player.username];
                if (rating)
                    player.rating = rating;
                else
                    player.rating = undefined;
            }

            // Update the game's guess statistics, but only in multiplayer games
            if (this.parent.players.length > 1)
            {
                try
                {
                    await gamesdb.addGuesses(cur_vid.game_name, numCorrect, numIncorrect);
                }
                catch (err)
                {
                    console.log('Failed to update guess statistics: ' + err);
                }
            }

            // Sort players by points
            this.parent.players.sort(function(a, b)
                {
                    return a.points - b.points;
                }
            );

            // If the game is finished
            if (this.parent.round == this.parent.videos.length)
            {
                // Assign player ranks and experience points
                var prevPoints = 0;
                var rank = 1;
                for (player of this.parent.players)
                {
                    // This allows ties
                    if (player.points < prevPoints)
                        rank += 1;
                    
                    // Set the visible rank and win status
                    player.rank = rank;
                    player.winner = (rank == 1);

                    // Calculate EXP
                    var betterThan = this.parent.players.length - player.rank;
                    var multiplier = (betterThan/4 + .5);
                    var expGain = multiplier * (player.points * 100);

                    // Set the visible EXP gain
                    player.exp += expGain;

                    // Add a win if this is a multiplayer game
                    if (player.winner && this.parent.players.length > 1)
                    {
                        await usersdb.addWins(player.username, 1);
                    }
                }
            }

            // Add experience points
            for (player of this.parent.players)
            {
                if (player.exp != 0)
                {
                    await usersdb.addExp(player.username, player.exp);
                }
            }

            // Update clients
            this.parent.sendLobbyInfo();

            // Notify clients that the round is over
            this.parent.sendRoundOver();
        }
    );
    this.addHandler('answer', function(event)  // Player answered
        {
            console.log("GuessingState::answer");

            // Find the player that answered
            const found = this.parent.players.find(player => player.username == event.username);

            // Set the player answer
            if (found)
            {
                found.answer = event.answer;
                found.answered = true;
                found.answerTime = Date.now();
            }

            // Update clients
            this.parent.sendLobbyInfo();
        }
    );
    this.addHandler('timeout', async function(event)  // Time ran out
        {
            console.log("GuessingState::timeout");

            // Go to viewing
            await this.parent.goto('viewing');
        }
    );
}

// Viewing the song
function ViewingState()
{
    statemachine.State.call(this,
        'viewing',
        function()  // onEntry
        {
            console.log("ViewingState::onEntry");

            // After time runs out, send a timeout event
            var time_left = this.parent.settings.guess_time * 1000;
            setTimeout(async () =>
                {
                    await this.parent.handle('timeout');
                }, time_left);
        },
        function()  // onExit
        {
            console.log("ViewingState::onExit");
        }
    );
    this.addHandler('timeout', async function(event)  // Time ran out
        {
            console.log("ViewingState::timeout");

            if (this.parent.round == this.parent.videos.length)  // Game finished
            {
                // Notify players that the game is over
                this.parent.sendGameOver();

                // Go back to queueing
                await this.parent.goto('queueing');
            }
            else
            {
                // Go to the next video
                await this.parent.goto('guessing');
            }
        }
    );
}

// All players left, so it's inactive now
function InactiveState()
{
    statemachine.State.call(this,
        'inactive',
        function()  // onEntry
        {
            console.log("InactiveState::onEntry");
        },
        function()  // onExit
        {
            console.log("InactiveState::onExit");
        }
    );
}

function HostStateMachine(name, password = '')
{
    // Inherit state machine
    statemachine.StateMachine.call(this);

    // Lobby information
    this.name = name;
    this.password = password;
    this.players = [];
    this.settings =
    {
        num_games: 20,
        game_selection: 'random',
        song_selection: 'random',
        guess_time: 20,
        restrict_difficulty: 'off',
        allow_easy: 'on',
        allow_medium: 'on',
        allow_hard: 'on',
        restrict_ratings: 'off',
        min_rating: 1,
        max_rating: 10,
        allow_unrated: 'on'
    };

    // Game information
    this.round = 0;
    this.videos = [];
    this.roundstart = Date.now();

    // Local RNG
    this.random = require('seedrandom')(new Date().toString());

    // Add states
    this.addState(new QueueingState());
    this.addState(new GuessingState());
    this.addState(new ViewingState());
    this.addState(new InactiveState());

    // Get the socket.io namespace for this lobby
    this.nsp = require('../app').io.of('/' + encodeURIComponent(this.name));

    // Callback for a socket connection
    this.onConnection = function (socket, next)
    {
        // Set username
        socket.on('setusername', username =>
            {
                // Find the player, but only if they're not currently connected
                var found = this.players.find(player =>
                    {
                        return player.username == username && !player.connected;
                    }
                );

                if (found)
                {
                    console.log('Accepted a connection from username=' + username);

                    // Set the socket username
                    socket.username = username;

                    // Set player connected
                    found.connected = true;

                    // Update clients
                    this.sendLobbyInfo();
                }
                else
                {
                    console.log('Refused a connection from username=' + username);

                    // Disconnect the socket
                    socket.disconnect();
                }
            }
        )

        // Toggle ready
        socket.on('ready', async () =>
            {
                await this.handle('ready', { username: socket.username });
            }
        );

        // Game start
        socket.on('start', async () =>
            {
                await this.handle('start');
            }
        );

        // Answer
        socket.on('answer', async (answer) =>
            {
                console.log('Received answer "' + answer + '" from username=' + socket.username);
                await this.handle('answer', { username: socket.username, answer: answer });
            }
        );

        // Report song
        socket.on('report', async (video) =>
            {
                console.log('Received report for game_name=' + video.game_name + ', video_id=' + video.video_id);
                await songsdb.setBlocked(video._id, true);
            }
        );

        // Disconnected
        socket.on('disconnect', async () =>
            {
                // Find the player
                let wasHost = false;
                for (i in this.players)
                {
                    if (this.players[i].username == socket.username)
                    {
                        console.log('Lost connection with username=' + socket.username);

                        // Check if the player was host
                        wasHost = this.players[i].host;

                        // Remove
                        this.players.splice(i, 1);
                    }
                }

                if (this.players.length == 0)  // No more players left
                {
                    console.log('Closing lobby name=' + this.name);

                    // Close the lobby
                    await this.goto('inactive');
                }
                else
                {
                    // The host left, so we need a new host
                    if (wasHost)
                    {
                        // Assign the first player in the lobby as host
                        this.players[0].host = true;
                    }

                    // Update the clients
                    this.sendLobbyInfo();
                }
            }
        );
    };

    // Sends updated lobby info to one or more clients
    this.sendLobbyInfo = function(socket = undefined)
    {
        var lobby_info =
        {
            gamestate: this.cur_state.name,
            name: this.name,
            players: this.players,
            settings: this.settings,
            num_rounds: this.videos.length
        }

        if (socket)
        {
            socket.emit('lobby_info', lobby_info);
        }
        else
        {
            this.nsp.emit('lobby_info', lobby_info);
        }
    };

    // Generate the list of videos to use for this game
    this.generateVideos = async function()
    {
        function correctDifficulty(game, settings)
        {
            if (!(settings.restrict_difficulty == 'on'))
                return true;
            if (game.easy && !(settings.allow_easy === 'on'))
                return false;
            if (game.medium && !(settings.allow_medium === 'on'))
                return false;
            if (game.hard && !(settings.allow_hard === 'on'))
                return false;
            return true;
        }
        
        function correctRating(game, settings, username = undefined)
        {
            if (!(settings.restrict_ratings == 'on'))
                return true;

            // Get the rating
            var rating;
            if (username == undefined)  // Average rating
                rating = game.average_rating;
            else
                rating = game.ratings[username];

            if (!rating)  // Not rated
            {
                return settings.allow_unrated == 'on';
            }

            // True if in range
            return (rating >= settings.min_rating) &&
                   (rating <= settings.max_rating);
        }

        var games = [];

        if (this.settings.game_selection == 'only_played')  // Only played
        {
            // Sample 100 games from each player
            let sample_from_each = 100;
            var sampled_games = new Map();  // Use a map to prevent duplicates

            // For each player (not including spectators)
            for (player of this.players.filter(player => !player.spectator))
            {
                // Get all games for the user
                var user_games = await usersdb.getGamesFromUser(player.username);

                // Filter out songs of the wrong difficulty
                user_games = user_games.filter(game => correctDifficulty(game, this.settings));

                // Filter out songs of the wrong user rating
                user_games = user_games.filter(game => correctRating(game, this.settings, player.username));

                for (num = 0; num < sample_from_each && user_games.length != 0; num += 1)
                {
                    // Pull a random game
                    var i = Math.floor(this.random() * user_games.length);
                    var game = user_games[i];
                    user_games.splice(i, 1);

                    // Add to the sample, without duplicates
                    sampled_games.set(game.playlist_id, game);
                }
            }

            // Convert to an array
            var sampled_games_arr = [];
            for (game of sampled_games.values())
            {
                sampled_games_arr.push(game);
            }

            // Pull from the random sample
            while (games.length < this.settings.num_games && sampled_games_arr.length != 0)
            {
                // Pull a random game
                var i = Math.floor(this.random() * sampled_games_arr.length);
                games.push(sampled_games_arr[i]);
                sampled_games_arr.splice(i, 1);
            }
        }
        else  // Random games
        {
            var all_games = await gamesdb.all();

            // Filter out songs of the wrong difficulty
            all_games = all_games.filter(game => correctDifficulty(game, this.settings));

            // Filter out songs of the wrong average rating
            all_games = all_games.filter(game => correctRating(game, this.settings));

            while (games.length < this.settings.num_games && all_games.length != 0)
            {
                // Pull a random game
                var i = Math.floor(this.random() * all_games.length);
                games.push(all_games[i]);
                all_games.splice(i, 1);
            }
        }

        // Clear the existing videos list
        this.videos = [];

        // No games found
        if (games.length == 0)
        {
            throw 'No games were sampled';
        }

        // For each of the sampled games
        var round = 1;
        for (game of games)
        {
            // Send
            this.nsp.emit('loading', { current: round, total: games.length });

            // The database used to not store song data,
            // so some entries need to be updated
            if (game.songs == undefined)
            {
                game = await gamesdb.updateSongs(game.game_name);
            }

            // Get all the songs for the game
            let songs = await songsdb.find(game.songs);

            // Filter out songs that aren't allowed
            songs = songs.filter(song => song.allowed);

            if (songs.length == 0)
            {
                console.log('Uh-oh');
                game.playlist_id = 'PL8hPwziDQWdhC4err29RxSL2ksdxMxda3';
                let playlist = await require('./yt').getPlaylistWithSongs(game.playlist_id);
                songs = playlist.songs;
            }

            // Choose the song select criterion
            let prop = undefined;
            if (this.settings.song_selection == 'weight_by_views')
                prop = 'views';
            else if (this.settings.song_selection == 'weight_by_likes')
                prop = 'likes';

            // Get the song
            let chosen_song = undefined;
            if (prop != undefined)  // Weighted
            {
                // Weight using a Zipf distribution
                setZipfWeights(songs, prop);

                // Get the sum of all weights
                let sum = 0;
                for (song of songs)
                {
                    sum += song.weight;
                }

                // Generate a random position
                var target_pos = this.random() * sum;

                // Find the song it corresponds to
                var current_pos = 0;
                for (song of songs)
                {
                    current_pos += song.weight;
                    if (current_pos >= target_pos)
                    {
                        chosen_song = song;
                        break;
                    }
                }
            }
            else  // Random
            {
                // Pull a random song
                var i = Math.floor(this.random() * songs.length);
                chosen_song = songs[i];
            }

            // Write the video data
            let video =
            {
                round: round,
                game_name: game.game_name,
                id: chosen_song._id,
                video_id: chosen_song.video_id,
                title: chosen_song.title
            };

            // Add to list
            this.videos.push(video);

            // Increment round
            round += 1;
        }

        // Log videos to the console
        console.log(this.videos);
    };

    // Increments the round number and sends the video to all players
    this.sendNewVideo = function()
    {
        // Increment the round
        this.round += 1;

        // Get the video for this round
        const new_video = this.videos[this.round - 1];

        // Send
        this.nsp.emit('new_video', new_video);
    };

    // Notifies players that the round ended
    this.sendRoundOver = function()
    {
        // Send
        this.nsp.emit('round_over', {});
    };

    // Notifies players that the game ended
    this.sendGameOver = function()
    {
        // Send
        this.nsp.emit('game_over', {});
    };
}

function setZipfWeights(songs, prop)
{
    function sortFunc(a, b)
    {
        return b[prop] - a[prop];
    }

    // Sort by chosen property
    songs.sort(sortFunc);

    // Set the weights
    var rank = 1;
    for (song of songs)
    {
        song.weight = songs.length / rank;
        rank += 1;
    }
}

module.exports =
{
    HostStateMachine
};
