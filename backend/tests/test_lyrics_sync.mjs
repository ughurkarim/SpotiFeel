import assert from "node:assert/strict";
import test from "node:test";

import { findActiveLyricIndex, parseSyncedLyrics } from "../js/lyrics.js";

test("uses the LRC timestamps exactly when selecting the active line", () => {
  const timeline = parseSyncedLyrics(
    "[00:10.00]First line\n[00:14.50]Second line\n[00:22.125]Third line",
    30_000
  );

  assert.deepEqual(timeline.map(({ start }) => start), [10_000, 14_500, 22_125]);
  assert.equal(findActiveLyricIndex(timeline, 9_999), -1);
  assert.equal(findActiveLyricIndex(timeline, 10_000), 0);
  assert.equal(findActiveLyricIndex(timeline, 14_499), 0);
  assert.equal(findActiveLyricIndex(timeline, 14_500), 1);
  assert.equal(findActiveLyricIndex(timeline, 22_125), 2);
});

test("forward and backward seeks resolve directly from the new playback position", () => {
  const timeline = parseSyncedLyrics(
    "[00:05.00]Intro\n[00:18.00]Verse\n[00:42.00]Chorus\n[01:04.00]Bridge",
    90_000
  );

  assert.equal(findActiveLyricIndex(timeline, 43_000), 2);
  assert.equal(findActiveLyricIndex(timeline, 7_000), 0);
  assert.equal(findActiveLyricIndex(timeline, 65_000), 3);
});

test("a paused position stays on the same lyric and resume follows real elapsed position", () => {
  const timeline = parseSyncedLyrics(
    "[00:03.00]One\n[00:08.00]Two\n[00:12.00]Three",
    20_000
  );
  const pausedPosition = 8_500;

  assert.equal(findActiveLyricIndex(timeline, pausedPosition), 1);
  assert.equal(findActiveLyricIndex(timeline, pausedPosition), 1);
  assert.equal(findActiveLyricIndex(timeline, pausedPosition + 4_000), 2);
});

test("honors an LRC offset and accepts a single genuinely timestamped line", () => {
  const timeline = parseSyncedLyrics("[offset:+250]\n[00:02.00]Only line", 8_000);

  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].start, 2_250);
  assert.equal(findActiveLyricIndex(timeline, 2_249), -1);
  assert.equal(findActiveLyricIndex(timeline, 2_250), 0);
});

test("plain lyrics never receive artificial timestamps", () => {
  assert.deepEqual(parseSyncedLyrics("First line\nSecond line\nThird line", 180_000), []);
});
