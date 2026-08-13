# SpotiFeel

SpotiFeel turns a listener's Spotify data into a reactive now-playing experience, on-demand listening analytics, explainable personalized recommendations, and custom Spotify playlists. It is a Flask application with a vanilla JavaScript frontend; it does not proxy Spotify credentials or tokens to browser code.

[Live app](https://spoti-feel.vercel.app/) · [Wrapped Anytime preview](docs/screenshots/wrapped-anytime.svg)

![SpotiFeel Wrapped Anytime product preview](docs/screenshots/wrapped-anytime.svg)

## What it includes

- Live now-playing card, vinyl, and lyrics views with artwork-driven themes
- Wrapped Anytime reports for Spotify's short-, medium-, and long-term affinity ranges
- Top artists, tracks, genres, mood DNA, listening personality, replay loops, and discovery score
- Recommendations explained with labels such as `same mood`, `higher energy`, `slower burn`, `artist orbit`, and `new discovery`
- Personalized private playlists with familiarity, discovery, energy, artist-variety, explicit-content, and decade controls
- A Day in Color listening timeline and shareable Wrapped PNG generation

## Architecture

```text
Browser (HTML/CSS + vanilla ES modules)
  ├─ js/api.js             API + CSRF transport
  ├─ js/state.js           shared UI/session state
  ├─ js/player.js          playback presentation helpers
  ├─ js/recommendations.js recommendation response helpers
  ├─ js/playlists.js       playlist request normalization
  ├─ js/wrapped.js         Wrapped export helper
  └─ js/theme.js           theme normalization
             │
             ▼
Flask API (app.py entry point)
  ├─ routes/auth.py             OAuth/session boundary
  ├─ routes/playback.py         playback mutations
  ├─ routes/recommendations.py  recommendation delivery
  ├─ routes/playlists.py        playlist creation boundary
  └─ routes/wrapped.py          report delivery
             │
             ▼
Personalization and reporting
  ├─ recommendations/ranking.py   pure similarity/ranking/filtering logic
  ├─ recommendations/playlists.py playlist ranking public surface
  ├─ recommendations/taste_profile.py taste-summary presentation
  ├─ wrapped/personality.py        pure discovery/personality scoring
  ├─ wrapped/report.py             Wrapped time-range contracts
  └─ core.py                       taste, playlist, and report orchestration
             │
             ▼
Integration services
  ├─ services/spotify.py   centralized HTTP transport
  ├─ services/lastfm.py    cached track tags
  ├─ services/lyrics.py    cached lyrics lookup
  └─ services/youtube.py   cached video/search resolution
             │
             ▼
Spotify + Last.fm + lyrics.ovh + YouTube
```

Optional integrations fail independently. A missing lyric or video result does not block now-playing, theming, or Spotify data. `/api/track-metadata` aggregates theme/genre, lyrics, and YouTube data into one browser request while retaining separate provider results.

## Recommendation model

Recommendations use both the currently playing track and the listener's recent and top Spotify data. The pipeline builds a taste profile from recent tracks, top tracks, top artists, artist genres, known artists, and averaged audio features.

```text
candidate score =
    audio similarity
  + familiarity/discovery weighting
  + popularity adjustment
  + artist-variety adjustment
  + explicit-content constraint
  + era constraint
```

The ranker creates separate lanes for close continuations, similar moods in a different genre, familiar favorites, and deep cuts. It deduplicates candidates across lanes and varies artist exposure. Spotify artist/search strategies and Last.fm similarity remain graceful fallbacks when the primary candidate source is sparse. Clean mode and decade playlists use hard eligibility constraints; balanced/explicit modes retain the existing weighted behavior.

Spotify audio features shape similarity when available. Genre and listening-history signals provide fallbacks, so an unavailable optional provider does not empty the entire recommendation surface.

## Engineering decisions

- **OAuth:** Spotify authorization-code OAuth retains a cryptographically random, one-time `state` value. The callback validates it with a constant-time comparison before exchanging the code.
- **Server-side sessions:** the cookie contains only a signed opaque session ID. Access and refresh tokens live in SQLite for local development/tests and Redis in production.
- **CSRF:** `/api/session` supplies a per-session CSRF token. The shared browser transport sends it on every POST, PUT, PATCH, and DELETE request, and Flask rejects missing or mismatched tokens before route code runs.
- **Cookies and secrets:** production requires a secret of at least 32 characters and Redis. Cookies are `HttpOnly`, `Secure` in production/HTTPS, and `SameSite=Lax`. There is no static development-secret fallback.
- **Caching:** current playback uses a short four-second cache; user taste uses three minutes; Wrapped reports use five minutes. Public track audio features, Last.fm tags, lyrics, video resolution, and Spotify genre seeds use longer resource-appropriate TTLs.
- **Failure handling:** provider payloads and exception strings are logged internally, not returned to the UI. Routes return stable error codes, safe messages, and appropriate 4xx/5xx statuses.
- **Frontend synchronization:** polling intervals and pending-request guards prevent overlapping now-playing/history work. Track changes reset dependent UI state once, then request aggregated metadata and recommendations.
- **Wrapped sharing:** image generation remains browser-side with Canvas, native sharing when available, and a PNG download fallback.

## Local setup

1. Create a Spotify application and set its callback to `http://127.0.0.1:5001/callback`.
2. Copy `.env.example` to `backend/.env` and fill in the required values.
3. Install and run:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python backend/app.py
```

`LASTFM_API_KEY` and `YOUTUBE_API_KEY` are optional. Without them, SpotiFeel uses Spotify genre signals and a YouTube search link.

Production must set:

```text
SPOTIFEEL_ENV=production
FLASK_SECRET=<cryptographically-random value of at least 32 characters>
REDIS_URL=<TLS Redis connection URL>
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=https://your-host/callback
```

Vercel exposes `VERCEL_ENV=production`, which activates the same startup checks automatically.

## Spotify scopes

```text
user-read-currently-playing
user-read-playback-state
user-modify-playback-state
playlist-modify-private
playlist-modify-public
user-read-recently-played
user-library-read
user-top-read
```

Spotify's `short_term`, `medium_term`, and `long_term` values power the 4-week, 6-month, and All Time reports. The All Time view is Spotify's long-term affinity ranking, not an exact lifetime play count.

## Tests

```bash
python -m pytest backend/tests -q
```

The suite covers audio similarity, familiarity/discovery weighting, explicit and decade constraints, genre and playlist-option normalization, deduplication, artist variety, Wrapped discovery/personality calculations, signed-out endpoint behavior, OAuth state validation, opaque session cookies, and CSRF enforcement.

## Main endpoints

- `GET /api/session`
- `GET /api/wrapped?time_range=short_term|medium_term|long_term`
- `GET /api/now-playing`
- `GET /api/track-metadata`
- `GET /api/recently-played`
- `GET /api/recommendations`
- `POST /api/create-playlist/<type>`
- `POST /api/player/toggle`
- `PUT /api/player/play`
