export function hasRecommendationGroups(payload) {
  return Array.isArray(payload?.groups) && payload.groups.some((group) => Array.isArray(group?.tracks) && group.tracks.length);
}
