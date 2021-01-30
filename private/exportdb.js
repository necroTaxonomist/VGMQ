
// Libraries
const path = require('path');
const util = require('util');
const os = require('os');
const child_process = require("child_process");
const exec = util.promisify(child_process.exec);

// Export a collection and return the local filename
async function export_any(coll)
{
    const cmd = 'mongoexport';
    const args = '--host="localhost" --db=vgmq';
    const output_dir = 'export/';

    var fn = path.join(output_dir, coll + '.json');

    var full_cmd = cmd + ' ' + args + ' ' + '--collection=' + coll + ' ' + '--out=' + fn;
    console.log(full_cmd);

    const { stdout, stderr } = await exec(full_cmd);
    console.log('stdout:\n' + stdout);
    console.log('stderr:\n' + stderr);

    return fn;
}

// Export the users database and return the local filename
async function export_users()
{
    return await export_any('users');
}

// Export the games database and return the local filename
async function export_games()
{
    return await export_any('games');
}

// Export the songs database and return the local filename
async function export_songs()
{
    return await export_any('songs');
}

module.exports =
{
    export_users,
    export_games,
    export_songs
};
