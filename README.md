# SpotiFeel

Spotify Wrapped Anytime: connect Spotify and generate a polished personal music report for the last 4 weeks, last 6 months, or all-time listening.

![SpotiFeel Wrapped Anytime product preview](docs/screenshots/wrapped-anytime.svg)

## Vercel Deployment

This project is set up to run on Vercel with the Flask backend in `backend/app.py`. The included `vercel.json` routes all requests through that app.

Add these environment variables in Vercel:

```text
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=https://your-vercel-domain.vercel.app/callback
FLASK_SECRET=
LASTFM_API_KEY=
YOUTUBE_API_KEY=
OPENAI_API_KEY=
```

The Spotify Developer Dashboard must include the exact same callback URL:

```text
https://your-vercel-domain.vercel.app/callback
```

## Features

- Spotify OAuth login with session refresh
- Wrapped Anytime dashboard with 4 week, 6 month, and all-time reports
- Top artists, top songs, top genres, mood profile, listening personality, replay loops, and discovery score
- Shareable PNG image card with native share/download fallback
- Live now-playing view with album-art theming, lyrics, YouTube search, and playback controls
- Recent listening timeline and playlist generation
- Optional Last.fm and YouTube integrations

## Tech Stack

- Flask backend
- Vanilla JavaScript, HTML, and CSS frontend
- Spotify Web API
- Vercel Python deployment

## Spotify Scopes

SpotiFeel asks for:

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

`user-top-read` powers the Wrapped Anytime report. Spotify exposes `short_term`, `medium_term`, and `long_term`; the all-time view uses Spotify's `long_term` affinity ranking, not exact lifetime play count.

## Key Endpoints

- `GET /api/session` checks auth and Spotify configuration
- `GET /api/wrapped?time_range=short_term` builds a 4-week report
- `GET /api/wrapped?time_range=medium_term` builds a 6-month report
- `GET /api/wrapped?time_range=long_term` builds an all-time report
- `GET /api/now-playing` syncs the live player
- `GET /api/recently-played` loads recent listening
- `POST /api/create-playlist/<type>` creates a Spotify playlist

## Local Development

Local setup is only needed when testing changes before pushing to Vercel.

Use a local callback URL in the Spotify Developer Dashboard:

```text
http://127.0.0.1:5001/callback
```

Then run:

```bash
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
.venv/bin/flask --app backend.app:app run --host 0.0.0.0 --port 5001
```

Open:

```text
http://127.0.0.1:5001
```

## Product Roadmap

- AI music roast and personality analysis
- Friend compatibility reports
- Saved monthly and seasonal reports
- User accounts and report history
- Public leaderboards or anonymous trend stats
- Analytics for report generation and share conversion

## Troubleshooting

- `spotify_not_configured`: Vercel is missing Spotify credentials or the redirect URI.
- `Invalid state parameter`: cookies/session changed during OAuth; retry login from the same browser.
- Spotify redirect mismatch: the Vercel environment variable and Spotify Developer Dashboard URI must match exactly.
- Empty top tracks/artists: the Spotify account may not have enough listening history for that range.
