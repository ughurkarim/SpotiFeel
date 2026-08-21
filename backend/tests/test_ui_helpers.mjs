import assert from "node:assert/strict";
import test from "node:test";

import {
  getLocalDayKey,
  mergeDailyHistory,
  readDailyHistory,
  writeDailyHistory,
} from "../js/history.js";
import { getHeroTitleTier } from "../js/player.js";

function playAt(date, id) {
  return { played_at: date.toISOString(), track: { id, name: id } };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("title tiers retain the large treatment for short names and scale the Barbie example", () => {
  assert.equal(getHeroTitleTier("Runaway"), "short");
  assert.equal(getHeroTitleTier("Midnight City (Live)"), "medium");
  assert.equal(getHeroTitleTier("Dance The Night - From Barbie The Album"), "long");
  assert.equal(
    getHeroTitleTier("An Extremely Long Song Title (Live at Somewhere) - 25th Anniversary Remaster Featuring Several Artists"),
    "extreme"
  );
});

test("daily history follows the browser's local midnight and preserves separate repeat plays", () => {
  const reference = new Date(2026, 7, 20, 12, 0, 0);
  const first = playAt(new Date(2026, 7, 20, 8, 0, 0), "repeat");
  const second = playAt(new Date(2026, 7, 20, 10, 0, 0), "repeat");
  const yesterday = playAt(new Date(2026, 7, 19, 23, 59, 0), "old");

  const merged = mergeDailyHistory([first], [first, second, yesterday], reference);

  assert.equal(getLocalDayKey(reference), "2026-08-20");
  assert.deepEqual(merged.map((item) => item.track.id), ["repeat", "repeat"]);
  assert.deepEqual(merged.map((item) => item.played_at), [second.played_at, first.played_at]);
});

test("observed daily history survives a reload but expires on the next local day", () => {
  const storage = memoryStorage();
  const today = new Date(2026, 7, 20, 12, 0, 0);
  const nextDay = new Date(2026, 7, 21, 12, 0, 0);
  const item = playAt(new Date(2026, 7, 20, 9, 30, 0), "saved");

  writeDailyHistory(storage, [item], today);

  assert.deepEqual(readDailyHistory(storage, today), [item]);
  assert.deepEqual(readDailyHistory(storage, nextDay), []);
});
