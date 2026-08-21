import { apiRequest, setCsrfToken } from "./js/api.js";
import { state } from "./js/state.js";
import {
  formatDuration as fmt,
  getTrackKey,
  getArtistLabel,
  getHeroTitleTier,
  HERO_TITLE_TIERS,
} from "./js/player.js";
import {
  clearDailyHistory,
  getLocalDayKey,
  mergeDailyHistory,
  readDailyHistory,
  writeDailyHistory,
} from "./js/history.js";
import { buildPlaylistPayload } from "./js/playlists.js";
import { hasRecommendationGroups } from "./js/recommendations.js";
import { canvasBlob } from "./js/wrapped.js";
import { normalizeGenreName } from "./js/theme.js";
import { buildLyricLines, findActiveLyricIndex, parseSyncedLyrics } from "./js/lyrics.js";

const POLL_INTERVALS = {
  session: 60000,
  nowPlaying: 2000,
  recentTracks: 45000,
};

const REQUEST_GAPS = {
  nowPlaying: 1000,
  recentTracks: 12000,
};

const THEME_PALETTES = {
  default: {
    bgBase: "#071315",
    bgDepth: "#040a0c",
    text: "#f4efe6",
    textSoft: "#d1d6d0",
    muted: "#839893",
    accent: "#5ee1d0",
    accentStrong: "#665f9a",
    accentSoft: "rgba(94, 225, 208, 0.12)",
    accentShadow: "rgba(94, 225, 208, 0.16)",
    accentInk: "#041312",
    border: "rgba(177, 229, 220, 0.17)",
    panel: "#0b1b1d",
    panelStrong: "#040a0c",
    panelSoft: "#102427",
    dominant: "#176967",
    secondary: "#665f9a",
    highlight: "#d9fff7",
    blob1: "rgba(23, 105, 103, 0.34)",
    blob2: "rgba(102, 95, 154, 0.2)",
    blob3: "rgba(94, 225, 208, 0.12)",
    blob4: "rgba(244, 239, 230, 0.08)",
    heroWash: "linear-gradient(180deg, rgba(4, 10, 12, 0.18), rgba(4, 10, 12, 0.84))",
    heroGlow: "rgba(23, 105, 103, 0.2)",
    youtubeBg: "#244b4a",
    youtubeBgHover: "#2d5d5b",
  },
  pop: {
    bgBase: "#131019",
    bgDepth: "#0d0b12",
    text: "#fbf7fc",
    textSoft: "#f0dfea",
    muted: "#b7a7b6",
    accent: "#f0b8d4",
    accentStrong: "#f8dcb3",
    accentSoft: "rgba(240, 184, 212, 0.18)",
    accentShadow: "rgba(240, 184, 212, 0.22)",
    accentInk: "#19121a",
    border: "rgba(255, 230, 242, 0.12)",
    panel: "rgba(28, 19, 31, 0.64)",
    panelStrong: "rgba(17, 12, 20, 0.82)",
    panelSoft: "rgba(36, 24, 39, 0.48)",
    blob1: "rgba(239, 171, 205, 0.56)",
    blob2: "rgba(245, 204, 154, 0.34)",
    blob3: "rgba(199, 164, 255, 0.34)",
    blob4: "rgba(255, 232, 188, 0.2)",
    youtubeBg: "#9d6b61",
    youtubeBgHover: "#b4796d",
  },
  hipHop: {
    bgBase: "#121017",
    bgDepth: "#0a0910",
    text: "#faf8fb",
    textSoft: "#efe5ee",
    muted: "#afa6b7",
    accent: "#d5b3ff",
    accentStrong: "#f3caa0",
    accentSoft: "rgba(213, 179, 255, 0.18)",
    accentShadow: "rgba(213, 179, 255, 0.2)",
    accentInk: "#15111a",
    border: "rgba(240, 225, 255, 0.11)",
    panel: "rgba(26, 20, 34, 0.64)",
    panelStrong: "rgba(15, 11, 21, 0.82)",
    panelSoft: "rgba(34, 26, 43, 0.48)",
    blob1: "rgba(199, 144, 255, 0.52)",
    blob2: "rgba(122, 162, 255, 0.34)",
    blob3: "rgba(244, 188, 137, 0.34)",
    blob4: "rgba(255, 220, 173, 0.2)",
    youtubeBg: "#8d655d",
    youtubeBgHover: "#a5756c",
  },
  rock: {
    bgBase: "#111218",
    bgDepth: "#090a0f",
    text: "#f7f8fb",
    textSoft: "#dde3eb",
    muted: "#a5afbc",
    accent: "#9ec4e7",
    accentStrong: "#f0c1b6",
    accentSoft: "rgba(158, 196, 231, 0.18)",
    accentShadow: "rgba(158, 196, 231, 0.2)",
    accentInk: "#11161a",
    border: "rgba(230, 238, 255, 0.11)",
    panel: "rgba(18, 22, 31, 0.66)",
    panelStrong: "rgba(10, 12, 19, 0.82)",
    panelSoft: "rgba(24, 31, 42, 0.48)",
    blob1: "rgba(129, 176, 226, 0.48)",
    blob2: "rgba(243, 179, 160, 0.28)",
    blob3: "rgba(178, 149, 226, 0.24)",
    blob4: "rgba(255, 216, 180, 0.18)",
    youtubeBg: "#87685f",
    youtubeBgHover: "#9c786d",
  },
  indie: {
    bgBase: "#101418",
    bgDepth: "#090c10",
    text: "#f8f8f5",
    textSoft: "#e5e4dc",
    muted: "#adb0a6",
    accent: "#b9d7b0",
    accentStrong: "#f0d4a8",
    accentSoft: "rgba(185, 215, 176, 0.18)",
    accentShadow: "rgba(185, 215, 176, 0.2)",
    accentInk: "#151713",
    border: "rgba(237, 241, 227, 0.11)",
    panel: "rgba(20, 25, 26, 0.66)",
    panelStrong: "rgba(11, 15, 16, 0.82)",
    panelSoft: "rgba(28, 34, 35, 0.48)",
    blob1: "rgba(173, 214, 163, 0.46)",
    blob2: "rgba(150, 191, 223, 0.3)",
    blob3: "rgba(240, 202, 149, 0.26)",
    blob4: "rgba(247, 227, 182, 0.18)",
    youtubeBg: "#8f6f60",
    youtubeBgHover: "#a78070",
  },
  jazz: {
    bgBase: "#131116",
    bgDepth: "#0b0a0e",
    text: "#faf8f4",
    textSoft: "#eee0d2",
    muted: "#b7ab9d",
    accent: "#d8c0a1",
    accentStrong: "#8fc9c2",
    accentSoft: "rgba(216, 192, 161, 0.18)",
    accentShadow: "rgba(216, 192, 161, 0.2)",
    accentInk: "#171410",
    border: "rgba(245, 229, 208, 0.11)",
    panel: "rgba(28, 22, 25, 0.66)",
    panelStrong: "rgba(16, 12, 15, 0.84)",
    panelSoft: "rgba(35, 27, 31, 0.5)",
    blob1: "rgba(208, 172, 121, 0.42)",
    blob2: "rgba(109, 178, 172, 0.3)",
    blob3: "rgba(147, 118, 210, 0.24)",
    blob4: "rgba(255, 221, 179, 0.18)",
    youtubeBg: "#90655c",
    youtubeBgHover: "#a8756b",
  },
  classical: {
    bgBase: "#12141d",
    bgDepth: "#0a0c13",
    text: "#faf8fb",
    textSoft: "#ebe4f2",
    muted: "#aca6b5",
    accent: "#d4c4f1",
    accentStrong: "#b7d5f4",
    accentSoft: "rgba(212, 196, 241, 0.18)",
    accentShadow: "rgba(212, 196, 241, 0.2)",
    accentInk: "#14141b",
    border: "rgba(238, 230, 255, 0.11)",
    panel: "rgba(22, 24, 35, 0.66)",
    panelStrong: "rgba(11, 13, 21, 0.82)",
    panelSoft: "rgba(29, 32, 45, 0.48)",
    blob1: "rgba(203, 178, 246, 0.44)",
    blob2: "rgba(164, 198, 241, 0.34)",
    blob3: "rgba(245, 219, 179, 0.22)",
    blob4: "rgba(255, 242, 221, 0.18)",
    youtubeBg: "#88697b",
    youtubeBgHover: "#9d7c90",
  },
  edm: {
    bgBase: "#0d1220",
    bgDepth: "#080c16",
    text: "#f8f8fd",
    textSoft: "#e2e3f2",
    muted: "#a8abc5",
    accent: "#91dfff",
    accentStrong: "#d6b7ff",
    accentSoft: "rgba(145, 223, 255, 0.18)",
    accentShadow: "rgba(145, 223, 255, 0.22)",
    accentInk: "#10151b",
    border: "rgba(228, 242, 255, 0.11)",
    panel: "rgba(16, 23, 39, 0.66)",
    panelStrong: "rgba(9, 13, 23, 0.82)",
    panelSoft: "rgba(22, 31, 50, 0.48)",
    blob1: "rgba(111, 226, 255, 0.54)",
    blob2: "rgba(212, 142, 255, 0.34)",
    blob3: "rgba(253, 174, 203, 0.28)",
    blob4: "rgba(255, 229, 188, 0.16)",
    youtubeBg: "#706792",
    youtubeBgHover: "#8177a6",
  },
  metal: {
    bgBase: "#121216",
    bgDepth: "#09090c",
    text: "#f6f6f8",
    textSoft: "#dfdfe4",
    muted: "#aaaab5",
    accent: "#c7c6d4",
    accentStrong: "#b7d0d9",
    accentSoft: "rgba(199, 198, 212, 0.16)",
    accentShadow: "rgba(199, 198, 212, 0.16)",
    accentInk: "#141418",
    border: "rgba(235, 235, 242, 0.1)",
    panel: "rgba(22, 22, 28, 0.7)",
    panelStrong: "rgba(10, 10, 14, 0.84)",
    panelSoft: "rgba(28, 28, 36, 0.5)",
    blob1: "rgba(154, 154, 168, 0.34)",
    blob2: "rgba(125, 150, 167, 0.26)",
    blob3: "rgba(204, 163, 150, 0.2)",
    blob4: "rgba(255, 223, 195, 0.14)",
    youtubeBg: "#796460",
    youtubeBgHover: "#8b7570",
  },
  country: {
    bgBase: "#131118",
    bgDepth: "#0b0a0f",
    text: "#f9f8f5",
    textSoft: "#ede4d8",
    muted: "#b4ac9f",
    accent: "#e3c38c",
    accentStrong: "#b7cfc6",
    accentSoft: "rgba(227, 195, 140, 0.18)",
    accentShadow: "rgba(227, 195, 140, 0.2)",
    accentInk: "#17140f",
    border: "rgba(247, 231, 206, 0.11)",
    panel: "rgba(28, 23, 23, 0.66)",
    panelStrong: "rgba(16, 13, 13, 0.82)",
    panelSoft: "rgba(36, 29, 28, 0.48)",
    blob1: "rgba(227, 187, 111, 0.42)",
    blob2: "rgba(136, 181, 191, 0.28)",
    blob3: "rgba(212, 165, 149, 0.22)",
    blob4: "rgba(255, 228, 181, 0.16)",
    youtubeBg: "#916958",
    youtubeBgHover: "#a77a67",
  },
  rnb: {
    bgBase: "#151019",
    bgDepth: "#0c0910",
    text: "#fbf7fb",
    textSoft: "#f1dfeb",
    muted: "#b9a4b2",
    accent: "#f1b8cf",
    accentStrong: "#c6c0f5",
    accentSoft: "rgba(241, 184, 207, 0.18)",
    accentShadow: "rgba(241, 184, 207, 0.22)",
    accentInk: "#19111a",
    border: "rgba(248, 230, 239, 0.12)",
    panel: "rgba(30, 19, 30, 0.66)",
    panelStrong: "rgba(18, 11, 18, 0.82)",
    panelSoft: "rgba(38, 24, 39, 0.48)",
    blob1: "rgba(238, 162, 194, 0.5)",
    blob2: "rgba(182, 176, 245, 0.34)",
    blob3: "rgba(247, 205, 158, 0.24)",
    blob4: "rgba(255, 231, 198, 0.16)",
    youtubeBg: "#91637c",
    youtubeBgHover: "#a87590",
  },
  latin: {
    bgBase: "#151015",
    bgDepth: "#0c090d",
    text: "#fbf7f8",
    textSoft: "#f2dfdc",
    muted: "#b7a29e",
    accent: "#f0b48d",
    accentStrong: "#ef93a8",
    accentSoft: "rgba(240, 180, 141, 0.18)",
    accentShadow: "rgba(240, 180, 141, 0.22)",
    accentInk: "#1a130f",
    border: "rgba(252, 225, 214, 0.11)",
    panel: "rgba(31, 20, 24, 0.66)",
    panelStrong: "rgba(18, 11, 14, 0.82)",
    panelSoft: "rgba(39, 25, 30, 0.48)",
    blob1: "rgba(239, 161, 115, 0.48)",
    blob2: "rgba(235, 120, 152, 0.34)",
    blob3: "rgba(189, 153, 232, 0.24)",
    blob4: "rgba(255, 226, 186, 0.16)",
    youtubeBg: "#a06456",
    youtubeBgHover: "#b57565",
  },
  ambient: {
    bgBase: "#10151b",
    bgDepth: "#090d12",
    text: "#f6f8fb",
    textSoft: "#dde8ef",
    muted: "#a6b3bc",
    accent: "#a9d9d5",
    accentStrong: "#bfd0f6",
    accentSoft: "rgba(169, 217, 213, 0.18)",
    accentShadow: "rgba(169, 217, 213, 0.2)",
    accentInk: "#11171a",
    border: "rgba(232, 242, 248, 0.1)",
    panel: "rgba(18, 24, 31, 0.66)",
    panelStrong: "rgba(11, 14, 19, 0.82)",
    panelSoft: "rgba(24, 32, 40, 0.48)",
    blob1: "rgba(148, 214, 206, 0.44)",
    blob2: "rgba(174, 194, 243, 0.32)",
    blob3: "rgba(247, 218, 188, 0.2)",
    blob4: "rgba(255, 244, 222, 0.16)",
    youtubeBg: "#6d778f",
    youtubeBgHover: "#808ba4",
  },
};

const DEFAULT_THEME = THEME_PALETTES.default;

const elements = {
  loginBtn: document.getElementById("login"),
  logoutBtn: document.getElementById("logout"),
  track: document.getElementById("track"),
  dayOverview: document.getElementById("day-overview"),
  dayChapters: document.getElementById("day-chapters"),
  dayPaneButtons: document.querySelectorAll("[data-day-pane]"),
  dayPanes: document.querySelectorAll("[data-day-panel]"),
  recList: document.getElementById("rec-list"),
  playlistLinks: document.getElementById("playlist-links"),
  playlistStatus: document.getElementById("playlist-status"),
  wrappedStatus: document.getElementById("wrapped-status"),
  wrappedShareCard: document.getElementById("wrapped-share-card"),
  wrappedSection: document.getElementById("wrapped-anytime"),
  wrappedMoodGrid: document.getElementById("wrapped-mood-grid"),
  wrappedTopArtists: document.getElementById("wrapped-top-artists"),
  wrappedTopTracks: document.getElementById("wrapped-top-tracks"),
  wrappedTopGenres: document.getElementById("wrapped-top-genres"),
  wrappedReplayedTracks: document.getElementById("wrapped-replayed-tracks"),
  wrappedImageShare: document.getElementById("wrapped-image-share"),
  wrappedRangeButtons: document.querySelectorAll(".wrapped-range[data-range]"),
  wrappedPaneButtons: document.querySelectorAll("[data-wrapped-pane]"),
  wrappedPanes: document.querySelectorAll("[data-wrapped-panel]"),
  main: document.querySelector("main"),
  topbar: document.querySelector(".topbar"),
  sessionBanner: document.getElementById("session-banner"),
  sessionMessage: document.getElementById("session-message"),
  sessionLink: document.getElementById("session-link"),
  playerBar: document.querySelector(".player-bar"),
  playerArtShell: document.getElementById("player-art-shell"),
  playerArt: document.getElementById("player-art"),
  playerTitle: document.getElementById("player-title"),
  playerArtist: document.getElementById("player-artist"),
  currentTime: document.getElementById("current-time"),
  totalTime: document.getElementById("total-time"),
  progressBar: document.querySelector(".progress-bar"),
  heroCurrentTime: document.getElementById("hero-current-time"),
  heroTotalTime: document.getElementById("hero-total-time"),
  heroProgressBar: document.getElementById("hero-progress-bar"),
  ytLink: document.getElementById("yt-link"),
  vinylLabel: document.getElementById("vinyl-label"),
  vinylTitle: document.getElementById("vinyl-title"),
  vinylArtist: document.getElementById("vinyl-artist"),
  vinyl: document.querySelector(".vinyl"),
  vinylToggle: document.getElementById("vinyl-toggle"),
  nowCard: document.getElementById("now-card"),
  nowVinyl: document.getElementById("now-vinyl"),
  nowLyrics: document.getElementById("now-lyrics"),
  nowPlayingSection: document.getElementById("now-playing"),
  heroBackdropCurrent: document.getElementById("hero-backdrop-current"),
  heroBackdropNext: document.getElementById("hero-backdrop-next"),
  heroTitle: document.getElementById("hero-title"),
  heroArtist: document.getElementById("hero-artist"),
  heroContext: document.getElementById("hero-context"),
  heroArc: document.getElementById("hero-arc"),
  heroArcText: document.getElementById("hero-arc-text"),
  moodChip: document.getElementById("mood-chip"),
  heroWaveBars: document.querySelectorAll(".hero-wave-chip__bar"),
  genreChip: document.getElementById("genre-chip"),
  sessionChip: document.getElementById("session-chip"),
  spotifyLink: document.getElementById("spotify-link"),
  roomToggle: document.getElementById("room-toggle"),
  visualizerBars: document.querySelectorAll(".hero-visualizer__bar"),
  lyricsTitle: document.getElementById("lyrics-title"),
  lyricsSubtitle: document.getElementById("lyrics-subtitle"),
  lyricsTiming: document.getElementById("lyrics-timing"),
  lyricsContent: document.getElementById("lyrics-content"),
  lyricsFollow: document.getElementById("lyrics-follow"),
  lyricsLinks: document.getElementById("lyrics-links"),
  lyricsGenius: document.getElementById("lyrics-genius"),
  lyricsSearch: document.getElementById("lyrics-search"),
  playlistCards: document.querySelectorAll(".playlist-card[data-playlist]"),
  playlistPaneButtons: document.querySelectorAll("[data-playlist-pane]"),
  playlistPanes: document.querySelectorAll("[data-playlist-panel]"),
  navLinks: document.querySelectorAll('.topbar nav a[href^="#"]'),
  viewChips: document.querySelectorAll(".now-views .chip"),
};

let lastSync = 0;
let progressMs = 0;
let durationMs = 0;
let isPlaying = false;
let vinylFrame = 0;
let vinylRotation = 0;
let vinylLastTick = 0;
let heroPulseTimer = 0;
let heroTitleFitFrame = 0;
let overviewLayoutFrame = 0;
let trackBoundaryTimer = 0;
let lastPlaybackWakeSync = 0;
const imagePreloadCache = new Set();
const dayPaletteCache = new Map();
const dayArtworkPaletteCache = new Map();

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function mixColors(colorA, colorB, ratio = 0.5) {
  const weight = clamp(ratio, 0, 1);
  return {
    r: colorA.r * (1 - weight) + colorB.r * weight,
    g: colorA.g * (1 - weight) + colorB.g * weight,
    b: colorA.b * (1 - weight) + colorB.b * weight,
  };
}

function rgbToCss(color) {
  return `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
}

function rgbaString(color, alpha) {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${clamp(alpha)})`;
}

function rgbToHsl(color) {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  if (delta !== 0) {
    switch (max) {
      case r:
        h = 60 * (((g - b) / delta) % 6);
        break;
      case g:
        h = 60 * ((b - r) / delta + 2);
        break;
      default:
        h = 60 * ((r - g) / delta + 4);
        break;
    }
  }

  if (h < 0) h += 360;
  return { h, s, l };
}

