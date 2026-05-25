const path = require('path');
const fs = require('fs');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const DATA_FILE = path.join(__dirname, 'data.json');
const adapter = new FileSync(DATA_FILE);
const db = low(adapter);

const defaultData = {
    tracks: [],
    playlists: [],
    playlist_tracks: []
};

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
}

db.defaults(defaultData).write();

const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const hasTrackIds = Array.isArray(raw.playlists) && raw.playlists.some(p => Array.isArray(p.trackIds) && p.trackIds.length > 0);
const hasPlaylistTracks = Array.isArray(raw.playlist_tracks) && raw.playlist_tracks.length > 0;

if (hasTrackIds && !hasPlaylistTracks) {
    raw.playlists.forEach(playlist => {
        (playlist.trackIds || []).forEach(trackId => {
            raw.playlist_tracks.push({ playlist_id: playlist.id, track_id: trackId });
        });
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify(raw, null, 2));
    db.set('playlist_tracks', raw.playlist_tracks).write();
}

module.exports = db;