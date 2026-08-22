import {
  cloneDemo,
  DEMO_ARTISTS,
  DEMO_PROFILE,
  DEMO_TRACKS,
  PLAYLIST_SELECTIONS,
  PRIMARY_TRACK_IDS,
  TRACK_PROFILES,
  tracksForIds,
} from "./demo-data.js";

export const DEMO_STORAGE_KEY = "spotifeel:demo-mode";

let runtimeDemoMode = false;
let playback = {
  trackId: "billie-jean",
  isPlaying: true,
  progressMs: 288000,
  syncedAt: Date.now(),
};

const DEMO_PLAYBACK_SEQUENCE = ["billie-jean", "smooth-criminal"];

function browserStorage() {
  try {
    return window.sessionStorage;
  } catch (_error) {
    return null;
  }
}

export function isDemoMode(storage = browserStorage()) {
  try {
    return storage?.getItem(DEMO_STORAGE_KEY) === "1" || runtimeDemoMode;
  } catch (_error) {
    return runtimeDemoMode;
  }
}

export function setDemoMode(enabled, storage = browserStorage()) {
  runtimeDemoMode = !!enabled;
  try {
    if (enabled) storage?.setItem(DEMO_STORAGE_KEY, "1");
    else storage?.removeItem(DEMO_STORAGE_KEY);
  } catch (_error) {
    // The in-memory flag still supports the current page when storage is unavailable.
  }
}

export function isDemoApiRequest(url) {
  try {
    return new URL(String(url), "https://spotifeel.demo").pathname.startsWith("/api/");
  } catch (_error) {
    return false;
  }
}

function response(data, status = 200) {
  return {
    response: {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Demo response",
    },
    data: cloneDemo(data),
  };
}

function rawCurrentTrack() {
  return DEMO_TRACKS[playback.trackId] || DEMO_TRACKS["billie-jean"];
}

function syncPlaybackClock() {
  if (!playback.isPlaying) return;
  let progressMs = playback.progressMs + (Date.now() - playback.syncedAt);
  let track = rawCurrentTrack();
  while (progressMs >= track.duration_ms) {
    progressMs -= track.duration_ms;
    const currentIndex = DEMO_PLAYBACK_SEQUENCE.indexOf(playback.trackId);
    playback.trackId = DEMO_PLAYBACK_SEQUENCE[(Math.max(0, currentIndex) + 1) % DEMO_PLAYBACK_SEQUENCE.length];
    track = rawCurrentTrack();
  }
  playback.progressMs = progressMs;
  playback.syncedAt = Date.now();
}

function currentTrack() {
  syncPlaybackClock();
  return rawCurrentTrack();
}

function currentProgress() {
  syncPlaybackClock();
  return playback.progressMs;
}

function setPlaying(playing) {
  playback.progressMs = currentProgress();
  playback.syncedAt = Date.now();
  playback.isPlaying = !!playing;
}

function findTrackByUri(uri) {
  return Object.entries(DEMO_TRACKS).find(([, track]) => track.uri === uri)?.[0] || "";
}

function profileForTrack(trackId) {
  return TRACK_PROFILES[trackId] || {
    genre: "pop",
    tags: ["pop", "funk", "soul"],
    energy: .72,
    valence: .7,
    danceability: .74,
    tempo: 116,
    loudness: -6.2,
  };
}

function moodDna(profile) {
  const energy = profile.energy < .4 ? "Low" : profile.energy < .68 ? "Medium" : profile.energy < .86 ? "High" : "Intense";
  const mood = profile.valence < .34 ? "Dark" : profile.valence < .6 ? "Balanced" : "Bright";
  const danceability = profile.danceability < .32 ? "Low" : profile.danceability < .6 ? "Medium" : profile.danceability < .78 ? "High" : "Locked In";
  const tempo = profile.tempo < 86 ? "Slow" : profile.tempo < 116 ? "Midtempo" : profile.tempo < 138 ? "Fast" : "Sprint";
  return [
    { key: "energy", label: "Energy", value: energy, detail: `${Math.round(profile.energy * 100)}%` },
    { key: "mood", label: "Mood", value: mood, detail: `${Math.round(profile.valence * 100)}%` },
    { key: "danceability", label: "Danceability", value: danceability, detail: `${Math.round(profile.danceability * 100)}%` },
    { key: "tempo", label: "Tempo", value: tempo, detail: `${Math.round(profile.tempo)} BPM` },
  ];
}