function hslToRgb({ h, s, l }) {
  const hue = ((h % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = l - chroma / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = chroma;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = chroma;
  } else if (hue < 180) {
    g = chroma;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = chroma;
  } else if (hue < 300) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  return {
    r: (r + match) * 255,
    g: (g + match) * 255,
    b: (b + match) * 255,
  };
}

function colorDistance(colorA, colorB) {
  return Math.sqrt(
    (colorA.r - colorB.r) ** 2 +
      (colorA.g - colorB.g) ** 2 +
      (colorA.b - colorB.b) ** 2
  );
}

function normalizeColorTone(
  color,
  {
    minLightness = 0.18,
    maxLightness = 0.82,
    minSaturation = 0.14,
    maxSaturation = 0.88,
  } = {}
) {
  const hsl = rgbToHsl(color);
  return hslToRgb({
    h: hsl.h,
    s: clamp(hsl.s, minSaturation, maxSaturation),
    l: clamp(hsl.l, minLightness, maxLightness),
  });
}

function relativeLuminance(color) {
  const convert = (value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * convert(color.r) + 0.7152 * convert(color.g) + 0.0722 * convert(color.b);
}

function createArtworkPalette(primary, secondary, accent) {
  const primaryTone = normalizeColorTone(primary, {
    minLightness: 0.18,
    maxLightness: 0.6,
    minSaturation: 0.4,
    maxSaturation: 0.92,
  });
  const secondaryTone = normalizeColorTone(secondary, {
    minLightness: 0.24,
    maxLightness: 0.68,
    minSaturation: 0.34,
    maxSaturation: 0.9,
  });
  const accentTone = normalizeColorTone(accent, {
    minLightness: 0.44,
    maxLightness: 0.76,
    minSaturation: 0.58,
    maxSaturation: 0.96,
  });

  const primaryHsl = rgbToHsl(primaryTone);
  const secondaryHsl = rgbToHsl(secondaryTone);
  const accentHsl = rgbToHsl(accentTone);
  const bgBase = hslToRgb({
    h: primaryHsl.h,
    s: clamp(primaryHsl.s * 0.9, 0.22, 0.58),
    l: 0.095,
  });
  const bgDepth = hslToRgb({
    h: primaryHsl.h,
    s: clamp(primaryHsl.s * 0.64, 0.16, 0.42),
    l: 0.045,
  });
  const gradientLift = hslToRgb({
    h: secondaryHsl.h,
    s: clamp(secondaryHsl.s, 0.38, 0.82),
    l: 0.28,
  });
  const accentStrong = hslToRgb({
    h: accentHsl.h,
    s: clamp(accentHsl.s, 0.34, 0.86),
    l: 0.78,
  });
  const accentInk =
    relativeLuminance(accentTone) > 0.44
      ? hslToRgb({ h: accentHsl.h, s: 0.2, l: 0.11 })
      : hslToRgb({ h: accentHsl.h, s: 0.18, l: 0.96 });
  const text = hslToRgb({ h: primaryHsl.h, s: 0.16, l: 0.968 });
  const textSoft = hslToRgb({ h: secondaryHsl.h, s: 0.14, l: 0.9 });
  const muted = hslToRgb({ h: secondaryHsl.h, s: 0.08, l: 0.7 });
  const panel = mixColors(bgBase, gradientLift, 0.12);
  const panelStrong = mixColors(bgDepth, bgBase, 0.32);
  const panelSoft = mixColors(bgBase, accentTone, 0.18);
  const tertiary = mixColors(secondaryTone, accentTone, 0.45);
  const warmAction = mixColors(accentTone, { r: 126, g: 88, b: 82 }, 0.4);
  const warmActionHover = mixColors(accentStrong, { r: 150, g: 108, b: 96 }, 0.34);

  return {
    bgBase: rgbToCss(bgBase),
    bgDepth: rgbToCss(bgDepth),
    text: rgbToCss(text),
    textSoft: rgbToCss(textSoft),
    muted: rgbToCss(muted),
    accent: rgbToCss(accentTone),
    accentStrong: rgbToCss(accentStrong),
    accentSoft: rgbaString(accentTone, 0.18),
    accentShadow: rgbaString(accentTone, 0.3),
    accentInk: rgbToCss(accentInk),
    border: rgbaString(textSoft, 0.12),
    panel: rgbaString(panel, 0.68),
    panelStrong: rgbaString(panelStrong, 0.84),
    panelSoft: rgbaString(panelSoft, 0.5),
    blob1: rgbaString(primaryTone, 0.4),
    blob2: rgbaString(secondaryTone, 0.34),
    blob3: rgbaString(accentTone, 0.28),
    blob4: rgbaString(tertiary, 0.2),
    dominant: rgbToCss(primaryTone),
    secondary: rgbToCss(secondaryTone),
    highlight: rgbToCss(accentStrong),
    heroWash: `linear-gradient(180deg, ${rgbaString(bgDepth, 0.22)}, ${rgbaString(bgDepth, 0.82)})`,
    heroGlow: rgbaString(mixColors(accentTone, accentStrong, 0.35), 0.18),
    youtubeBg: rgbToCss(warmAction),
    youtubeBgHover: rgbToCss(warmActionHover),
  };
}

function buildArtworkPalette(imageUrl) {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      reject(new Error("no_artwork"));
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        const size = 36;

        if (!context) {
          reject(new Error("canvas_unavailable"));
          return;
        }

        canvas.width = size;
        canvas.height = size;
        context.drawImage(image, 0, 0, size, size);

        const { data } = context.getImageData(0, 0, size, size);
        const buckets = new Map();
        let weightedR = 0;
        let weightedG = 0;
        let weightedB = 0;
        let totalWeight = 0;

        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3] / 255;
          if (alpha < 0.9) continue;

          const color = {
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
          };
          const hsl = rgbToHsl(color);
          if (hsl.l < 0.05 || hsl.l > 0.96) continue;

          const key = [
            Math.round(color.r / 24) * 24,
            Math.round(color.g / 24) * 24,
            Math.round(color.b / 24) * 24,
          ].join("-");
          const weight = 0.7 + hsl.s * 1.5 + (1 - Math.abs(hsl.l - 0.55));
          const bucket = buckets.get(key) || {
            r: 0,
            g: 0,
            b: 0,
            weight: 0,
            count: 0,
          };

          bucket.r += color.r;
          bucket.g += color.g;
          bucket.b += color.b;
          bucket.weight += weight;
          bucket.count += 1;
          buckets.set(key, bucket);

          weightedR += color.r * weight;
          weightedG += color.g * weight;
          weightedB += color.b * weight;
          totalWeight += weight;
        }

        if (!totalWeight || buckets.size === 0) {
          reject(new Error("palette_empty"));
          return;
        }

        const weightedDominant = {
          r: weightedR / totalWeight,
          g: weightedG / totalWeight,
          b: weightedB / totalWeight,
        };

        const swatches = [...buckets.values()]
          .map((bucket) => {
            const color = {
              r: bucket.r / bucket.count,
              g: bucket.g / bucket.count,
              b: bucket.b / bucket.count,
            };
            const hsl = rgbToHsl(color);
            return {
              color,
              saturation: hsl.s,
              lightness: hsl.l,
              score: bucket.weight * (0.7 + hsl.s * 1.5),
            };
          })
          .sort((left, right) => right.score - left.score);

        const primaryEntry =
          swatches.find((swatch) => swatch.lightness > 0.12 && swatch.lightness < 0.72) || swatches[0];
        const primary = primaryEntry?.color || weightedDominant;
        const secondaryEntry =
          swatches.find(
            (swatch) =>
              colorDistance(swatch.color, primary) > 44 &&
              swatch.lightness > 0.14 &&
              swatch.lightness < 0.78
          ) || swatches[1] || primaryEntry;
        const secondary = secondaryEntry?.color || mixColors(weightedDominant, primary, 0.36);
        const accentEntry =
          swatches.find(
            (swatch) =>
              colorDistance(swatch.color, primary) > 54 &&
              colorDistance(swatch.color, secondary) > 42 &&
              swatch.saturation > 0.22 &&
              swatch.lightness > 0.18 &&
              swatch.lightness < 0.82
          ) ||
          swatches.find((swatch) => swatch.saturation > 0.24 && swatch.lightness > 0.18 && swatch.lightness < 0.82) ||
          swatches[0];
        const accent = accentEntry?.color || mixColors(primary, secondary, 0.52);

        resolve(createArtworkPalette(primary, secondary, accent));
      } catch (error) {
        reject(error);
      }
    };

    image.onerror = () => reject(new Error("image_load_failed"));
    image.src = imageUrl;
  });
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char] || char;
  });
}

