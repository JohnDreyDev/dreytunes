const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname)));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Get all tracks
app.get('/api/tracks', (req, res) => {
    const tracks = db.get('tracks').value();
    res.json(tracks);
});

// Get a single track by ID
app.get('/api/tracks/:id', (req, res) => {
    const track = db.get('tracks').find({ id: parseInt(req.params.id, 10) }).value();
    if (!track) return res.status(404).json({ error: 'Track not found' });
    res.json(track);
});

// Add a new track
app.post('/api/tracks', (req, res) => {
    const { title, artist, genre, duration, url } = req.body;
    if (!title || !artist) {
        return res.status(400).json({ error: 'Title and artist required' });
    }
    const tracks = db.get('tracks').value();
    const newTrack = {
        id: Math.max(0, ...tracks.map(t => t.id)) + 1,
        title,
        artist,
        genre: genre || 'Unknown',
        duration: duration || 0,
        url: url || ''
    };
    db.get('tracks').push(newTrack).write();
    res.status(201).json(newTrack);
});

// Delete a track
app.delete('/api/tracks/:id', (req, res) => {
    const trackId = parseInt(req.params.id, 10);
    const track = db.get('tracks').find({ id: trackId }).value();
    if (!track) return res.status(404).json({ error: 'Track not found' });
    db.get('playlist_tracks').remove({ track_id: trackId }).write();
    db.get('tracks').remove({ id: trackId }).write();
    res.json(track);
});

// Search tracks
app.get('/api/search', (req, res) => {
    const q = (req.query.q || '').toLowerCase().trim();
    if (!q) return res.json([]);
    const results = db.get('tracks')
        .filter(track =>
            track.title.toLowerCase().includes(q) ||
            track.artist.toLowerCase().includes(q) ||
            (track.genre || '').toLowerCase().includes(q)
        )
        .value();
    res.json(results);
});

// Get all playlists
app.get('/api/playlists', (req, res) => {
    const playlists = db.get('playlists').value();
    res.json(playlists);
});

// Get a single playlist with its tracks
app.get('/api/playlists/:id', (req, res) => {
    const playlistId = parseInt(req.params.id, 10);
    const playlist = db.get('playlists').find({ id: playlistId }).value();
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    const tracks = db.get('playlist_tracks')
        .filter({ playlist_id: playlistId })
        .map(link => db.get('tracks').find({ id: link.track_id }).value())
        .filter(Boolean)
        .value();
    res.json({...playlist, tracks });
});

// Create a new playlist
app.post('/api/playlists', (req, res) => {
    const { name, description, trackIds } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const playlists = db.get('playlists').value();
    const newPlaylist = {
        id: Math.max(0, ...playlists.map(p => p.id)) + 1,
        name,
        description: description || '',
        createdAt: new Date().toISOString()
    };
    db.get('playlists').push(newPlaylist).write();
    const ids = Array.isArray(trackIds) ? trackIds.map(Number).filter(Boolean) : [];
    ids.forEach(trackId => {
        db.get('playlist_tracks')
            .push({ playlist_id: newPlaylist.id, track_id: trackId })
            .write();
    });
    const tracks = db.get('playlist_tracks')
        .filter({ playlist_id: newPlaylist.id })
        .map(link => db.get('tracks').find({ id: link.track_id }).value())
        .filter(Boolean)
        .value();
    res.status(201).json({...newPlaylist, tracks });
});

// Update a playlist
app.put('/api/playlists/:id', (req, res) => {
    const playlistId = parseInt(req.params.id, 10);
    const { name, description, trackIds } = req.body;
    const playlist = db.get('playlists').find({ id: playlistId }).value();
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    db.get('playlists')
        .find({ id: playlistId })
        .assign({
            name: name || playlist.name,
            description: description !== undefined ? description : playlist.description
        })
        .write();

    if (Array.isArray(trackIds)) {
        db.get('playlist_tracks').remove({ playlist_id: playlistId }).write();
        trackIds.map(Number).filter(Boolean).forEach(trackId => {
            db.get('playlist_tracks')
                .push({ playlist_id: playlistId, track_id: trackId })
                .write();
        });
    }

    const updated = db.get('playlists').find({ id: playlistId }).value();
    const tracks = db.get('playlist_tracks')
        .filter({ playlist_id: playlistId })
        .map(link => db.get('tracks').find({ id: link.track_id }).value())
        .filter(Boolean)
        .value();
    res.json({...updated, tracks });
});

// Delete a playlist
app.delete('/api/playlists/:id', (req, res) => {
    const playlistId = parseInt(req.params.id, 10);
    const playlist = db.get('playlists').find({ id: playlistId }).value();
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    db.get('playlist_tracks').remove({ playlist_id: playlistId }).write();
    db.get('playlists').remove({ id: playlistId }).write();
    res.json(playlist);
});

// Fallback: serve index.html for SPA routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Music System backend listening on http://localhost:${PORT}`);
});