function genrePayload(track = currentTrack()) {
  const trackId = track.id.replace("demo-track-", "");
  const profile = profileForTrack(trackId);
  return {
    track: track.name,
    artist: track.artists[0]?.name || "",
    genre: profile.genre,
    tags: profile.tags,
    audio_profile: {
      energy: profile.energy,
      valence: profile.valence,
      danceability: profile.danceability,
      tempo: profile.tempo,
      loudness: profile.loudness,
    },
    mood_dna: moodDna(profile),
    taste_summary: "Michael Jackson leads a feel-good mix of pop, funk, soul, and universally loved classics.",
    arc: { detail: "A crisp bassline and bright pop pulse lift the day into an energetic run of timeless favorites." },
  };
}

function lyricsPayload(track = currentTrack()) {
  const artist = track.artists[0]?.name || "";
  const query = encodeURIComponent(`${track.name} ${artist} lyrics`);
  if (track.id === "demo-track-billie-jean") {
    const timedLines = [
      ["00:00.00", "Instrumental intro"],
      ["00:16.00", "Verse one"],
      ["00:37.00", "The groove settles in"],
      ["00:48.00", "Pre-chorus"],
      ["01:03.00", "Chorus — Billie Jean is not my lover"],
      ["01:31.00", "Verse two"],
      ["01:58.00", "Pre-chorus returns"],
      ["02:15.00", "Chorus"],
      ["02:44.00", "Dance break"],
      ["03:10.00", "Final chorus"],
      ["03:53.00", "Outro"],
    ];
    return {
      track_id: track.id,
      track: track.name,
      artist,
      lyrics: timedLines.map(([, line]) => line).join("\n"),
      synced_lyrics: timedLines.map(([time, line]) => `[${time}]${line}`).join("\n"),
      timing: "synced",
      source: "SpotiFeel demo timing",
      search_urls: {
        genius: `https://genius.com/search?q=${query}`,
        search: `https://www.google.com/search?q=${query}`,
      },
    };
  }
  if (track.id === "demo-track-smooth-criminal") {
    const timedLines = [
      ["00:00.00", "Instrumental opening"],
      ["00:19.00", "Verse one"],
      ["00:43.00", "The tension rises"],
      ["00:56.00", "Chorus — Annie, are you okay?"],
      ["01:24.00", "Verse two"],
      ["01:50.00", "Chorus returns"],
      ["02:13.00", "Rhythmic break"],
      ["02:35.00", "Final chorus"],
      ["03:39.00", "Outro"],
    ];
    return {
      track_id: track.id,
      track: track.name,
      artist,
      lyrics: timedLines.map(([, line]) => line).join("\n"),
      synced_lyrics: timedLines.map(([time, line]) => `[${time}]${line}`).join("\n"),
      timing: "synced",
      source: "SpotiFeel demo timing",
      search_urls: {
        genius: `https://genius.com/search?q=${query}`,
        search: `https://www.google.com/search?q=${query}`,
      },
    };
  }
  return {
    track_id: track.id,
    track: track.name,
    artist,
    error: "lyrics_unavailable",
    search_urls: {
      genius: `https://genius.com/search?q=${query}`,
      search: `https://www.google.com/search?q=${query}`,
    },
  };
}

function youtubePayload(track = currentTrack()) {
  const artist = track.artists[0]?.name || "";
  return {
    track_id: track.id,
    youtube_search_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.name} ${artist} official audio`)}`,
  };
}

