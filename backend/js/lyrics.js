export function buildLyricLines(content = "") {
  return String(content)
    .replace(/\r/g, "")
    .split("\n")
    .reduce((lines, line) => {
      const text = line.trim();
      if (!text) {
        if (lines.length && lines[lines.length - 1]?.type !== "spacer") lines.push({ type: "spacer" });
        return lines;
      }
      const previous = lines[lines.length - 1];
      lines.push({ type: "line", text, stanzaBreak: !previous || previous.type === "spacer" });
      return lines;
    }, []);
}

export function parseSyncedLyrics(content = "", totalDurationMs = 0) {
  const entries = [];
  const normalizedContent = String(content).replace(/\r/g, "");
  const offsetMatch = normalizedContent.match(/\[offset:\s*([+-]?\d+)\s*\]/i);
  const offsetMs = Number(offsetMatch?.[1]) || 0;
  normalizedContent
    .split("\n")
    .forEach((rawLine) => {
      const timestamps = [...rawLine.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
      if (!timestamps.length) return;
      const text = rawLine
        .replace(/\[[^\]]+\]/g, "")
        .replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g, "")
        .trim();
      if (!text) return;
      timestamps.forEach((match) => {
        const fraction = match[3] || "0";
        const fractionMs = Number(fraction.padEnd(3, "0").slice(0, 3));
        const start = Math.max(0, Number(match[1]) * 60_000 + Number(match[2]) * 1_000 + fractionMs + offsetMs);
        if (Number.isFinite(start)) entries.push({ text, start });
      });
    });

  entries.sort((left, right) => left.start - right.start);
  return entries.map((entry, index) => ({
    ...entry,
    end: entries[index + 1]?.start ?? Math.max(entry.start + 2_000, totalDurationMs || entry.start + 8_000),
  }));
}

export function findActiveLyricIndex(timeline = [], currentMs = 0) {
  if (!timeline.length || !Number.isFinite(currentMs)) return -1;
  let low = 0;
  let high = timeline.length - 1;
  let activeIndex = -1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (timeline[middle].start <= currentMs) {
      activeIndex = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return activeIndex;
}
