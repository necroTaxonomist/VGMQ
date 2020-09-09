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
        views: Number,
        likes: Number,
        duration: mongoose.Mixed,
        restricted: Boolean,
        short: Boolean,
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

    var duration = yt.parseDuration(item.contentDetails.duration);
    var short = (duration.minutes == 0) &&
                (duration.hours == 0) &&
                duration.seconds < 30;
    
    var song =
    {
        video_id: item.id,
        title: item.snippet.title,
        views: item.statistics.viewCount,
        likes: item.statistics.likeCount,
        duration: duration,
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
    var all_ids = [];
    for (item of playlistItems)
    {
        ids.push(item.snippet.resourceId.videoId);
        all_ids.push(item.snippet.resourceId.videoId);
    }

    // Get videos from youtube
    var items = await yt.queryVideos(ids, 'snippet,contentDetails,statistics,status');

    // Create a list of songs
    var songs = [];

    // For each returned item
    for (item of items)
    {
        // Convert to database format
        songs.push(itemToSong(item));
    }

    // Some of the songs may be in the database,
    // so do a search query for them first
    var present_songs = await songModel.find({  video_id: { $in: ids }  }).select('video_id');

    // For each song in our list
    for (i = 0; i < songs.length; i += 1)
    {
        // Get the song
        var song = songs[i];

        if (songs.findIndex(s => s.video_id == song.video_id) < i)  // Check for duplicate
        {
            // Remove from songs
            songs.splice(i, 1);
            i -= 1;
        }
        else if(present_songs.some(s => s.video_id == song.video_id))  // Check if already present
        {
            // Update
            await songModel.updateOne({video_id : song.video_id}, song);

            // Remove from songs
            songs.splice(i, 1);
            i -= 1;
        }
    }

    // Write remaining songs to the database
    if (songs.length != 0)
    {
        await songModel.create(songs);
    }

    // Query the database again for all the songs
    return await songModel.find({ video_id: { $in: all_ids } }).select('_id');
}

// Find multiple songs
// Returns a Query
function find(ids)
{
    return songModel.find({  _id: { $in: ids }  });
}

// Get a song
// Returns a Query
function findOne(id)
{
    return songModel.findOne({ _id: id });
}

// Blocks/unblocks a song
// Returns a Query
function setBlocked(id, blocked = true)
{
    return songModel.findByIdAndUpdate(id, { blocked: blocked });
}

// Blocks a video with the given video ID
// Needed to convert from the legacy method of blocking songs
// Returns a Query
function blockVideoIds(video_ids)
{
    var filter = { video_id : video_ids };
    var update = { blocked: true };
    return songModel.updateMany(filter, update);
}

module.exports =
{
    createFromVideoId,
    createFromPlaylistId,
    find,
    findOne,
    setBlocked,
    blockVideoIds
};