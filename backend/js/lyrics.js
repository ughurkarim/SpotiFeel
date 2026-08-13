function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

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
  String(content)
    .replace(/\r/g, "")
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
        const start = Number(match[1]) * 60_000 + Number(match[2]) * 1_000 + fractionMs;
        if (Number.isFinite(start)) entries.push({ text, start });
      });
    });

  entries.sort((left, right) => left.start - right.start);
  return entries.map((entry, index) => ({
    ...entry,
    end: entries[index + 1]?.start ?? Math.max(entry.start + 2_000, totalDurationMs || entry.start + 8_000),
  }));
}

export function buildLyricTimeline(lines = [], totalDurationMs = 0) {
  const lyricLines = lines.filter((line) => line.type === "line");
  if (!lyricLines.length || totalDurationMs <= 0) return [];
  const introMs = Math.min(clamp(totalDurationMs * 0.055, 3_500, 14_000), totalDurationMs * 0.18);
  const outroMs = Math.min(clamp(totalDurationMs * 0.035, 3_000, 10_000), totalDurationMs * 0.14);
  const timelineEnd = Math.max(introMs, totalDurationMs - outroMs);
  const usableDuration = Math.max(1, timelineEnd - introMs);
  const weights = lyricLines.map((line) => {
    const wordWeight = line.text.split(/\s+/).filter(Boolean).length * 0.24;
    const characterWeight = clamp(line.text.length / 30, 0.65, 2.2);
    return characterWeight + wordWeight + (line.stanzaBreak ? 0.34 : 0);
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let cursor = introMs;
  return lyricLines.map((line, index) => {
    const segmentDuration = (weights[index] / totalWeight) * usableDuration;
    const start = cursor;
    const end = index === lyricLines.length - 1 ? timelineEnd : Math.min(timelineEnd, cursor + segmentDuration);
    cursor = end;
    return { text: line.text, start, end };
  });
}
