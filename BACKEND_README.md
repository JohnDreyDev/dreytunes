# Backend for Music System

Node/Express backend that serves the frontend, manages music data, and provides a full REST API.

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Run in development:

```bash
npm run dev
```

3. Or production:

```bash
npm start
```

Server listens on `http://localhost:3000` (or `$PORT` environment variable).

## API Endpoints

### Health
- `GET /api/health` — health status and timestamp

### Tracks
- `GET /api/tracks` — list all tracks
- `GET /api/tracks/:id` — get a single track
- `POST /api/tracks` — create a track (body: `{title, artist, genre?, duration?, url?}`)
- `DELETE /api/tracks/:id` — delete a track

### Search
- `GET /api/search?q=query` — search tracks by title, artist, or genre

### Playlists
- `GET /api/playlists` — list all playlists
- `GET /api/playlists/:id` — get playlist with tracks
- `POST /api/playlists` — create a playlist (body: `{name, description?, trackIds?}`)
- `PUT /api/playlists/:id` — update a playlist
- `DELETE /api/playlists/:id` — delete a playlist

## Data Storage

All data is stored in SQLite by default in `music-system.db` at the project root. The database is automatically initialized from `data.json` on first server start if the DB is empty.

## Deployment

### Heroku

```bash
heroku create your-app-name
git push heroku main
```

### Railway

1. Connect your repo: https://railway.app
2. Select this folder and Railway auto-detects `railway.toml`
3. Set `PORT` variable if needed

### Render

1. Go to https://render.com, connect repo
2. Create a "Web Service"
3. Build command: `npm ci`
4. Start command: `npm start`
5. Set `NODE_ENV=production` in environment

## Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
PORT=3000
NODE_ENV=production
```
