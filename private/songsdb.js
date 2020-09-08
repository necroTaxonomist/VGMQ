// MongoDB database
var mongoose = require('mongoose');

// YouTube database
var yt = require('./yt');

// Song Schema
var songSchema = new mongoose.Schema(
    {
        name: String,
        video_id: { type: String, index: true, unique: true, required: true },
        title: { type: String, required: true },
        views: { type: Number, required: true },
        likes: { type: Number, required: true },
        restricted: { type: Boolean, required: true },
        short: { type: Boolean, required: true },
        blocked: { type: Boolean, default: false}
    },
    { collection: 'songs' }
);
songSchema.virtual('allowed').get(function()
    {
        return !this.restricted && !this.short && !this.blocked;
    }
);

// Song Model
var songModel = mongoose.model('song', songSchema);

// Convert a YouTube video item to a song
function itemToSong(item)
{
    var restricted = false;
    if (item.contentDetails.regionRestriction != undefined)
    {
        if (item.contentDetails.licensedContent)
        {
            // Licensed content can't be played embedded
            restricted = true;
        }
        if (item.contentDetails.regionRestriction.blocked &&
            item.contentDetails.regionRestriction.blocked.includes('US'))
        {
            // Blocked in the US
            restricted = true;
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

    var duration = parseDuration(item.contentDetails.duration);
    var short = (duration.minutes == 0) &&
                (duration.hours == 0) &&
                duration.seconds < 30;
    
    var song =
    {
        video_id: item.id,
        title: item.snippet.title,
        views: item.statistics.viewCount,
        likes: item.statistics.likeCount,
        restricted: restricted,
        short: short
    };

    return song;
}

// Adds a video from a video ID
// Returns a Promise
async function createFromVideoId(id)
{
    // Get videos from youtube
    var items = await yt.queryVideos([id], 'snippet,contentDetails,statistics,status');
    if (items.length == 0)
    {
        throw 'No YT video returned matching id=' + id;
    }

    // Get the video item
    var item = items[0];

    // Convert to database format
    var song = itemToSong(item);

    // Write to the database
    return songModel.create(song).exec();
}

// Adds several videos from a playlist ID
// Returns a Promise
async function createFromPlaylistId(playlistId)
{
    // Verify that this is a playlist
    await yt.queryPlaylist(playlistId);

    // Get the playlist items
    var playlistItems = await yt.queryPlaylistItems(playlistId);
    if (playlistItems.length == 0)
    {
        throw 'No YT playlist items returned matching playlistId=' + playlistId;
    }

    // Get the video IDs
    var ids = [];
    for (item in playlistItems)
    {
        ids.push(item.snippet.resourceId.videoId);
    }

    // Get videos from youtube
    var items = await yt.queryVideos(ids, 'snippet,contentDetails,statistics,status');

    // Create a list of songs
    var songs = [];

    // For each returned item
    for (item in items)
    {
        // Convert to database format
        songs.push(itemToSong(item));
    }

    // Write to the database
    return songModel.create(songs).exec();
}

// Find multiple songs
// Returns a Query
function find(ids)
{
    return gameModel.find({  _id: { $in: ids }  });
}

// Get a song
// Returns a Query
function findOne(id)
{
    return gameModel.findOne({ _id: id });
}

module.exports =
{
    createFromVideoId,
    createFromPlaylistId,
    find,
    findOne
};