function formatClockLabel(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCountLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatTimeRange(startValue, endValue) {
  const startLabel = formatClockLabel(startValue);
  const endLabel = formatClockLabel(endValue);
  if (!startLabel) return endLabel || "";
  if (!endLabel || startLabel === endLabel) return startLabel;
  return `${startLabel} - ${endLabel}`;
}

function getTodayBounds(reference = new Date()) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

const DAY_CHAPTER_DEFINITIONS = [
  {
    id: "morning-glow",
    label: "Morning Glow",
    fixedRange: "5 AM – 11:59 AM",
    includes: (minute) => minute >= 5 * 60 && minute < 12 * 60,
  },
  {
    id: "midday-motion",
    label: "Midday Motion",
    fixedRange: "12 PM – 3:59 PM",
    includes: (minute) => minute >= 12 * 60 && minute < 16 * 60,
  },
  {
    id: "golden-hour",
    label: "Golden Hour",
    fixedRange: "4 PM – 7:59 PM",
    includes: (minute) => minute >= 16 * 60 && minute < 20 * 60,
  },
  {
    id: "after-hours",
    label: "After Hours",
    fixedRange: "8 PM – 4:59 AM",
    includes: (minute) => minute < 5 * 60 || minute >= 20 * 60,
  },
];

function getDayMinute(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

function getListeningChapter(value) {
  const minute = getDayMinute(value);
  return DAY_CHAPTER_DEFINITIONS.find((chapter) => chapter.includes(minute)) || DAY_CHAPTER_DEFINITIONS[3];
}

function buildListeningTimeline(items = [], reference = new Date()) {
  const { start, end } = getTodayBounds(reference);
  const currentTime = reference instanceof Date ? reference : new Date(reference);
  const currentLimit = Number.isNaN(currentTime.getTime()) ? end : currentTime;
  const plays = items
    .map((item) => {
      const track = item?.track;
      const playedAt = item?.played_at ? new Date(item.played_at) : null;
      if (!track || !playedAt || Number.isNaN(playedAt.getTime())) return null;
      if (playedAt < start || playedAt >= end || playedAt > currentLimit) return null;
      return {
        track,
        playedAt,
        trackKey: getTrackKey(track),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.playedAt - b.playedAt);

  const chapters = DAY_CHAPTER_DEFINITIONS.map((definition) => ({
    ...definition,
    firstPlayedAt: null,
    lastPlayedAt: null,
    plays: [],
  }));
  const chapterMap = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  plays.forEach((play) => {
    const chapterMeta = getListeningChapter(play.playedAt);
    const chapter = chapterMap.get(chapterMeta.id);
    if (!chapter) return;
    if (!chapter.firstPlayedAt || play.playedAt < chapter.firstPlayedAt) chapter.firstPlayedAt = play.playedAt;
    if (!chapter.lastPlayedAt || play.playedAt > chapter.lastPlayedAt) chapter.lastPlayedAt = play.playedAt;
    chapter.plays.push(play);
  });

  chapters.forEach((chapter) => {
    chapter.rangeLabel = chapter.plays.length
      ? formatTimeRange(chapter.firstPlayedAt, chapter.lastPlayedAt)
      : "No listening yet.";
  });

  return {
    chapters,
    totalPlays: plays.length,
    plays,
    currentTime,
  };
}

function buildTrackSnapshot(item = null, profile = null, mood = null) {
  if (!item) return null;
  return {
    trackKey: getTrackKey(item),
    name: item.name || "Unknown track",
    artist: getArtistLabel(item),
    moodLabel: mood?.label || "",
    audioProfile: profile || inferAudioProfile(state.currentGenre, state.currentTags),
  };
}

function describeSongArc(previousSnapshot, currentSnapshot) {
  if (!previousSnapshot || !currentSnapshot) return "";
  if (previousSnapshot.trackKey === currentSnapshot.trackKey) return "";

  const previousProfile = previousSnapshot.audioProfile || {};
  const currentProfile = currentSnapshot.audioProfile || {};
  const energyDelta = (currentProfile.energy || 0) - (previousProfile.energy || 0);
  const tempoDelta = (currentProfile.tempo || 0) - (previousProfile.tempo || 0);
  const valenceDelta = (currentProfile.valence || 0) - (previousProfile.valence || 0);
  const danceDelta = (currentProfile.danceability || 0) - (previousProfile.danceability || 0);

  if (energyDelta >= 0.14 && tempoDelta >= 8) {
    return `More lift than "${previousSnapshot.name}" with a faster, brighter push.`;
  }
  if (energyDelta <= -0.14 && tempoDelta <= -8) {
    return `A softer landing after "${previousSnapshot.name}", with lower motion and less pressure.`;
  }
  if (valenceDelta >= 0.12) {
    return `Warmer than "${previousSnapshot.name}", with a lighter emotional tone.`;
  }
  if (valenceDelta <= -0.12) {
    return `Darker than "${previousSnapshot.name}", leaning more inward and nocturnal.`;
  }
  if (tempoDelta >= 12) {
    return `It picks the pace up from "${previousSnapshot.name}" without breaking the mood.`;
  }
  if (tempoDelta <= -12) {
    return `It slows the room down after "${previousSnapshot.name}" and lets the space breathe.`;
  }
  if (danceDelta >= 0.12) {
    return `More movement than "${previousSnapshot.name}", but still in the same mood.`;
  }
  if (danceDelta <= -0.12) {
    return `Less movement than "${previousSnapshot.name}", keeping the mood but easing the pulse.`;
  }
  return `It stays close to "${previousSnapshot.name}" while nudging the mood into a new shade.`;
}

function renderHeroArc(text = "") {
  if (!elements.heroArc || !elements.heroArcText) return;
  elements.heroArcText.textContent = text || "";
  elements.heroArc.classList.toggle("hidden", !text);
}

function syncHeroArc() {
  const currentSnapshot = buildTrackSnapshot(
    state.currentItem,
    state.currentAudioProfile || inferAudioProfile(state.currentGenre, state.currentTags),
    state.currentMood
  );
  renderHeroArc(describeSongArc(state.previousTrackSnapshot, currentSnapshot));
}

function resolveDayPalette(imageUrl, fallback) {
  if (!imageUrl) return Promise.resolve(fallback);
  if (!dayPaletteCache.has(imageUrl)) {
    dayPaletteCache.set(
      imageUrl,
      buildArtworkPalette(imageUrl)
        .then((palette) => palette.dominant || palette.accent || fallback)
        .catch(() => fallback)
    );
  }
  return dayPaletteCache.get(imageUrl);
}

function resolveDayArtworkPalette(imageUrl) {
  if (!imageUrl) return Promise.resolve(null);
  if (!dayArtworkPaletteCache.has(imageUrl)) {
    dayArtworkPaletteCache.set(imageUrl, buildArtworkPalette(imageUrl).catch(() => null));
  }
  return dayArtworkPaletteCache.get(imageUrl);
}

function getChapterMostPlayed(chapter) {
  const counts = new Map();
  chapter.plays.forEach((play, index) => {
    const entry = counts.get(play.trackKey) || { count: 0, play, lastIndex: index };
    entry.count += 1;
    entry.play = play;
    entry.lastIndex = index;
    counts.set(play.trackKey, entry);
  });
  return [...counts.values()].sort((left, right) => right.count - left.count || right.lastIndex - left.lastIndex)[0] || null;
}

function getChapterDominantArtist(chapter) {
  const counts = new Map();
  chapter.plays.forEach((play, index) => {
    const artist = getArtistLabel(play.track);
    const entry = counts.get(artist) || { artist, count: 0, lastIndex: index };
    entry.count += 1;
    entry.lastIndex = index;
    counts.set(artist, entry);
  });
  return [...counts.values()].sort((left, right) => right.count - left.count || right.lastIndex - left.lastIndex)[0] || null;
}

function getRepresentativeChapterPlays(chapter, limit = 3) {
  const albums = new Map();
  chapter.plays.forEach((play, index) => {
    const album = play.track?.album || {};
    const imageUrl = album.images?.[0]?.url || "";
    const key = album.id || imageUrl || album.name || play.trackKey;
    const entry = albums.get(key) || { count: 0, play, lastIndex: index };
    entry.count += 1;
    entry.play = play;
    entry.lastIndex = index;
    albums.set(key, entry);
  });
  const ranked = [...albums.values()].sort((left, right) => right.count - left.count || right.lastIndex - left.lastIndex);
  if (ranked.length <= limit) return ranked.map((entry) => entry.play);
  const selected = ranked.slice(0, Math.min(2, limit));
  const selectedKeys = new Set(selected.map((entry) => entry.play.track?.album?.images?.[0]?.url || entry.play.trackKey));
  const recentDistinct = [...albums.values()]
    .sort((left, right) => right.lastIndex - left.lastIndex)
    .find((entry) => !selectedKeys.has(entry.play.track?.album?.images?.[0]?.url || entry.play.trackKey));
  if (recentDistinct && selected.length < limit) selected.push(recentDistinct);
  return selected.slice(0, limit).map((entry) => entry.play);
}

function focusListeningChapter(chapterId) {
  setDayPane("chapters");
  window.requestAnimationFrame(() => {
    const chapter = elements.dayChapters?.querySelector(`[data-chapter-id="${chapterId}"]`);
    chapter?.focus({ preventScroll: true });
  });
}

function applyOverviewChapterPalette(element, representativePlays) {
  const fallback = ["#b55a3a", "#355f75", "#6d5577"];
  Promise.all(representativePlays.map((play) => {
    const imageUrl = play.track?.album?.images?.[0]?.url || "";
    return resolveDayArtworkPalette(imageUrl);
  })).then((palettes) => {
    const primary = palettes[0];
    const colors = [
      primary?.dominant,
      palettes[1]?.secondary || palettes[1]?.dominant || primary?.secondary,
      palettes[2]?.highlight || palettes[2]?.accent || palettes[2]?.dominant || primary?.highlight || primary?.accent,
    ];
    colors.forEach((color, index) => {
      element.style.setProperty(`--overview-color-${index + 1}`, color || fallback[index]);
    });
  });
}

function createDayOverviewChapter(chapter, currentTime) {
  const hasListening = chapter.plays.length > 0;
  const temporalState = getDayChapterTemporalState(chapter, getDayMinute(currentTime));
  const element = document.createElement(hasListening ? "button" : "article");
  const representativePlays = hasListening ? getRepresentativeChapterPlays(chapter) : [];
  const mostPlayed = hasListening ? getChapterMostPlayed(chapter) : null;
  const dominantArtist = hasListening ? getChapterDominantArtist(chapter) : null;
  const statusLabel = temporalState === "current" ? "No listening yet" : temporalState === "future" ? "Later today" : "Quiet chapter";
  const artworkMarkup = representativePlays.map((play, index) => {
    const imageUrl = play.track?.album?.images?.[0]?.url || "";
    return imageUrl
      ? `<img class="day-overview-chapter__cover day-overview-chapter__cover--${index + 1}" src="${escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
      : `<span class="day-overview-chapter__cover day-overview-chapter__cover--${index + 1}" aria-hidden="true"></span>`;
  }).join("");
  element.className = `day-overview-chapter ${hasListening ? "has-listening" : "is-empty"} is-${temporalState} art-count-${representativePlays.length}`;
  element.dataset.overviewChapterId = chapter.id;
  if (hasListening) {
    element.type = "button";
    element.setAttribute("aria-label", `Open ${chapter.label} in Listening Chapters`);
  }
  element.innerHTML = `
    <header class="day-overview-chapter__header">
      <span>${escapeHtml(temporalState === "current" ? "Now" : chapter.fixedRange)}</span>
      <h3>${escapeHtml(chapter.label)}</h3>
    </header>
    <div class="day-overview-chapter__visual" aria-hidden="true">
      <span class="day-overview-chapter__field day-overview-chapter__field--one"></span>
      <span class="day-overview-chapter__field day-overview-chapter__field--two"></span>
      <span class="day-overview-chapter__field day-overview-chapter__field--three"></span>
      <div class="day-overview-chapter__art">${artworkMarkup}</div>
    </div>
    <div class="day-overview-chapter__facts">
      ${hasListening
        ? `<strong>${escapeHtml(chapter.rangeLabel)} <i>·</i> ${escapeHtml(formatCountLabel(chapter.plays.length, "play"))}</strong>
           <span>${escapeHtml(chapter.plays.length === 1
             ? `${mostPlayed.play.track.name} · ${getArtistLabel(mostPlayed.play.track)}`
             : mostPlayed.count > 1
               ? `Most played: ${mostPlayed.play.track.name} · ${mostPlayed.count}×`
               : `Dominant artist: ${dominantArtist.artist}`)}</span>`
        : `<strong>${escapeHtml(chapter.fixedRange)}</strong><span>${escapeHtml(statusLabel)}</span>`}
    </div>
  `;
  if (hasListening) {
    applyOverviewChapterPalette(element, representativePlays);
    element.addEventListener("click", () => focusListeningChapter(chapter.id));
  }
  return element;
}

function parseDayColor(value = "") {
  const rgbMatch = String(value).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgbMatch) return { r: Number(rgbMatch[1]), g: Number(rgbMatch[2]), b: Number(rgbMatch[3]) };
  const hexMatch = String(value).trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!hexMatch) return null;
  const expanded = hexMatch[1].length === 3
    ? [...hexMatch[1]].map((part) => `${part}${part}`).join("")
    : hexMatch[1];
  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

function dayColorSeed(value = "") {
  let seed = 2166136261;
  for (const char of String(value)) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

const DAY_PERIOD_RANGES = {
  "morning-glow": { start: 5 * 60, end: 12 * 60, startLabel: "5 AM", endLabel: "12 PM" },
  "midday-motion": { start: 12 * 60, end: 16 * 60, startLabel: "12 PM", endLabel: "4 PM" },
  "golden-hour": { start: 16 * 60, end: 20 * 60, startLabel: "4 PM", endLabel: "8 PM" },
  "after-hours": { start: 20 * 60, end: 29 * 60, startLabel: "8 PM", endLabel: "5 AM" },
};

function getDayPeriodProgress(value, chapter) {
  const range = DAY_PERIOD_RANGES[chapter.id] || DAY_PERIOD_RANGES["morning-glow"];
  let minute = getDayMinute(value);
  if (chapter.id === "after-hours" && minute < 5 * 60) minute += 24 * 60;
  return clamp((minute - range.start) / Math.max(1, range.end - range.start), 0, 1);
}

function getDayOverviewPeriodPlays(chapter, timeline) {
  if (chapter.id !== "after-hours") return [...chapter.plays];
  const currentMinute = getDayMinute(timeline.currentTime);
  if (currentMinute >= 20 * 60) return chapter.plays.filter((play) => getDayMinute(play.playedAt) >= 20 * 60);
  if (currentMinute < 5 * 60) return chapter.plays.filter((play) => getDayMinute(play.playedAt) < 5 * 60);
  return [...chapter.plays];
}

function getDayTimelineTrackKey(play) {
  return play.trackKey || `${play.track?.name || "track"}:${getArtistLabel(play.track)}`;
}

function buildDayTimelineEvents(chapter, plays) {
  const positioned = plays
    .map((play) => ({ ...play, position: getDayPeriodProgress(play.playedAt, chapter) }))
    .sort((left, right) => left.position - right.position || left.playedAt - right.playedAt);
  const nearbyReplayGap = 10 * 60 * 1000;
  const nearbyReplaySpan = 16 * 60 * 1000;
  const groups = [];
  positioned.forEach((play) => {
    const key = getDayTimelineTrackKey(play);
    const playedAt = new Date(play.playedAt).getTime();
    const nearbyGroup = [...groups].reverse().find((group) => (
      group.key === key
      && playedAt - group.lastPlayedAt <= nearbyReplayGap
      && playedAt - group.firstPlayedAt <= nearbyReplaySpan
    ));
    if (nearbyGroup) {
      nearbyGroup.plays.push(play);
      nearbyGroup.lastPosition = play.position;
      nearbyGroup.lastPlayedAt = playedAt;
      nearbyGroup.position = nearbyGroup.plays.reduce((total, item) => total + item.position, 0) / nearbyGroup.plays.length;
      return;
    }
    groups.push({
      key,
      play,
      plays: [play],
      position: play.position,
      lastPosition: play.position,
      firstPlayedAt: playedAt,
      lastPlayedAt: playedAt,
      lane: 0,
    });
  });

  groups.sort((left, right) => left.position - right.position || left.firstPlayedAt - right.firstPlayedAt);
  const laneEnds = [-1, -1];
  const laneCounts = [0, 0];
  let previousVisualPosition = -1;
  groups.forEach((group, index) => {
    const availableLanes = laneEnds
      .map((position, lane) => ({ lane, available: group.position - position >= 0.052 }))
      .filter((entry) => entry.available)
      .map((entry) => entry.lane);
    let lane = availableLanes.length === 2 ? index % 2 : availableLanes[0];
    if (lane === undefined) lane = laneEnds.indexOf(Math.min(...laneEnds));
    group.lane = lane;
    const minimumVisualPosition = laneEnds[lane] + 0.047;
    const collisionAdjustedPosition = Math.min(
      0.975,
      Math.max(group.position, Math.min(group.position + 0.018, minimumVisualPosition))
    );
    group.visualPosition = Math.min(
      0.975,
      Math.max(collisionAdjustedPosition, Math.min(group.position + 0.018, previousVisualPosition + 0.001))
    );
    group.verticalNudge = ((laneCounts[lane] % 3) - 1) * 3;
    laneCounts[lane] += 1;
    laneEnds[lane] = group.visualPosition;
    previousVisualPosition = group.visualPosition;
  });
  return groups;
}

function getDayPeriodHighlights(chapter, plays) {
  const positioned = plays
    .map((play) => ({ ...play, position: getDayPeriodProgress(play.playedAt, chapter) }))
    .sort((left, right) => left.position - right.position || left.playedAt - right.playedAt);
  if (!positioned.length) return null;
  const counts = new Map();
  positioned.forEach((play, index) => {
    const key = getDayTimelineTrackKey(play);
    const entry = counts.get(key) || { play, count: 0, firstIndex: index };
    entry.count += 1;
    counts.set(key, entry);
  });
  const mostReplayed = [...counts.values()].sort((left, right) => right.count - left.count || left.firstIndex - right.firstIndex)[0];
  return {
    first: positioned[0],
    mostReplayed,
    latest: positioned.at(-1),
  };
}

function getDayTimelineArtwork(play) {
  return play?.track?.album?.images?.[0]?.url || "";
}

function createDayHighlightMarkup(label, play, detail, featured = false) {
  const imageUrl = getDayTimelineArtwork(play);
  const title = play?.track?.name || "Unknown track";
  const artist = getArtistLabel(play?.track);
  return `
    <article class="day-period-highlight${featured ? " is-featured" : ""}${imageUrl ? "" : " has-no-art"}">
      <p>${escapeHtml(label)}</p>
      ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(`${title} album artwork`)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}
      <h4>${escapeHtml(title)}</h4>
      <span>${escapeHtml(artist)}</span>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

function createDayTimelineEvent(group) {
  const event = document.createElement("article");
  const play = group.play;
  const imageUrl = getDayTimelineArtwork(play);
  const title = play.track?.name || "Unknown track";
  const artist = getArtistLabel(play.track);
  const timeLabel = formatClockLabel(play.playedAt);
  event.className = `day-timeline-event ${group.lane === 0 ? "is-lane-upper" : "is-lane-lower"}${imageUrl ? "" : " has-no-art"}`;
  event.tabIndex = 0;
  event.style.setProperty("--day-event-position", `${(clamp(group.visualPosition ?? group.position, 0.025, 0.975) * 100).toFixed(3)}%`);
  event.style.setProperty("--day-event-nudge", `${group.verticalNudge || 0}px`);
  event.style.setProperty("--day-event-lane", group.lane);
  event.setAttribute("aria-label", `${timeLabel}, ${title} by ${artist}${group.plays.length > 1 ? `, ${group.plays.length} plays` : ""}`);
  event.innerHTML = `
    ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}
    ${group.plays.length > 1 ? `<b>${group.plays.length}×</b>` : ""}
    <i aria-hidden="true"></i>
    <span class="day-timeline-event__tooltip" role="tooltip">
      <strong>${escapeHtml(timeLabel)}</strong>
      <em>${escapeHtml(title)}</em>
      <small>${escapeHtml(artist)}${group.plays.length > 1 ? ` · ${group.plays.length} plays` : ""}</small>
    </span>
  `;
  return event;
}

function renderDayOverviewPeriod(overview, timeline, chapter) {
  const panel = overview.querySelector(".day-period-panel");
  if (!panel) return;
  const plays = getDayOverviewPeriodPlays(chapter, timeline);
  const range = DAY_PERIOD_RANGES[chapter.id];
  overview.querySelectorAll(".day-period-selector").forEach((button) => {
    const active = button.dataset.dayPeriod === chapter.id;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  panel.setAttribute("aria-labelledby", `day-period-${chapter.id}`);
  panel.innerHTML = "";

  if (!plays.length) {
    panel.innerHTML = `<div class="day-period-empty"><strong>Nothing played during ${escapeHtml(chapter.label)} yet.</strong><span>${escapeHtml(chapter.fixedRange)}</span></div>`;
    return;
  }

  const timelineElement = document.createElement("section");
  const events = buildDayTimelineEvents(chapter, plays);
  const isCurrent = getListeningChapter(timeline.currentTime).id === chapter.id;
  const nowPosition = getDayPeriodProgress(timeline.currentTime, chapter);
  timelineElement.className = "day-period-timeline";
  timelineElement.setAttribute("aria-label", `${chapter.label} listening timeline, ${range.startLabel} to ${range.endLabel}`);
  timelineElement.innerHTML = `
    <div class="day-period-timeline__events"></div>
    <div class="day-period-timeline__rail" aria-hidden="true">
      <span>${escapeHtml(range.startLabel)}</span>
      <i></i>
      <span>${escapeHtml(range.endLabel)}</span>
      ${isCurrent ? `<b style="--day-period-now:${(clamp(nowPosition, 0, 1) * 100).toFixed(3)}%">Now</b>` : ""}
    </div>
  `;
  applyOverviewChapterPalette(timelineElement, getRepresentativeChapterPlays({ ...chapter, plays }));
  const eventLayer = timelineElement.querySelector(".day-period-timeline__events");
  events.forEach((event) => eventLayer.appendChild(createDayTimelineEvent(event)));

  const highlights = getDayPeriodHighlights(chapter, plays);
  const highlightGrid = document.createElement("section");
  highlightGrid.className = "day-period-highlights";
  highlightGrid.setAttribute("aria-label", `${chapter.label} highlights`);
  highlightGrid.innerHTML = [
    createDayHighlightMarkup("First Song", highlights.first, formatClockLabel(highlights.first.playedAt)),
    createDayHighlightMarkup(
      "Most Replayed",
      highlights.mostReplayed.play,
      `${highlights.mostReplayed.count} ${highlights.mostReplayed.count === 1 ? "play" : "plays"}`,
      true
    ),
    createDayHighlightMarkup("Latest Song", highlights.latest, formatClockLabel(highlights.latest.playedAt)),
  ].join("");
  panel.append(timelineElement, highlightGrid);
}

function createDayOverview(timeline) {
  const overview = document.createElement("div");
  const currentChapterId = getListeningChapter(timeline.currentTime).id;
  const currentChapter = timeline.chapters.find((chapter) => chapter.id === currentChapterId) || timeline.chapters[0];
  overview.className = "day-overview day-overview--artwork-timeline";
  overview.innerHTML = `
    <div class="day-period-selectors" role="tablist" aria-label="Day periods">
      ${DAY_CHAPTER_DEFINITIONS.map((chapter) => `<button id="day-period-${chapter.id}" class="day-period-selector" type="button" role="tab" data-day-period="${chapter.id}" aria-controls="day-period-panel">${escapeHtml(chapter.label)}</button>`).join("")}
    </div>
    <div id="day-period-panel" class="day-period-panel" role="tabpanel"></div>
  `;
  overview.querySelectorAll(".day-period-selector").forEach((button) => {
    button.addEventListener("click", () => {
      const chapter = timeline.chapters.find((item) => item.id === button.dataset.dayPeriod) || currentChapter;
      renderDayOverviewPeriod(overview, timeline, chapter);
    });
  });
  renderDayOverviewPeriod(overview, timeline, currentChapter);
  return overview;
}

function createDayMoment(play, colorIndex = 0) {
  const moment = document.createElement("button");
  const imageUrl = play.track?.album?.images?.[0]?.url || "";
  moment.type = "button";
  moment.className = "day-moment";
  moment.style.setProperty("--moment-color", ["#ff6a2a", "#28b8d8", "#7868e6", "#e3bc36"][colorIndex % 4]);
  moment.setAttribute(
    "aria-label",
    `Play ${play.track?.name || "track"} by ${getArtistLabel(play.track)}, heard ${formatClockLabel(play.playedAt)}`
  );
  moment.innerHTML = `
    <span class="day-moment__time">${escapeHtml(formatClockLabel(play.playedAt))}</span>
    <span class="day-moment__art">
      ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : '<span aria-hidden="true"></span>'}
    </span>
    <span class="day-moment__copy">
      <strong>${escapeHtml(play.track?.name || "Unknown track")}</strong>
      <span>${escapeHtml(getArtistLabel(play.track))}</span>
    </span>
  `;
  moment.addEventListener("click", () => playTrack(play.track, moment));
  resolveDayPalette(imageUrl, moment.style.getPropertyValue("--moment-color")).then((color) => {
    moment.style.setProperty("--moment-color", color);
  });
  return moment;
}

function getDayChapterTemporalState(chapter, minute) {
  if (chapter.includes(minute)) return "current";
  if (chapter.id === "morning-glow") return minute < 5 * 60 ? "future" : "complete";
  if (chapter.id === "midday-motion") return minute < 12 * 60 ? "future" : "complete";
  if (chapter.id === "golden-hour") return minute < 16 * 60 ? "future" : "complete";
  return minute >= 5 * 60 && minute < 20 * 60 ? "future" : "complete";
}

function createListeningChapter(chapter, options = {}) {
  const section = document.createElement("section");
  const tracksId = `day-chapter-tracks-${chapter.id}`;
  const hasListening = chapter.plays.length > 0;
  const temporalState = getDayChapterTemporalState(chapter, getDayMinute(options.currentTime));
  const isFuture = !hasListening && temporalState === "future";
  const isCurrent = !hasListening && temporalState === "current";
  const visibleCount = options.visibleCount || 3;
  section.className = `day-chapter ${hasListening ? "day-chapter--populated" : "day-chapter--preview"} is-${hasListening ? "populated" : temporalState}`;
  section.dataset.chapterId = chapter.id;
  section.tabIndex = -1;
  section.innerHTML = `
    <header class="day-chapter__header">
      <p>${escapeHtml(hasListening ? formatCountLabel(chapter.plays.length, "play") : chapter.fixedRange)}</p>
      <h3>${escapeHtml(chapter.label)}</h3>
      <strong>${escapeHtml(hasListening ? chapter.rangeLabel : isFuture ? "Later today" : isCurrent ? "No listening yet" : "No listening this chapter")}</strong>
    </header>
    ${hasListening ? `<div id="${tracksId}" class="day-chapter__tracks"></div>` : ""}
  `;
  const tracks = section.querySelector(".day-chapter__tracks");
  if (!tracks) return section;
  const moments = chapter.plays.map((play, index) => createDayMoment(play, index));
  moments.forEach((moment, index) => {
    moment.hidden = index >= visibleCount;
    tracks.appendChild(moment);
  });
  section.style.setProperty("--chapter-visible-count", visibleCount);
  if (chapter.plays.length > visibleCount) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "day-chapter__toggle";
    toggle.setAttribute("aria-controls", tracksId);
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "View More";
    toggle.addEventListener("click", () => {
      const expanded = section.classList.toggle("is-expanded");
      moments.forEach((moment, index) => { moment.hidden = !expanded && index >= visibleCount; });
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.textContent = expanded ? "View Less" : "View More";
    });
    section.appendChild(toggle);
  }
  return section;
}

function inferAudioProfile(genre = "", tags = []) {
  const haystack = [normalizeGenreName(genre), ...formatTagList(tags)].join(" ");
  const profile = {
    energy: 0.54,
    tempo: 112,
    loudness: -8,
    valence: 0.5,
    danceability: 0.58,
  };

  if (haystack.includes("ambient") || haystack.includes("classical") || haystack.includes("piano")) {
    return { energy: 0.24, tempo: 78, loudness: -13, valence: 0.4, danceability: 0.2 };
  }
  if (haystack.includes("jazz") || haystack.includes("soul") || haystack.includes("r&b")) {
    return { energy: 0.42, tempo: 96, loudness: -10, valence: 0.52, danceability: 0.48 };
  }
  if (haystack.includes("indie") || haystack.includes("folk") || haystack.includes("acoustic") || haystack.includes("chill")) {
    return { energy: 0.36, tempo: 90, loudness: -10.5, valence: 0.46, danceability: 0.38 };
  }
  if (haystack.includes("hip") || haystack.includes("rap") || haystack.includes("trap")) {
    return { energy: 0.76, tempo: 136, loudness: -6.2, valence: 0.58, danceability: 0.78 };
  }
  if (haystack.includes("edm") || haystack.includes("dance") || haystack.includes("house") || haystack.includes("party")) {
    return { energy: 0.9, tempo: 128, loudness: -5, valence: 0.72, danceability: 0.84 };
  }
  if (haystack.includes("rock") || haystack.includes("metal") || haystack.includes("punk")) {
    return { energy: 0.82, tempo: 122, loudness: -5.8, valence: 0.48, danceability: 0.46 };
  }
  if (haystack.includes("country") || haystack.includes("americana")) {
    return { energy: 0.52, tempo: 104, loudness: -8.5, valence: 0.56, danceability: 0.48 };
  }
  if (haystack.includes("focus") || haystack.includes("study")) {
    return { energy: 0.3, tempo: 86, loudness: -11.5, valence: 0.38, danceability: 0.26 };
  }
  return profile;
}

function setReactiveProfile(audioProfile = null) {
  const fallback = inferAudioProfile(state.currentGenre, state.currentTags);
  const profile = {
    energy: clamp(Number(audioProfile?.energy ?? fallback.energy), 0.18, 0.98),
    tempo: clamp(Number(audioProfile?.tempo ?? fallback.tempo), 64, 180),
    loudness: clamp(Number(audioProfile?.loudness ?? fallback.loudness), -18, -2),
    valence: clamp(Number(audioProfile?.valence ?? fallback.valence), 0.08, 0.96),
    danceability: clamp(Number(audioProfile?.danceability ?? fallback.danceability), 0.08, 0.96),
  };
  const tempoRatio = clamp((profile.tempo - 64) / 116, 0, 1);
  state.currentAudioProfile = profile;
  document.documentElement.style.setProperty("--backdrop-zoom-duration", `${clamp(10 - tempoRatio * 4, 6, 10).toFixed(2)}s`);
  document.documentElement.style.setProperty("--energy-brightness", `${(1 + profile.energy * 0.08).toFixed(3)}`);
  document.documentElement.style.setProperty("--visualizer-glow", `${(12 + profile.energy * 14).toFixed(1)}px`);
  document.documentElement.style.setProperty("--progress-smooth", `${(180 - tempoRatio * 70).toFixed(0)}ms`);
}

function clearReactiveProfile() {
  state.currentAudioProfile = null;
  setReactiveProfile(null);
}

function syncPersistentLayout() {
  const root = document.documentElement;
  const bannerHeight = elements.sessionBanner?.classList.contains("hidden")
    ? 0
    : Math.round(elements.sessionBanner?.getBoundingClientRect().height || 0);
  root.style.setProperty("--banner-height", `${bannerHeight}px`);
}

function showSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({
    behavior: state.preferences.reducedMotion ? "auto" : "smooth",
    block: "start",
  });
}

function formatGenreLabel(genre = "") {
  const normalized = normalizeGenreName(genre);
  const special = {
    "hip-hop": "Hip-Hop",
    "hip hop": "Hip-Hop",
    "r-n-b": "R&B",
    "r&b": "R&B",
    edm: "EDM",
    dnb: "Drum & Bass",
    "drum-and-bass": "Drum & Bass",
    "indie-pop": "Indie Pop",
    electropop: "Electropop",
    "synth-pop": "Synth Pop",
  };
  if (special[normalized]) return special[normalized];
  return normalized
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveThemeKey(genre = "") {
  const normalized = normalizeGenreName(genre);
  if (!normalized) return "default";
  if (normalized.includes("hip") || normalized.includes("rap") || normalized.includes("trap")) return "hipHop";
  if (normalized.includes("r-n-b") || normalized.includes("r&b") || normalized.includes("soul")) return "rnb";
  if (normalized.includes("jazz") || normalized.includes("blues")) return "jazz";
  if (normalized.includes("classical") || normalized.includes("orchestra") || normalized.includes("piano")) return "classical";
  if (normalized.includes("edm") || normalized.includes("house") || normalized.includes("techno") || normalized.includes("trance")) return "edm";
  if (normalized.includes("metal") || normalized.includes("punk") || normalized.includes("grunge")) return "metal";
  if (normalized.includes("rock")) return "rock";
  if (normalized.includes("indie") || normalized.includes("folk") || normalized.includes("acoustic")) return "indie";
  if (normalized.includes("country") || normalized.includes("americana")) return "country";
  if (normalized.includes("latin") || normalized.includes("reggaeton") || normalized.includes("salsa")) return "latin";
  if (normalized.includes("ambient") || normalized.includes("lofi") || normalized.includes("chill")) return "ambient";
  if (normalized.includes("pop") || normalized.includes("dance")) return "pop";
  return "default";
}

function applyThemeVariables(palette) {
  const root = document.documentElement;
  const cssVars = {
    "--bg-base": palette.bgBase,
    "--bg-depth": palette.bgDepth,
    "--text": palette.text,
    "--text-soft": palette.textSoft,
    "--muted": palette.muted,
    "--accent": palette.accent,
    "--accent-strong": palette.accentStrong,
    "--accent-soft": palette.accentSoft,
    "--accent-shadow": palette.accentShadow,
    "--accent-ink": palette.accentInk,
    "--border": palette.border,
    "--panel": palette.panel,
    "--panel-strong": palette.panelStrong,
    "--panel-soft": palette.panelSoft,
    "--blob-1": palette.blob1,
    "--blob-2": palette.blob2,
    "--blob-3": palette.blob3,
    "--blob-4": palette.blob4,
    "--hero-wash": palette.heroWash || DEFAULT_THEME.heroWash || "linear-gradient(180deg, rgba(6, 8, 12, 0.3), rgba(6, 8, 12, 0.66))",
    "--hero-glow": palette.heroGlow || DEFAULT_THEME.heroGlow || "rgba(159, 215, 202, 0.18)",
    "--youtube-bg": palette.youtubeBg,
    "--youtube-bg-hover": palette.youtubeBgHover,
    "--color-dominant": palette.dominant || palette.accent,
    "--color-secondary": palette.secondary || palette.accentStrong,
    "--color-highlight": palette.highlight || palette.text,
    "--surface-tint": palette.accentSoft,
  };

  Object.entries(cssVars).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
}

function applyGenreTheme(genre = "") {
  const palette = THEME_PALETTES[resolveThemeKey(genre)] || DEFAULT_THEME;
  state.themeMode = genre ? "genre" : "default";
  applyThemeVariables(palette);
}

async function applyAlbumTheme(trackKey, imageUrl) {
  state.themeRequestKey = trackKey;
  if (!imageUrl) {
    applyGenreTheme(state.currentGenre || "");
    return;
  }

  try {
    const palette = await buildArtworkPalette(imageUrl);
    if (state.currentTrackKey !== trackKey || state.themeRequestKey !== trackKey) return;
    state.themeMode = "album";
    applyThemeVariables(palette);
  } catch (_error) {
    if (state.currentTrackKey !== trackKey || state.themeRequestKey !== trackKey) return;
    applyGenreTheme(state.currentGenre || "");
  }
}

function applyPreferences() {
  const { reducedMotion, sessionMode } = state.preferences;
  const sessionLabels = {
    adaptive: "Adaptive",
    focus: "Focus",
    chill: "Chill",
    party: "Party",
    night: "Night",
  };
  document.body.classList.remove("high-contrast", "font-large", "font-xlarge");
  document.body.classList.toggle("reduce-motion", !!reducedMotion);
  document.body.dataset.sessionMode = sessionMode;
  ["focus", "chill", "party", "night"].forEach((mode) => {
    document.body.classList.toggle(`mode-${mode}`, sessionMode === mode);
  });
  if (elements.sessionChip) {
    const label = sessionLabels[sessionMode] || sessionMode;
    elements.sessionChip.textContent = label;
  }
}

function syncOverviewLayout() {
  document.documentElement.style.removeProperty("--overview-main-height");
  if (!state.overviewMode || !elements.main || !elements.playerBar) return;
  if (window.innerWidth < 960) return;

  const topbarBottom = elements.topbar ? elements.topbar.getBoundingClientRect().bottom : elements.main.getBoundingClientRect().top;
  const mainMarginTop = parseFloat(window.getComputedStyle(elements.main).marginTop) || 0;
  const playerTop = elements.playerBar.getBoundingClientRect().top;
  const availableHeight = Math.floor(playerTop - topbarBottom - mainMarginTop - 14);

  if (!Number.isFinite(availableHeight) || availableHeight <= 0) return;
  document.documentElement.style.setProperty("--overview-main-height", `${availableHeight}px`);
}

function jumpWindowScroll(top = 0) {
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  window.scrollTo(0, Math.max(0, top));
  root.style.scrollBehavior = previousBehavior;
}

function queueOverviewLayoutSync() {
  if (overviewLayoutFrame) window.cancelAnimationFrame(overviewLayoutFrame);
  overviewLayoutFrame = window.requestAnimationFrame(() => {
    overviewLayoutFrame = 0;
    syncOverviewLayout();
  });
}

function applyRoomMode() {
  document.body.classList.toggle("room-mode", state.roomMode);
  if (state.roomMode) {
    if (!state.roomPreviousView) state.roomPreviousView = state.activeView;
    if (state.activeView !== "card") setNowView("card");
  } else if (state.roomPreviousView && state.activeView === "card") {
    const restoreView = state.roomPreviousView;
    state.roomPreviousView = null;
    setNowView(restoreView);
  } else if (!state.roomMode) {
    state.roomPreviousView = null;
  }
  if (!elements.roomToggle) return;
  elements.roomToggle.textContent = state.roomMode ? "Exit Ambient" : "Ambient Mode";
  elements.roomToggle.setAttribute("aria-pressed", String(state.roomMode));
  elements.roomToggle.setAttribute(
    "aria-label",
    state.roomMode ? "Exit ambient room mode" : "Enter ambient room mode"
  );
  elements.roomToggle.title = state.roomMode ? "Exit ambient room mode" : "Enter ambient room mode";
}

function applyOverviewMode() {
  if (window.innerWidth < 960 && state.overviewMode) {
    state.overviewMode = false;
  }
  const enteringOverview = state.overviewMode;
  if (state.overviewMode && state.roomMode) {
    state.roomMode = false;
    applyRoomMode();
  }
  document.body.classList.toggle("overview-mode", state.overviewMode);
  if (enteringOverview && window.innerWidth >= 960) {
    state.overviewScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    state.overviewPreviousView = state.activeView;
    if (state.activeView !== "card") setNowView("card");
    jumpWindowScroll(0);
  } else if (!state.overviewMode && state.overviewPreviousView && state.activeView === "card") {
    const restoreView = state.overviewPreviousView;
    state.overviewPreviousView = null;
    setNowView(restoreView);
  } else if (!state.overviewMode) {
    state.overviewPreviousView = null;
  }
  syncTrackPanelEmptyState();
  if (!elements.overviewToggle) return;
  elements.overviewToggle.textContent = state.overviewMode ? "Expand" : "Minimize";
  elements.overviewToggle.setAttribute("aria-pressed", String(state.overviewMode));
  elements.overviewToggle.setAttribute(
    "aria-label",
    state.overviewMode ? "Expand dashboard layout" : "Minimize dashboard layout"
  );
  elements.overviewToggle.title = state.overviewMode ? "Expand dashboard layout" : "Minimize dashboard layout";
  queueOverviewLayoutSync();
  if (!enteringOverview && state.overviewScrollY > 0) {
    const restoreY = state.overviewScrollY;
    state.overviewScrollY = 0;
    window.requestAnimationFrame(() => jumpWindowScroll(restoreY));
  } else if (!enteringOverview) {
    state.overviewScrollY = 0;
  }
}

function setNowView(view = "card") {
  const nextView = ["card", "vinyl", "lyrics"].includes(view) ? view : "card";
  state.activeView = nextView;

  elements.viewChips.forEach((chip) => {
    const isActive = chip.dataset.view === nextView;
    chip.classList.toggle("active", isActive);
    chip.setAttribute("aria-pressed", String(isActive));
  });

  if (elements.nowCard) elements.nowCard.classList.toggle("hidden", nextView !== "card");
  if (elements.nowVinyl) elements.nowVinyl.classList.toggle("hidden", nextView !== "vinyl");
  if (elements.nowLyrics) elements.nowLyrics.classList.toggle("hidden", nextView !== "lyrics");
  if (nextView === "lyrics") {
    window.requestAnimationFrame(() => syncLyricsPlayback(getCurrentProgressMs(), { forceFollow: true }));
  }
}

function getCurrentProgressMs(now = Date.now()) {
  if (durationMs <= 0) return 0;
  const elapsed = isPlaying ? Math.max(0, now - lastSync) : 0;
  return clamp(progressMs + elapsed, 0, durationMs);
}

function clearOptimisticPlayback() {
  state.optimisticTrackKey = null;
  state.optimisticTrackUntil = 0;
}

function shouldHoldOptimisticPlayback(observedTrackKey = "") {
  if (!state.optimisticTrackKey) return false;
  if (observedTrackKey === state.optimisticTrackKey) {
    clearOptimisticPlayback();
    return false;
  }
  if (Date.now() < state.optimisticTrackUntil) return true;
  clearOptimisticPlayback();
  return false;
}

function scheduleTrackBoundarySync() {
  window.clearTimeout(trackBoundaryTimer);
  trackBoundaryTimer = 0;
  if (!state.authenticated || !state.currentItem || !isPlaying || durationMs <= 0) return;
  const remainingMs = durationMs - getCurrentProgressMs();
  if (remainingMs <= 0) return;
  trackBoundaryTimer = window.setTimeout(() => {
    trackBoundaryTimer = 0;
    fetchNowPlaying({ force: true });
  }, Math.max(250, remainingMs + 180));
}

function setSpotifyLink(url) {
  if (!elements.spotifyLink) return;
  if (!url) {
    elements.spotifyLink.href = "#";
    elements.spotifyLink.classList.add("hidden");
    return;
  }
  elements.spotifyLink.href = url;
  elements.spotifyLink.classList.remove("hidden");
}

function paintVinylRotation() {
  if (!elements.vinyl) return;
  elements.vinyl.style.setProperty("--vinyl-rotation", `${vinylRotation}deg`);
}

function stopVinylMotion() {
  if (vinylFrame) {
    window.cancelAnimationFrame(vinylFrame);
    vinylFrame = 0;
  }
  vinylLastTick = 0;
}

function stepVinylMotion(timestamp) {
  if (!elements.vinyl || !state.currentItem || !isPlaying) {
    stopVinylMotion();
    return;
  }
  if (!vinylLastTick) {
    vinylLastTick = timestamp;
  }
  const elapsed = timestamp - vinylLastTick;
  vinylLastTick = timestamp;
  vinylRotation += elapsed * 0.03;
  paintVinylRotation();
  vinylFrame = window.requestAnimationFrame(stepVinylMotion);
}

function syncVinylMotion({ reset = false } = {}) {
  if (reset) {
    vinylRotation = 0;
    paintVinylRotation();
  }
  if (elements.vinyl && state.currentItem && isPlaying && !state.preferences.reducedMotion) {
    if (!vinylFrame) {
      vinylLastTick = 0;
      vinylFrame = window.requestAnimationFrame(stepVinylMotion);
    }
    return;
  }
  stopVinylMotion();
}

function setPlaybackVisualState() {
  document.body.classList.toggle("is-playing", !!isPlaying);
  if (elements.vinylToggle) elements.vinylToggle.setAttribute("aria-pressed", String(!!isPlaying));
  syncVinylMotion();
}

function formatTagList(tags = []) {
  return tags.map((tag) => normalizeGenreName(tag?.name || tag)).filter(Boolean);
}

function resolveMoodContext(genre = "", tags = []) {
  const haystack = [normalizeGenreName(genre), ...formatTagList(tags)].join(" ");

  if (haystack.includes("focus") || haystack.includes("study") || haystack.includes("ambient") || haystack.includes("classical")) {
    return {
      label: "Focus Mode",
      context: "A quieter palette with longer motion curves to keep attention on the song.",
    };
  }
  if (haystack.includes("workout") || haystack.includes("party") || haystack.includes("edm") || haystack.includes("dance") || haystack.includes("house")) {
    return {
      label: "High Energy",
      context: "Pulse-forward visuals and brighter highlights to match the momentum.",
    };
  }
  if (haystack.includes("jazz") || haystack.includes("soul") || haystack.includes("r&b")) {
    return {
      label: "Velvet Mood",
      context: "Soft glow, slower motion, and warmer accents shaped around the current record.",
    };
  }
  if (haystack.includes("hip") || haystack.includes("rap") || haystack.includes("trap")) {
    return {
      label: "Headphone Heavy",
      context: "",
    };
  }
  if (haystack.includes("rock") || haystack.includes("metal") || haystack.includes("punk")) {
    return {
      label: "Full Volume",
      context: "Sharper contrast and heavier motion cues to make the playback feel larger.",
    };
  }
  if (haystack.includes("chill") || haystack.includes("indie") || haystack.includes("folk") || haystack.includes("acoustic")) {
    return {
      label: "Late Night Chill",
      context: "Gentle gradients and softened motion that sit behind the music instead of fighting it.",
    };
  }
  return {
    label: "Adaptive Mood",
    context: "",
  };
}

function updateMoodChip() {
  if (!elements.moodChip) return;
  if (!state.currentMood?.label) {
    elements.moodChip.classList.add("hidden");
    elements.moodChip.textContent = "";
    return;
  }
  elements.moodChip.textContent = state.currentMood.label;
  elements.moodChip.classList.remove("hidden");
}

function updateGenreChip() {
  if (!elements.genreChip) return;
  if (!state.currentGenre) {
    elements.genreChip.classList.add("hidden");
    elements.genreChip.textContent = "";
    return;
  }
  elements.genreChip.textContent = formatGenreLabel(state.currentGenre);
  elements.genreChip.classList.remove("hidden");
}

function setHeroMeta({ item = null, context = "" } = {}) {
  if (!elements.heroTitle || !elements.heroArtist || !elements.heroContext) return;

  if (!item) {
    setHeroTitle(state.authenticated ? "Nothing playing" : "Connect Spotify");
    elements.heroArtist.textContent = state.authenticated
      ? "Start something on Spotify."
      : "Bring your listening into a more vivid, personal view.";
    elements.heroContext.textContent = context || (state.authenticated
      ? "SpotiFeel will pick up the next track automatically."
      : "Album art, motion, and lyrics respond when the music begins.");
    elements.heroContext.classList.remove("hidden");
    updateMoodChip();
    updateGenreChip();
    setSpotifyLink("");
    return;
  }

  const title = item.name || "Unknown track";
  setHeroTitle(title);
  elements.heroArtist.textContent = (item.artists || []).map((artist) => artist.name).join(", ") || "Unknown artist";
  elements.heroContext.textContent = "";
  elements.heroContext.classList.add("hidden");
  updateMoodChip();
  updateGenreChip();
  setSpotifyLink(item.external_urls?.spotify || "");
}

function applyHeroTitleTier(tier) {
  if (!elements.heroTitle) return;
  HERO_TITLE_TIERS.slice(1).forEach((name) => {
    elements.heroTitle.classList.toggle(`hero-title--${name}`, tier === name);
  });
  elements.heroTitle.dataset.titleTier = tier;
}

function fitHeroTitle(title, { reset = false } = {}) {
  if (!elements.heroTitle || elements.heroTitle.textContent !== title) return;
  let tierIndex = Math.max(0, HERO_TITLE_TIERS.indexOf(getHeroTitleTier(title)));
  if (!reset) {
    tierIndex = Math.max(tierIndex, HERO_TITLE_TIERS.indexOf(elements.heroTitle.dataset.titleTier));
  }
  applyHeroTitleTier(HERO_TITLE_TIERS[tierIndex]);

  const maxLines = window.innerWidth <= 680 ? 4 : 3;
  while (tierIndex < HERO_TITLE_TIERS.length - 1) {
    const lineHeight = Number.parseFloat(window.getComputedStyle(elements.heroTitle).lineHeight);
    if (!Number.isFinite(lineHeight) || lineHeight <= 0) break;
    const renderedLines = Math.round(elements.heroTitle.getBoundingClientRect().height / lineHeight);
    if (renderedLines <= maxLines) break;
    tierIndex += 1;
    applyHeroTitleTier(HERO_TITLE_TIERS[tierIndex]);
  }
}

function setHeroTitle(title) {
  if (!elements.heroTitle) return;
  const nextTitle = String(title || "Unknown track");
  const changed = elements.heroTitle.dataset.fullTitle !== nextTitle;
  if (changed) {
    elements.heroTitle.textContent = nextTitle;
    elements.heroTitle.dataset.fullTitle = nextTitle;
    elements.heroTitle.title = nextTitle;
    elements.heroTitle.setAttribute("aria-label", nextTitle);
    applyHeroTitleTier(getHeroTitleTier(nextTitle));
  }
  if (heroTitleFitFrame) window.cancelAnimationFrame(heroTitleFitFrame);
  heroTitleFitFrame = window.requestAnimationFrame(() => {
    heroTitleFitFrame = 0;
    fitHeroTitle(nextTitle, { reset: changed });
  });
}

function renderSkeletonCards(container, count = 6) {
  if (!container) return;
  container.innerHTML = "";
  const row = document.createElement("div");
  row.className = container === elements.recList ? "recommendation-row" : "card-row";
  for (let index = 0; index < count; index += 1) {
    const skeleton = document.createElement("article");
    skeleton.className = "card skeleton-card";
    skeleton.innerHTML = `
      <div class="skeleton-block skeleton-block--art"></div>
      <div class="skeleton-block skeleton-block--title"></div>
      <div class="skeleton-block skeleton-block--meta"></div>
    `;
    row.appendChild(skeleton);
  }
  container.appendChild(row);
}

function getSessionModeProfile() {
  const reactive = state.currentAudioProfile || inferAudioProfile(state.currentGenre, state.currentTags);
  const tempoRatio = clamp(((reactive.tempo || 108) - 64) / 116, 0, 1);
  const energyRatio = clamp(reactive.energy || 0.5, 0.18, 0.98);
  const danceRatio = clamp(reactive.danceability || 0.5, 0.08, 0.96);
  const responseBoost = 0.72 + energyRatio * 0.52;
  switch (state.preferences.sessionMode) {
    case "focus":
      return {
        visualizer: 0.42 * responseBoost,
        motion: 0.7 + tempoRatio * 0.08,
        tempoRatio,
        energyRatio,
        danceRatio,
      };
    case "chill":
      return {
        visualizer: 0.58 * responseBoost,
        motion: 0.78 + tempoRatio * 0.12,
        tempoRatio,
        energyRatio,
        danceRatio,
      };
    case "party":
      return {
        visualizer: 0.94 * (0.9 + energyRatio * 0.5),
        motion: 1.02 + tempoRatio * 0.24,
        tempoRatio,
        energyRatio,
        danceRatio,
      };
    case "night":
      return {
        visualizer: 0.34 * responseBoost,
        motion: 0.66 + tempoRatio * 0.06,
        tempoRatio,
        energyRatio,
        danceRatio,
      };
    default:
      return {
        visualizer: 0.68 * responseBoost,
        motion: 0.88 + tempoRatio * 0.18,
        tempoRatio,
        energyRatio,
        danceRatio,
      };
  }
}

function seedFromString(input = "") {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function prepareVisualizerProfile(seedKey = "default") {
  const seed = seedFromString(seedKey || "default");
  state.visualizerProfile = Array.from(elements.visualizerBars).map((_, index) => ({
    amplitude: 0.32 + (((seed + index * 37) % 58) / 100),
    offset: ((seed + index * 97) % 1000) / 1000,
    speed: 0.8 + (((seed + index * 29) % 60) / 100),
    jitter: 0.12 + (((seed + index * 17) % 22) / 100),
  }));
}

function paintVisualizer(currentMs = 0) {
  if (!elements.visualizerBars.length && !elements.heroWaveBars.length) return;
  const modeProfile = getSessionModeProfile();
  const baseIntensity = !state.currentItem ? 0.08 : isPlaying ? 0.66 + modeProfile.energyRatio * 0.24 : 0.14;
  const progressRatio = durationMs > 0 ? clamp(currentMs / durationMs, 0, 1) : 0;
  const cadence = 0.7 + modeProfile.tempoRatio * 0.85;
  const sampledLevels = [];

  elements.visualizerBars.forEach((bar, index) => {
    const profile = state.visualizerProfile[index] || {
      amplitude: 0.4,
      offset: index / Math.max(1, elements.visualizerBars.length),
      speed: 1,
      jitter: 0.16,
    };
    const waveA = Math.sin((currentMs / (560 / cadence)) * profile.speed + profile.offset * Math.PI * 2);
    const waveB = Math.sin((currentMs / (320 / cadence)) * (1.1 + profile.jitter + modeProfile.danceRatio * 0.24) + index * 0.4);
    const waveC = Math.sin(progressRatio * Math.PI * (5 + modeProfile.tempoRatio * 2) + index * 0.22);
    const rawLevel = Math.abs(waveA) * 0.46 + Math.abs(waveB) * 0.34 + Math.abs(waveC) * 0.2;
    const level = clamp(
      0.08 + rawLevel * profile.amplitude * baseIntensity * modeProfile.visualizer * (0.74 + modeProfile.energyRatio * 0.4),
      0.06,
      1
    );
    const opacity = clamp(0.28 + level * 0.72, 0.24, 1);
    sampledLevels.push(level);
    bar.style.transform = `scaleY(${level.toFixed(3)})`;
    bar.style.opacity = opacity.toFixed(3);
  });

  const miniIndexes = [0, 2, 5, 8, 11];
  elements.heroWaveBars.forEach((bar, index) => {
    const level = sampledLevels[miniIndexes[index]] ?? sampledLevels[index] ?? 0.18;
    const compactLevel = clamp(level * 0.92, 0.18, 1);
    const opacity = clamp(0.42 + compactLevel * 0.5, 0.38, 1);
    bar.style.transform = `scaleY(${compactLevel.toFixed(3)})`;
    bar.style.opacity = opacity.toFixed(3);
  });
}

function preloadImage(imageUrl) {
  if (!imageUrl) return Promise.resolve();
  if (imagePreloadCache.has(imageUrl)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.onload = () => {
      imagePreloadCache.add(imageUrl);
      resolve();
    };
    image.onerror = reject;
    image.src = imageUrl;
  });
}

async function crossfadeHeroBackdrop(trackKey, imageUrl) {
  if (!elements.heroBackdropCurrent || !elements.heroBackdropNext) return;
  state.backdropRequestKey = trackKey || "default";
  const requestKey = state.backdropRequestKey;
  const currentLayer = elements.heroBackdropCurrent;
  const nextLayer = elements.heroBackdropNext;

  if (!imageUrl) {
    currentLayer.style.backgroundImage = "";
    currentLayer.dataset.imageUrl = "";
    nextLayer.style.backgroundImage = "";
    nextLayer.dataset.imageUrl = "";
    nextLayer.classList.remove("is-visible", "is-zooming");
    currentLayer.classList.remove("is-fading", "is-zooming");
    return;
  }

  if (currentLayer.dataset.imageUrl === imageUrl) {
    currentLayer.classList.add("is-zooming");
    nextLayer.classList.remove("is-visible", "is-zooming");
    return;
  }

  try {
    await preloadImage(imageUrl);
  } catch (_error) {}
  if (state.backdropRequestKey !== requestKey) return;

  nextLayer.style.backgroundImage = `url("${imageUrl}")`;
  nextLayer.dataset.imageUrl = imageUrl;
  nextLayer.classList.remove("is-visible", "is-zooming");

  requestAnimationFrame(() => {
    if (state.backdropRequestKey !== requestKey) return;
    currentLayer.classList.add("is-fading");
    nextLayer.classList.add("is-visible", "is-zooming");
    const duration = state.preferences.reducedMotion ? 0 : 400;
    window.setTimeout(() => {
      if (state.backdropRequestKey !== requestKey) return;
      currentLayer.style.backgroundImage = `url("${imageUrl}")`;
      currentLayer.dataset.imageUrl = imageUrl;
      currentLayer.classList.remove("is-fading");
      currentLayer.classList.add("is-zooming");
      nextLayer.classList.remove("is-visible", "is-zooming");
      nextLayer.style.backgroundImage = "";
      nextLayer.dataset.imageUrl = "";
    }, duration);
  });
}

function triggerHeroPulse(kind = "track") {
  if (!elements.nowPlayingSection || state.preferences.reducedMotion) return;
  const pulseClass = kind === "play" ? "is-playing-pulse" : "is-brightness-pulse";
  window.clearTimeout(heroPulseTimer);
  elements.nowPlayingSection.classList.remove("is-playing-pulse", "is-brightness-pulse");
  void elements.nowPlayingSection.offsetWidth;
  elements.nowPlayingSection.classList.add(pulseClass);
  heroPulseTimer = window.setTimeout(() => {
    elements.nowPlayingSection?.classList.remove("is-playing-pulse", "is-brightness-pulse");
  }, kind === "play" ? 620 : 520);
}

function triggerTrackTransition() {
  if (!elements.nowPlayingSection || state.preferences.reducedMotion) return;
  elements.nowPlayingSection.classList.remove("is-track-changing");
  void elements.nowPlayingSection.offsetWidth;
  elements.nowPlayingSection.classList.add("is-track-changing");
  window.setTimeout(() => {
    elements.nowPlayingSection?.classList.remove("is-track-changing");
  }, 520);
}

function showBanner(message, actionLabel = "", actionHref = "/login") {
  if (!elements.sessionBanner || !elements.sessionMessage || !elements.sessionLink) return;
  if (!message) {
    elements.sessionBanner.classList.add("hidden");
    window.requestAnimationFrame(syncPersistentLayout);
    queueOverviewLayoutSync();
    return;
  }
  elements.sessionMessage.textContent = message;
  elements.sessionLink.textContent = actionLabel;
  elements.sessionLink.href = actionHref;
  elements.sessionLink.classList.toggle("hidden", !actionLabel);
  elements.sessionBanner.classList.remove("hidden");
  window.requestAnimationFrame(syncPersistentLayout);
  queueOverviewLayoutSync();
}

function syncAuthButtons() {
  if (elements.loginBtn) elements.loginBtn.classList.toggle("hidden", state.authenticated);
  if (elements.logoutBtn) elements.logoutBtn.classList.toggle("hidden", !state.authenticated);
  syncExperienceState();
}

function syncExperienceState() {
  const disconnected = !state.authenticated;
  const connectedIdle = state.authenticated && !state.currentItem;
  document.body.classList.toggle("experience-disconnected", disconnected);
  document.body.classList.toggle("experience-connected-idle", connectedIdle);
}

function setPlaylistStatus(message, tone = "muted") {
  if (!elements.playlistStatus) return;
  elements.playlistStatus.textContent = message;
  elements.playlistStatus.classList.toggle("is-error", tone === "error");
  elements.playlistStatus.classList.toggle("is-success", tone === "success");
}

function setPlaylistCardsDisabled(disabled) {
  elements.playlistCards.forEach((button) => {
    button.disabled = disabled;
  });
}

function flashPlaylistCardState(button, stateClass, duration = 2200) {
  if (!button) return;
  button.classList.remove("is-loading", "is-success", "is-error");
  button.classList.add(stateClass);
  if (stateClass !== "is-loading") {
    window.setTimeout(() => button.classList.remove(stateClass), duration);
  }
}

function renderEmptyState(container, title, detail) {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <span class="empty-state__mark" aria-hidden="true">—</span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(detail)}</p>
    </div>
  `;
}

function shouldBlankTrackPanelInOverview() {
  return state.overviewMode && window.innerWidth >= 960;
}

function renderTrackPanelIdleState(title, detail) {
  if (!elements.track) return;
  elements.track.innerHTML = `
    <div class="track-idle-state">
      <span class="track-idle-state__rule" aria-hidden="true"></span>
      <div class="track-idle-state__copy">
        <p class="track-idle-state__eyebrow">Playback idle</p>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(detail)}</p>
      </div>
    </div>
  `;
}

function renderTrackPanelEmptyState(title, detail, { variant = "standard" } = {}) {
  if (!elements.track) return;
  elements.track.dataset.emptyTitle = title;
  elements.track.dataset.emptyDetail = detail;
  elements.track.dataset.emptyVariant = variant;
  if (shouldBlankTrackPanelInOverview()) {
    elements.track.innerHTML = "";
    return;
  }
  if (variant === "idle") {
    renderTrackPanelIdleState(title, detail);
    return;
  }
  renderEmptyState(elements.track, title, detail);
}

function clearTrackPanelEmptyState() {
  if (!elements.track) return;
  delete elements.track.dataset.emptyTitle;
  delete elements.track.dataset.emptyDetail;
  delete elements.track.dataset.emptyVariant;
}

function syncTrackPanelEmptyState() {
  if (!elements.track) return;
  const { emptyTitle, emptyDetail, emptyVariant } = elements.track.dataset;
  if (!emptyTitle || !emptyDetail) return;
  if (shouldBlankTrackPanelInOverview()) {
    elements.track.innerHTML = "";
    return;
  }
  if (emptyVariant === "idle") {
    renderTrackPanelIdleState(emptyTitle, emptyDetail);
    return;
  }
  renderEmptyState(elements.track, emptyTitle, emptyDetail);
}

function setPlayerState({ title, artist, artUrl }) {
  if (elements.playerTitle) elements.playerTitle.textContent = title;
  if (elements.playerArtist) elements.playerArtist.textContent = artist;
  if (elements.playerArt) {
    if (artUrl) {
      elements.playerArt.crossOrigin = "anonymous";
      elements.playerArt.referrerPolicy = "no-referrer";
      elements.playerArt.src = artUrl;
      elements.playerArt.alt = `Album art for ${title}`;
      elements.playerArtShell?.classList.remove("is-empty");
    } else {
      elements.playerArt.removeAttribute("src");
      elements.playerArt.alt = "";
      elements.playerArtShell?.classList.add("is-empty");
    }
  }
}

function setYouTubeLink(url) {
  if (!elements.ytLink) return;
  if (!url) {
    elements.ytLink.href = "#";
    elements.ytLink.classList.add("is-disabled");
    elements.ytLink.setAttribute("aria-disabled", "true");
    return;
  }
  elements.ytLink.href = url;
  elements.ytLink.classList.remove("is-disabled");
  elements.ytLink.removeAttribute("aria-disabled");
}

function setLyricsLinks(searchUrls = null) {
  if (!elements.lyricsLinks || !elements.lyricsGenius || !elements.lyricsSearch) return;

  const geniusUrl = searchUrls?.genius || "";
  const searchUrl = searchUrls?.search || "";
  elements.lyricsGenius.href = geniusUrl || "#";
  elements.lyricsSearch.href = searchUrl || "#";
  elements.lyricsGenius.classList.toggle("hidden", !geniusUrl);
  elements.lyricsSearch.classList.toggle("hidden", !searchUrl);
  elements.lyricsLinks.classList.toggle("hidden", !geniusUrl && !searchUrl);
}

function setLyricsTiming(timing = "plain", source = "") {
  state.lyricsTiming = timing;
  if (!elements.lyricsTiming) return;
  const labels = {
    synced: "Line synced",
    unsynced: "Unsynced lyrics",
    plain: "Plain lyrics",
  };
  elements.lyricsTiming.textContent = labels[timing] || labels.plain;
  elements.lyricsTiming.dataset.source = source || "";
  elements.lyricsTiming.classList.toggle("hidden", !state.currentItem && timing === "plain");
}

function setLyricsFollow(enabled) {
  state.lyricsFollowEnabled = !!enabled;
  if (enabled) state.lyricsManualUntil = 0;
  if (elements.lyricsFollow) {
    elements.lyricsFollow.classList.toggle("hidden", enabled || !state.lyricsInteractive);
  }
}

function pauseLyricsFollow() {
  if (!state.lyricsInteractive || state.activeView !== "lyrics") return;
  state.lyricsFollowEnabled = false;
  state.lyricsManualUntil = Date.now() + 12_000;
  elements.lyricsFollow?.classList.remove("hidden");
}

function resumeLyricsFollow() {
  if (!state.lyricsInteractive) return;
  setLyricsFollow(true);
  syncLyricsPlayback(getCurrentProgressMs(), { forceFollow: true });
}

function renderLyricsLoadingState({
  title = "Loading lyrics...",
  subtitle = "Pulling the next set of lines for this track.",
} = {}) {
  state.currentLyricsLines = [];
  state.lyricTimeline = [];
  state.lyricLineElements = [];
  state.activeLyricLineIndex = -1;
  state.lyricsInteractive = false;
  setLyricsFollow(true);

  if (elements.lyricsTitle) elements.lyricsTitle.textContent = title;
  if (elements.lyricsSubtitle) elements.lyricsSubtitle.textContent = subtitle;
  if (elements.lyricsTiming) elements.lyricsTiming.classList.add("hidden");
  if (elements.lyricsContent) {
    elements.lyricsContent.classList.remove("lyrics-content--lines");
    elements.lyricsContent.classList.add("lyrics-content--loading");
    elements.lyricsContent.innerHTML = `
      <div class="lyrics-loading" aria-hidden="true">
        <div class="lyrics-loading__line"></div>
        <div class="lyrics-loading__line lyrics-loading__line--wide"></div>
        <div class="lyrics-loading__line"></div>
        <div class="lyrics-loading__line lyrics-loading__line--narrow"></div>
      </div>
    `;
    elements.lyricsContent.scrollTop = 0;
  }
  setLyricsLinks(null);
}

function syncLyricsPlayback(currentMs = 0, { forceFollow = false } = {}) {
  if (
    !elements.lyricsContent ||
    !state.lyricsInteractive ||
    !state.lyricLineElements.length ||
    !state.lyricTimeline.length
  ) {
    return;
  }

  const targetIndex = findActiveLyricIndex(state.lyricTimeline, currentMs);

  if (targetIndex !== state.activeLyricLineIndex) {
    state.activeLyricLineIndex = targetIndex;
    state.lyricLineElements.forEach((line, index) => {
      const distance = targetIndex < 0 ? index + 1 : Math.abs(index - targetIndex);
      line.classList.toggle("is-active", index === targetIndex);
      line.classList.toggle("is-past", targetIndex >= 0 && index < targetIndex);
      line.classList.toggle("is-far", distance > 2);
      if (index === targetIndex) line.setAttribute("aria-current", "true");
      else line.removeAttribute("aria-current");
    });
  }

  if (state.activeView !== "lyrics" || targetIndex < 0) return;
  if (!state.lyricsFollowEnabled && Date.now() >= state.lyricsManualUntil) setLyricsFollow(true);
  if (!state.lyricsFollowEnabled) return;
  const activeLine = state.lyricLineElements[targetIndex];
  if (!activeLine) return;
  const nextTop = Math.max(
    0,
    activeLine.offsetTop - elements.lyricsContent.clientHeight / 2 + activeLine.offsetHeight / 2
  );
  const distance = Math.abs(nextTop - elements.lyricsContent.scrollTop);
  if (!forceFollow && distance < 12) return;
  elements.lyricsContent.scrollTo({
    top: nextTop,
    behavior: state.preferences.reducedMotion || distance > 260 ? "auto" : "smooth",
  });
}

function renderLyricsView({
  title = "Play a song to view lyrics.",
  subtitle = "Start a track in Spotify and switch to this view to read along.",
  content = "Lyrics will appear here when available.",
  searchUrls = null,
  syncedLyrics = "",
  timing = "plain",
  source = "",
} = {}) {
  if (elements.lyricsTitle) elements.lyricsTitle.textContent = title;
  if (elements.lyricsSubtitle) elements.lyricsSubtitle.textContent = subtitle;
  state.currentLyricsLines = [];
  state.lyricTimeline = [];
  state.lyricLineElements = [];
  state.activeLyricLineIndex = -1;
  state.lyricsInteractive = false;
  setLyricsFollow(true);
  if (elements.lyricsContent) {
    const trackDuration = durationMs || state.currentItem?.duration_ms || 0;
    const syncedTimeline = parseSyncedLyrics(syncedLyrics, trackDuration);
    const lyricLines = buildLyricLines(content);
    elements.lyricsContent.classList.remove("lyrics-content--loading");
    elements.lyricsContent.innerHTML = "";
    elements.lyricsContent.scrollTop = 0;

    if (syncedTimeline.length) {
      elements.lyricsContent.classList.add("lyrics-content--lines");
      const fragment = document.createDocumentFragment();
      syncedTimeline.forEach((line) => {
        const paragraph = document.createElement("p");
        paragraph.className = "lyric-line";
        paragraph.textContent = line.text;
        state.currentLyricsLines.push(line.text);
        state.lyricLineElements.push(paragraph);
        fragment.appendChild(paragraph);
      });
      elements.lyricsContent.appendChild(fragment);
      state.lyricTimeline = syncedTimeline;
      state.lyricsInteractive = state.lyricTimeline.length === state.lyricLineElements.length;
      setLyricsTiming("synced", source);
    } else {
      elements.lyricsContent.classList.remove("lyrics-content--lines");
      const fragment = document.createDocumentFragment();
      lyricLines.forEach((line) => {
        if (line.type === "spacer") {
          const spacer = document.createElement("div");
          spacer.className = "lyric-spacer";
          fragment.appendChild(spacer);
          return;
        }
        const paragraph = document.createElement("p");
        paragraph.textContent = line.text;
        fragment.appendChild(paragraph);
      });
      if (lyricLines.length) elements.lyricsContent.appendChild(fragment);
      else elements.lyricsContent.textContent = content;
      const fallbackTiming = timing === "synced" ? "unsynced" : timing;
      if (source || fallbackTiming !== "plain") setLyricsTiming(fallbackTiming, source);
      else elements.lyricsTiming?.classList.add("hidden");
    }
  }
  if (elements.lyricsFollow) {
    elements.lyricsFollow.classList.toggle("hidden", !state.lyricsInteractive);
  }
  setLyricsFollow(true);
  setLyricsLinks(searchUrls);
}

function resetProgress() {
  window.clearTimeout(trackBoundaryTimer);
  trackBoundaryTimer = 0;
  progressMs = 0;
  durationMs = 0;
  isPlaying = false;
  state.activeLyricLineIndex = -1;
  state.lyricLineElements.forEach((line) => {
    line.classList.remove("is-active", "is-past");
  });
  setPlaybackVisualState();
  if (elements.progressBar) elements.progressBar.style.transform = "scaleX(0)";
  if (elements.heroProgressBar) elements.heroProgressBar.style.transform = "scaleX(0)";
  if (elements.currentTime) elements.currentTime.textContent = "0:00";
  if (elements.totalTime) elements.totalTime.textContent = "0:00";
  if (elements.heroCurrentTime) elements.heroCurrentTime.textContent = "0:00";
  if (elements.heroTotalTime) elements.heroTotalTime.textContent = "0:00";
  paintVisualizer(0);
}

function updateTrackCard(item) {
  if (!elements.track) return;
  document.body.classList.toggle("has-current-track", !!item);
  syncExperienceState();
  if (!item) {
    renderTrackPanelEmptyState(
      state.authenticated ? "Nothing playing." : "Connect Spotify and start playing music.",
      state.authenticated
        ? "Start something on Spotify and this space will come alive."
        : "Start playback to bring this view to life.",
      { variant: "idle" }
    );
    return;
  }

  clearTrackPanelEmptyState();

  const artUrl = item.album?.images?.[0]?.url || "";
  const artists = (item.artists || []).map((artist) => artist.name).join(", ");
  const waveMarkup = `
    <div class="track-wave" aria-hidden="true">
      <span class="track-wave__bar"></span>
      <span class="track-wave__bar"></span>
      <span class="track-wave__bar"></span>
      <span class="track-wave__bar"></span>
      <span class="track-wave__bar"></span>
      <span class="track-wave__bar"></span>
      <span class="track-wave__bar"></span>
      <span class="track-wave__bar"></span>
      <span class="track-wave__bar"></span>
    </div>
  `;

  elements.track.innerHTML = `
    <div class="track-art-shell">
      <div class="track-art-glow"></div>
      ${
        artUrl
          ? `<img class="track-art" src="${escapeHtml(artUrl)}" alt="Album art for ${escapeHtml(item.name)}" loading="eager">`
          : '<div class="track-art"></div>'
      }
    </div>
    <h3 class="track-title">${escapeHtml(item.name || "Unknown track")}</h3>
    <p class="track-meta">${escapeHtml(artists || "Unknown artist")}</p>
    ${waveMarkup}
  `;
}

function updateVinyl(item) {
  const artUrl = item?.album?.images?.[0]?.url || "";
  const artists = item ? (item.artists || []).map((artist) => artist.name).join(", ") : "—";
  if (elements.vinylLabel) {
    if (artUrl) {
      elements.vinylLabel.src = artUrl;
      elements.vinylLabel.alt = `Album art for ${item?.name || "current track"}`;
      elements.vinylLabel.classList.remove("is-empty");
    } else {
      elements.vinylLabel.removeAttribute("src");
      elements.vinylLabel.alt = "";
      elements.vinylLabel.classList.add("is-empty");
    }
  }
  if (!item) {
    vinylRotation = 0;
    paintVinylRotation();
  }
  if (elements.vinylTitle) elements.vinylTitle.textContent = item?.name || "—";
  if (elements.vinylArtist) elements.vinylArtist.textContent = artists || "—";
}

function setActiveCard(trackKey = "") {
  state.activeCardKey = trackKey || "";
  document.querySelectorAll(".card[data-track-key]").forEach((card) => {
    card.classList.toggle("is-active", !!trackKey && card.dataset.trackKey === trackKey);
  });
}

function flashCardActivation(card) {
  if (!card) return;
  card.classList.remove("is-activating");
  void card.offsetWidth;
  card.classList.add("is-activating");
  window.setTimeout(() => card.classList.remove("is-activating"), 540);
}

function createCard({
  track,
  detail = "",
  href = "",
  onPlay = null,
  badge = "",
  openOnCard = false,
  showNowPlaying = true,
}) {
  const imageUrl = track?.album?.images?.[0]?.url || "";
  const title = track?.name || "Unknown track";
  const subtitle = getArtistLabel(track);
  const cardKey = getTrackKey(track);
  const card = document.createElement("article");
  card.className = "card";
  if (cardKey) card.dataset.trackKey = cardKey;
  if (cardKey && cardKey === state.activeCardKey) card.classList.add("is-active");
  const media = document.createElement("div");
  media.className = "card-media";

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = `Album art for ${title}`;
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    media.appendChild(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "card-art-placeholder";
    media.appendChild(placeholder);
  }

  if (onPlay && track?.uri) {
    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.className = "card-play-button";
    playButton.setAttribute("aria-label", `Play ${title}`);
    playButton.innerHTML = '<i class="bx bx-play"></i>';
    playButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onPlay(track, card);
    });
    media.appendChild(playButton);
  }

  const titleRow = document.createElement("p");
  titleRow.className = "card-title";
  const strong = document.createElement("strong");
  strong.textContent = title || "Unknown track";
  titleRow.appendChild(strong);

  const subtitleRow = document.createElement("p");
  subtitleRow.className = "card-meta";
  subtitleRow.textContent = subtitle || "Unknown artist";

  let badgeRow = null;
  if (badge) {
    badgeRow = document.createElement("div");
    badgeRow.className = "card-tag";
    badgeRow.textContent = badge;
  }

  let detailRow = null;
  if (detail) {
    detailRow = document.createElement("p");
    detailRow.className = "card-caption";
    detailRow.textContent = detail;
  }

  const nowPlayingRow = document.createElement("div");
  nowPlayingRow.className = "card-now-playing";
  nowPlayingRow.innerHTML = `
    <span class="card-now-playing__label">Now Playing</span>
    <span class="card-now-playing__waves" aria-hidden="true">
      <span class="card-now-playing__wave"></span>
      <span class="card-now-playing__wave"></span>
      <span class="card-now-playing__wave"></span>
      <span class="card-now-playing__wave"></span>
    </span>
  `;

  if (href && !openOnCard) {
    const link = document.createElement("a");
    link.className = "card-overlay-link";
    link.href = href;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Open";
    link.setAttribute("aria-label", `Open ${title} by ${subtitle} in Spotify`);
    link.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    card.appendChild(link);
  }

  if (onPlay && track?.uri && !openOnCard) {
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Play ${title} by ${subtitle}`);
    card.addEventListener("click", () => onPlay(track, card));
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onPlay(track, card);
    });
  }

  card.prepend(media);
  if (badgeRow) card.appendChild(badgeRow);
  card.append(titleRow, subtitleRow);
  if (detailRow) card.appendChild(detailRow);
  if (showNowPlaying) card.appendChild(nowPlayingRow);
  if (href && openOnCard) {
    const cardLink = document.createElement("a");
    cardLink.className = "card-hit-link";
    cardLink.href = href;
    cardLink.target = "_blank";
    cardLink.rel = "noreferrer";
    cardLink.setAttribute("aria-label", `Open ${title} by ${subtitle} in Spotify`);
    card.appendChild(cardLink);
  }
  return card;
}

function createTrackRow(tracks = [], options = {}) {
  const row = document.createElement("div");
  row.className = options.rowClass || "card-row";
  tracks.forEach((track, index) => {
    if (!track) return;
    const card = createCard({
      track,
      detail: typeof options.detail === "function" ? options.detail(track, index) : options.detail || "",
      badge: typeof options.badge === "function" ? options.badge(track, index) : options.badge || "",
      href: track.external_urls?.spotify || "",
      onPlay: playTrack,
      openOnCard: !!options.openOnCard,
      showNowPlaying: options.showNowPlaying !== false,
    });
    if (typeof options.decorate === "function") options.decorate(card, track, index);
    row.appendChild(card);
  });
  return row;
}

function renderFeelingHistory(items = []) {
  if (!elements.dayOverview || !elements.dayChapters) return;
  const timeline = buildListeningTimeline(items);
  elements.dayOverview.innerHTML = "";
  elements.dayChapters.innerHTML = "";
  elements.dayOverview.appendChild(createDayOverview(timeline));
  const chapters = document.createElement("div");
  const populatedChapters = timeline.chapters.filter((chapter) => chapter.plays.length);
  const previewChapters = timeline.chapters.filter((chapter) => !chapter.plays.length);
  const visibleCount = populatedChapters.length <= 2 ? 4 : 3;
  const stories = document.createElement("div");
  const previews = document.createElement("div");
  chapters.className = "day-chapters";
  chapters.dataset.populated = String(populatedChapters.length);
  stories.className = "day-chapters__stories";
  previews.className = "day-chapters__previews";
  populatedChapters.forEach((chapter) => {
    stories.appendChild(createListeningChapter(chapter, { currentTime: timeline.currentTime, visibleCount }));
  });
  previewChapters.forEach((chapter) => {
    previews.appendChild(createListeningChapter(chapter, { currentTime: timeline.currentTime, visibleCount }));
  });
  if (stories.children.length) chapters.appendChild(stories);
  if (previews.children.length) chapters.appendChild(previews);
  elements.dayChapters.appendChild(chapters);
}

function renderDayUnavailable(title, detail) {
  [elements.dayOverview, elements.dayChapters].forEach((container) => {
    if (!container) return;
    container.innerHTML = `
      <div class="day-message">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(detail)}</p>
      </div>
    `;
  });
}

function renderDayLoading() {
  if (elements.dayOverview) {
    elements.dayOverview.innerHTML = `
      <div class="day-loading day-loading--overview" aria-label="Loading today's listening">
        <span></span><span></span><span></span><span></span>
      </div>
    `;
  }
  if (elements.dayChapters) {
    elements.dayChapters.innerHTML = `
      <div class="day-loading day-loading--chapters" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
      </div>
    `;
  }
}

function mergeTodayRecentItems(items = [], reference = new Date()) {
  const dayKey = getLocalDayKey(reference);
  if (state.recentDayKey !== dayKey) {
    state.recentDayKey = dayKey;
    state.todayRecentItems = [];
  }
  state.todayRecentItems = mergeDailyHistory(state.todayRecentItems, items, reference);
  writeDailyHistory(window.sessionStorage, state.todayRecentItems, reference);
  return state.todayRecentItems;
}

function restoreTodayRecentItems(reference = new Date()) {
  state.recentDayKey = getLocalDayKey(reference);
  state.todayRecentItems = readDailyHistory(window.sessionStorage, reference);
  return state.todayRecentItems;
}

function renderRecommendationGroups(groups = [], sourceTrack = "") {
  if (!elements.recList) return;
  elements.recList.innerHTML = "";
  const seen = new Set();
  const renderedGroups = [];

  groups.forEach((group, sourceIndex) => {
    if (!Array.isArray(group?.tracks)) return;
    const tracks = [];
    group.tracks.forEach((track) => {
      if (!track) return;
      const trackKey =
        getTrackKey(track) ||
        track?.id ||
        track?.uri ||
        `${track?.name || "track"}::${(track?.artists || []).map((artist) => artist.name).join(",")}`;
      if (!trackKey || seen.has(trackKey)) return;
      seen.add(trackKey);
      tracks.push(track);
    });
    if (!tracks.length) return;

    const section = document.createElement("section");
    section.className = "recommendation-group";
    section.dataset.recommendationPanel = String(sourceIndex);
    section.id = `recommendation-panel-${sourceIndex}`;
    section.setAttribute("role", "tabpanel");
    section.setAttribute("aria-labelledby", `recommendation-tab-${sourceIndex}`);
    section.appendChild(createTrackRow(tracks, {
      rowClass: "recommendation-row",
      badge: (track) => track?.spotifeel_reason_short || "close match",
      openOnCard: true,
      showNowPlaying: false,
    }));
    renderedGroups.push({ group, section, sourceIndex });
  });

  if (!renderedGroups.length) return;
  state.activeRecommendationGroup = Math.min(
    Math.max(0, state.activeRecommendationGroup || 0),
    renderedGroups.length - 1
  );

  const tabs = document.createElement("div");
  tabs.className = "section-tabs recommendation-tabs";
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Recommendation groups");

  const groupHeading = document.createElement("div");
  groupHeading.className = "recommendation-group-heading";
  groupHeading.innerHTML = `
    <p class="collection-kicker">Because you listened to ${escapeHtml(sourceTrack || "this track")}</p>
    <h3 aria-live="polite"></h3>
  `;

  const activate = (nextIndex, { focus = false } = {}) => {
    const previousScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    state.activeRecommendationGroup = nextIndex;
    groupHeading.querySelector("h3").textContent = renderedGroups[nextIndex]?.group?.title || "Listening path";
    renderedGroups.forEach(({ section }, index) => {
      const active = index === nextIndex;
      section.classList.toggle("is-active", active);
      section.hidden = !active;
    });
    [...tabs.querySelectorAll("[data-recommendation-tab]")].forEach((button, index) => {
      const active = index === nextIndex;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus({ preventScroll: true });
    });
    window.requestAnimationFrame(() => jumpWindowScroll(previousScrollY));
  };

  renderedGroups.forEach(({ group, sourceIndex }, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "section-tab";
    button.dataset.recommendationTab = String(index);
    button.id = `recommendation-tab-${sourceIndex}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", `recommendation-panel-${sourceIndex}`);
    button.textContent = group.title || `Selection ${index + 1}`;
    button.addEventListener("click", () => activate(index));
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      activate((index + direction + renderedGroups.length) % renderedGroups.length, { focus: true });
    });
    tabs.appendChild(button);
  });

  elements.recList.appendChild(tabs);
  elements.recList.appendChild(groupHeading);
  renderedGroups.forEach(({ section }) => elements.recList.appendChild(section));
  activate(state.activeRecommendationGroup);
}

function setWrappedStatus(message = "", tone = "muted") {
  if (!elements.wrappedStatus) return;
  elements.wrappedStatus.textContent = message;
  elements.wrappedStatus.style.color =
    tone === "error" ? "#f2b8b2" : tone === "success" ? "var(--text-soft)" : "var(--muted)";
}

function syncWrappedRangeButtons() {
  elements.wrappedRangeButtons.forEach((button) => {
    const active = button.dataset.range === state.activeWrappedRange;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function activateStaticPane({ buttons, panes, value, buttonAttribute, panelAttribute, stateKey, focus = false }) {
  state[stateKey] = value;
  buttons.forEach((button) => {
    const active = button.dataset[buttonAttribute] === value;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    if (active && focus) button.focus();
  });
  panes.forEach((pane) => {
    const active = pane.dataset[panelAttribute] === value;
    pane.classList.toggle("is-active", active);
    pane.hidden = !active;
  });
}

function setWrappedPane(value = "overview", options = {}) {
  const nextValue = ["overview", "artists", "songs", "genres"].includes(value) ? value : "overview";
  const previousScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  activateStaticPane({
    buttons: elements.wrappedPaneButtons,
    panes: elements.wrappedPanes,
    value: nextValue,
    buttonAttribute: "wrappedPane",
    panelAttribute: "wrappedPanel",
    stateKey: "activeWrappedPane",
    ...options,
  });
  window.requestAnimationFrame(() => jumpWindowScroll(previousScrollY));
}

function setDayPane(value = "overview", options = {}) {
  const nextValue = ["overview", "chapters"].includes(value) ? value : "overview";
  const previousScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  activateStaticPane({
    buttons: elements.dayPaneButtons,
    panes: elements.dayPanes,
    value: nextValue,
    buttonAttribute: "dayPane",
    panelAttribute: "dayPanel",
    stateKey: "activeDayPane",
    ...options,
  });
  window.requestAnimationFrame(() => jumpWindowScroll(previousScrollY));
}

function setPlaylistPane(value = "genre", options = {}) {
  const nextValue = ["genre", "decade", "mood"].includes(value) ? value : "genre";
  const previousScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  activateStaticPane({
    buttons: elements.playlistPaneButtons,
    panes: elements.playlistPanes,
    value: nextValue,
    buttonAttribute: "playlistPane",
    panelAttribute: "playlistPanel",
    stateKey: "activePlaylistPane",
    ...options,
  });
  window.requestAnimationFrame(() => jumpWindowScroll(previousScrollY));
}

function getTrackImageUrl(track = null) {
  return track?.image_url || track?.album?.images?.[0]?.url || "";
}

function getArtistImageUrl(artist = null) {
  return artist?.image_url || artist?.images?.[0]?.url || "";
}

function getSpotifyUrl(item = null) {
  return item?.spotify_url || item?.external_urls?.spotify || "";
}

function createWrappedRankedItem({ imageUrl = "", title = "", detail = "", badge = "", href = "" }) {
  const wrapper = document.createElement(href ? "a" : "article");
  wrapper.className = "wrapped-ranked-item";
  if (href) {
    wrapper.href = href;
    wrapper.target = "_blank";
    wrapper.rel = "noreferrer";
  }

  const imageMarkup = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer">`
    : `<span class="wrapped-ranked-placeholder" aria-hidden="true">${escapeHtml((title || "?").slice(0, 1))}</span>`;

  wrapper.innerHTML = `
    <span class="wrapped-ranked-art">${imageMarkup}</span>
    <span class="wrapped-ranked-copy">
      <strong>${escapeHtml(title || "Unknown")}</strong>
      <span>${escapeHtml(detail || "")}</span>
    </span>
    ${badge ? `<span class="wrapped-ranked-badge">${escapeHtml(badge)}</span>` : ""}
  `;
  return wrapper;
}

function getWrappedPeriod(range = state.activeWrappedRange) {
  const periods = {
    short_term: { label: "Last 4 Weeks", story: "Your last 4 weeks" },
    medium_term: { label: "Last 6 Months", story: "Your last 6 months" },
    long_term: { label: "All Time", story: "Your long-term listening" },
  };
  return periods[range] || periods.short_term;
}

function setWrappedBusy(isBusy) {
  elements.wrappedSection?.setAttribute("aria-busy", String(isBusy));
  elements.wrappedRangeButtons.forEach((button) => {
    button.disabled = isBusy;
  });
}

function setWrappedShareAvailable(available) {
  if (!elements.wrappedImageShare) return;
  elements.wrappedImageShare.disabled = !available;
  elements.wrappedImageShare.setAttribute("aria-disabled", String(!available));
}

function renderWrappedLoading() {
  setWrappedBusy(true);
  setWrappedShareAvailable(false);
  setWrappedStatus("Building your Wrapped Anytime report...");
  elements.wrappedSection?.classList.remove("has-empty-report");
  if (elements.wrappedShareCard) {
    elements.wrappedShareCard.classList.remove("is-empty-state");
    elements.wrappedShareCard.classList.add("is-loading");
    elements.wrappedShareCard.innerHTML = `
      <div class="wrapped-story-copy">
        <p class="wrapped-story-period">${escapeHtml(getWrappedPeriod().story)}</p>
        <p class="wrapped-story-eyebrow">Listening personality</p>
        <h3>Generating report</h3>
        <div class="wrapped-story-loading-lines" aria-hidden="true"><span></span><span></span></div>
        <p class="wrapped-story-summary">Finding the shape of your listening history.</p>
      </div>
      <div class="wrapped-story-placeholder" aria-hidden="true"></div>
    `;
  }
  if (elements.wrappedMoodGrid) {
    elements.wrappedMoodGrid.innerHTML = Array.from({ length: 6 }, () => '<span class="wrapped-metric-skeleton" aria-hidden="true"></span>').join("");
  }
  [elements.wrappedTopArtists, elements.wrappedTopGenres, elements.wrappedReplayedTracks].forEach((container) => {
    if (!container) return;
    container.innerHTML = `
      <div class="wrapped-mini-skeleton"></div>
      <div class="wrapped-mini-skeleton"></div>
      <div class="wrapped-mini-skeleton"></div>
    `;
  });
  renderSkeletonCards(elements.wrappedTopTracks, 4);
}

function renderWrappedSignedOut() {
  const authenticated = state.authenticated;
  state.wrappedReport = null;
  setWrappedBusy(false);
  setWrappedShareAvailable(false);
  syncWrappedRangeButtons();
  setWrappedStatus("");
  elements.wrappedSection?.classList.add("has-empty-report");
  if (elements.wrappedShareCard) {
    elements.wrappedShareCard.classList.remove("is-loading", "has-long-personality");
    elements.wrappedShareCard.classList.add("is-empty-state");
    elements.wrappedShareCard.innerHTML = `
      <div class="wrapped-story-copy">
        <p class="wrapped-story-period">${escapeHtml(getWrappedPeriod().story)}</p>
        <p class="wrapped-story-eyebrow">${authenticated ? "Listening profile" : "Listening personality"}</p>
        <h3>${authenticated ? "Nothing to report yet" : "Connect Spotify"}</h3>
        <p class="wrapped-story-detail">${authenticated
          ? "Keep listening on Spotify. Your report will take shape when listening history becomes available."
          : "Your listening personality appears here after login."}</p>
      </div>
    `;
  }
  if (elements.wrappedMoodGrid) elements.wrappedMoodGrid.innerHTML = "";
  renderEmptyState(
    elements.wrappedTopArtists,
    "No artists yet.",
    authenticated ? "Your top artists will appear as your listening history develops." : "Connect Spotify to load your top artists."
  );
  renderEmptyState(
    elements.wrappedTopTracks,
    "No songs yet.",
    authenticated ? "Your top songs will appear as your listening history develops." : "Connect Spotify to load your top songs."
  );
  renderEmptyState(
    elements.wrappedTopGenres,
    "No genres yet.",
    authenticated ? "Your genre mix will appear as Spotify learns your listening." : "Connect Spotify to load your genre mix."
  );
  renderEmptyState(
    elements.wrappedReplayedTracks,
    "No top tracks yet.",
    authenticated ? "Your selected-range Top Tracks will appear as Spotify learns your listening." : "Connect Spotify to load your Top Tracks."
  );
}

function renderWrappedMood(dna = [], { topTrack = null, topGenre = null } = {}) {
  if (!elements.wrappedMoodGrid) return;
  elements.wrappedMoodGrid.innerHTML = "";
  if (!dna.length) {
    renderEmptyState(elements.wrappedMoodGrid, "Mood profile unavailable.", "Spotify did not return enough signals yet.");
    return;
  }
  elements.wrappedMoodGrid.setAttribute("aria-label", "Wrapped highlights and mood profile");
  const metrics = [
    { label: "Top Song", value: topTrack?.name || "Unknown", imageUrl: getTrackImageUrl(topTrack), isContext: true },
    { label: "Top Genre", value: formatGenreLabel(topGenre?.name || "") || "Unknown", isContext: true },
    ...dna,
  ];
  metrics.forEach((item) => {
    const tile = document.createElement("div");
    tile.className = "wrapped-mood-tile";
    if (item.isContext) tile.classList.add("wrapped-mood-tile--context");
    if (item.imageUrl) {
      tile.classList.add("wrapped-mood-tile--track");
      tile.innerHTML = `
        <img src="${escapeHtml(getWrappedDisplayArtworkUrl(item.imageUrl))}" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer">
        <span class="wrapped-mood-tile__copy">
          <span>${escapeHtml(item.label || "")}</span>
          <strong>${escapeHtml(item.value || "")}</strong>
          <em>${escapeHtml(item.detail || "")}</em>
        </span>
      `;
    } else {
      tile.innerHTML = `
        <span>${escapeHtml(item.label || "")}</span>
        <strong>${escapeHtml(item.value || "")}</strong>
        <em>${escapeHtml(item.detail || "")}</em>
      `;
    }
    elements.wrappedMoodGrid.appendChild(tile);
  });
}

function renderWrappedGenres(genres = []) {
  if (!elements.wrappedTopGenres) return;
  elements.wrappedTopGenres.innerHTML = "";
  if (!genres.length) {
    renderEmptyState(elements.wrappedTopGenres, "No genres yet.", "Spotify did not return artist genres for this range.");
    return;
  }
  const maxCount = Math.max(...genres.map((genre) => genre.count || 0), 1);
  genres.slice(0, 6).forEach((genre) => {
    const row = document.createElement("article");
    row.className = "wrapped-genre-row";
    const percent = Math.max(10, Math.min(100, ((genre.count || 0) / maxCount) * 100));
    row.style.setProperty("--genre-share", `${percent}%`);
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(formatGenreLabel(genre.name || ""))}</strong>
      </div>
      <div class="wrapped-genre-meter" aria-hidden="true"><span></span></div>
    `;
    elements.wrappedTopGenres.appendChild(row);
  });
}

function renderWrappedArtists(artists = []) {
  if (!elements.wrappedTopArtists) return;
  elements.wrappedTopArtists.innerHTML = "";
  if (!artists.length) {
    renderEmptyState(elements.wrappedTopArtists, "No artists yet.", "Spotify did not return top artists for this range.");
    return;
  }
  artists.slice(0, 6).forEach((artist, index) => {
    const genres = (artist.genres || []).slice(0, 2).map(formatGenreLabel).join(" / ");
    const item = createWrappedRankedItem({
      imageUrl: getArtistImageUrl(artist),
      title: artist.name || "Unknown artist",
      detail: index === 0 ? `Top artist${genres ? ` · ${genres}` : ""}` : genres || "Artist",
      href: getSpotifyUrl(artist),
    });
    item.classList.add("wrapped-artist-item");
    if (index === 0) item.classList.add("is-featured");
    elements.wrappedTopArtists.appendChild(item);
  });
}

function renderWrappedTracks(tracks = []) {
  if (!elements.wrappedTopTracks) return;
  elements.wrappedTopTracks.innerHTML = "";
  if (!tracks.length) {
    renderEmptyState(elements.wrappedTopTracks, "No songs yet.", "Spotify did not return top songs for this range.");
    return;
  }
  elements.wrappedTopTracks.appendChild(
    createTrackRow(tracks.slice(0, 8), {
      rowClass: "wrapped-card-row",
      badge: (_track, index) => (index === 0 ? "Top song" : ""),
      detail: (track) => {
        const year = track.release_year ? `${track.release_year}` : "";
        return year ? `Released ${year}` : track.album?.name || "";
      },
      decorate: (card, _track, index) => {
        card.classList.add("wrapped-song-card");
        if (index === 0) card.classList.add("is-top-song");
      },
      openOnCard: true,
      showNowPlaying: false,
    })
  );
}

function renderWrappedPeriodTracks(tracks = []) {
  if (!elements.wrappedReplayedTracks) return;
  elements.wrappedReplayedTracks.innerHTML = "";
  if (!tracks.length) {
    renderEmptyState(elements.wrappedReplayedTracks, "No top tracks yet.", "Spotify did not return Top Tracks for this range.");
    return;
  }
  tracks.slice(0, 5).forEach((track) => {
    const rankedTrack = createWrappedRankedItem({
      imageUrl: getTrackImageUrl(track),
      title: track.name || "Unknown track",
      detail: getArtistLabel(track),
      href: getSpotifyUrl(track),
    });
    rankedTrack.classList.add("wrapped-replay-item");
    elements.wrappedReplayedTracks.appendChild(rankedTrack);
  });
}

function renderWrappedShareCard(report) {
  if (!elements.wrappedShareCard) return;
  const card = report?.share_card || {};
  const topTrack = card.top_track || {};
  const topArtist = card.top_artist || {};
  const topGenre = card.top_genre || {};
  const trackImage = getTrackImageUrl(topTrack);
  const artistImage = getArtistImageUrl(topArtist);
  const imageUrl = artistImage || trackImage;
  const displayImageUrl = getWrappedDisplayArtworkUrl(imageUrl);
  const personality = report?.listening_personality || card.personality || {};
  const discovery = report?.discovery_score || card.discovery_score || {};
  const discoveryScore = Math.max(0, Math.min(100, Number(discovery.score) || 0));
  const period = getWrappedPeriod();
  elements.wrappedShareCard.classList.remove("is-loading", "is-empty-state");
  elements.wrappedShareCard.classList.toggle("has-long-personality", (personality.title || "").length > 42);
  elements.wrappedShareCard.innerHTML = `
    <div class="wrapped-story-copy">
      <p class="wrapped-story-period">${escapeHtml(period.story)}</p>
      <p class="wrapped-story-eyebrow">Listening personality</p>
      <h3>${escapeHtml(personality.title || "The Taste Architect")}</h3>
      <p class="wrapped-story-detail">${escapeHtml(personality.detail || "")}</p>
      <section class="wrapped-discovery-story" aria-label="Discovery score: ${escapeHtml(String(discoveryScore))} percent">
        <div class="wrapped-discovery-heading">
          <span>Discovery</span>
          <strong>${escapeHtml(String(discoveryScore))}%</strong>
          <i aria-hidden="true">·</i>
          <b>${escapeHtml(discovery.label || "Discovery Score")}</b>
        </div>
        <p class="wrapped-discovery-detail">${escapeHtml(discovery.detail || "")}</p>
      </section>
    </div>
    <figure class="wrapped-featured-artist">
      ${
        displayImageUrl
          ? `<img src="${escapeHtml(displayImageUrl)}" alt="${escapeHtml(`Top artist ${topArtist.name || ""}`.trim())}" loading="eager" decoding="async" fetchpriority="high" referrerpolicy="no-referrer">`
          : '<span class="wrapped-story-placeholder" aria-hidden="true"></span>'
      }
      <figcaption>
        <span>Top artist</span>
        <strong>${escapeHtml(topArtist.name || "Unknown")}</strong>
      </figcaption>
    </figure>
  `;
}

function renderWrappedReport(report) {
  const hasListeningData = [
    report?.top_artists,
    report?.top_tracks,
    report?.top_genres,
  ].some((items) => Array.isArray(items) && items.length > 0);
  if (!report || !hasListeningData) {
    renderWrappedSignedOut();
    return;
  }
  state.wrappedReport = report;
  setWrappedBusy(false);
  setWrappedShareAvailable(true);
  elements.wrappedSection?.classList.remove("has-empty-report");
  syncWrappedRangeButtons();
  setWrappedStatus("");
  const allTimeButton = [...elements.wrappedRangeButtons].find((button) => button.dataset.range === "long_term");
  if (allTimeButton && report.data_note) {
    allTimeButton.title = report.data_note;
    allTimeButton.setAttribute("aria-label", `All Time. ${report.data_note}`);
  }
  renderWrappedShareCard(report);
  renderWrappedMood(report.mood_profile?.dna || [], {
    topTrack: report.share_card?.top_track || report.top_tracks?.[0] || null,
    topGenre: report.share_card?.top_genre || report.top_genres?.[0] || null,
  });
  renderWrappedArtists(report.top_artists || []);
  renderWrappedTracks(report.top_tracks || []);
  renderWrappedGenres(report.top_genres || []);
  renderWrappedPeriodTracks(report.top_tracks || []);
}

async function fetchWrappedReport({ force = false } = {}) {
  if (state.wrappedPending || !state.authenticated) return;
  const previousScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  state.wrappedPending = true;
  renderWrappedLoading();
  window.requestAnimationFrame(() => jumpWindowScroll(previousScrollY));
  try {
    const query = new URLSearchParams({
      time_range: state.activeWrappedRange,
    });
    if (force) query.set("force", "1");
    const { response, data } = await getJson(`/api/wrapped?${query.toString()}`);
    if (response.status === 401 || data?.error === "not_authenticated") {
      state.authenticated = false;
      syncAuthButtons();
      resetSignedOutUi();
      showBanner("Your Spotify session expired. Log in again to generate Wrapped Anytime.", "Log In Again");
      return;
    }
    if (!response.ok || data?.error) {
      setWrappedStatus(
        data?.error === "spotify_not_configured"
          ? "Spotify OAuth is not configured for this deployment."
          : "Wrapped Anytime could not load from Spotify right now.",
        "error"
      );
      if (elements.wrappedShareCard) elements.wrappedShareCard.classList.remove("is-loading");
      return;
    }
    renderWrappedReport(data);
    window.requestAnimationFrame(() => jumpWindowScroll(previousScrollY));
  } catch (_error) {
    setWrappedStatus("Wrapped Anytime is unavailable right now.", "error");
    if (elements.wrappedShareCard) elements.wrappedShareCard.classList.remove("is-loading");
  } finally {
    state.wrappedPending = false;
    setWrappedBusy(false);
  }
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = [];
  String(text || "").split(/\s+/).filter(Boolean).forEach((word) => {
    if (context.measureText(word).width <= maxWidth) {
      words.push(word);
      return;
    }
    let remainder = word;
    while (remainder) {
      let end = remainder.length;
      while (end > 1 && context.measureText(remainder.slice(0, end)).width > maxWidth) end -= 1;
      words.push(remainder.slice(0, end));
      remainder = remainder.slice(end);
    }
  });
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const nextLine = line ? `${line} ${word}` : word;
    if (context.measureText(nextLine).width <= maxWidth || !line) {
      line = nextLine;
      return;
    }
    lines.push(line);
    line = word;
  });
  if (line) lines.push(line);

  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines && visibleLines.length) {
    let last = visibleLines[visibleLines.length - 1];
    while (last.length > 0 && context.measureText(`${last}...`).width > maxWidth) {
      last = last.slice(0, -1).trim();
    }
    visibleLines[visibleLines.length - 1] = `${last}...`;
  }

  visibleLines.forEach((lineText, index) => {
    context.fillText(lineText, x, y + index * lineHeight);
  });
  return y + visibleLines.length * lineHeight;
}

function createWrappedShareTheme(palette) {
  const accent = parseDayColor(palette.accent) || { r: 159, g: 215, b: 202 };
  const secondarySource = parseDayColor(palette.secondary) || accent;
  const secondary = normalizeColorTone(mixColors(secondarySource, accent, 0.34), {
    minLightness: 0.4,
    maxLightness: 0.68,
    minSaturation: 0.32,
    maxSaturation: 0.82,
  });
  const secondaryHsl = rgbToHsl(secondary);
  const secondaryInk = relativeLuminance(secondary) > 0.42
    ? hslToRgb({ h: secondaryHsl.h, s: 0.18, l: 0.1 })
    : hslToRgb({ h: secondaryHsl.h, s: 0.14, l: 0.96 });

  return {
    background: palette.bgDepth || "#090b11",
    accent: palette.accent || "#9fd7ca",
    secondary: rgbToCss(secondary),
    accentInk: palette.accentInk || "#11131a",
    secondaryInk: rgbToCss(secondaryInk),
    text: palette.text || "#f8f7fb",
    textSoft: palette.textSoft || "#e5e2ed",
    muted: palette.muted || "#a9a8b8",
  };
}

function createWrappedFallbackPalette(report) {
  const card = report?.share_card || {};
  const rangeLabel = report?.time_range?.label || getWrappedPeriod().label;
  const identity = [
    rangeLabel,
    card.top_artist?.name || report?.top_artists?.[0]?.name,
    card.top_track?.name || report?.top_tracks?.[0]?.name,
  ].filter(Boolean).join("|");
  const hue = dayColorSeed(identity || "SpotiFeel Wrapped") % 360;
  return createArtworkPalette(
    hslToRgb({ h: hue, s: 0.58, l: 0.36 }),
    hslToRgb({ h: hue + 18, s: 0.48, l: 0.5 }),
    hslToRgb({ h: hue - 12, s: 0.7, l: 0.62 })
  );
}

async function getWrappedShareTheme(report) {
  const card = report?.share_card || {};
  const topArtist = card.top_artist || report?.top_artists?.[0] || {};
  const topTrack = card.top_track || report?.top_tracks?.[0] || {};
  const imageUrl = getArtistImageUrl(topArtist) || getTrackImageUrl(topTrack);
  let palette = createWrappedFallbackPalette(report);

  if (imageUrl) {
    const paletteUrl = imageUrl.startsWith("/api/wrapped/artwork?")
      ? imageUrl
      : getWrappedArtworkProxyUrl(imageUrl);
    try {
      palette = await buildArtworkPalette(paletteUrl);
    } catch (_error) {
      // A period-specific tonal fallback keeps export colors cohesive if artwork cannot be sampled.
    }
  }

  return createWrappedShareTheme(palette);
}

function getWrappedArtworkProxyUrl(imageUrl) {
  if (!imageUrl) return "";
  return `/api/wrapped/artwork?${new URLSearchParams({ url: imageUrl }).toString()}`;
}

function getWrappedDisplayArtworkUrl(imageUrl) {
  if (!imageUrl) return "";
  try {
    const url = new URL(imageUrl, window.location.href);
    const host = url.hostname.toLowerCase();
    if (url.protocol === "https:" && (host === "scdn.co" || host.endsWith(".scdn.co") || host === "spotifycdn.com" || host.endsWith(".spotifycdn.com"))) {
      return getWrappedArtworkProxyUrl(imageUrl);
    }
  } catch (_error) {
    return imageUrl;
  }
  return imageUrl;
}

function loadWrappedCanvasImage(imageUrl) {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.referrerPolicy = "no-referrer";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = getWrappedArtworkProxyUrl(imageUrl);
  });
}

function drawWrappedCoverImage(context, image, x, y, width, height) {
  if (/\.svg(?:\?|$)/i.test(image.currentSrc || image.src || "")) {
    context.drawImage(image, x, y, width, height);
    return;
  }
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;
  if (sourceRatio > targetRatio) {
    sourceWidth = image.naturalHeight * targetRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / targetRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawWrappedArtwork(context, image, x, y, width, height, theme, fallbackLabel = "") {
  if (image) {
    drawWrappedCoverImage(context, image, x, y, width, height);
    return;
  }
  context.fillStyle = "#20232b";
  context.fillRect(x, y, width, height);
  context.fillStyle = theme.secondary;
  context.font = `500 ${Math.round(Math.min(width, height) * .34)}px 'Bodoni Moda', Georgia, serif`;
  context.textAlign = "center";
  context.fillText((fallbackLabel || "S").slice(0, 1).toUpperCase(), x + width / 2, y + height * .62);
  context.textAlign = "left";
}

function drawWrappedShareHeader(context, theme, rangeLabel, viewLabel) {
  context.fillStyle = theme.accent;
  context.fillRect(0, 0, 1080, 12);
  context.fillRect(70, 92, 50, 3);
  context.fillStyle = theme.text;
  context.font = "700 20px 'DM Sans', Arial, sans-serif";
  context.fillText("SPOTIFEEL / WRAPPED ANYTIME", 70, 66);
  context.fillStyle = theme.accent;
  context.font = "700 15px 'DM Sans', Arial, sans-serif";
  context.fillText(String(viewLabel || "Overview").toUpperCase(), 140, 98);
  context.textAlign = "right";
  context.fillStyle = theme.textSoft;
  context.fillText(String(rangeLabel || "").toUpperCase(), 1010, 66);
  context.textAlign = "left";
}

function drawWrappedShareFooter(context, theme) {
  context.strokeStyle = "rgba(255, 255, 255, .16)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(70, 1270);
  context.lineTo(1010, 1270);
  context.stroke();
  context.fillStyle = theme.muted;
  context.font = "600 16px 'DM Sans', Arial, sans-serif";
  context.fillText("YOUR MUSIC, SEEN DIFFERENTLY", 70, 1306);
  context.textAlign = "right";
  context.fillText("SPOTIFEEL", 1010, 1302);
  context.textAlign = "left";
}

async function drawWrappedOverviewShare(context, report, theme) {
  const card = report?.share_card || {};
  const topTrack = card.top_track || {};
  const topArtist = card.top_artist || {};
  const topGenre = card.top_genre || {};
  const discovery = report?.discovery_score || card.discovery_score || {};
  const personality = report?.listening_personality || card.personality || {};
  const artistImage = await loadWrappedCanvasImage(getArtistImageUrl(topArtist) || getTrackImageUrl(topTrack));

  context.fillStyle = theme.accent;
  context.font = "700 16px 'DM Sans', Arial, sans-serif";
  context.fillText("LISTENING PERSONALITY", 70, 164);
  context.fillStyle = theme.text;
  context.font = "500 76px 'Bodoni Moda', Georgia, serif";
  const titleEnd = drawWrappedText(context, personality.title || "The Taste Architect", 70, 242, 940, 76, 2);
  context.fillStyle = theme.textSoft;
  context.font = "400 22px 'DM Sans', Arial, sans-serif";
  drawWrappedText(context, personality.detail || "", 72, titleEnd + 22, 880, 30, 2);

  drawWrappedArtwork(context, artistImage, 70, 470, 594, 610, theme, topArtist.name);
  context.strokeStyle = theme.accent;
  context.lineWidth = 3;
  context.strokeRect(70, 470, 594, 610);
  context.fillStyle = "rgba(7, 9, 14, .9)";
  context.fillRect(70, 974, 594, 106);
  context.fillStyle = theme.accent;
  context.font = "700 16px 'DM Sans', Arial, sans-serif";
  context.fillText("TOP ARTIST", 100, 1014);
  context.fillStyle = theme.text;
  context.font = "500 38px 'Bodoni Moda', Georgia, serif";
  drawWrappedText(context, topArtist.name || "Unknown", 100, 1058, 525, 40, 1);

  context.fillStyle = theme.muted;
  context.font = "700 18px 'DM Sans', Arial, sans-serif";
  context.fillText("DISCOVERY", 714, 482);
  context.fillStyle = theme.accent;
  context.font = "500 106px 'Bodoni Moda', Georgia, serif";
  context.fillText(`${discovery.score ?? "--"}%`, 706, 578);
  context.fillStyle = theme.textSoft;
  context.font = "600 17px 'DM Sans', Arial, sans-serif";
  drawWrappedText(context, discovery.label || "Discovery Score", 714, 614, 270, 22, 2);

  context.strokeStyle = "rgba(255, 255, 255, .16)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(714, 660);
  context.lineTo(1010, 660);
  context.stroke();
  context.fillStyle = theme.muted;
  context.font = "700 16px 'DM Sans', Arial, sans-serif";
  context.fillText("TOP GENRE", 714, 710);
  context.fillStyle = theme.text;
  context.font = "500 42px 'Bodoni Moda', Georgia, serif";
  drawWrappedText(context, formatGenreLabel(topGenre.name || "Mixed"), 714, 762, 286, 44, 2);

  context.strokeStyle = "rgba(255, 255, 255, .16)";
  context.beginPath();
  context.moveTo(714, 850);
  context.lineTo(1010, 850);
  context.stroke();
  context.fillStyle = theme.accent;
  context.font = "700 16px 'DM Sans', Arial, sans-serif";
  context.fillText("TOP SONG", 714, 900);
  context.fillStyle = theme.text;
  context.font = "500 42px 'Bodoni Moda', Georgia, serif";
  drawWrappedText(context, topTrack.name || "Unknown", 714, 952, 286, 44, 3);
  context.fillStyle = theme.muted;
  context.font = "500 18px 'DM Sans', Arial, sans-serif";
  drawWrappedText(context, getArtistLabel(topTrack), 714, 1090, 286, 23, 2);
}

async function drawWrappedArtistsShare(context, report, theme) {
  const artists = (report?.top_artists || []).slice(0, 5);
  const images = await Promise.all(artists.map((artist) => loadWrappedCanvasImage(getArtistImageUrl(artist))));
  const topArtist = artists[0] || {};
  context.fillStyle = theme.text;
  context.font = "500 72px 'Bodoni Moda', Georgia, serif";
  drawWrappedText(context, "The artists that defined your listening.", 70, 200, 940, 72, 2);
  drawWrappedArtwork(context, images[0], 70, 348, 590, 710, theme, topArtist.name);
  context.fillStyle = theme.accent;
  context.fillRect(70, 948, 590, 110);
  context.fillStyle = theme.accentInk;
  context.font = "700 17px 'DM Sans', Arial, sans-serif";
  context.fillText("1 / TOP ARTIST", 102, 988);
  context.font = "500 42px 'Bodoni Moda', Georgia, serif";
  drawWrappedText(context, topArtist.name || "Unknown", 102, 1036, 520, 44, 1);

  artists.slice(1).forEach((artist, index) => {
    const y = 348 + index * 176;
    drawWrappedArtwork(context, images[index + 1], 710, y, 132, 132, theme, artist.name);
    context.fillStyle = theme.accent;
    context.font = "700 15px 'DM Sans', Arial, sans-serif";
    context.fillText(`${index + 2}`, 870, y + 30);
    context.fillStyle = theme.text;
    context.font = "500 29px 'Bodoni Moda', Georgia, serif";
    drawWrappedText(context, artist.name || "Unknown", 870, y + 72, 140, 31, 2);
  });
  context.fillStyle = theme.textSoft;
  context.font = "400 23px 'DM Sans', Arial, sans-serif";
  drawWrappedText(context, report?.taste_summary || "", 70, 1150, 920, 31, 3);
}

async function drawWrappedSongsShare(context, report, theme) {
  const tracks = (report?.top_tracks || []).slice(0, 5);
  const images = await Promise.all(tracks.map((track) => loadWrappedCanvasImage(getTrackImageUrl(track))));
  const topTrack = tracks[0] || {};
  context.fillStyle = theme.text;
  context.font = "500 70px 'Bodoni Moda', Georgia, serif";
  drawWrappedText(context, "The songs at the center of your world.", 70, 200, 940, 70, 2);
  drawWrappedArtwork(context, images[0], 70, 340, 540, 540, theme, topTrack.name);
  context.fillStyle = theme.accent;
  context.fillRect(70, 880, 540, 200);
  context.fillStyle = theme.accentInk;
  context.font = "700 16px 'DM Sans', Arial, sans-serif";
  context.fillText("1 / TOP SONG", 102, 923);
  context.font = "500 34px 'Bodoni Moda', Georgia, serif";
  drawWrappedText(context, topTrack.name || "Unknown", 102, 968, 475, 36, 2);
  context.font = "500 18px 'DM Sans', Arial, sans-serif";
  drawWrappedText(context, getArtistLabel(topTrack), 102, 1054, 475, 22, 1);

  tracks.slice(1).forEach((track, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 650 + column * 180;
    const y = 340 + row * 340;
    drawWrappedArtwork(context, images[index + 1], x, y, 160, 160, theme, track.name);
    context.fillStyle = theme.accent;
    context.font = "700 14px 'DM Sans', Arial, sans-serif";
    context.fillText(`${index + 2}`, x, y + 194);
    context.fillStyle = theme.text;
    context.font = "500 25px 'Bodoni Moda', Georgia, serif";
    drawWrappedText(context, track.name || "Unknown", x, y + 228, 160, 27, 2);
    context.fillStyle = theme.muted;
    context.font = "500 15px 'DM Sans', Arial, sans-serif";
    drawWrappedText(context, getArtistLabel(track), x, y + 290, 160, 20, 2);
  });
  context.fillStyle = theme.textSoft;
  context.font = "400 23px 'DM Sans', Arial, sans-serif";
  drawWrappedText(context, report?.taste_summary || "", 70, 1140, 920, 31, 3);
}

async function drawWrappedGenresShare(context, report, theme) {
  const genres = (report?.top_genres || []).slice(0, 6);
  const topTracks = (report?.top_tracks || []).slice(0, 3);
  const trackImages = await Promise.all(topTracks.map((track) => loadWrappedCanvasImage(getTrackImageUrl(track))));
  context.fillStyle = theme.text;
  context.font = "500 72px 'Bodoni Moda', Georgia, serif";
  drawWrappedText(context, "The sounds shaping your listening palette.", 70, 200, 940, 72, 2);

  genres.forEach((genre, index) => {
    const y = 376 + index * 116;
    context.fillStyle = index === 0 ? theme.accent : theme.muted;
    context.font = "700 16px 'DM Sans', Arial, sans-serif";
    context.fillText(`${index + 1}`, 70, y);
    context.fillStyle = index === 0 ? theme.accent : theme.text;
    context.font = `${index === 0 ? 500 : 400} ${index === 0 ? 55 : 42}px 'Bodoni Moda', Georgia, serif`;
    drawWrappedText(context, formatGenreLabel(genre.name || "Mixed"), 120, y, 500, index === 0 ? 56 : 45, 1);
    context.strokeStyle = "rgba(255, 255, 255, .15)";
    context.beginPath();
    context.moveTo(70, y + 42);
    context.lineTo(610, y + 42);
    context.stroke();
  });

  context.fillStyle = theme.secondary;
  context.fillRect(665, 330, 345, 650);
  context.fillStyle = theme.secondaryInk;
  context.font = "700 17px 'DM Sans', Arial, sans-serif";
  context.fillText("TOP TRACKS", 700, 378);
  topTracks.forEach((track, index) => {
    const y = 424 + index * 172;
    drawWrappedArtwork(context, trackImages[index], 700, y, 118, 118, theme, track.name);
    context.font = "700 15px 'DM Sans', Arial, sans-serif";
    context.fillText(`${index + 1}`, 842, y + 26);
    context.font = "500 27px 'Bodoni Moda', Georgia, serif";
    drawWrappedText(context, track.name || "Unknown", 842, y + 62, 140, 29, 2);
  });
  if (!topTracks.length) {
    context.font = "500 34px 'Bodoni Moda', Georgia, serif";
    drawWrappedText(context, "Your Top Tracks will appear here as Spotify learns your listening.", 700, 470, 265, 40, 4);
  }
  context.fillStyle = theme.textSoft;
  context.font = "400 23px 'DM Sans', Arial, sans-serif";
  drawWrappedText(context, report?.taste_summary || "", 70, 1120, 920, 31, 4);
}

async function buildWrappedImageCanvas(report, pane = "overview") {
  const card = report?.share_card || {};
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;
  await document.fonts?.ready;
  const theme = await getWrappedShareTheme(report);
  canvas.wrappedShareTheme = theme;
  const rangeLabel = report?.time_range?.label || getWrappedPeriod().label;
  const labels = { overview: "Overview", artists: "Top Artists", songs: "Top Songs", genres: "Genres + Top Tracks" };

  context.fillStyle = theme.background;
  context.fillRect(0, 0, width, height);
  drawWrappedShareHeader(context, theme, rangeLabel, labels[pane] || labels.overview);
  if (pane === "artists") await drawWrappedArtistsShare(context, report, theme);
  else if (pane === "songs") await drawWrappedSongsShare(context, report, theme);
  else if (pane === "genres") await drawWrappedGenresShare(context, report, theme);
  else await drawWrappedOverviewShare(context, report, theme);
  drawWrappedShareFooter(context, theme);

  return canvas;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

let wrappedSharePending = false;
let wrappedShareBlob = null;
let wrappedShareFilename = "";
let wrappedSharePreviewUrl = "";
let wrappedShareReturnFocus = null;
let wrappedShareScrollY = 0;

function closeWrappedSharePreview() {
  const dialog = document.querySelector(".wrapped-share-dialog");
  if (dialog?.open) dialog.close();
}

function cleanupWrappedSharePreview() {
  if (wrappedSharePreviewUrl) URL.revokeObjectURL(wrappedSharePreviewUrl);
  wrappedSharePreviewUrl = "";
  wrappedShareBlob = null;
  wrappedShareFilename = "";
  window.requestAnimationFrame(() => jumpWindowScroll(wrappedShareScrollY));
  wrappedShareReturnFocus?.focus?.({ preventScroll: true });
  wrappedShareReturnFocus = null;
}

function ensureWrappedShareDialog() {
  let dialog = document.querySelector(".wrapped-share-dialog");
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.className = "wrapped-share-dialog";
  dialog.setAttribute("aria-labelledby", "wrapped-share-preview-title");
  dialog.innerHTML = `
    <div class="wrapped-share-dialog__shell">
      <header class="wrapped-share-dialog__header">
        <div>
          <span>Wrapped Anytime</span>
          <h2 id="wrapped-share-preview-title">Share your listening</h2>
          <p class="wrapped-share-dialog__context"></p>
        </div>
        <button class="wrapped-share-dialog__close" type="button" aria-label="Close share preview"><i class="bx bx-x" aria-hidden="true"></i></button>
      </header>
      <figure class="wrapped-share-dialog__preview">
        <img alt="Generated SpotiFeel Wrapped share image preview">
      </figure>
      <div class="wrapped-share-dialog__actions">
        <button type="button" data-share-action="download">Download Image</button>
        <button type="button" data-share-action="share">Share</button>
        <button type="button" data-share-action="copy">Copy</button>
      </div>
      <p class="wrapped-share-dialog__status" role="status" aria-live="polite"></p>
    </div>
  `;
  document.body.appendChild(dialog);
  dialog.querySelector(".wrapped-share-dialog__close").addEventListener("click", closeWrappedSharePreview);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeWrappedSharePreview();
  });
  dialog.addEventListener("close", cleanupWrappedSharePreview);
  dialog.querySelector('[data-share-action="download"]').addEventListener("click", () => {
    if (!wrappedShareBlob) return;
    downloadBlob(wrappedShareBlob, wrappedShareFilename);
    dialog.querySelector(".wrapped-share-dialog__status").textContent = "Image downloaded.";
  });
  dialog.querySelector('[data-share-action="share"]').addEventListener("click", async () => {
    if (!wrappedShareBlob) return;
    const file = new File([wrappedShareBlob], wrappedShareFilename, { type: "image/png" });
    try {
      await navigator.share({ title: "SpotiFeel Wrapped Anytime", files: [file] });
      dialog.querySelector(".wrapped-share-dialog__status").textContent = "Share sheet opened.";
    } catch (error) {
      if (error?.name !== "AbortError") dialog.querySelector(".wrapped-share-dialog__status").textContent = "Sharing is unavailable here. Download still works.";
    }
  });
  dialog.querySelector('[data-share-action="copy"]').addEventListener("click", async () => {
    if (!wrappedShareBlob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": wrappedShareBlob })]);
      dialog.querySelector(".wrapped-share-dialog__status").textContent = "Image copied.";
    } catch (_error) {
      dialog.querySelector(".wrapped-share-dialog__status").textContent = "Image copy is unavailable here. Download still works.";
    }
  });
  return dialog;
}

function openWrappedSharePreview(blob, filename, pane, rangeLabel, theme = {}) {
  const dialog = ensureWrappedShareDialog();
  wrappedShareBlob = blob;
  wrappedShareFilename = filename;
  wrappedSharePreviewUrl = URL.createObjectURL(blob);
  dialog.querySelector("img").src = wrappedSharePreviewUrl;
  dialog.querySelector(".wrapped-share-dialog__context").textContent = `${rangeLabel} · ${pane}`;
  dialog.style.setProperty("--share-accent", theme.accent || "var(--accent-primary)");
  dialog.style.setProperty("--share-accent-ink", theme.accentInk || "var(--accent-ink)");
  dialog.style.setProperty("--share-background", theme.background || "var(--surface-dark)");
  dialog.style.setProperty("--share-text", theme.text || "var(--text)");
  dialog.style.setProperty("--share-muted", theme.muted || "var(--muted)");
  dialog.querySelector(".wrapped-share-dialog__status").textContent = "";
  const shareButton = dialog.querySelector('[data-share-action="share"]');
  const copyButton = dialog.querySelector('[data-share-action="copy"]');
  shareButton.hidden = false;
  copyButton.hidden = false;
  wrappedShareReturnFocus = document.activeElement;
  wrappedShareScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  dialog.showModal();
  dialog.querySelector(".wrapped-share-dialog__close").focus({ preventScroll: true });
}

async function shareWrappedImage() {
  if (!state.wrappedReport) {
    setWrappedStatus("Generate a report before sharing an image.", "error");
    return;
  }
  if (wrappedSharePending) return;

  const report = state.wrappedReport;
  const pane = state.activeWrappedPane;
  const range = state.activeWrappedRange;
  const rangeLabel = report?.time_range?.label || getWrappedPeriod().label;
  const paneLabel = { overview: "Overview", artists: "Artists", songs: "Songs", genres: "Genres" }[pane] || "Overview";
  const idleLabel = elements.wrappedImageShare.textContent;
  wrappedSharePending = true;
  elements.wrappedImageShare.disabled = true;
  elements.wrappedImageShare.setAttribute("aria-busy", "true");
  elements.wrappedImageShare.textContent = "Creating…";
  try {
    setWrappedStatus("Creating your share image...");
    const canvas = await buildWrappedImageCanvas(report, pane);
    const blob = await canvasBlob(canvas);
    const filename = `spotifeel-${range}-${pane}.png`;
    openWrappedSharePreview(blob, filename, paneLabel, rangeLabel, canvas.wrappedShareTheme);
    setWrappedStatus("Share image ready.", "success");
  } catch (_error) {
    setWrappedStatus("Image generation failed. Download remains available after retrying.", "error");
  } finally {
    wrappedSharePending = false;
    setWrappedShareAvailable(!!state.wrappedReport);
    elements.wrappedImageShare.removeAttribute("aria-busy");
    elements.wrappedImageShare.textContent = idleLabel;
  }
}

function resetSignedOutUi() {
  state.lyricsRequestToken += 1;
  state.currentItem = null;
  state.currentTrackKey = null;
  state.previousTrackSnapshot = null;
  state.activeCardKey = null;
  state.recentDayKey = "";
  state.todayRecentItems = [];
  clearDailyHistory(window.sessionStorage);
  state.currentGenre = null;
  state.currentTags = [];
  state.currentMood = null;
  state.currentAudioProfile = null;
  state.themeRequestKey = null;
  state.backdropRequestKey = null;
  clearOptimisticPlayback();
  state.currentLyricsLines = [];
  state.lyricTimeline = [];
  state.lyricLineElements = [];
  state.activeLyricLineIndex = -1;
  state.lyricsInteractive = false;
  state.visualizerProfile = [];
  setNowView("card");
  applyGenreTheme();
  clearReactiveProfile();
  renderHeroArc("");
  crossfadeHeroBackdrop("", "");
  updateTrackCard(null);
  updateVinyl(null);
  renderLyricsView({
    title: "Connect Spotify to view lyrics.",
    subtitle: "Lyrics, artwork color, and recommendations unlock after login.",
    content: "Log in and play a track to turn the page into a live reading and listening surface.",
  });
  setHeroMeta({
    item: null,
    context: "Start a song and SpotiFeel will follow its artwork, mood, and motion.",
  });
  setPlayerState({
    title: "Connect Spotify",
    artist: "Log in to load playback, history, and recommendations.",
    artUrl: "",
  });
  setYouTubeLink("");
  resetProgress();
  setActiveCard("");
  prepareVisualizerProfile("default");
  paintVisualizer(0);
  renderDayUnavailable("No recent tracks yet.", "Sign in with Spotify to load your listening history.");
  renderEmptyState(
    elements.recList,
    "Recommendations are waiting.",
    "Play a song after logging in and SpotiFeel will build similar picks."
  );
  setPlaylistStatus("Log in before creating playlists.");
  setPlaylistCardsDisabled(false);
  renderWrappedSignedOut();
}

async function getJson(url, options) {
  return apiRequest(url, options);
}

async function syncSession() {
  try {
    const { response, data } = await getJson("/api/session");
    if (response.ok) setCsrfToken(data?.csrf_token || "");
    if (response.ok && data?.configured === false) {
      state.authenticated = false;
      syncAuthButtons();
      showBanner("Spotify OAuth is not configured. Add the Spotify credentials before logging in.");
      resetSignedOutUi();
      return;
    }
    const authenticated = response.ok && !!data?.authenticated;
    state.authenticated = authenticated;
    syncAuthButtons();

    if (!authenticated) {
      showBanner("Connect Spotify to sync playback and unlock your listening tools.", "Connect Spotify");
      resetSignedOutUi();
      return;
    }

    showBanner("");
    setPlaylistStatus("");
    if (!state.wrappedReport) {
      fetchWrappedReport({ force: true });
    }
    if (!state.currentItem) {
      await Promise.all([fetchNowPlaying({ forceMeta: true, force: true }), fetchRecentTracks({ force: true })]);
    }
  } catch (_error) {
    syncAuthButtons();
    showBanner("SpotiFeel could not verify your Spotify session. Your current listening view has been preserved.", "Try Again");
  }
}

async function fetchTrackMetadata(trackKey, lyricsRequestToken = state.lyricsRequestToken) {
  try {
    const { response, data } = await getJson("/api/track-metadata");
    if (response.status === 401 || data?.error === "not_authenticated") {
      state.authenticated = false;
      syncAuthButtons();
      resetSignedOutUi();
      showBanner("Your Spotify session expired. Log in again to reload track details.", "Log In Again");
      return;
    }
    if (
      !response.ok ||
      state.currentTrackKey !== trackKey ||
      state.lyricsRequestToken !== lyricsRequestToken ||
      (data?.track_id && data.track_id !== state.currentItem?.id)
    ) return;

    const genre = data?.genre?.data;
    if (data?.genre?.status === 200 && genre) {
      state.currentGenre = genre.genre || state.currentGenre || "";
      state.currentTags = Array.isArray(genre.tags) ? genre.tags : [];
      state.currentMood = resolveMoodContext(state.currentGenre, state.currentTags);
      setReactiveProfile(genre.audio_profile || null);
      if (state.themeMode !== "album" && state.themeMode !== "pending") applyGenreTheme(state.currentGenre);
      updateGenreChip();
      updateMoodChip();
      if (genre.arc?.detail) renderHeroArc(genre.arc.detail);
      else syncHeroArc();
      setHeroMeta({ item: state.currentItem, context: state.currentMood?.context ?? "" });
      updateTrackCard(state.currentItem);
    }

    const lyrics = data?.lyrics?.data;
    if (lyrics?.track_id && lyrics.track_id !== state.currentItem?.id) return;
    const activeTitle = lyrics?.track || state.currentItem?.name || "Lyrics unavailable.";
    const activeArtist = lyrics?.artist || getArtistLabel(state.currentItem);
    if (data?.lyrics?.status === 200 && lyrics?.lyrics) {
      renderLyricsView({
        title: activeTitle,
        subtitle: activeArtist,
        content: lyrics.lyrics,
        syncedLyrics: lyrics.synced_lyrics || "",
        timing: lyrics.timing || "plain",
        source: lyrics.source || "",
        searchUrls: lyrics.search_urls || null,
      });
      syncLyricsPlayback(getCurrentProgressMs(), { forceFollow: true });
    } else {
      renderLyricsView({
        title: activeTitle,
        subtitle: `Lyrics weren't found for ${activeArtist} yet.`,
        content: "SpotiFeel couldn't pull lyrics for this song right now. Use the links below to keep following along.",
        searchUrls: lyrics?.search_urls || null,
      });
    }

    const youtube = data?.youtube?.data;
    setYouTubeLink(youtube?.youtube_url || youtube?.youtube_search_url || "");
  } catch (_error) {
    if (state.currentTrackKey !== trackKey || state.lyricsRequestToken !== lyricsRequestToken) return;
    setYouTubeLink("");
    renderLyricsView({
      title: state.currentItem?.name || "Lyrics unavailable.",
      subtitle: "Track metadata did not respond.",
      content: "Try again in a moment while the optional music services recover.",
    });
  }
}

