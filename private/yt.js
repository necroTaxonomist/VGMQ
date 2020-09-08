
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

// Max 50 items per request
const MAX_PER_REQUEST = 50;

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

    // Query for playlist items
    var playlist_items_query = 
    {
        playlistId: id,
        part: 'snippet',
        maxResults: 50
    }

    // Start a list of video ids
    var video_ids = [];

    // Keep querying results
    do
    {
        // Query YouTube for playlist items
        var res = await youtube.playlistItems.list(playlist_items_query);

        // Get the next page from the data
        playlist_items_query.pageToken = res.data.nextPageToken;

        // For each item, get the ID
        for (item of res.data.items)
        {
            video_ids.push(item.snippet.resourceId.videoId);
        }
    }
    while (playlist_items_query.pageToken != undefined);

    // Query for videos
    var videos_query = 
    {
        id: video_ids.slice(0, 50).join(','),
        part: 'snippet,contentDetails,statistics,status'
    };

    // Keep querying results
    while (video_ids.length != 0)
    {
        // Query YouTube for videos
        var res = await youtube.videos.list(videos_query);

        // Remove the returned ids and update the query
        video_ids = video_ids.slice(res.data.items.length);
        videos_query.id = video_ids.slice(0, 50).join(',');

        // For each item, write to the playlist
        for (item of res.data.items)
        {
            let restricted = false;
            if (item.contentDetails.regionRestriction != undefined)
            {
                if (item.contentDetails.licensedContent)
                {
                    // Licensed content can't be played embedded
                    restricted = true;
                }
                if (item.contentDetails.regionRestriction.blocked)
                {
                    if (item.contentDetails.regionRestriction.blocked.includes('US'))
                    {
                        // Blocked in the US
                        restricted = true;
                    }
                }
            }
            if (item.status.uploadStatus !== 'processed')
            {
                // Video was not successfully uploaded
                restricted = true;
            }
            if (item.status.privacyStatus === 'private')
            {
                // Video is private
                restricted = true;
            }
            if (item.status.embeddable === false)
            {
                // Cannot embed this video
                restricted = true;
            }

            let duration = parseDuration(item.contentDetails.duration);
            let short = (duration.minutes == 0) &&
                        (duration.hours == 0) &&
                        duration.seconds < 30;

            playlist.songs.push(
                {
                    title: item.snippet.title,
                    id: item.id,
                    views: item.statistics.viewCount,
                    likes: item.statistics.likeCount,
                    restricted: restricted,
                    short: short
                }
            );
        }
    }

    return playlist;
}

function parseDuration(str)  // Parses an ISO 8601 duration
{
    const re = /(-)?P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/;

    var matches = str.match(re);

    var date = 
    {
        sign: (matches[1] === undefined) ? '+' : '-',
        years: (matches[2] === undefined) ? 0 : parseInt(matches[2]),
        months: (matches[3] === undefined) ? 0 : parseInt(matches[3]),
        weeks: (matches[4] === undefined) ? 0 : parseInt(matches[4]),
        days: (matches[5] === undefined) ? 0 : parseInt(matches[5]),
        hours: (matches[6] === undefined) ? 0 : parseInt(matches[6]),
        minutes: (matches[7] === undefined) ? 0 : parseInt(matches[7]),
        seconds: (matches[8] === undefined) ? 0 : parseInt(matches[8])
    }

    return date;
}

async function queryPlaylist(id, part = 'snippet')
{
    // Query YouTube for a playlist
    var query =
    {
        id: id,
        part: part
    }

    // Make a single query
    var response = await youtube.playlists.list(query);

    // Check the data to make sure it is a playlist
    if (response.data.kind != 'youtube#playlistListResponse')
    {
        throw 'ID is not a playlist.';
    }

    // Return the first item from the response
    return data.items[0];
}

async function queryPlaylistItems(id, part = 'snippet')
{
    var nextPageToken = undefined;

    // Query for playlist items
    var query = 
    {
        playlistId: id,
        part: part,
        maxResults: MAX_PER_REQUEST
    }

    // Start a list of all returned items
    var allItems = [];

    // Keep querying results
    do
    {
        // Query YouTube for playlist items
        var response = await youtube.playlistItems.list(query);

        // Get the next page from the data
        query.pageToken = response.data.nextPageToken;

        // For each item, get the ID
        for (item of res.data.items)
        {
            allitems.push(item);
        }
    }
    while (query.pageToken != undefined);

    // Return all the items
    return allItems;
}

async function queryVideos(ids, part = 'snippet')
{
    // Deep copy an array of video ids
    var videoIds = [];
    for (id of ids)
    {
        videoIds.push(id);
    }

    // Query for videos
    var query = 
    {
        id: videoIds.slice(0, MAX_PER_REQUEST).join(','),
        part: part
    };

    // Start a list of all returned items
    var allItems = [];

    // Keep querying results
    while (videoIds.length != 0)
    {
        // Query YouTube for videos
        var response = await youtube.videos.list(query);

        // Remove the returned ids and update the query
        videoIds = videoIds.slice(MAX_PER_REQUEST);
        videoIds.id = videoIds.slice(0, MAX_PER_REQUEST).join(',');

        // For each item, write to the playlist
        for (item of res.data.items)
        {
            allItems.push(item);
        }
    }

    // Return all the items
    return allItems;
}

module.exports = 
{
    playlistUrlToId,
    getPlaylist,  // Deprecated
    getPlaylistWithSongs,  // Deprecated

    queryPlaylist,
    queryPlaylistItems,
    queryVideos
};

