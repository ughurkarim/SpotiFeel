export function buildPlaylistPayload(options) {
  return {
    familiarity: options.familiarity,
    energy_bias: options.energyBias,
    artist_variety: options.artistVariety,
    explicit_mode: options.explicitMode,
  };
}