async function fetchGenreNow(trackKey) {
  try {
    const { response, data } = await getJson("/api/genre-now");
    if (response.status === 401 || data?.error === "not_authenticated") {
      state.authenticated = false;
      syncAuthButtons();
      showBanner("Your Spotify session expired. Log in again to reload the dashboard.", "Log In Again");
      resetSignedOutUi();
      return;
    }
    if (!response.ok || state.currentTrackKey !== trackKey) return;
    state.currentGenre = data?.genre || state.currentGenre || "";
    state.currentTags = Array.isArray(data.tags) ? data.tags : [];
    state.currentMood = resolveMoodContext(state.currentGenre, state.currentTags);
    setReactiveProfile(data?.audio_profile || null);
    if (state.themeMode !== "album" && state.themeMode !== "pending") applyGenreTheme(state.currentGenre);
    updateGenreChip();
    updateMoodChip();
    if (data?.arc?.detail) {
      renderHeroArc(data.arc.detail);
    } else {
      syncHeroArc();
    }
    setHeroMeta({
      item: state.currentItem,
      context: state.currentMood?.context ?? "",
    });
    updateTrackCard(state.currentItem);
  } catch (_error) {}
}

async function fetchLyrics(trackKey, lyricsRequestToken = state.lyricsRequestToken) {
  if (!state.authenticated) return;
  try {
    const { response, data } = await getJson("/api/lyrics-now");
    if (response.status === 401 || data?.error === "not_authenticated") {
      state.authenticated = false;
      syncAuthButtons();
      resetSignedOutUi();
      showBanner("Your Spotify session expired. Log in again to view lyrics.", "Log In Again");
      return;
    }
    if (
      state.currentTrackKey !== trackKey ||
      state.lyricsRequestToken !== lyricsRequestToken ||
      (data?.track_id && data.track_id !== state.currentItem?.id)
    ) return;

    const activeTitle = data?.track || state.currentItem?.name || "Lyrics unavailable.";
    const activeArtist =
      data?.artist || (state.currentItem?.artists || []).map((artist) => artist.name).join(", ");

    if (!response.ok || !data?.lyrics) {
      renderLyricsView({
        title: activeTitle,
        subtitle: activeArtist
          ? `Lyrics weren't found for ${activeArtist} yet.`
          : "Lyrics weren't found for this track yet.",
        content:
          "SpotiFeel couldn't pull lyrics for this song right now. Use the links below to keep following along.",
        searchUrls: data?.search_urls || null,
      });
      return;
    }

    renderLyricsView({
      title: data.track || state.currentItem?.name || "Lyrics",
      subtitle: activeArtist || "",
      content: data.lyrics,
      syncedLyrics: data.synced_lyrics || "",
      timing: data.timing || "plain",
      source: data.source || "",
      searchUrls: data.search_urls || null,
    });
    syncLyricsPlayback(getCurrentProgressMs(), { forceFollow: true });
  } catch (_error) {
    if (state.currentTrackKey !== trackKey || state.lyricsRequestToken !== lyricsRequestToken) return;
    renderLyricsView({
      title: state.currentItem?.name || "Lyrics unavailable.",
      subtitle: "The lyrics service didn't respond for this track.",
      content: "Try again in a moment or use the lyric search links when they are available.",
    });
  }
}

