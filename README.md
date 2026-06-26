# SpotiFeel

## Live App

[https://spoti-feel.vercel.app/](https://spoti-feel.vercel.app/)

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

## Product Roadmap

- AI music roast and personality analysis
- Friend compatibility reports
- Saved monthly and seasonal reports
- User accounts and report history
- Public leaderboards or anonymous trend stats
- Analytics for report generation and share conversion
