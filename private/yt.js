
// Use the Google API to get YouTube data
const {google} = require('googleapis');
var apiKey;
var youtube;

// Get the API key from a text file
const fs = require('fs') 
fs.readFile('key.txt', function (err, data)
    { 
        if (err)
            throw err;
        
        apiKey = data.toString();
        youtube = google.youtube(
            {
                version: 'v3',
                auth: apiKey
            }
        )
    }
);

function playlistUrlToId(url)
{
    const re = /(?:https?:\/\/)?(?:www.)?youtube.com\/playlist(?:\?\S+=\S+)*\?list=(\S+)(?:\?\S+=\S+)*/;
    const found = url.match(re);

    if (found == null || found.length < 2)
    {
        throw 'Invalid playlist URL';
    }
    else
    {
        return found[1];
    }
}

async function getPlaylist(id)
{
    // Query YouTube for a playlist
    var playlist_res = await youtube.playlists.list(
        {
            id: id,
            part: 'snippet'
        }
    );

    // Check the data to make sure it is a playlist
    var playlist_data = playlist_res.data;
    if (playlist_data.kind != 'youtube#playlistListResponse')
    {
        throw 'ID is not a playlist.';
    }

    // Get the playlist snippet
    var playlist_snippet = playlist_res.data.items[0].snippet;

    // Create the output struct
    var playlist = 
    {
        title: playlist_snippet.title,
        id: id,
        songs: []
    };

    return playlist;
};

async function getPlaylistWithSongs(id)
{
    var playlist = await getPlaylist(id);

    var nextPageToken = undefined;

    // Set up the base query
    var query = 
    {
        playlistId: id,
        part: 'snippet',
        maxResults: 50
    }

    // Keep querying results
    do
    {
        // Query YouTube for playlist items
        var songs_res = await youtube.playlistItems.list(query);

        // Get the next page from the data
        query.pageToken = songs_res.data.nextPageToken;

        // For each item, add the corresponding song
        for (item of songs_res.data.items)
        {
            playlist.songs.push(
                {
                    title: item.snippet.title,
                    id: item.snippet.resourceId.videoId
                }
            );
        }
    }
    while (query.pageToken != undefined);

    return playlist;
}

module.exports = 
{
    playlistUrlToId,
    getPlaylist,
    getPlaylistWithSongs
};