function recentListening(reference = new Date()) {
  const ids = ["billie-jean", "rock-with-you", "september", "human-nature", "dreams", "smooth-criminal", "superstition", "i-wanna-dance", "dont-stop-me-now", "thriller"];
  const midnight = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate()).getTime();
  const available = Math.max(1000, reference.getTime() - midnight);
  return ids.map((id, index) => ({
    track: cloneDemo(DEMO_TRACKS[id]),
    played_at: new Date(midnight + available * (1 - (index + 1) / (ids.length + 1))).toISOString(),
    context: { type: "playlist", name: index < 4 ? "Morning Classics" : index < 7 ? "All-Time Favorites" : "After-Work Energy" },
  }));
}

const RANGE_DATA = {
  short_term: {
    artistIds: ["michael-jackson", "earth-wind-fire", "fleetwood-mac", "queen", "stevie-wonder", "whitney-houston"],
    trackIds: ["billie-jean", "thriller", "rock-with-you", "september", "dreams", "superstition", "i-wanna-dance", "dont-stop-me-now"],
    genres: [["pop", 8], ["funk", 7], ["soul", 6], ["dance-pop", 5], ["classic-rock", 4], ["disco", 3]],
    personality: ["The Crowd-Pleaser", "You lead with immaculate pop instincts, undeniable grooves, and classics everyone knows by heart."],
    discovery: [54, "Selective Explorer"],
    profile: { energy: .76, valence: .78, danceability: .81, tempo: 116, loudness: -5.8 },
  },
  medium_term: {
    artistIds: ["michael-jackson", "queen", "fleetwood-mac", "prince", "stevie-wonder", "earth-wind-fire"],
    trackIds: ["billie-jean", "smooth-criminal", "beat-it", "purple-rain", "dreams", "superstition", "september", "dont-stop-me-now"],
    genres: [["pop", 9], ["funk", 8], ["classic-rock", 6], ["soul", 5], ["dance-pop", 5], ["rock", 4]],
    personality: ["The Timeless Hitmaker", "Your queue balances world-class pop craft, big choruses, and grooves that never age."],
    discovery: [58, "Curious Curator"],
    profile: { energy: .78, valence: .74, danceability: .76, tempo: 118, loudness: -5.6 },
  },
  long_term: {
    artistIds: ["michael-jackson", "fleetwood-mac", "queen", "stevie-wonder", "david-bowie", "prince"],
    trackIds: ["billie-jean", "man-in-mirror", "dont-stop-til", "dreams", "dont-stop-me-now", "heroes", "purple-rain", "superstition"],
    genres: [["pop", 10], ["classic-rock", 8], ["soul", 7], ["funk", 7], ["rock", 5], ["motown", 4]],
    personality: ["The All-Time Curator", "Your long-term listening is built on masterful songwriting, unforgettable voices, and generation-spanning favorites."],
    discovery: [48, "Selective Explorer"],
    profile: { energy: .71, valence: .7, danceability: .68, tempo: 112, loudness: -6.4 },
  },
};

const RANGE_META = {
  short_term: { label: "Last 4 Weeks", slug: "4-weeks", summary_label: "four-week", spotify_value: "short_term" },
  medium_term: { label: "Last 6 Months", slug: "6-months", summary_label: "six-month", spotify_value: "medium_term" },
  long_term: { label: "All Time", slug: "all-time", summary_label: "all-time", spotify_value: "long_term" },
};

