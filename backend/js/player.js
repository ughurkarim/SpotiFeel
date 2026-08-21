export function formatDuration(ms) {
  const seconds = Math.floor((ms || 0) / 1000);
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function getTrackKey(track = null) {
  if (!track) return "";
  return track.id || `${track.name || "unknown"}::${(track.artists || []).map((artist) => artist.name).join(",")}`;
}

export function getArtistLabel(track = null) {
  return (track?.artists || []).map((artist) => artist.name).join(", ") || "Unknown artist";
}

export const HERO_TITLE_TIERS = ["short", "medium", "long", "extreme"];

export function getHeroTitleTier(title = "") {
  const normalized = String(title).trim().replace(/\s+/g, " ");
  const longestWord = normalized.split(/[\s–—-]+/).reduce((longest, word) => Math.max(longest, word.length), 0);

  if (normalized.length <= 18 && longestWord <= 14) return "short";
  if (normalized.length <= 32 && longestWord <= 18) return "medium";
  if (normalized.length <= 58 && longestWord <= 24) return "long";
  return "extreme";
}
