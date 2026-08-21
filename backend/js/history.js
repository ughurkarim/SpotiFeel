const HISTORY_STORAGE_KEY = "spotifeel:day-in-color:v1";

export function getLocalDayKey(reference = new Date()) {
  const date = reference instanceof Date ? reference : new Date(reference);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getRecentPlayKey(item = null) {
  if (!item?.played_at || !item?.track) return "";
  const track = item.track;
  const trackKey = track.id || track.uri || `${track.name || "track"}::${(track.artists || []).map((artist) => artist.name).join(",")}`;
  return `${item.played_at}:${trackKey}`;
}

export function mergeDailyHistory(existing = [], incoming = [], reference = new Date()) {
  const date = reference instanceof Date ? reference : new Date(reference);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const merged = new Map();

  [...existing, ...incoming].forEach((item) => {
    const playedAt = item?.played_at ? new Date(item.played_at) : null;
    const key = getRecentPlayKey(item);
    if (!key || !playedAt || Number.isNaN(playedAt.getTime()) || playedAt < start || playedAt >= end) return;
    merged.set(key, item);
  });

  return [...merged.values()].sort((left, right) => new Date(right.played_at) - new Date(left.played_at));
}

export function readDailyHistory(storage, reference = new Date()) {
  if (!storage) return [];
  try {
    const payload = JSON.parse(storage.getItem(HISTORY_STORAGE_KEY) || "null");
    if (payload?.dayKey !== getLocalDayKey(reference) || !Array.isArray(payload?.items)) return [];
    return mergeDailyHistory([], payload.items, reference);
  } catch (_error) {
    return [];
  }
}

export function writeDailyHistory(storage, items = [], reference = new Date()) {
  if (!storage) return;
  try {
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({
      dayKey: getLocalDayKey(reference),
      items: mergeDailyHistory([], items, reference),
    }));
  } catch (_error) {
    // Storage can be unavailable in privacy modes; in-memory history still remains authoritative.
  }
}

export function clearDailyHistory(storage) {
  if (!storage) return;
  try {
    storage.removeItem(HISTORY_STORAGE_KEY);
  } catch (_error) {
    // Clearing a blocked storage area is a no-op.
  }
}