async function fetchYouTubeNow(trackKey) {
  try {
    const { response, data } = await getJson("/api/youtube-now");
    if (!response.ok || state.currentTrackKey !== trackKey) return;
    setYouTubeLink(data?.youtube_url || data?.youtube_search_url || "");
  } catch (_error) {
    setYouTubeLink("");
  }
}

async function fetchRecommendations(trackKey) {
  try {
    renderSkeletonCards(elements.recList, 6);
    const { response, data } = await getJson("/api/recommendations");
    if (response.status === 401 || data?.error === "not_authenticated") {
      state.authenticated = false;
      syncAuthButtons();
      resetSignedOutUi();
      showBanner("Your Spotify session expired. Log in again to refresh recommendations.", "Log In Again");
      return;
    }
    if (state.currentTrackKey !== trackKey) return;
    if (!response.ok || !hasRecommendationGroups(data)) {
      renderEmptyState(
        elements.recList,
        "No recommendations yet.",
        "SpotiFeel could not build similar tracks for the current song."
      );
      return;
    }
    renderRecommendationGroups(data.groups, data?.based_on?.track || state.currentItem?.name || "this track");
  } catch (_error) {
    renderEmptyState(
      elements.recList,
      "Recommendations are unavailable.",
      "Try again in a moment after Spotify and Last.fm respond."
    );
  }
}

