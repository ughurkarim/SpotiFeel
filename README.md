# SpotiFeel

SpotiFeel is a full-stack music app that turns Spotify listening data into recommendations, custom playlists, listening reports, and a live interface that reacts to the song currently playing.

The app combines Spotify listening and playback data with Last.fm, YouTube, and lyrics.ovh for additional metadata, discovery, video links, and lyrics.

**Live app:** [spoti-feel.vercel.app](https://spoti-feel.vercel.app/)

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
| Testing | Pytest |

## Features

- Live Spotify now-playing interface
- Album-art-based dynamic theming
- Personalized music recommendations
- Adjustable discovery and familiarity controls
- Genre, decade, energy, artist variety, and explicit-content filters
- Spotify playlist generation
- Short, medium, and long-term listening reports
- Shareable Wrapped-style report images
- Recently played visualizations through Day in Color
- Spotify playback controls
- Server-side OAuth and token refresh
- Redis-backed sessions and caching
- Fallback behavior when optional music APIs are unavailable

## What Users Can Do

SpotiFeel connects to a user's Spotify account and uses their listening data throughout the app.

Users can:

- See the song currently playing on Spotify
- View album artwork, playback progress, lyrics, and track information
- Play, pause, and change tracks without leaving SpotiFeel
- Generate recommendations from their current song and listening history
- Control how familiar or experimental recommendations should be
- Filter recommendations by genre, decade, energy, artist variety, and explicit content
- Turn recommendations into Spotify playlists
- View top artists, tracks, genres, and listening patterns
- Generate listening reports across multiple Spotify time ranges
- Export reports as shareable images
- View recently played music as a color-based timeline

## How the App Works

### Now Playing

SpotiFeel syncs with the user's active Spotify session and updates when the current track changes.

The now-playing view includes:

- Album artwork
- Playback progress
- Lyrics
- Genre information
- Playback controls
- Track metadata

The frontend polls the backend for playback updates while preventing overlapping requests from stacking up if Spotify responds slowly.

When the song changes, the interface also generates a new visual theme from the album artwork.

### Recommendations

The recommendation system starts with Spotify listening data and creates a larger candidate pool using:

- Current track
- Recently played tracks
- Top tracks
- Top artists
- Genre information
- Last.fm data when available

Candidates are scored and filtered based on the controls selected by the user.

Users can adjust:

- Discovery versus familiarity
- Artist variety
- Energy
- Explicit content
- Decade
- Genre preference

The system also reduces duplicate tracks and repeated artists so recommendations do not become several versions of the same result.

Recommendations are grouped into different types so users can see why a track is being suggested rather than receiving one unexplained list.

### Playlist Generation

Recommendation results can be turned directly into Spotify playlists.

The user chooses the type of playlist and can use the same discovery and filtering controls available in the recommendation system.

The backend creates the playlist through the Spotify Web API and saves it to the connected Spotify account.

### Wrapped Anytime

Wrapped Anytime generates listening reports using Spotify's short, medium, and long-term listening ranges.

Reports can include:

- Top artists
- Top tracks
- Top genres
- Repeated listening patterns
- Discovery score
- Listening personality
- Mood breakdowns
- Genre breakdowns

Reports can also be exported as images using the browser Canvas API.

### Day in Color

Day in Color turns recently played tracks into a visual timeline.

Each song contributes colors based on its artwork and listening context, creating a visual record of how the user's music changed throughout the day.

### Dynamic Theming

The interface changes with the current song.

When Spotify reports a new track, the frontend loads the album artwork and derives a new theme from it.

Instead of replacing the old colors immediately, the page transitions between the previous and current themes.

Genre and available track information can also affect parts of the presentation.

## Architecture

SpotiFeel uses a Flask backend for authentication, external API requests, recommendation logic, playlist creation, playback control, and listening reports.

The frontend handles the live listening interface and communicates with the backend through REST endpoints.

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

Backend logic is separated into routes, services, recommendation code, and reporting logic rather than keeping third-party API calls directly inside request handlers.

The frontend follows the same separation for API requests, playback state, recommendations, playlists, reports, and visual theming.

## Authentication and Sessions

SpotiFeel uses Spotify OAuth 2.0.

Spotify access and refresh tokens are handled by the Flask backend rather than exposed to frontend JavaScript.

The browser receives a session cookie instead of receiving Spotify tokens directly.

The authentication flow includes:

- OAuth state validation
- Server-side token refresh
- CSRF protection on state-changing requests
- `HttpOnly` session cookies
- `SameSite` cookie settings
- Secure cookies in production
- Environment-based secret management

When a Spotify access token expires, the backend refreshes it without requiring the user to log in again.

Production sessions are stored in Redis.

## Caching and Reliability

SpotiFeel depends on several external APIs that do not all have the same reliability or response times.

Spotify is the main data source. Last.fm, YouTube, and lyrics.ovh provide additional information but are treated as optional integrations.

A failed lyrics request should not prevent the current song from loading. A YouTube timeout should not break recommendations. Missing Last.fm data should not fail the entire request.

Each integration is handled independently so the app can continue using the information that is still available.

Redis is also used to cache data that does not need to be requested repeatedly.

Live playback information is handled separately because it needs to stay current.

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

SpotiFeel requests the Spotify permissions needed for listening history, playback, and playlist creation.

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

## Testing

The backend test suite covers:

- Recommendation ranking
- Recommendation filtering
- Wrapped calculations
- OAuth behavior
- Session handling
- CSRF protection
- Authenticated routes

Run the tests with:

```bash
python -m pytest backend/tests -q
```

## The Process

I use Spotify constantly, and I wanted to make something with my listening data that I would actually keep open.

At first, I thought the Spotify API would handle almost everything I wanted to do. Once I started building the app, I realized some of the data and functionality I wanted was limited or unavailable through Spotify alone.

That pushed me to start using other APIs instead of forcing every feature through Spotify.

I added Last.fm, YouTube, and lyrics.ovh, and that ended up making the app better than the version I originally planned. Last.fm gave me another source for music discovery and metadata, YouTube added video links, and lyrics.ovh gave me lyrics without making that feature depend on Spotify.

The first version focused on showing the current song and basic Spotify data.

From there, I started adding the parts I actually wanted to use: recommendations that could be adjusted instead of returning one fixed list, playlists generated from those recommendations, listening reports that could be created at any time, lyrics, additional music metadata, and an interface that changed with the music.

The backend grew as those features started depending on more than one service.

Spotify still provides most of the listening and playback data, but the other APIs fill in information and functionality that Spotify does not provide. That meant I had to account for different response formats, missing data, rate limits, and APIs failing independently.

The recommendation system also changed over time. Instead of returning tracks directly from one API response, I created a candidate pool from several parts of the user's listening history and ranked those candidates based on the controls selected in the interface.

Authentication became another part of the project once SpotiFeel started creating playlists and controlling playback. Spotify tokens needed to stay on the server, expired tokens needed to refresh automatically, and production sessions needed somewhere persistent to live.

Redis ended up handling both production sessions and caching.

The frontend grew in parallel. Now Playing needed to stay synchronized without creating overlapping requests, and the visual theme needed to transition when the track changed without resetting the rest of the interface.

A lot of the project became less about calling the Spotify API and more about deciding how several services should work together when their data is incomplete, delayed, or unavailable.

## What I Learned

SpotiFeel was the project where I learned the difference between using an API and building an application that depends on several of them.

I originally expected Spotify to provide most of what I needed. Working around its limitations taught me that adding another data source does not have to be a fallback. In this case, it gave me more information to work with and led to features I probably would not have added if Spotify had handled everything itself.

Getting one Spotify response is straightforward. Keeping authentication valid, combining several data sources, ranking recommendations, updating playback in real time, and making sure one failed service does not break everything else required a different structure.

I learned more about:

- Designing a Flask backend around separate routes and services
- Working with OAuth 2.0 and refresh tokens
- Keeping authentication credentials out of frontend code
- Managing server-side sessions
- Using Redis for sessions and caching
- Combining data from APIs with different formats and reliability
- Designing around API limitations instead of depending on one provider
- Designing fallback behavior for optional integrations
- Ranking and filtering recommendation candidates
- Synchronizing a frontend with changing playback state
- Preventing overlapping network requests
- Generating images with the Canvas API
- Testing authenticated routes and recommendation logic
- Separating live data from information that can be cached

The recommendation system was probably the part I changed the most.

It started as a way to suggest more songs, but the interesting part became deciding what makes two recommendations meaningfully different and how much control the user should have over that.

## How to Run the Project

### Requirements

- Python
- pip
- Spotify Developer account
- Redis for production configuration

### Clone the Repository

```bash
git clone https://github.com/ughurkarim/SpotiFeel.git
cd SpotiFeel
```

### Create a Virtual Environment

```bash
python -m venv .venv
source .venv/bin/activate
```

On Windows:

```bash
.venv\Scripts\activate
```

### Install Dependencies

```bash
pip install -r backend/requirements.txt
```

### Configure Environment Variables

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

### Start the Application

```bash
python backend/app.py
```

Open:

```text
http://127.0.0.1:5001
```

### Production Configuration

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

## Video
Compression lowered the quality of the video substantially


https://github.com/user-attachments/assets/f7dd93a6-bd5c-4ca8-9ca1-240bd9b24f3e