function wrappedReport(requestedRange) {
  const range = RANGE_DATA[requestedRange] ? requestedRange : "short_term";
  const data = RANGE_DATA[range];
  const artists = data.artistIds.map((id) => DEMO_ARTISTS[id]).filter(Boolean);
  const tracks = tracksForIds(data.trackIds);
  const genres = data.genres.map(([name, count]) => ({ name, count }));
  const personality = { title: data.personality[0], detail: data.personality[1] };
  const discovery = {
    score: data.discovery[0],
    label: data.discovery[1],
    detail: "Based on genre range, artist variety, newer releases, and how deep-cut the listening mix goes.",
    parts: { genre_variety: 68, artist_variety: 88, freshness: range === "short_term" ? 42 : 28, deep_cuts: 61 },
  };
  const summary = `${DEMO_PROFILE.display_name}'s ${RANGE_META[range].summary_label} listening is led by ${artists[0]?.name}, anchored in ${genres[0]?.name.replace(/-/g, " ")}, with ${tracks[0]?.name} at the center.`;
  return {
    generated_at: Math.floor(Date.now() / 1000),
    time_range: RANGE_META[range],
    user: DEMO_PROFILE,
    top_artists: artists,
    top_tracks: tracks,
    top_genres: genres,
    mood_profile: { source: "demo_listening_profile", audio_profile: data.profile, dna: moodDna(data.profile) },
    listening_personality: personality,
    taste_summary: summary,
    discovery_score: discovery,
    share_card: {
      headline: `${DEMO_PROFILE.display_name}'s ${RANGE_META[range].label} Wrapped`,
      kicker: "Spotify Wrapped Anytime",
      top_artist: artists[0],
      top_track: tracks[0],
      top_genre: genres[0],
      personality,
      discovery_score: discovery,
      summary,
      share_text: `${DEMO_PROFILE.display_name}'s SpotiFeel demo: ${personality.title}. Top artist: ${artists[0]?.name}.`,
    },
    data_note: "Demo Mode uses a curated sample profile. Spotify top-items use affinity rankings rather than exact lifetime play counts.",
  };
}

function recommendationTrack(id, reason) {
  const source = DEMO_TRACKS[id];
  if (!source) return null;
  const track = cloneDemo(source);
  track.spotifeel_reason_short = reason;
  track.spotifeel_reason = `Selected for its ${reason} with the current listening profile.`;
  return track;
}

function recommendationPayload() {
  const current = currentTrack();
  const currentId = current.id.replace("demo-track-", "");
  const similarIds = PRIMARY_TRACK_IDS.filter((id) => id !== currentId).slice(0, 6);
  const sameArtistIds = Object.entries(DEMO_TRACKS)
    .filter(([id, track]) => id !== currentId && track.artists[0]?.name === current.artists[0]?.name)
    .map(([id]) => id);
  const artistOrbit = [...sameArtistIds, "thriller", "beat-it", "human-nature", "smooth-criminal", "man-in-mirror"]
    .filter((id, index, values) => id !== currentId && values.indexOf(id) === index)
    .slice(0, 6);
  const widerTaste = ["september", "dreams", "superstition", "dont-stop-me-now", "purple-rain", "i-wanna-dance"]
    .filter((id) => id !== currentId)
    .slice(0, 6);
  return {
    based_on: { track: current.name, artist: current.artists[0]?.name || "" },
    profile_summary: `Tracks curated because this sample listener played "${current.name}".`,
    groups: [
      { id: "more-like-this", title: "More like this", kicker: `Because you listened to ${current.name}`, detail: "A close continuation of the current song's atmosphere.", tracks: similarIds.map((id) => recommendationTrack(id, "same mood")).filter(Boolean) },
      { id: "artist-top-tracks", title: sameArtistIds.length ? "More from this artist" : "Same artist orbit", kicker: `Stay close to ${current.artists[0]?.name || "this artist"}`, detail: "Catalog favorites and neighboring artists.", tracks: artistOrbit.map((id) => recommendationTrack(id, "artist orbit")).filter(Boolean) },
      { id: "still-fits-your-taste", title: "Still fits your taste", kicker: "From the wider sample profile", detail: "Familiar anchors with a little more range.", tracks: widerTaste.map((id) => recommendationTrack(id, "taste match")).filter(Boolean) },
    ],
  };
}

