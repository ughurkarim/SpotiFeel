# SpotiFeel

SpotiFeel is a full-stack music app that turns Spotify listening data into recommendations, custom playlists, listening reports, and a live interface that reacts to what you are playing.

I built it with Python, Flask, Redis, and vanilla JavaScript. Spotify provides the core listening and playback data, with Last.fm, YouTube, and lyrics.ovh used for additional music metadata, discovery, video links, and lyrics.

**Live app:** [spoti-feel.vercel.app](https://spoti-feel.vercel.app/)

## Features

### Now Playing

SpotiFeel syncs with the user's active Spotify session and updates as the current track changes.

The now-playing view includes album artwork, playback progress, lyrics, genre information, and playback controls. The page also pulls colors from the current album artwork and transitions between themes when the song changes.

### Recommendations

Recommendations are generated using the current song alongside the user's listening history, top tracks, top artists, genre data, and available track information.

Users can adjust recommendation behavior through controls for:

- discovery versus familiarity
- artist variety
- energy
- explicit content
- decade
- genre preference

Recommendations are ranked and filtered before being shown to the user. Duplicate tracks and repeated artists are reduced so the results do not become a slightly reordered version of the same playlist.

When an optional data source is unavailable, SpotiFeel falls back to the remaining Spotify and Last.fm data instead of failing the entire request.

### Playlist Generation

Recommendations can be turned directly into Spotify playlists.

Users can choose the type of playlist they want and adjust the same discovery and filtering controls used by the recommendation system.

Created playlists are saved to the connected Spotify account through the Spotify Web API.

### Wrapped Anytime

Wrapped Anytime generates listening reports using Spotify's short, medium, and long-term listening ranges.

Reports include information such as:

- top artists
- top tracks
- top genres
- repeated listening patterns
- discovery score
- listening personality
- mood and genre breakdowns

Reports can also be exported as shareable images using the browser Canvas API.

### Day in Color

Day in Color turns recently played songs into a visual timeline.

Each track contributes colors based on its artwork and listening context, creating a visual record of how the user's music changed throughout the day.

### Playback Controls

SpotiFeel can control an active Spotify playback session without leaving the app.

Users can play, pause, and switch tracks while the rest of the interface stays synchronized with Spotify.

## Tech Stack

| Area | Technology |
| --- | --- |
| Backend | Python, Flask |
| Frontend | JavaScript, HTML, CSS |
| Cache and Sessions | Redis, Upstash Redis |
| Authentication | Spotify OAuth 2.0 |
| Music Data | Spotify Web API, Last.fm API |
| Additional APIs | YouTube Data API, lyrics.ovh |
| Browser APIs | Canvas API |
| Deployment | Vercel |

## Architecture

SpotiFeel uses a Flask backend for authentication, external API requests, recommendation logic, playlist creation, playback control, and listening reports.

The frontend communicates with the backend through REST endpoints and handles the live listening experience in the browser.

```text
Browser
   |
   v
Flask API
   |
   +-- Spotify OAuth
   +-- Playback
   +-- Listening History
   +-- Recommendations
   +-- Playlist Creation
   +-- Wrapped Reports
   +-- Lyrics and Metadata
   |
   v
Spotify / Last.fm / YouTube / lyrics.ovh
```

Backend logic is separated into routes, services, recommendation logic, and reporting code so API integrations do not live directly inside request handlers.

The frontend follows the same idea by separating API requests, playback state, recommendations, playlists, reports, and visual theming.

## Recommendation System

The recommendation system starts with Spotify listening data and builds a larger candidate pool using the current track, recently played songs, top artists, top tracks, and genre information.

Candidates are scored based on the user's selected preferences.

The system can favor familiar music or push further toward discovery. It can also reduce repeated artists, apply decade filters, exclude explicit tracks, and adjust results based on genre and available audio information.

The final results are grouped into different recommendation types so the user can see why a track is being suggested instead of receiving one unexplained list.

## Dynamic Theming

SpotiFeel's interface changes with the current song.

When Spotify reports a new track, the frontend loads the album artwork and derives a new visual theme from it. Instead of immediately switching from one set of colors to another, the page transitions between the previous and current themes.

Genre and available audio information also affect parts of the presentation.

The result is a now-playing page that feels different for each song while keeping the layout familiar.

## Authentication

SpotiFeel uses Spotify OAuth 2.0.

Spotify access and refresh tokens are handled by the Flask backend rather than exposed to frontend JavaScript.

Production sessions are stored in Redis. The browser receives a session cookie instead of the Spotify tokens themselves.

The authentication flow includes:

- OAuth state validation
- server-side token refresh
- CSRF protection on state-changing requests
- `HttpOnly` session cookies
- `SameSite` cookie settings
- secure cookies in production
- environment-based secret management

When an access token expires, the backend refreshes it without requiring the user to manually log in again.

## Caching

Spotify and third-party requests are cached where it makes sense to avoid repeatedly requesting data that has not changed.

Redis is used in production for caching and session storage.

Live playback data is handled differently because it needs to stay current. The frontend polls the now-playing endpoint while preventing overlapping requests from stacking up when Spotify or another service responds slowly.

## Reliability

Spotify is the main dependency of the app, while services such as Last.fm, YouTube, and lyrics.ovh are treated as optional additions.

A failed lyrics request should not stop the current song from loading. A YouTube timeout should not break recommendations. Missing Last.fm data should not end the entire request.

Each integration is handled independently so SpotiFeel can continue working with whatever information is available.

## Project Structure

```text
SpotiFeel/
├── backend/
│   ├── app.py
│   ├── routes/
│   ├── services/
│   ├── recommendations/
│   ├── reports/
│   ├── tests/
│   └── requirements.txt
│
├── index.html
├── script.js
├── style.css
└── .env.example
```

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

SpotiFeel requests the Spotify permissions needed for listening data, playback, and playlist creation.

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

## Run Locally

Clone the repository:

```bash
git clone https://github.com/ughurkarim/SpotiFeel.git
cd SpotiFeel
```

Create and activate a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r backend/requirements.txt
```

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

Optional API keys:

```env
LASTFM_API_KEY=your_key
YOUTUBE_API_KEY=your_key
```

Start the Flask server:

```bash
python backend/app.py
```

Open:

```text
http://127.0.0.1:5001
```

## Production Configuration

Production uses Redis-backed sessions and requires a Flask secret.

```env
SPOTIFEEL_ENV=production
FLASK_SECRET=your_random_secret
REDIS_URL=your_redis_url

SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=https://your-domain.com/callback
```

`FLASK_SECRET` should be a randomly generated value of at least 32 characters.

Local development and testing can use SQLite-backed sessions instead of Redis.

## Testing

Run the backend test suite with:

```bash
python -m pytest backend/tests -q
```

Tests cover recommendation ranking, filtering, Wrapped calculations, OAuth behavior, sessions, CSRF protection, and authenticated routes.

## Why I Built It

I use Spotify constantly, and I wanted to make something with my listening data that I would actually want to keep open.

Most Spotify projects I had seen stopped at showing top songs and artists. I wanted SpotiFeel to do more with the data by reacting to the song currently playing, finding new music, creating playlists, and letting me generate a listening report whenever I wanted one.

It also gave me a reason to work through problems that were more interesting than just displaying API responses. I had to handle OAuth and token refresh, combine data from services that do not always agree with each other, rank recommendations, keep live playback responsive, and make optional APIs fail without taking down the rest of the experience.