function applyNowPlaying(item, { trackChanged = false, preview = false } = {}) {
  state.currentItem = item;
  syncExperienceState();
  const trackKey = getTrackKey(item);
  if (trackKey) setActiveCard(trackKey);
  if (trackChanged) {
    crossfadeHeroBackdrop(trackKey, item.album?.images?.[0]?.url || "");
    updateTrackCard(item);
    updateVinyl(item);
    prepareVisualizerProfile(trackKey);
    triggerHeroPulse("track");
  }
  setHeroMeta({
    item,
    context:
      (preview && "Switching playback on Spotify and redrawing the page around the next song.") ||
      (state.currentMood?.context ?? ""),
  });
  setPlayerState({
    title: item.name || "Unknown track",
    artist: getArtistLabel(item),
    artUrl: item.album?.images?.[0]?.url || "",
  });
  if (preview) triggerHeroPulse("play");
  setPlaybackVisualState();
  paintVisualizer(progressMs);
}

async function fetchNowPlaying({ forceMeta = false, force = false } = {}) {
  if (state.nowPlayingPending || !state.authenticated) return;
  const now = Date.now();
  if (!force && !forceMeta && now - state.lastNowPlayingRequestAt < REQUEST_GAPS.nowPlaying) return;
  state.nowPlayingPending = true;
  state.lastNowPlayingRequestAt = now;
  try {
    const { response, data } = await getJson(force ? "/api/now-playing?refresh=1" : "/api/now-playing");

    if (response.status === 401 || data?.error === "not_authenticated") {
      state.authenticated = false;
      syncAuthButtons();
      showBanner("Your Spotify session expired. Log in again to continue syncing.", "Log In Again");
      resetSignedOutUi();
      return;
    }

    if (!response.ok || data?.error) {
      renderTrackPanelEmptyState(
        "Playback is temporarily unavailable.",
        "Spotify did not return track data for the dashboard."
      );
      return;
    }

    if (data?.playing === false || !data?.item) {
      if (shouldHoldOptimisticPlayback()) return;
      state.lyricsRequestToken += 1;
      state.currentItem = null;
      state.currentTrackKey = null;
      state.previousTrackSnapshot = null;
      state.currentGenre = null;
      state.currentTags = [];
      state.currentMood = null;
      state.currentAudioProfile = null;
      state.themeRequestKey = null;
      setNowView("card");
      applyGenreTheme();
      clearReactiveProfile();
      renderHeroArc("");
      crossfadeHeroBackdrop("", "");
      updateTrackCard(null);
      updateVinyl(null);
      setHeroMeta({
        item: null,
        context: "SpotiFeel will pick up the next track automatically and reshape the page around it.",
      });
      renderLyricsView({
        title: "Play a song to view lyrics.",
        subtitle: "Start a track in Spotify and the lyrics view will update automatically.",
        content: "When music is playing, SpotiFeel will pull lyric lines and recolor the page from the album art.",
      });
      setPlayerState({
        title: "No song playing",
        artist: "Start a track in Spotify to sync SpotiFeel.",
        artUrl: "",
      });
      setYouTubeLink("");
      resetProgress();
      setActiveCard("");
      prepareVisualizerProfile("default");
      paintVisualizer(0);
      renderEmptyState(
        elements.recList,
        "Play a song to generate recommendations.",
        "Recommendations update when Spotify reports an active track."
      );
      return;
    }

    const item = data.item;
    const trackKey = getTrackKey(item);
    if (shouldHoldOptimisticPlayback(trackKey)) return;
    const trackChanged = trackKey !== state.currentTrackKey;

    progressMs = data.progress_ms || 0;
    durationMs = item.duration_ms || 0;
    isPlaying = !!data.is_playing;
    lastSync = Date.now();

    if (trackChanged && state.currentItem) {
      state.previousTrackSnapshot = buildTrackSnapshot(
        state.currentItem,
        state.currentAudioProfile || inferAudioProfile(state.currentGenre, state.currentTags),
        state.currentMood
      );
    }

    state.currentTrackKey = trackKey;
    if (trackChanged) {
      state.lyricsRequestToken += 1;
      state.currentGenre = null;
      state.currentTags = [];
      state.currentMood = null;
      state.currentAudioProfile = null;
      state.themeMode = "pending";
      clearReactiveProfile();
      setYouTubeLink("");
      syncVinylMotion({ reset: true });
      triggerTrackTransition();
      renderLyricsLoadingState({
        title: item.name || "Loading lyrics...",
        subtitle: (item.artists || []).map((artist) => artist.name).join(", ") || "Finding lyrics for this track.",
      });
    }

    applyNowPlaying(item, { trackChanged });
    scheduleTrackBoundarySync();

    if (trackChanged || forceMeta) {
      applyAlbumTheme(trackKey, item.album?.images?.[0]?.url || "");
      fetchTrackMetadata(trackKey, state.lyricsRequestToken);
      fetchRecommendations(trackKey);
    }
  } catch (_error) {
    renderTrackPanelEmptyState(
      "Track data could not load.",
      "Check the Spotify session and try again."
    );
  } finally {
    state.nowPlayingPending = false;
  }
}

