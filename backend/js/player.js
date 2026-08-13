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
