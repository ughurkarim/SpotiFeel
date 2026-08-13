import { apiRequest, setCsrfToken } from "./js/api.js";
import { state } from "./js/state.js";
import { formatDuration as fmt, getTrackKey, getArtistLabel } from "./js/player.js";
import { buildPlaylistPayload } from "./js/playlists.js";
import { hasRecommendationGroups } from "./js/recommendations.js";
import { canvasBlob } from "./js/wrapped.js";
import { normalizeGenreName } from "./js/theme.js";
import { buildLyricLines, buildLyricTimeline, parseSyncedLyrics } from "./js/lyrics.js";

const POLL_INTERVALS = {
  session: 60000,
  nowPlaying: 5000,
  recentTracks: 45000,
};

const REQUEST_GAPS = {
  nowPlaying: 2500,
  recentTracks: 12000,
};

const THEME_PALETTES = {
  default: {
    bgBase: "#0d1018",
    bgDepth: "#090b11",
    text: "#f8f7fb",
    textSoft: "#e5e2ed",
    muted: "#a9a8b8",
    accent: "#9fd7ca",
    accentStrong: "#f2c7db",
    accentSoft: "rgba(159, 215, 202, 0.18)",
    accentShadow: "rgba(159, 215, 202, 0.2)",
    accentInk: "#11131a",
    border: "rgba(255, 255, 255, 0.1)",
    panel: "rgba(18, 21, 31, 0.66)",
    panelStrong: "rgba(10, 12, 19, 0.82)",
    panelSoft: "rgba(24, 28, 40, 0.48)",
    blob1: "rgba(136, 213, 201, 0.52)",
    blob2: "rgba(138, 173, 255, 0.38)",
    blob3: "rgba(246, 174, 202, 0.34)",
    blob4: "rgba(255, 208, 151, 0.24)",
    youtubeBg: "#8e6358",
    youtubeBgHover: "#a67164",
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
let overviewLayoutFrame = 0;
const imagePreloadCache = new Set();
const dayPaletteCache = new Map();

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

const DAY_SESSION_GAP_MINUTES = 35;
const DAY_SESSION_GAP_MS = DAY_SESSION_GAP_MINUTES * 60 * 1000;

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
    endMinute: Math.max(1, getDayMinute(currentTime)),
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

function formatDayAxisTime(minute) {
  const date = new Date();
  date.setHours(0, Math.max(0, Math.floor(minute)), 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric" });
}

function buildDayAxis(endMinute) {
  const step = endMinute <= 6 * 60 ? 2 * 60 : endMinute <= 12 * 60 ? 3 * 60 : 6 * 60;
  const labels = [{ minute: 0, label: formatDayAxisTime(0) }];
  for (let minute = step; minute < endMinute - Math.max(30, step * 0.3); minute += step) {
    labels.push({ minute, label: formatDayAxisTime(minute) });
  }
  labels.push({ minute: endMinute, label: "Now", now: true });
  return labels;
}

function buildListeningSessions(plays = [], currentTime = new Date()) {
  const currentMs = currentTime.getTime();
  const sessions = [];
  plays.forEach((play) => {
    const startMs = play.playedAt.getTime();
    const rawDuration = Number(play.track?.duration_ms) || 210000;
    const duration = Math.min(20 * 60 * 1000, Math.max(60 * 1000, rawDuration));
    const endMs = Math.min(currentMs, Math.max(startMs + 30000, startMs + duration));
    const segment = { ...play, startMs, endMs };
    const session = sessions.at(-1);
    if (!session || startMs - session.lastPlayStartMs > DAY_SESSION_GAP_MS) {
      sessions.push({ startMs, endMs, lastPlayStartMs: startMs, plays: [segment] });
      return;
    }
    session.endMs = Math.max(session.endMs, endMs);
    session.lastPlayStartMs = startMs;
    session.plays.push(segment);
  });
  return sessions;
}

function buildSessionGradient(colors = []) {
  if (!colors.length) return "#6f695f";
  if (colors.length === 1) return colors[0];
  const stops = colors.map((color, index) => {
    const position = colors.length === 1 ? 0 : (index / (colors.length - 1)) * 100;
    return `${color} ${position.toFixed(1)}%`;
  });
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

function createDayRibbon(timeline) {
  const fallbackColors = ["#ff6a2a", "#28b8d8", "#7868e6", "#f04f78", "#e3bc36", "#35a66f"];
  const ribbon = document.createElement("div");
  const axis = buildDayAxis(timeline.endMinute);
  const sessions = buildListeningSessions(timeline.plays, timeline.currentTime);
  const dayStart = new Date(timeline.currentTime);
  dayStart.setHours(0, 0, 0, 0);
  const axisMarkup = axis.map((item, index) => {
    const position = clamp(item.minute / timeline.endMinute, 0, 1) * 100;
    const edge = index === 0 ? " is-start" : item.now ? " is-now" : "";
    return `<span class="day-ribbon__tick${edge}" style="--tick-position:${position.toFixed(3)}%">${escapeHtml(item.label)}</span>`;
  }).join("");
  ribbon.className = "day-ribbon";
  ribbon.innerHTML = `
    <div class="day-ribbon__axis" aria-hidden="true">${axisMarkup}</div>
    <div class="day-ribbon__rail" aria-label="Listening sessions from midnight to now">
      <div class="day-ribbon__sessions"></div>
    </div>
  `;
  const sessionLayer = ribbon.querySelector(".day-ribbon__sessions");
  sessions.forEach((session, sessionIndex) => {
    const sessionStartMinute = (session.startMs - dayStart.getTime()) / 60000;
    const sessionEndMinute = (session.endMs - dayStart.getTime()) / 60000;
    const sessionDuration = Math.max(0.5, sessionEndMinute - sessionStartMinute);
    const sessionElement = document.createElement("button");
    const palettePlays = getRepresentativePlays(session.plays);
    const sessionColors = palettePlays.map((_, playIndex) => fallbackColors[(sessionIndex + playIndex) % fallbackColors.length]);
    const representativePlay = session.plays.at(-1);
    sessionElement.type = "button";
    sessionElement.className = "day-ribbon__session";
    sessionElement.style.left = `${(clamp(sessionStartMinute / timeline.endMinute, 0, 1) * 100).toFixed(3)}%`;
    sessionElement.style.width = `${(clamp(sessionDuration / timeline.endMinute, 0, 1) * 100).toFixed(3)}%`;
    sessionElement.setAttribute(
      "aria-label",
      `${formatCountLabel(session.plays.length, "play")} from ${formatClockLabel(session.startMs)} to ${formatClockLabel(session.endMs)}`
    );
    sessionElement.style.background = buildSessionGradient(sessionColors);
    sessionElement.addEventListener("click", () => playTrack(representativePlay.track, sessionElement));
    palettePlays.forEach((play, playIndex) => {
      const imageUrl = play.track?.album?.images?.[0]?.url || "";
      resolveDayPalette(imageUrl, sessionColors[playIndex]).then((color) => {
        sessionColors[playIndex] = color;
        sessionElement.style.background = buildSessionGradient(sessionColors);
      });
    });
    sessionLayer.appendChild(sessionElement);
  });
  return ribbon;
}

function getFeaturedChapterNote(chapter) {
  const counts = new Map();
  chapter.plays.forEach((play) => counts.set(play.trackKey, (counts.get(play.trackKey) || 0) + 1));
  const mostRepeated = [...counts.entries()].sort((left, right) => right[1] - left[1])[0];
  const repeatedPlay = chapter.plays.find((play) => play.trackKey === mostRepeated?.[0]);
  if (mostRepeated?.[1] > 1 && repeatedPlay) {
    return `You returned to ${repeatedPlay.track.name} ${mostRepeated[1]} times across this chapter.`;
  }
  const artistCount = new Set(chapter.plays.map((play) => getArtistLabel(play.track))).size;
  if (chapter.plays.length === 1) {
    return `${chapter.plays[0].track.name} is the single color held here so far.`;
  }
  return `${formatCountLabel(chapter.plays.length, "play")} across ${formatCountLabel(artistCount, "artist")} shaped this part of the day.`;
}

function getRepresentativePlays(plays = [], limit = 3) {
  const unique = [];
  const seen = new Set();
  plays.forEach((play) => {
    const imageUrl = play.track?.album?.images?.[0]?.url || play.trackKey;
    if (!seen.has(imageUrl)) {
      seen.add(imageUrl);
      unique.push(play);
    }
  });
  const source = unique.length >= Math.min(limit, plays.length) ? unique : plays;
  if (source.length <= limit) return source;
  return [source[0], source[Math.floor((source.length - 1) / 2)], source.at(-1)];
}

function createFeaturedChapter(timeline) {
  const populated = timeline.chapters.filter((chapter) => chapter.plays.length);
  if (!populated.length) return null;
  const chapter = [...populated].sort((left, right) => {
    if (right.plays.length !== left.plays.length) return right.plays.length - left.plays.length;
    return right.lastPlayedAt - left.lastPlayedAt;
  })[0];
  const feature = document.createElement("article");
  const coverPlays = getRepresentativePlays(chapter.plays);
  feature.className = "day-feature";
  feature.innerHTML = `
    <div class="day-feature__copy">
      <p>Featured Chapter</p>
      <h3>${escapeHtml(chapter.label)}</h3>
      <strong>${escapeHtml(chapter.rangeLabel)}</strong>
      <span>${escapeHtml(getFeaturedChapterNote(chapter))}</span>
    </div>
    <div class="day-feature__covers" aria-label="Representative records from ${escapeHtml(chapter.label)}"></div>
  `;
  const covers = feature.querySelector(".day-feature__covers");
  coverPlays.forEach((play, index) => {
    const cover = document.createElement("button");
    const imageUrl = play.track?.album?.images?.[0]?.url || "";
    cover.type = "button";
    cover.className = "day-feature__cover";
    cover.setAttribute("aria-label", `Play ${play.track.name} by ${getArtistLabel(play.track)}`);
    cover.innerHTML = imageUrl
      ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
      : '<span aria-hidden="true"></span>';
    cover.addEventListener("click", () => playTrack(play.track, cover));
    covers.appendChild(cover);
    resolveDayPalette(imageUrl, ["#ff6a2a", "#28b8d8", "#7868e6"][index % 3]).then((color) => {
      feature.style.setProperty(`--feature-color-${index + 1}`, color);
    });
  });
  return feature;
}

function createDayHighlight({ label, play = null, title = "", detail = "", count = 0 }) {
  const element = document.createElement(play ? "button" : "article");
  const imageUrl = play?.track?.album?.images?.[0]?.url || "";
  if (play) element.type = "button";
  element.className = "day-highlight";
  element.innerHTML = `
    <span class="day-highlight__label">${escapeHtml(label)}</span>
    <span class="day-highlight__body">
      ${imageUrl
        ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
        : '<span class="day-highlight__swatch" aria-hidden="true"></span>'}
      <span class="day-highlight__copy">
        <strong>${escapeHtml(play?.track?.name || title)}</strong>
        <span>${escapeHtml(play ? getArtistLabel(play.track) : detail)}</span>
        ${count > 1 ? `<em>${escapeHtml(`${count} plays`)}</em>` : ""}
      </span>
    </span>
  `;
  if (play) element.addEventListener("click", () => playTrack(play.track, element));
  return element;
}

function createDayOverview(timeline) {
  const overview = document.createElement("div");
  overview.className = "day-overview";
  if (!timeline.plays.length) {
    const quiet = document.createElement("div");
    quiet.className = "day-overview__quiet";
    quiet.innerHTML = `
      <p>Today is still quiet.</p>
      <strong>Your first listen will leave the first passage of color here.</strong>
    `;
    overview.appendChild(quiet);
    return overview;
  }
  overview.appendChild(createDayRibbon(timeline));
  const story = document.createElement("div");
  story.className = "day-overview__story";
  const feature = createFeaturedChapter(timeline);
  if (feature) story.appendChild(feature);
  const highlights = document.createElement("div");
  highlights.className = "day-highlights";
  const firstPlay = timeline.plays[0];
  const latestPlay = timeline.plays.at(-1);
  const counts = new Map();
  timeline.plays.forEach((play) => {
    const entry = counts.get(play.trackKey) || { count: 0, play };
    entry.count += 1;
    counts.set(play.trackKey, entry);
  });
  const mostPlayed = [...counts.values()].sort((left, right) => right.count - left.count)[0];
  highlights.appendChild(createDayHighlight({ label: "First Track", play: firstPlay }));
  highlights.appendChild(createDayHighlight({ label: "Most Played", play: mostPlayed.play, count: mostPlayed.count }));
  highlights.appendChild(createDayHighlight({ label: "Latest", play: latestPlay }));
  story.appendChild(highlights);
  overview.appendChild(story);
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
    const hiddenCount = chapter.plays.length - visibleCount;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "day-chapter__toggle";
    toggle.setAttribute("aria-controls", tracksId);
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = `+ ${hiddenCount} more`;
    toggle.addEventListener("click", () => {
      const expanded = section.classList.toggle("is-expanded");
      moments.forEach((moment, index) => { moment.hidden = !expanded && index >= visibleCount; });
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.textContent = expanded ? "Close" : `+ ${hiddenCount} more`;
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
    elements.heroTitle.classList.remove("hero-title--medium", "hero-title--long");
    elements.heroTitle.textContent = "Connect Spotify";
    elements.heroArtist.textContent = "Log in and start a track to make the page react to your music.";
    elements.heroContext.textContent = context || "Album art, motion, and lyrics respond to what's playing.";
    elements.heroContext.classList.remove("hidden");
    updateMoodChip();
    updateGenreChip();
    setSpotifyLink("");
    return;
  }

  const title = item.name || "Unknown track";
  elements.heroTitle.textContent = title;
  elements.heroTitle.classList.toggle("hero-title--medium", title.length > 42 && title.length <= 70);
  elements.heroTitle.classList.toggle("hero-title--long", title.length > 70);
  elements.heroArtist.textContent = (item.artists || []).map((artist) => artist.name).join(", ") || "Unknown artist";
  elements.heroContext.textContent = "";
  elements.heroContext.classList.add("hidden");
  updateMoodChip();
  updateGenreChip();
  setSpotifyLink(item.external_urls?.spotify || "");
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

function renderTrackPanelEmptyState(title, detail) {
  if (!elements.track) return;
  elements.track.dataset.emptyTitle = title;
  elements.track.dataset.emptyDetail = detail;
  if (shouldBlankTrackPanelInOverview()) {
    elements.track.innerHTML = "";
    return;
  }
  renderEmptyState(elements.track, title, detail);
}

function clearTrackPanelEmptyState() {
  if (!elements.track) return;
  delete elements.track.dataset.emptyTitle;
  delete elements.track.dataset.emptyDetail;
}

function syncTrackPanelEmptyState() {
  if (!elements.track) return;
  const { emptyTitle, emptyDetail } = elements.track.dataset;
  if (!emptyTitle || !emptyDetail) return;
  if (shouldBlankTrackPanelInOverview()) {
    elements.track.innerHTML = "";
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
    estimated: "Estimated timing",
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

  let targetIndex = -1;
  for (let index = 0; index < state.lyricTimeline.length; index += 1) {
    if (state.lyricTimeline[index].start > currentMs + 24) break;
    targetIndex = index;
  }

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
  interactive = false,
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
    const syncedTimeline = interactive ? parseSyncedLyrics(syncedLyrics, trackDuration) : [];
    const lyricLines = buildLyricLines(content);
    elements.lyricsContent.classList.remove("lyrics-content--loading");
    elements.lyricsContent.innerHTML = "";
    elements.lyricsContent.scrollTop = 0;

    if (syncedTimeline.length >= 2) {
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
    } else if (interactive && trackDuration > 0 && lyricLines.filter((line) => line.type === "line").length >= 4) {
      elements.lyricsContent.classList.add("lyrics-content--lines");
      const fragment = document.createDocumentFragment();
      lyricLines.forEach((line) => {
        if (line.type === "spacer") {
          const spacer = document.createElement("div");
          spacer.className = "lyric-spacer";
          fragment.appendChild(spacer);
          return;
        }
        const paragraph = document.createElement("p");
        paragraph.className = "lyric-line";
        paragraph.textContent = line.text;
        state.currentLyricsLines.push(line.text);
        state.lyricLineElements.push(paragraph);
        fragment.appendChild(paragraph);
      });
      elements.lyricsContent.appendChild(fragment);
      state.lyricTimeline = buildLyricTimeline(lyricLines, trackDuration);
      state.lyricsInteractive = state.lyricTimeline.length === state.lyricLineElements.length;
      setLyricsTiming("estimated", source);
    } else {
      elements.lyricsContent.classList.remove("lyrics-content--lines");
      elements.lyricsContent.textContent = content;
      if (interactive) setLyricsTiming(timing === "synced" ? "plain" : timing, source);
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
  if (!item) {
    renderTrackPanelEmptyState(
      "Nothing is playing right now.",
      "Start a song in Spotify and this panel will update automatically."
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

function createCard({ track, detail = "", href = "", onPlay = null, badge = "" }) {
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

  if (href) {
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

  if (onPlay && track?.uri) {
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
  card.appendChild(nowPlayingRow);
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
  const visibleCount = populatedChapters.length <= 1 ? 5 : populatedChapters.length === 2 ? 4 : 3;
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

function renderWrappedLoading() {
  setWrappedBusy(true);
  setWrappedStatus("Building your Wrapped Anytime report...");
  if (elements.wrappedShareCard) {
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
    elements.wrappedMoodGrid.innerHTML = Array.from({ length: 4 }, () => '<span class="wrapped-metric-skeleton" aria-hidden="true"></span>').join("");
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
  state.wrappedReport = null;
  setWrappedBusy(false);
  syncWrappedRangeButtons();
  setWrappedStatus("Connect Spotify to generate your report.");
  if (elements.wrappedShareCard) {
    elements.wrappedShareCard.classList.remove("is-loading");
    elements.wrappedShareCard.innerHTML = `
      <div class="wrapped-story-copy">
        <p class="wrapped-story-period">${escapeHtml(getWrappedPeriod().story)}</p>
        <p class="wrapped-story-eyebrow">Listening personality</p>
        <h3>Connect Spotify</h3>
        <p class="wrapped-story-detail">Your listening personality appears here after login.</p>
        <p class="wrapped-story-summary">Generate a personal report from your Spotify listening.</p>
      </div>
      <div class="wrapped-story-placeholder" aria-hidden="true"></div>
    `;
  }
  if (elements.wrappedMoodGrid) elements.wrappedMoodGrid.innerHTML = "";
  renderEmptyState(elements.wrappedTopArtists, "No artists yet.", "Connect Spotify to load your top artists.");
  renderEmptyState(elements.wrappedTopTracks, "No songs yet.", "Connect Spotify to load your top songs.");
  renderEmptyState(elements.wrappedTopGenres, "No genres yet.", "Connect Spotify to load your genre mix.");
  renderEmptyState(elements.wrappedReplayedTracks, "No replay loops yet.", "Recent repeat plays will appear here.");
}

function renderWrappedMood(dna = []) {
  if (!elements.wrappedMoodGrid) return;
  elements.wrappedMoodGrid.innerHTML = "";
  if (!dna.length) {
    renderEmptyState(elements.wrappedMoodGrid, "Mood profile unavailable.", "Spotify did not return enough signals yet.");
    return;
  }
  dna.forEach((item) => {
    const tile = document.createElement("div");
    tile.className = "wrapped-mood-tile";
    tile.innerHTML = `
      <span>${escapeHtml(item.label || "")}</span>
      <strong>${escapeHtml(item.value || "")}</strong>
      <em>${escapeHtml(item.detail || "")}</em>
    `;
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
    })
  );
}

function renderWrappedReplays(replayed = []) {
  if (!elements.wrappedReplayedTracks) return;
  elements.wrappedReplayedTracks.innerHTML = "";
  if (!replayed.length) {
    renderEmptyState(elements.wrappedReplayedTracks, "No replay loops yet.", "Repeat plays from recently played tracks will appear here.");
    return;
  }
  replayed.slice(0, 5).forEach((item) => {
    const track = item.track || {};
    const replay = createWrappedRankedItem({
      imageUrl: getTrackImageUrl(track),
      title: track.name || "Unknown track",
      detail: getArtistLabel(track),
      badge: `${item.play_count || 1}×`,
      href: getSpotifyUrl(track),
    });
    replay.classList.add("wrapped-replay-item");
    elements.wrappedReplayedTracks.appendChild(replay);
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
  const personality = report?.listening_personality || card.personality || {};
  const discovery = report?.discovery_score || card.discovery_score || {};
  const discoveryScore = Math.max(0, Math.min(100, Number(discovery.score) || 0));
  const period = getWrappedPeriod();
  elements.wrappedShareCard.classList.remove("is-loading");
  elements.wrappedShareCard.innerHTML = `
    <div class="wrapped-story-copy">
      <p class="wrapped-story-period">${escapeHtml(period.story)}</p>
      <p class="wrapped-story-eyebrow">Listening personality</p>
      <h3>${escapeHtml(personality.title || "The Taste Architect")}</h3>
      <p class="wrapped-story-detail">${escapeHtml(personality.detail || "")}</p>
      <p class="wrapped-story-summary">${escapeHtml(card.summary || report?.taste_summary || "")}</p>
    </div>
    <figure class="wrapped-featured-artist">
      ${
        imageUrl
          ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer">`
          : '<span class="wrapped-story-placeholder" aria-hidden="true"></span>'
      }
      <figcaption>
        <span>Top artist</span>
        <strong>${escapeHtml(topArtist.name || "Unknown")}</strong>
      </figcaption>
    </figure>
    <section class="wrapped-discovery-story" aria-label="Discovery score: ${escapeHtml(String(discoveryScore))} percent">
      <div class="wrapped-discovery-heading">
        <strong>${escapeHtml(String(discoveryScore))}%</strong>
        <span>Discovery</span>
      </div>
      <div class="wrapped-discovery-scale" style="--discovery-score: ${escapeHtml(String(discoveryScore))}%" aria-hidden="true"><span></span></div>
      <p class="wrapped-discovery-label">${escapeHtml(discovery.label || "Discovery Score")}</p>
      <p class="wrapped-discovery-detail">${escapeHtml(discovery.detail || "")}</p>
    </section>
    <dl class="wrapped-story-facts">
      <div><dt>Top Song</dt><dd>${escapeHtml(topTrack.name || "Unknown")}</dd></div>
      <div><dt>Genre</dt><dd>${escapeHtml(formatGenreLabel(topGenre.name || ""))}</dd></div>
    </dl>
  `;
}

function renderWrappedReport(report) {
  if (!report) {
    renderWrappedSignedOut();
    return;
  }
  state.wrappedReport = report;
  setWrappedBusy(false);
  syncWrappedRangeButtons();
  setWrappedStatus("");
  const allTimeButton = [...elements.wrappedRangeButtons].find((button) => button.dataset.range === "long_term");
  if (allTimeButton && report.data_note) {
    allTimeButton.title = report.data_note;
    allTimeButton.setAttribute("aria-label", `All Time. ${report.data_note}`);
  }
  renderWrappedShareCard(report);
  renderWrappedMood(report.mood_profile?.dna || []);
  renderWrappedArtists(report.top_artists || []);
  renderWrappedTracks(report.top_tracks || []);
  renderWrappedGenres(report.top_genres || []);
  renderWrappedReplays(report.most_replayed_tracks || []);
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
  const words = String(text || "").split(/\s+/).filter(Boolean);
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

function loadWrappedCanvasImage(imageUrl) {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = imageUrl;
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

async function buildWrappedImageCanvas(report) {
  const card = report?.share_card || {};
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;

  const topTrack = card.top_track || {};
  const topArtist = card.top_artist || {};
  const topGenre = card.top_genre || {};
  const discovery = report?.discovery_score || card.discovery_score || {};
  const personality = report?.listening_personality || card.personality || {};
  const artistName = topArtist.name || "Unknown";
  const trackName = topTrack.name || "Unknown";
  const genreName = formatGenreLabel(topGenre.name || "Mixed");
  const score = `${discovery.score ?? "--"}%`;
  const rangeLabel = report?.time_range?.label || getWrappedPeriod().label;
  const visibleArtistImage = elements.wrappedShareCard?.querySelector(".wrapped-featured-artist img");
  const artistImage = visibleArtistImage?.complete && visibleArtistImage.naturalWidth
    ? visibleArtistImage
    : await loadWrappedCanvasImage(getArtistImageUrl(topArtist) || getTrackImageUrl(topTrack));

  const styles = getComputedStyle(document.documentElement);
  const background = styles.getPropertyValue("--bg-depth").trim() || "#090b11";
  const accent = styles.getPropertyValue("--accent").trim() || "#9fd7ca";
  const secondary = styles.getPropertyValue("--color-secondary").trim() || "#f2c7db";
  const accentInk = styles.getPropertyValue("--accent-ink").trim() || "#11131a";
  const text = styles.getPropertyValue("--text").trim() || "#f8f7fb";
  const textSoft = styles.getPropertyValue("--text-soft").trim() || "#e5e2ed";

  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  context.fillStyle = accent;
  context.fillRect(0, 0, width, 278);

  context.fillStyle = accentInk;
  context.font = "700 22px 'DM Sans', Arial, sans-serif";
  context.fillText("SPOTIFEEL / WRAPPED ANYTIME", 70, 64);
  context.textAlign = "right";
  context.fillText(String(rangeLabel).toUpperCase(), 1010, 64);
  context.textAlign = "left";
  context.font = "600 72px 'Bodoni Moda', Georgia, serif";
  drawWrappedText(context, personality.title || "The Taste Architect", 70, 145, 880, 67, 2);

  if (artistImage) {
    drawWrappedCoverImage(context, artistImage, 70, 328, 622, 560);
  } else {
    context.fillStyle = "#20232b";
    context.fillRect(70, 328, 622, 560);
    context.fillStyle = textSoft;
    context.font = "500 210px 'Bodoni Moda', Georgia, serif";
    context.fillText(artistName.slice(0, 1).toUpperCase(), 270, 680);
  }

  context.fillStyle = "rgba(7, 9, 14, 0.9)";
  context.fillRect(70, 792, 622, 96);
  context.fillStyle = accent;
  context.font = "700 17px 'DM Sans', Arial, sans-serif";
  context.fillText("TOP ARTIST", 100, 829);
  context.fillStyle = text;
  context.font = "500 38px 'Bodoni Moda', Georgia, serif";
  drawWrappedText(context, artistName, 100, 868, 552, 40, 1);

  context.fillStyle = secondary;
  context.fillRect(692, 328, 318, 560);
  context.fillStyle = text;
  context.font = "500 138px 'Bodoni Moda', Georgia, serif";
  context.fillText(score, 732, 510);
  context.font = "700 18px 'DM Sans', Arial, sans-serif";
  context.fillText("DISCOVERY", 736, 553);
  context.fillRect(736, 586, 230, 5);
  context.font = "700 22px 'DM Sans', Arial, sans-serif";
  drawWrappedText(context, discovery.label || "Discovery Score", 736, 645, 230, 28, 2);
  context.font = "400 19px 'DM Sans', Arial, sans-serif";
  drawWrappedText(context, discovery.detail || "", 736, 724, 230, 29, 4);
  context.font = "700 16px 'DM Sans', Arial, sans-serif";
  context.fillText("TOP GENRE", 736, 830);
  context.font = "500 31px 'Bodoni Moda', Georgia, serif";
  drawWrappedText(context, genreName, 736, 865, 230, 33, 1);

  context.strokeStyle = "rgba(255, 255, 255, 0.24)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(70, 958);
  context.lineTo(1010, 958);
  context.stroke();
  context.fillStyle = accent;
  context.font = "700 18px 'DM Sans', Arial, sans-serif";
  context.fillText("TOP SONG", 70, 1010);
  context.fillStyle = text;
  context.font = "500 65px 'Bodoni Moda', Georgia, serif";
  drawWrappedText(context, trackName, 70, 1086, 920, 65, 2);

  context.fillStyle = textSoft;
  context.font = "400 24px 'DM Sans', Arial, sans-serif";
  drawWrappedText(context, personality.detail || "", 70, 1240, 760, 34, 2);
  context.fillStyle = accent;
  context.fillRect(70, 1300, 48, 5);
  context.fillStyle = "rgba(255, 255, 255, 0.62)";
  context.font = "500 18px 'DM Sans', Arial, sans-serif";
  context.fillText("spotifeel.app", 138, 1307);

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

async function shareWrappedImage() {
  if (!state.wrappedReport) {
    setWrappedStatus("Generate a report before sharing an image.", "error");
    return;
  }

  try {
    setWrappedStatus("Creating your share image...");
    const canvas = await buildWrappedImageCanvas(state.wrappedReport);
    const blob = await canvasBlob(canvas);
    const filename = `spotifeel-${state.activeWrappedRange}.png`;
    const file = new File([blob], filename, { type: "image/png" });

    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({
        title: state.wrappedReport?.share_card?.headline || "SpotiFeel Wrapped Anytime",
        files: [file],
      });
      setWrappedStatus("Image share sheet opened.", "success");
      return;
    }

    downloadBlob(blob, filename);
    setWrappedStatus("Image downloaded.", "success");
  } catch (_error) {
    setWrappedStatus("Image sharing failed. Try again after regenerating the report.", "error");
  }
}

function resetSignedOutUi() {
  state.lyricsRequestToken += 1;
  state.currentItem = null;
  state.currentTrackKey = null;
  state.previousTrackSnapshot = null;
  state.activeCardKey = null;
  state.currentGenre = null;
  state.currentTags = [];
  state.currentMood = null;
  state.currentAudioProfile = null;
  state.themeRequestKey = null;
  state.backdropRequestKey = null;
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
    context: "Log in and start a song to let the interface follow the album art, mood, and motion of the music.",
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
      showBanner("Connect Spotify to unlock playback sync, recommendations, and playlist creation.", "Connect Spotify");
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
    state.authenticated = false;
    syncAuthButtons();
    showBanner("SpotiFeel could not verify your Spotify session.", "Try Logging In");
    resetSignedOutUi();
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
      if (state.themeMode !== "album") applyGenreTheme(state.currentGenre);
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
        interactive: true,
      });
      syncLyricsPlayback(getCurrentProgressMs(), { forceFollow: true });
    } else {
      renderLyricsView({
        title: activeTitle,
        subtitle: `Lyrics weren't found for ${activeArtist} yet.`,
        content: "SpotiFeel couldn't pull lyrics for this song right now. Use the links below to keep following along.",
        searchUrls: lyrics?.search_urls || null,
        interactive: false,
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
      interactive: false,
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
    if (state.themeMode !== "album") applyGenreTheme(state.currentGenre);
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
        interactive: false,
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
      interactive: true,
    });
    syncLyricsPlayback(getCurrentProgressMs(), { forceFollow: true });
  } catch (_error) {
    if (state.currentTrackKey !== trackKey || state.lyricsRequestToken !== lyricsRequestToken) return;
    renderLyricsView({
      title: state.currentItem?.name || "Lyrics unavailable.",
      subtitle: "The lyrics service didn't respond for this track.",
      content: "Try again in a moment or use the lyric search links when they are available.",
      interactive: false,
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
    const { response, data } = await getJson("/api/now-playing");

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
        context: "Start a track in Spotify and this hero will expand around the artwork, lyrics, and motion of the song.",
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
      state.themeMode = "default";
      applyGenreTheme();
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
    renderDayLoading();
    const { response, data } = await getJson("/api/recently-played?limit=50");
    if (response.status === 401 || data?.error === "not_authenticated") {
      state.authenticated = false;
      syncAuthButtons();
      resetSignedOutUi();
      showBanner("Your Spotify session expired. Log in again to reload recent tracks.", "Log In Again");
      return;
    }
    if (!response.ok || !Array.isArray(data?.items)) {
      renderDayUnavailable(
        "Recently played is unavailable.",
        "Spotify did not return listening history right now."
      );
      return;
    }
    if (data.items.length === 0) {
      renderFeelingHistory([]);
      return;
    }
    renderFeelingHistory(data.items);
  } catch (_error) {
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
    window.setTimeout(() => fetchNowPlaying({ forceMeta: true, force: true }), 450);
    window.setTimeout(() => fetchNowPlaying({ forceMeta: true, force: true }), 1500);
  } catch (_error) {
    window.clearTimeout(loadingTimer);
    card?.classList.remove("is-loading");
    if (state.playRequestToken !== requestToken) return;
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
  window.addEventListener("resize", () => {
    syncPersistentLayout();
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
  updateProgressBar();
  await syncSession();
  queueOverviewLayoutSync();

  setInterval(syncSession, POLL_INTERVALS.session);
  setInterval(() => {
    fetchNowPlaying();
  }, POLL_INTERVALS.nowPlaying);
  setInterval(() => {
    fetchRecentTracks();
  }, POLL_INTERVALS.recentTracks);
}

init();