function updateProgressBar() {
  const current = getCurrentProgressMs();
  if (durationMs > 0) {
    const percent = Math.min(100, (current / durationMs) * 100);
    const scale = Math.max(0, percent / 100).toFixed(4);
    if (elements.progressBar) elements.progressBar.style.transform = `scaleX(${scale})`;
    if (elements.heroProgressBar) elements.heroProgressBar.style.transform = `scaleX(${scale})`;
    if (elements.currentTime) elements.currentTime.textContent = fmt(current);
    if (elements.totalTime) elements.totalTime.textContent = fmt(durationMs);
    if (elements.heroCurrentTime) elements.heroCurrentTime.textContent = fmt(current);
    if (elements.heroTotalTime) elements.heroTotalTime.textContent = fmt(durationMs);
  }
  paintVisualizer(current);
  syncLyricsPlayback(current);
  requestAnimationFrame(updateProgressBar);
}

async function fetchRecentTracks({ force = false } = {}) {
  if (state.recentPending || !state.authenticated) return;
  const now = Date.now();
  if (!force && now - state.lastRecentRequestAt < REQUEST_GAPS.recentTracks) return;
  state.recentPending = true;
  state.lastRecentRequestAt = now;
  try {
    if (!state.todayRecentItems.length) renderDayLoading();
    const { start } = getTodayBounds();
    const query = new URLSearchParams({ limit: "50", after: String(start.getTime()) });
    const { response, data } = await getJson(`/api/recently-played?${query.toString()}`);
    if (response.status === 401 || data?.error === "not_authenticated") {
      state.authenticated = false;
      syncAuthButtons();
      resetSignedOutUi();
      showBanner("Your Spotify session expired. Log in again to reload recent tracks.", "Log In Again");
      return;
    }
    if (!response.ok || !Array.isArray(data?.items)) {
      if (state.todayRecentItems.length) {
        renderFeelingHistory(state.todayRecentItems);
        return;
      }
      renderDayUnavailable(
        "Recently played is unavailable.",
        "Spotify did not return listening history right now."
      );
      return;
    }
    renderFeelingHistory(mergeTodayRecentItems(data.items));
  } catch (_error) {
    if (state.todayRecentItems.length) {
      renderFeelingHistory(state.todayRecentItems);
      return;
    }
    renderDayUnavailable(
      "Recently played is unavailable.",
      "Spotify did not return listening history right now."
    );
  } finally {
    state.recentPending = false;
  }
}

