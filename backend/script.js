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

const state = {
  authenticated: false,
  currentItem: null,
  currentTrackKey: null,
  activeCardKey: null,
  currentGenre: null,
  currentTags: [],
  currentMood: null,
  currentAudioProfile: null,
  nowPlayingPending: false,
  recentPending: false,
  activePlaylist: null,
  activeView: "card",
  themeMode: "default",
  themeRequestKey: null,
  backdropRequestKey: null,
  currentLyricsLines: [],
  lyricTimeline: [],
  lyricLineElements: [],
  activeLyricLineIndex: -1,
  lyricsInteractive: false,
  visualizerProfile: [],
  lastNowPlayingRequestAt: 0,
  lastRecentRequestAt: 0,
  playRequestToken: 0,
  previousTrackSnapshot: null,
  overviewMode: false,
  roomMode: false,
  roomPreviousView: null,
  overviewPreviousView: null,
  overviewScrollY: 0,
  preferences: {
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    sessionMode: "adaptive",
  },
  playlistOptions: {
    familiarity: 0.58,
    energyBias: 0,
    artistVariety: 0.66,
    explicitMode: "balanced",
  },
};

const elements = {
  loginBtn: document.getElementById("login"),
  logoutBtn: document.getElementById("logout"),
  track: document.getElementById("track"),
  recentList: document.getElementById("recent-list"),
  recentContext: document.getElementById("recent-context"),
  recList: document.getElementById("rec-list"),
  playlistLinks: document.getElementById("playlist-links"),
  playlistStatus: document.getElementById("playlist-status"),
  main: document.querySelector("main"),
  topbar: document.querySelector(".topbar"),
  sessionBanner: document.getElementById("session-banner"),
  sessionMessage: document.getElementById("session-message"),
  sessionLink: document.getElementById("session-link"),
  overviewToggle: document.getElementById("overview-toggle"),
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
  lyricsContent: document.getElementById("lyrics-content"),
  lyricsLinks: document.getElementById("lyrics-links"),
  lyricsGenius: document.getElementById("lyrics-genius"),
  lyricsSearch: document.getElementById("lyrics-search"),
  playlistCards: document.querySelectorAll(".playlist-card[data-playlist]"),
  navLinks: document.querySelectorAll('.topbar nav a[href^="#"]'),
  viewChips: document.querySelectorAll(".now-views .chip"),
  recContext: document.getElementById("rec-context"),
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

function normalizeGenreName(genre = "") {
  return String(genre).toLowerCase().trim();
}

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
    maxLightness: 0.56,
    minSaturation: 0.16,
    maxSaturation: 0.72,
  });
  const secondaryTone = normalizeColorTone(secondary, {
    minLightness: 0.24,
    maxLightness: 0.68,
    minSaturation: 0.14,
    maxSaturation: 0.74,
  });
  const accentTone = normalizeColorTone(accent, {
    minLightness: 0.44,
    maxLightness: 0.76,
    minSaturation: 0.42,
    maxSaturation: 0.9,
  });

  const primaryHsl = rgbToHsl(primaryTone);
  const secondaryHsl = rgbToHsl(secondaryTone);
  const accentHsl = rgbToHsl(accentTone);
  const bgBase = hslToRgb({
    h: primaryHsl.h,
    s: clamp(primaryHsl.s * 0.56, 0.16, 0.38),
    l: 0.11,
  });
  const bgDepth = hslToRgb({
    h: primaryHsl.h,
    s: clamp(primaryHsl.s * 0.42, 0.12, 0.3),
    l: 0.055,
  });
  const gradientLift = hslToRgb({
    h: secondaryHsl.h,
    s: clamp(secondaryHsl.s * 0.7, 0.16, 0.48),
    l: 0.22,
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

function fmt(ms) {
  const seconds = Math.floor((ms || 0) / 1000);
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
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

function getTrackKey(track = null) {
  if (!track) return "";
  return track.id || `${track.name || "unknown"}::${(track.artists || []).map((artist) => artist.name).join(",")}`;
}

function getArtistLabel(track = null) {
  return (track?.artists || []).map((artist) => artist.name).join(", ") || "Unknown artist";
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

function getListeningChapter(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      id: "late-night",
      label: "Late Night",
      note: "Moodier picks and longer loops start showing up here.",
    };
  }

  const hour = date.getHours();
  if (hour < 5) {
    return {
      id: "after-midnight",
      label: "After Midnight",
      note: "The quieter tracks and slower loops hold the room here.",
    };
  }
  if (hour < 12) {
    return {
      id: "morning-glow",
      label: "Morning Glow",
      note: "A softer start with brighter colors and steadier choices.",
    };
  }
  if (hour < 17) {
    return {
      id: "afternoon-drift",
      label: "Afternoon Drift",
      note: "The day settles into a focused rhythm in this stretch.",
    };
  }
  if (hour < 21) {
    return {
      id: "evening-lift",
      label: "Evening Lift",
      note: "The palette warms up and the energy opens a little wider.",
    };
  }
  return {
    id: "late-night",
    label: "Late Night",
    note: "Moodier picks and longer loops start showing up here.",
  };
}

function buildListeningTimeline(items = []) {
  const { start, end } = getTodayBounds();
  const plays = items
    .map((item) => {
      const track = item?.track;
      const playedAt = item?.played_at ? new Date(item.played_at) : null;
      if (!track || !playedAt || Number.isNaN(playedAt.getTime())) return null;
      if (playedAt < start || playedAt >= end) return null;
      return {
        track,
        playedAt,
        trackKey: getTrackKey(track),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.playedAt - b.playedAt);

  const chapters = [];
  const chapterMap = new Map();
  plays.forEach((play) => {
    const chapterMeta = getListeningChapter(play.playedAt);
    let chapter = chapterMap.get(chapterMeta.id);
    if (!chapter) {
      chapter = {
        ...chapterMeta,
        firstPlayedAt: play.playedAt,
        lastPlayedAt: play.playedAt,
        plays: [],
      };
      chapterMap.set(chapterMeta.id, chapter);
      chapters.push(chapter);
    }
    if (play.playedAt < chapter.firstPlayedAt) chapter.firstPlayedAt = play.playedAt;
    if (play.playedAt > chapter.lastPlayedAt) chapter.lastPlayedAt = play.playedAt;
    chapter.plays.push(play);
  });

  chapters.forEach((chapter) => {
    chapter.rangeLabel = formatTimeRange(chapter.firstPlayedAt, chapter.lastPlayedAt);
  });

  return {
    chapters,
    totalPlays: plays.length,
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

function createHistoryPlayCard(play) {
  const card = createCard({
    track: play.track,
    detail: `Played ${formatClockLabel(play.playedAt)}`,
    href: play.track?.external_urls?.spotify || "",
    onPlay: playTrack,
  });
  return card;
}

function createHistoryChapterRow(plays = []) {
  const row = document.createElement("div");
  row.className = "history-row";
  plays.forEach((play) => {
    row.appendChild(createHistoryPlayCard(play));
  });
  return row;
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
  if (elements.vinyl && state.currentItem && isPlaying) {
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
    elements.heroTitle.textContent = "Connect Spotify";
    elements.heroArtist.textContent = "Log in and start a track to make the page react to your music.";
    elements.heroContext.textContent = context || "Album art, motion, and lyrics respond to what's playing.";
    elements.heroContext.classList.remove("hidden");
    updateMoodChip();
    updateGenreChip();
    setSpotifyLink("");
    return;
  }

  elements.heroTitle.textContent = item.name || "Unknown track";
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
  row.className =
    container === elements.recentList
      ? "history-row"
      : container === elements.recList
        ? "recommendation-row"
        : "card-row";
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
    queueOverviewLayoutSync();
    return;
  }
  elements.sessionMessage.textContent = message;
  elements.sessionLink.textContent = actionLabel;
  elements.sessionLink.href = actionHref;
  elements.sessionLink.classList.toggle("hidden", !actionLabel);
  elements.sessionBanner.classList.remove("hidden");
  queueOverviewLayoutSync();
}

function syncAuthButtons() {
  if (elements.loginBtn) elements.loginBtn.classList.toggle("hidden", state.authenticated);
  if (elements.logoutBtn) elements.logoutBtn.classList.toggle("hidden", !state.authenticated);
}

function setPlaylistStatus(message, tone = "muted") {
  if (!elements.playlistStatus) return;
  elements.playlistStatus.textContent = message;
  elements.playlistStatus.style.color =
    tone === "error" ? "#f2b8b2" : tone === "success" ? "var(--text-soft)" : "var(--muted)";
}

function setPlaylistCardsDisabled(disabled) {
  elements.playlistCards.forEach((button) => {
    button.disabled = disabled;
  });
}

function renderEmptyState(container, title, detail) {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <span class="empty-state__orb" aria-hidden="true"></span>
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

function buildLyricLines(content = "") {
  return String(content)
    .replace(/\r/g, "")
    .split("\n")
    .reduce((lines, line) => {
      const text = line.trim();
      if (!text) {
        if (lines.length && lines[lines.length - 1]?.type !== "spacer") {
          lines.push({ type: "spacer" });
        }
        return lines;
      }
      const previous = lines[lines.length - 1];
      lines.push({
        type: "line",
        text,
        stanzaBreak: !previous || previous.type === "spacer",
      });
      return lines;
    }, []);
}

function buildLyricTimeline(lines = [], totalDurationMs = 0) {
  const lyricLines = lines.filter((line) => line.type === "line");
  if (!lyricLines.length || totalDurationMs <= 0) return [];

  const weights = lyricLines.map((line) => {
    const lengthWeight = clamp(line.text.length / 26, 0.8, 2.5);
    return lengthWeight + (line.stanzaBreak ? 0.28 : 0);
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let cursor = 0;

  return lyricLines.map((line, index) => {
    const segmentDuration = (weights[index] / totalWeight) * totalDurationMs;
    const start = cursor;
    const end = index === lyricLines.length - 1 ? totalDurationMs : cursor + segmentDuration;
    cursor = end;
    return {
      text: line.text,
      start,
      end,
    };
  });
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

  if (elements.lyricsTitle) elements.lyricsTitle.textContent = title;
  if (elements.lyricsSubtitle) elements.lyricsSubtitle.textContent = subtitle;
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

function syncLyricsPlayback(currentMs = 0) {
  if (
    !elements.lyricsContent ||
    !state.lyricsInteractive ||
    !state.lyricLineElements.length ||
    !state.lyricTimeline.length ||
    durationMs <= 0
  ) {
    return;
  }
  const timelineIndex = state.lyricTimeline.findIndex((segment) => currentMs <= segment.end + 24);
  const targetIndex = timelineIndex === -1 ? state.lyricTimeline.length - 1 : timelineIndex;
  if (targetIndex === state.activeLyricLineIndex) return;

  state.activeLyricLineIndex = targetIndex;
  state.lyricLineElements.forEach((line, index) => {
    line.classList.toggle("is-active", index === targetIndex);
    line.classList.toggle("is-past", index < targetIndex);
  });

  if (state.activeView !== "lyrics") return;
  const activeLine = state.lyricLineElements[targetIndex];
  if (!activeLine) return;
  const nextTop = Math.max(
    0,
    activeLine.offsetTop - elements.lyricsContent.clientHeight / 2 + activeLine.offsetHeight / 2
  );
  const distance = Math.abs(nextTop - elements.lyricsContent.scrollTop);
  if (distance < 12) return;
  elements.lyricsContent.scrollTo({
    top: nextTop,
    behavior: state.preferences.reducedMotion || distance > 220 ? "auto" : "smooth",
  });
}

function renderLyricsView({
  title = "Play a song to view lyrics.",
  subtitle = "Start a track in Spotify and switch to this view to read along.",
  content = "Lyrics will appear here when available.",
  searchUrls = null,
  interactive = false,
} = {}) {
  if (elements.lyricsTitle) elements.lyricsTitle.textContent = title;
  if (elements.lyricsSubtitle) elements.lyricsSubtitle.textContent = subtitle;
  state.currentLyricsLines = [];
  state.lyricTimeline = [];
  state.lyricLineElements = [];
  state.activeLyricLineIndex = -1;
  state.lyricsInteractive = false;
  if (elements.lyricsContent) {
    const lyricLines = buildLyricLines(content);
    elements.lyricsContent.classList.remove("lyrics-content--loading");
    elements.lyricsContent.innerHTML = "";
    elements.lyricsContent.scrollTop = 0;

    if (interactive && lyricLines.filter((line) => line.type === "line").length >= 4) {
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
      state.lyricTimeline = buildLyricTimeline(lyricLines, durationMs || state.currentItem?.duration_ms || 0);
      state.lyricsInteractive = state.lyricTimeline.length === state.lyricLineElements.length;
    } else {
      elements.lyricsContent.classList.remove("lyrics-content--lines");
      elements.lyricsContent.textContent = content;
    }
  }
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
  tracks.forEach((track) => {
    if (!track) return;
    row.appendChild(
      createCard({
        track,
        detail: typeof options.detail === "function" ? options.detail(track) : options.detail || "",
        badge: typeof options.badge === "function" ? options.badge(track) : options.badge || "",
        href: track.external_urls?.spotify || "",
        onPlay: playTrack,
      })
    );
  });
  return row;
}

function renderFeelingHistory(items = []) {
  if (!elements.recentList) return;
  elements.recentList.innerHTML = "";
  const timeline = buildListeningTimeline(items);

  if (!timeline.chapters.length) {
    renderEmptyState(
      elements.recentList,
      "No recent tracks yet.",
      "Play something on Spotify and it will show up here."
    );
    if (elements.recentContext) {
      elements.recentContext.textContent = "A color memory of what today has sounded like.";
    }
    return;
  }

  if (elements.recentContext) {
    elements.recentContext.textContent = `A color memory of ${formatCountLabel(
      timeline.totalPlays,
      "play"
    )} from today.`;
  }

  timeline.chapters.forEach((chapter) => {
    const section = document.createElement("section");
    section.className = "history-group history-chapter";
    section.innerHTML = `
      <div class="collection-header history-chapter__header">
        <div>
          <p class="collection-kicker">${escapeHtml(chapter.rangeLabel || chapter.label)}</p>
          <h3>${escapeHtml(chapter.label)}</h3>
          <p class="collection-note">${escapeHtml(chapter.note)}</p>
        </div>
      </div>
    `;
    section.appendChild(createHistoryChapterRow(chapter.plays));
    elements.recentList.appendChild(section);
  });
}

function renderRecommendationGroups(groups = []) {
  if (!elements.recList) return;
  elements.recList.innerHTML = "";
  const seen = new Set();
  const tracks = [];

  groups.forEach((group) => {
    if (!Array.isArray(group?.tracks)) return;
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
  });

  if (!tracks.length) return;

  elements.recList.appendChild(
    createTrackRow(tracks, {
      rowClass: "recommendation-row",
      detail: "",
      badge: (track) => track?.spotifeel_reason_short || "",
    })
  );
}

function resetSignedOutUi() {
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
  renderEmptyState(
    elements.recentList,
    "No recent tracks yet.",
    "Sign in with Spotify to load your listening history."
  );
  if (elements.recentContext) {
    elements.recentContext.textContent = "A color memory of what today has sounded like.";
  }
  renderEmptyState(
    elements.recList,
    "Recommendations are waiting.",
    "Play a song after logging in and SpotiFeel will build similar picks."
  );
  if (elements.recContext) {
    elements.recContext.textContent = "Play something and SpotiFeel will build recommendations around it.";
  }
  setPlaylistStatus("Log in before creating playlists.");
  setPlaylistCardsDisabled(false);
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }
  return { response, data };
}

async function syncSession() {
  try {
    const { response, data } = await getJson("/api/session");
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

async function fetchLyrics(trackKey) {
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
    if (state.currentTrackKey !== trackKey) return;

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
      searchUrls: data.search_urls || null,
      interactive: true,
    });
    syncLyricsPlayback(progressMs);
  } catch (_error) {
    if (state.currentTrackKey !== trackKey) return;
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
    if (elements.recContext && state.currentItem?.name) {
      elements.recContext.textContent = `Building a listening path around "${state.currentItem.name}".`;
    }
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
    if (!response.ok || !Array.isArray(data?.groups) || data.groups.length === 0) {
      renderEmptyState(
        elements.recList,
        "No recommendations yet.",
        "SpotiFeel could not build similar tracks for the current song."
      );
      return;
    }
    if (elements.recContext) {
      elements.recContext.textContent =
        data?.profile_summary ||
        `Curated because you listened to "${data?.based_on?.track || state.currentItem?.name || "this track"}".`;
    }
    renderRecommendationGroups(data.groups);
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
      if (elements.recContext) {
        elements.recContext.textContent = "Play something and SpotiFeel will build recommendations around it.";
      }
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
      state.currentGenre = null;
      state.currentTags = [];
      state.currentMood = null;
      state.currentAudioProfile = null;
      state.themeMode = "default";
      applyGenreTheme();
      clearReactiveProfile();
      setYouTubeLink("");
      syncVinylMotion({ reset: true });
      setNowView("card");
      triggerTrackTransition();
      renderLyricsLoadingState({
        title: item.name || "Loading lyrics...",
        subtitle: (item.artists || []).map((artist) => artist.name).join(", ") || "Finding lyrics for this track.",
      });
    }

    applyNowPlaying(item, { trackChanged });

    if (trackChanged || forceMeta) {
      applyAlbumTheme(trackKey, item.album?.images?.[0]?.url || "");
      fetchGenreNow(trackKey);
      fetchLyrics(trackKey);
      fetchYouTubeNow(trackKey);
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
  let current = 0;
  if (durationMs > 0) {
    const elapsed = isPlaying ? Date.now() - lastSync : 0;
    current = Math.min(durationMs, progressMs + elapsed);
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
    renderSkeletonCards(elements.recentList, 6);
    const { response, data } = await getJson("/api/recently-played?limit=50");
    if (response.status === 401 || data?.error === "not_authenticated") {
      state.authenticated = false;
      syncAuthButtons();
      resetSignedOutUi();
      showBanner("Your Spotify session expired. Log in again to reload recent tracks.", "Log In Again");
      return;
    }
    if (!response.ok || !Array.isArray(data?.items) || data.items.length === 0) {
      renderEmptyState(
        elements.recentList,
        "No recent tracks yet.",
        "Play a few songs in Spotify and they will show up here."
      );
      if (elements.recentContext) {
        elements.recentContext.textContent = "A color memory of what today has sounded like.";
      }
      return;
    }
    renderFeelingHistory(data.items);
  } catch (_error) {
    renderEmptyState(
      elements.recentList,
      "Recently played is unavailable.",
      "Spotify did not return listening history right now."
    );
    if (elements.recentContext) {
      elements.recentContext.textContent = "A color memory of what today has sounded like.";
    }
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
  state.currentGenre = null;
  state.currentTags = [];
  state.currentMood = null;
  state.currentAudioProfile = null;
  clearReactiveProfile();
  progressMs = 0;
  durationMs = track.duration_ms || 0;
  isPlaying = true;
  lastSync = Date.now();
  setNowView("card");
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
      applyNowPlaying(previousItem, { trackChanged: true });
      applyAlbumTheme(previousTrackKey, previousItem.album?.images?.[0]?.url || "");
      setActiveCard(previousTrackKey);
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
  button?.classList.add("is-loading");

  try {
    const { response, data } = await getJson(`/api/create-playlist/${encodeURIComponent(type)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        familiarity: state.playlistOptions.familiarity,
        energy_bias: state.playlistOptions.energyBias,
        artist_variety: state.playlistOptions.artistVariety,
        explicit_mode: state.playlistOptions.explicitMode,
      }),
    });

    if (response.status === 401 || data?.error === "not_authenticated") {
      state.authenticated = false;
      syncAuthButtons();
      resetSignedOutUi();
      showBanner("Your Spotify session expired. Log in again to create playlists.", "Log In Again");
      return;
    }

    if (!response.ok || !data?.playlist_url) {
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
    if (button) {
      button.classList.add("is-success");
      window.setTimeout(() => button.classList.remove("is-success"), 1800);
    }
  } catch (_error) {
    setPlaylistStatus(`Playlist creation failed for ${playlistName}.`, "error");
  } finally {
    state.activePlaylist = null;
    setPlaylistCardsDisabled(false);
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
    isPlaying = data.playing;
    lastSync = Date.now();
    if (isPlaying) triggerHeroPulse("play");
    setPlaybackVisualState();
  } catch (_error) {
  } finally {
    if (elements.vinylToggle) elements.vinylToggle.disabled = false;
  }
}

function setupEventHandlers() {
  if (elements.overviewToggle) {
    elements.overviewToggle.addEventListener("click", () => {
      if (window.innerWidth < 960) return;
      state.overviewMode = !state.overviewMode;
      applyOverviewMode();
    });
  }
  window.addEventListener("resize", () => {
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
}

async function init() {
  applyGenreTheme();
  clearReactiveProfile();
  applyPreferences();
  applyRoomMode();
  applyOverviewMode();
  setupEventHandlers();
  syncAuthButtons();
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
