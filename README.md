# SpotiFeel

SpotiFeel is a full-stack music platform that turns Spotify listening data into personalized recommendations, playlists, listening reports, and a reactive now-playing experience.

I built it with Python, Flask, and vanilla JavaScript, using Spotify as the main data source along with Last.fm, YouTube, and lyrics.ovh.

**Live App:** https://spoti-feel.vercel.app/

## Features

- Live now-playing view with album artwork, lyrics, playback controls, and dynamic themes
- Personalized song recommendations based on listening history, artists, genres, and track characteristics
- Custom Spotify playlist generation with controls for discovery, familiarity, energy, artist variety, explicit content, and decade
- **Wrapped Anytime** reports for the last 4 weeks, 6 months, and long-term listening data
- Top artists, tracks, genres, replay loops, mood analysis, listening personality, and discovery score
- **Day in Color**, a visual timeline of recently played music
- Shareable Wrapped-style reports
- Spotify playback control directly through SpotiFeel

## Tech Stack

### Frontend
- JavaScript
- HTML/CSS
- Canvas API

### Backend
- Python
- Flask
- Redis
- REST APIs

### APIs
- Spotify Web API
- Last.fm API
- YouTube Data API
- lyrics.ovh

### Deployment
- Vercel
- Upstash Redis

## How It Works

SpotiFeel uses a Flask backend to handle authentication, Spotify requests, recommendations, playlist creation, playback, and listening reports.

The frontend is split into JavaScript modules for API requests, playback, recommendations, playlists, Wrapped reports, shared state, and theming.

```text
Frontend
   |
   v
Flask API
   |
   +-- Authentication
   +-- Playback
   +-- Recommendations
   +-- Playlists
   +-- Wrapped
   |
   v
Spotify / Last.fm / YouTube / lyrics.ovh
```

The backend is organized into route, service, recommendation, and reporting modules so API integrations and ranking logic stay separate from request handling.

## Recommendations

Recommendations use the current track along with the user's recent tracks, top tracks, top artists, genres, and available audio data.

Candidates are ranked using a combination of:

- Track similarity
- Familiarity vs. discovery preference
- Artist variety
- Popularity
- Genre signals
- Explicit-content preference
- Decade filters

The system also groups recommendations into different types, including close matches, familiar tracks, discoveries, and tracks from related artists.

If one data source is unavailable, SpotiFeel falls back to other Spotify and Last.fm signals instead of failing the entire recommendation request.

## Authentication and Security

SpotiFeel uses Spotify OAuth 2.0 for authentication.

Spotify access and refresh tokens stay on the server instead of being exposed to frontend JavaScript. Production sessions are stored in Redis, while the browser only receives a session cookie.

The app also includes:

- OAuth state validation
- CSRF protection for state-changing requests
- `HttpOnly` and `SameSite` session cookies
- Secure cookies in production
- Server-side token refresh
- Environment-based secret management
- Safe API error responses

## Caching and Reliability

Frequently requested Spotify and third-party data is cached to reduce unnecessary API calls.

Optional integrations are handled independently. For example, a failed lyrics or YouTube request will not prevent Spotify playback data from loading.

The frontend also prevents overlapping polling requests while the currently playing track changes.

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/ughurkarim/SpotiFeel.git
cd SpotiFeel
```

### 2. Create a virtual environment

```bash
python -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r backend/requirements.txt
```

### 4. Configure environment variables

Copy the example environment file:

```bash
cp .env.example backend/.env
```

Add your Spotify credentials:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:5001/callback
```

Optional integrations:

```env
LASTFM_API_KEY=your_key
YOUTUBE_API_KEY=your_key
```

### 5. Run the app

```bash
python backend/app.py
```

Then open:

```text
http://127.0.0.1:5001
```

## Production Environment

Production requires:

```env
SPOTIFEEL_ENV=production
FLASK_SECRET=your_random_secret
REDIS_URL=your_redis_url

SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=https://your-domain.com/callback
```

`FLASK_SECRET` should be a randomly generated value of at least 32 characters.

SpotiFeel uses Redis-backed sessions in production and SQLite sessions for local development and testing.

## Testing

Run the test suite with:

```bash
python -m pytest backend/tests -q
```

Tests cover:

- Recommendation ranking
- Familiarity and discovery weighting
- Explicit-content and decade filters
- Artist diversity and deduplication
- Wrapped calculations
- OAuth state validation
- Session behavior
- CSRF protection
- Authentication requirements

## Main API Routes

```text
GET  /api/session
GET  /api/now-playing
GET  /api/recently-played
GET  /api/recommendations
GET  /api/track-metadata
GET  /api/wrapped
POST /api/create-playlist/<type>
POST /api/player/toggle
PUT  /api/player/play
```

## Spotify Permissions

SpotiFeel requests the permissions needed to read listening data, control playback, and create playlists:

```text
user-read-currently-playing
user-read-playback-state
user-modify-playback-state
user-read-recently-played
user-library-read
user-top-read
playlist-modify-private
playlist-modify-public
```

## Why I Built It

I started SpotiFeel because I wanted to build something around Spotify data that went beyond displaying top songs and artists.

The project grew into a way to experiment with recommendation systems, API integration, OAuth, caching, session security, and data-driven frontend experiences while building something I would actually use.
