import assert from "node:assert/strict";
import test from "node:test";

import { apiRequest } from "../js/api.js";
import {
  demoApiRequest,
  getDemoRecentListening,
  isDemoApiRequest,
  isDemoMode,
  setDemoMode,
} from "../js/demo.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("Demo Mode persists independently from Spotify authentication", () => {
  const storage = memoryStorage();
  setDemoMode(false, storage);
  assert.equal(isDemoMode(storage), false);

  setDemoMode(true, storage);
  assert.equal(isDemoMode(storage), true);

  setDemoMode(false, storage);
  assert.equal(isDemoMode(storage), false);
  assert.equal(isDemoApiRequest("/api/session"), true);
  assert.equal(isDemoApiRequest("/login"), false);
});

test("the request boundary serves demo data without touching fetch", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("Demo Mode attempted a network request");
  };
  setDemoMode(true, memoryStorage());

  try {
    const { response, data } = await apiRequest("/api/session");
    assert.equal(response.ok, true);
    assert.equal(data.authenticated, true);
    assert.equal(data.demo_mode, true);
    assert.equal(data.user.display_name, "Alex Morgan");
  } finally {
    setDemoMode(false, memoryStorage());
    globalThis.fetch = originalFetch;
  }
});

test("the request boundary preserves normal server data when Demo Mode is off", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  setDemoMode(false, memoryStorage());
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({ authenticated: false, configured: true, csrf_token: "real-session" }),
    };
  };

  try {
    const { data } = await apiRequest("/api/session");
    assert.equal(requestedUrl, "/api/session");
    assert.equal(data.authenticated, false);
    assert.equal(data.demo_mode, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("demo playback advances from Billie Jean to Smooth Criminal with synced cues", async () => {
  const originalNow = Date.now;
  const baseTime = originalNow();
  const first = await demoApiRequest("/api/now-playing");
  assert.equal(first.data.item.name, "Billie Jean");

  try {
    Date.now = () => baseTime + 10000;
    const second = await demoApiRequest("/api/now-playing");
    const metadata = await demoApiRequest("/api/track-metadata");
    assert.equal(second.data.item.name, "Smooth Criminal");
    assert.equal(metadata.data.track_id, second.data.item.id);
    assert.equal(metadata.data.lyrics.status, 200);
    assert.match(metadata.data.lyrics.data.synced_lyrics, /\[00:56\.00\]/);
  } finally {
    Date.now = originalNow;
    await demoApiRequest("/api/player/play", {
      method: "PUT",
      body: JSON.stringify({ uri: "spotify:track:demo-billie-jean" }),
    });
  }
});

test("now playing, metadata, recommendations, and playback stay internally consistent", async () => {
  const nowPlaying = await demoApiRequest("/api/now-playing");
  const metadata = await demoApiRequest("/api/track-metadata");
  const recommendations = await demoApiRequest("/api/recommendations");

  assert.equal(nowPlaying.data.item.name, "Billie Jean");
  assert.equal(metadata.data.track_id, nowPlaying.data.item.id);
  assert.equal(metadata.data.genre.data.genre, "dance-pop");
  assert.equal(metadata.data.lyrics.status, 200);
  assert.match(metadata.data.lyrics.data.synced_lyrics, /\[01:03\.00\]/);
  assert.equal(recommendations.data.based_on.track, nowPlaying.data.item.name);
  assert.equal(recommendations.data.groups.length, 3);

  const nextTrack = recommendations.data.groups[0].tracks[0];
  const played = await demoApiRequest("/api/player/play", {
    method: "PUT",
    body: JSON.stringify({ uri: nextTrack.uri }),
  });
  const afterPlay = await demoApiRequest("/api/now-playing");
  assert.equal(played.response.ok, true);
  assert.equal(afterPlay.data.item.id, nextTrack.id);
});

test("recent listening stays within the current local day", () => {
  const reference = new Date(2026, 7, 21, 18, 30, 0);
  const items = getDemoRecentListening(reference);
  assert.ok(items.length >= 8);
  items.forEach((item) => {
    const playedAt = new Date(item.played_at);
    assert.equal(playedAt.getFullYear(), reference.getFullYear());
    assert.equal(playedAt.getMonth(), reference.getMonth());
    assert.equal(playedAt.getDate(), reference.getDate());
  });
});

test("Wrapped ranges and generated playlists return populated, realistic result shapes", async () => {
  const shortRange = await demoApiRequest("/api/wrapped?time_range=short_term");
  const longRange = await demoApiRequest("/api/wrapped?time_range=long_term");
  const playlist = await demoApiRequest("/api/create-playlist/late%20night%20drive", {
    method: "POST",
    body: JSON.stringify({ familiarity: .42 }),
  });

  assert.equal(shortRange.data.top_artists[0].name, "Michael Jackson");
  assert.equal(shortRange.data.top_tracks[0].name, "Billie Jean");
  assert.notEqual(shortRange.data.top_artists[1].name, longRange.data.top_artists[1].name);
  assert.notEqual(shortRange.data.listening_personality.title, longRange.data.listening_personality.title);
  assert.equal(playlist.data.demo_mode, true);
  assert.equal(playlist.data.playlist_url, "");
  assert.ok(playlist.data.tracks.length >= 6);
  assert.match(playlist.data.summary, /Demo Mode/);
});