async function playTrack(track, card = null) {
  if (!state.authenticated) {
    showBanner("Connect Spotify before controlling playback.", "Connect Spotify");
    return;
  }
  if (!track?.uri) return;

  const trackKey = getTrackKey(track);
  if (trackKey) setActiveCard(trackKey);
  flashCardActivation(card);

  const previewChanged = trackKey !== state.currentTrackKey;
  const requestToken = state.playRequestToken + 1;
  state.playRequestToken = requestToken;
  const previousTrackKey = state.currentTrackKey;
  const previousItem = state.currentItem;
  const previousGenre = state.currentGenre;
  const previousTags = state.currentTags;
  const previousMood = state.currentMood;
  const previousAudioProfile = state.currentAudioProfile;
  const previousProgress = progressMs;
  const previousDuration = durationMs;
  const previousPlaying = isPlaying;
  const previousSync = lastSync;
  let loadingTimer = 0;

  if (card) {
    loadingTimer = window.setTimeout(() => {
      if (state.playRequestToken === requestToken) {
        card.classList.add("is-loading");
      }
    }, 120);
  }

  if (previewChanged) {
    state.optimisticTrackKey = trackKey;
    state.optimisticTrackUntil = Date.now() + 2200;
  }

  state.currentTrackKey = trackKey;
  state.lyricsRequestToken += 1;
  state.currentGenre = null;
  state.currentTags = [];
  state.currentMood = null;
  state.currentAudioProfile = null;
  clearReactiveProfile();
  progressMs = 0;
  durationMs = track.duration_ms || 0;
  isPlaying = true;
  lastSync = Date.now();
  triggerTrackTransition();
  renderLyricsLoadingState({
    title: track.name || "Loading lyrics...",
    subtitle: getArtistLabel(track),
  });
  applyNowPlaying(track, { trackChanged: previewChanged, preview: true });
  scheduleTrackBoundarySync();
  applyAlbumTheme(trackKey, track.album?.images?.[0]?.url || "");

  try {
    const { response, data } = await getJson("/api/player/play", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uri: track.uri }),
    });

    if (response.status === 401 || data?.error === "not_authenticated") {
      window.clearTimeout(loadingTimer);
      card?.classList.remove("is-loading");
      state.authenticated = false;
      syncAuthButtons();
      resetSignedOutUi();
      showBanner("Your Spotify session expired. Log in again to control playback.", "Log In Again");
      return;
    }

    if (!response.ok || data?.error) {
      throw new Error(data?.error || "spotify_play_error");
    }

    window.clearTimeout(loadingTimer);
    card?.classList.remove("is-loading");
    if (state.playRequestToken !== requestToken) return;
    window.setTimeout(() => fetchNowPlaying({ forceMeta: true, force: true }), 300);
    window.setTimeout(() => fetchNowPlaying({ forceMeta: true, force: true }), 1100);
  } catch (_error) {
    window.clearTimeout(loadingTimer);
    card?.classList.remove("is-loading");
    if (state.playRequestToken !== requestToken) return;
    clearOptimisticPlayback();
    state.currentTrackKey = previousTrackKey;
    state.currentItem = previousItem;
    state.currentGenre = previousGenre;
    state.currentTags = previousTags;
    state.currentMood = previousMood;
    state.currentAudioProfile = previousAudioProfile;
    setReactiveProfile(previousAudioProfile);
    progressMs = previousProgress;
    durationMs = previousDuration;
    isPlaying = previousPlaying;
    lastSync = previousSync;
    if (previousItem) {
      state.lyricsRequestToken += 1;
      applyNowPlaying(previousItem, { trackChanged: true });
      applyAlbumTheme(previousTrackKey, previousItem.album?.images?.[0]?.url || "");
      setActiveCard(previousTrackKey);
      renderLyricsLoadingState({
        title: previousItem.name || "Loading lyrics...",
        subtitle: getArtistLabel(previousItem),
      });
      fetchTrackMetadata(previousTrackKey, state.lyricsRequestToken);
    } else {
      state.currentGenre = null;
      state.currentTags = [];
      state.currentMood = null;
      setNowView("card");
      applyGenreTheme();
      clearReactiveProfile();
      crossfadeHeroBackdrop("", "");
      updateTrackCard(null);
      updateVinyl(null);
      renderLyricsView();
      setHeroMeta();
      setPlayerState({
        title: "No song playing",
        artist: "Start a track in Spotify to sync SpotiFeel.",
        artUrl: "",
      });
      setActiveCard("");
      resetProgress();
    }
    scheduleTrackBoundarySync();
    showBanner("Spotify playback needs an active device before SpotiFeel can start another track.");
  }
}

async function createPlaylist(type) {
  if (!state.authenticated || state.activePlaylist) {
    if (!state.authenticated) {
      showBanner("Connect Spotify before creating a playlist.", "Connect Spotify");
      setPlaylistStatus("Log in before creating playlists.", "error");
    }
    return;
  }

  const button = Array.from(elements.playlistCards).find(
    (playlistButton) => playlistButton.dataset.playlist === type
  );
  const playlistName = button?.querySelector("h3")?.textContent || type;

  state.activePlaylist = type;
  setPlaylistCardsDisabled(true);
  setPlaylistStatus(`Creating a ${playlistName} playlist...`);
  flashPlaylistCardState(button, "is-loading");
  button?.setAttribute("aria-busy", "true");

  try {
    const { response, data } = await getJson(`/api/create-playlist/${encodeURIComponent(type)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPlaylistPayload(state.playlistOptions)),
    });

    if (response.status === 401 || data?.error === "not_authenticated") {
      flashPlaylistCardState(button, "is-error");
      state.authenticated = false;
      syncAuthButtons();
      resetSignedOutUi();
      showBanner("Your Spotify session expired. Log in again to create playlists.", "Log In Again");
      return;
    }

    if (!response.ok || !data?.playlist_url) {
      flashPlaylistCardState(button, "is-error");
      setPlaylistStatus(
        `Could not create the ${playlistName} playlist${data?.error ? `: ${data.error}` : "."}`,
        "error"
      );
      return;
    }

    const existingLink = Array.from(elements.playlistLinks?.querySelectorAll("[data-playlist-link]") || []).find(
      (link) => link.dataset.playlistLink === type
    );
    if (!existingLink && elements.playlistLinks) {
      const link = document.createElement("a");
      link.href = data.playlist_url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.dataset.playlistLink = type;
      link.textContent = `Open ${playlistName}`;
      elements.playlistLinks.prepend(link);
    }

    setPlaylistStatus(data?.summary || `${playlistName} playlist created. Use the link below to open it.`, "success");
    flashPlaylistCardState(button, "is-success");
  } catch (_error) {
    flashPlaylistCardState(button, "is-error");
    setPlaylistStatus(`Playlist creation failed for ${playlistName}.`, "error");
  } finally {
    state.activePlaylist = null;
    setPlaylistCardsDisabled(false);
    button?.removeAttribute("aria-busy");
    button?.classList.remove("is-loading");
  }
}

async function togglePlayback() {
  if (!state.authenticated || !state.currentItem) return;
  if (elements.vinylToggle) elements.vinylToggle.disabled = true;
  try {
    const { response, data } = await getJson("/api/player/toggle", { method: "POST" });
    if (response.status === 401 || data?.error === "not_authenticated") {
      state.authenticated = false;
      syncAuthButtons();
      resetSignedOutUi();
      showBanner("Your Spotify session expired. Log in again to control playback.", "Log In Again");
      return;
    }
    if (!response.ok || typeof data?.playing !== "boolean") {
      showBanner("Spotify playback control needs an active device and a fresh session.");
      return;
    }
    progressMs = getCurrentProgressMs();
    isPlaying = data.playing;
    lastSync = Date.now();
    scheduleTrackBoundarySync();
    if (isPlaying) triggerHeroPulse("play");
    setPlaybackVisualState();
  } catch (_error) {
  } finally {
    if (elements.vinylToggle) elements.vinylToggle.disabled = false;
  }
}

function bindStaticTabs(buttons, values, activate) {
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => activate(values[index]));
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + direction + buttons.length) % buttons.length;
      activate(values[nextIndex], { focus: true });
    });
  });
}

function setupPrimarySectionObserver() {
  if (!("IntersectionObserver" in window)) return;
  const sections = [...document.querySelectorAll("main > .dashboard-section")];
  const observer = new IntersectionObserver(
    (entries) => {
      const current = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (!current?.target?.id) return;
      elements.navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${current.target.id}`;
        link.classList.toggle("is-current", active);
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    },
    { threshold: [0.35, 0.55, 0.75] }
  );
  sections.forEach((section) => observer.observe(section));
}

function setupEventHandlers() {
  const syncPlaybackOnWake = () => {
    if (document.visibilityState !== "visible" || !state.authenticated) return;
    const now = Date.now();
    if (now - lastPlaybackWakeSync < 750) return;
    lastPlaybackWakeSync = now;
    fetchNowPlaying({ force: true });
  };

  document.addEventListener("visibilitychange", syncPlaybackOnWake);
  window.addEventListener("focus", syncPlaybackOnWake);
  window.addEventListener("resize", () => {
    syncPersistentLayout();
    if (elements.heroTitle?.dataset.fullTitle) {
      fitHeroTitle(elements.heroTitle.dataset.fullTitle, { reset: true });
    }
    if (window.innerWidth < 960 && state.overviewMode) {
      state.overviewMode = false;
      applyOverviewMode();
      return;
    }
    queueOverviewLayoutSync();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.roomMode) {
      state.roomMode = false;
      applyRoomMode();
    }
  });

  elements.navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = link.getAttribute("href")?.replace("#", "");
      if (!target) return;
      event.preventDefault();
      showSection(target);
      window.history.replaceState(null, "", `#${target}`);
    });
  });

  elements.viewChips.forEach((button) => {
    button.addEventListener("click", () => {
      setNowView(button.dataset.view || "card");
    });
  });

  if (elements.lyricsContent) {
    elements.lyricsContent.addEventListener("wheel", pauseLyricsFollow, { passive: true });
    elements.lyricsContent.addEventListener("touchstart", pauseLyricsFollow, { passive: true });
    elements.lyricsContent.addEventListener("pointerdown", pauseLyricsFollow);
    elements.lyricsContent.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
        pauseLyricsFollow();
      }
    });
  }

  elements.lyricsFollow?.addEventListener("click", resumeLyricsFollow);

  elements.wrappedRangeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextRange = button.dataset.range || "short_term";
      if (nextRange === state.activeWrappedRange && state.wrappedReport) return;
      state.activeWrappedRange = nextRange;
      state.wrappedReport = null;
      syncWrappedRangeButtons();
      if (!state.authenticated) {
        renderWrappedSignedOut();
        showBanner("Connect Spotify to generate Wrapped Anytime.", "Connect Spotify");
        return;
      }
      fetchWrappedReport({ force: true });
    });
  });

  bindStaticTabs(
    elements.wrappedPaneButtons,
    [...elements.wrappedPaneButtons].map((button) => button.dataset.wrappedPane || "overview"),
    setWrappedPane
  );

  bindStaticTabs(
    elements.dayPaneButtons,
    [...elements.dayPaneButtons].map((button) => button.dataset.dayPane || "overview"),
    setDayPane
  );

  bindStaticTabs(
    elements.playlistPaneButtons,
    [...elements.playlistPaneButtons].map((button) => button.dataset.playlistPane || "genre"),
    setPlaylistPane
  );

  if (elements.wrappedImageShare) {
    elements.wrappedImageShare.addEventListener("click", shareWrappedImage);
  }

  if (elements.roomToggle) {
    elements.roomToggle.addEventListener("click", () => {
      if (state.overviewMode) {
        state.overviewMode = false;
        applyOverviewMode();
      }
      state.roomMode = !state.roomMode;
      if (state.roomMode) jumpWindowScroll(0);
      applyRoomMode();
    });
  }

  if (elements.vinylToggle) {
    elements.vinylToggle.addEventListener("click", () => {
      togglePlayback();
    });
  }

  elements.playlistCards.forEach((button) => {
    button.addEventListener("click", () => {
      createPlaylist(button.dataset.playlist || "");
    });
  });

  if ("ResizeObserver" in window) {
    const persistentObserver = new ResizeObserver(syncPersistentLayout);
    [elements.sessionBanner].filter(Boolean).forEach((element) => {
      persistentObserver.observe(element);
    });
  }
  setupPrimarySectionObserver();
}

async function init() {
  applyGenreTheme();
  clearReactiveProfile();
  applyPreferences();
  applyRoomMode();
  applyOverviewMode();
  setupEventHandlers();
  syncPersistentLayout();
  syncAuthButtons();
  syncWrappedRangeButtons();
  setWrappedPane(state.activeWrappedPane);
  setDayPane(state.activeDayPane);
  setPlaylistPane(state.activePlaylistPane);
  renderWrappedSignedOut();
  prepareVisualizerProfile("default");
  paintVisualizer(0);
  paintVinylRotation();
  setNowView(state.activeView);
  renderLyricsView();
  setHeroMeta();
  const restoredRecentItems = restoreTodayRecentItems();
  if (restoredRecentItems.length) renderFeelingHistory(restoredRecentItems);
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      if (elements.heroTitle?.dataset.fullTitle) {
        fitHeroTitle(elements.heroTitle.dataset.fullTitle, { reset: true });
      }
    });
  }
  updateProgressBar();
  await syncSession();
  queueOverviewLayoutSync();

  setInterval(syncSession, POLL_INTERVALS.session);
  setInterval(() => {
    if (document.visibilityState === "visible") fetchNowPlaying();
  }, POLL_INTERVALS.nowPlaying);
  setInterval(() => {
    fetchRecentTracks();
  }, POLL_INTERVALS.recentTracks);
}

init();