function parseBody(options = {}) {
  if (!options.body || typeof options.body !== "string") return {};
  try {
    return JSON.parse(options.body);
  } catch (_error) {
    return {};
  }
}

function playlistPayload(type, options = {}) {
  const normalizedType = decodeURIComponent(type || "indie-pop").toLowerCase();
  const ids = PLAYLIST_SELECTIONS[normalizedType] || PLAYLIST_SELECTIONS["indie-pop"];
  const tracks = tracksForIds(ids);
  const preferences = parseBody(options);
  const discoveryStyle = Number(preferences.familiarity) < .5 ? "discovery-led" : "familiar-first";
  const name = `${normalizedType.replace(/(^|[-\s])\w/g, (letter) => letter.toUpperCase()).replace(/-/g, " ")} Mix`;
  return {
    demo_mode: true,
    name,
    playlist_url: "",
    summary: `${name} is ready in Demo Mode · ${tracks.length} ${discoveryStyle} picks shaped around this sample profile.`,
    track_count: tracks.length,
    tracks,
  };
}

export function getDemoRecentListening(reference = new Date()) {
  return cloneDemo(recentListening(reference));
}

export async function demoApiRequest(url, options = {}) {
  let parsed;
  try {
    parsed = new URL(String(url), "https://spotifeel.demo");
  } catch (_error) {
    return response({ error: "invalid_demo_request" }, 400);
  }

  const path = parsed.pathname;
  const method = String(options.method || "GET").toUpperCase();

  if (path === "/api/session" && method === "GET") {
    return response({ authenticated: true, configured: true, csrf_token: "demo-session", demo_mode: true, user: DEMO_PROFILE });
  }

  if (path === "/api/me" && method === "GET") return response(DEMO_PROFILE);

  if (path === "/api/now-playing" && method === "GET") {
    return response({
      playing: true,
      is_playing: playback.isPlaying,
      progress_ms: Math.round(currentProgress()),
      item: currentTrack(),
      context: { type: "playlist", name: "After Dark Essentials" },
    });
  }

  if (path === "/api/recently-played" && method === "GET") {
    return response({ items: recentListening(), cursors: {}, next: null });
  }

  if (path === "/api/recommendations" && method === "GET") return response(recommendationPayload());

  if (path === "/api/wrapped" && method === "GET") {
    return response(wrappedReport(parsed.searchParams.get("time_range") || "short_term"));
  }

  if (path === "/api/genre-now" && method === "GET") return response(genrePayload());

  if (path === "/api/lyrics-now" && method === "GET") {
    const lyrics = lyricsPayload();
    return response(lyrics, lyrics.error ? 404 : 200);
  }

  if (path === "/api/youtube-now" && method === "GET") return response(youtubePayload());

  if (path === "/api/track-metadata" && method === "GET") {
    const track = currentTrack();
    const lyrics = lyricsPayload(track);
    return response({
      track_id: track.id,
      genre: { status: 200, data: genrePayload(track) },
      lyrics: { status: lyrics.error ? 404 : 200, data: lyrics },
      youtube: { status: 200, data: youtubePayload(track) },
    });
  }

  if (path === "/api/player/toggle" && method === "POST") {
    setPlaying(!playback.isPlaying);
    return response({ playing: playback.isPlaying, demo_mode: true });
  }

  if (path === "/api/player/play" && method === "PUT") {
    const nextId = findTrackByUri(parseBody(options).uri);
    if (!nextId) return response({ error: "invalid_uri", message: "That track is not part of the demo catalog." }, 400);
    playback = { trackId: nextId, isPlaying: true, progressMs: 0, syncedAt: Date.now() };
    return response({ playing: true, uri: currentTrack().uri, demo_mode: true });
  }

  const playlistMatch = path.match(/^\/api\/create-playlist\/([^/]+)$/);
  if (playlistMatch && method === "POST") return response(playlistPayload(playlistMatch[1], options));

  return response({ error: "demo_endpoint_unavailable", message: "This action is not available in Demo Mode." }, 404);
}
