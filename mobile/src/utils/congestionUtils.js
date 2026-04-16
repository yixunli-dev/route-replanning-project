// ─────────────────────────────────────────────────────────────
// congestionUtils.js
// Pure constants and functions for congestion simulation.
// No React dependencies.
// ─────────────────────────────────────────────────────────────

export const CONGESTION_PATTERN = [
  { level: "clear", color: "#2563EB" }, // 0–10%
  { level: "clear", color: "#2563EB" }, // 10–20%
  { level: "light", color: "#F97316" }, // 20–30%  ← orange trigger
  { level: "moderate", color: "#EF4444" }, // 30–40%
  { level: "heavy", color: "#991B1B" }, // 40–50%
  { level: "heavy", color: "#991B1B" }, // 50–60%
  { level: "moderate", color: "#EF4444" }, // 60–70%
  { level: "light", color: "#F97316" }, // 70–80%
  { level: "clear", color: "#2563EB" }, // 80–90%
  { level: "clear", color: "#2563EB" }, // 90–100%
];

export const LEGEND = [
  { label: "Clear", color: "#2563EB" },
  { label: "Light", color: "#F97316" },
  { label: "Moderate", color: "#EF4444" },
  { label: "Heavy", color: "#991B1B" },
];

/**
 * Pre-compute the route-index boundaries for each congestion segment.
 * Returns an array of { startIdx, endIdx, level, color }.
 */
export function buildSegmentBoundaries(totalLen) {
  const n = CONGESTION_PATTERN.length;
  const step = (totalLen - 1) / n;
  return Array.from({ length: n }, (_, i) => ({
    startIdx: Math.round(i * step),
    endIdx: Math.round((i + 1) * step),
    ...CONGESTION_PATTERN[i],
  }));
}

/**
 * Like buildSegmentBoundaries, but starts from a given segment index in
 * CONGESTION_PATTERN so the alt route inherits the congestion level from
 * wherever the car was when it left the original route.
 *
 * Example: trigger fires at segment 2 (light/orange), so the alt route's
 * first visual/speed segment is also "light", not "clear".
 */
export function buildAltSegmentBoundaries(totalLen, startSegmentIdx) {
  const remaining = CONGESTION_PATTERN.slice(startSegmentIdx);
  const n = remaining.length;
  const step = (totalLen - 1) / n;
  return Array.from({ length: n }, (_, i) => ({
    startIdx: Math.round(i * step),
    endIdx: Math.round((i + 1) * step),
    ...remaining[i],
  }));
}

/**
 * Generate 2 mock alternative routes using a sin-arc detour
 * around the congested zone (40–62% of original route).
 * Both routes start from triggerIdx (current car position).
 * Returns [] if the route is too short to generate alternatives.
 */
export function generateMockAlternatives(coords, triggerIdx) {
  const totalLen = coords.length;
  const congStart = Math.floor(totalLen * 0.4);
  const congEnd = Math.floor(totalLen * 0.62);

  if (congStart <= triggerIdx || congEnd >= totalLen - 1) return [];

  const approach = coords.slice(triggerIdx, congStart + 1);
  const tail = coords.slice(congEnd);
  const middle = coords.slice(congStart, congEnd + 1);

  function arcOffset(latScale, lonScale) {
    return middle.map((p, i) => {
      const t = i / (middle.length - 1 || 1);
      const curve = Math.sin(t * Math.PI);
      return {
        latitude: p.latitude + latScale * curve,
        longitude: p.longitude + lonScale * curve,
      };
    });
  }

  return [
    {
      label: "Route A",
      description: "Via northern bypass",
      timeSaving: 4,
      color: "#22C55E",
      coords: [...approach, ...arcOffset(+0.013, +0.005), ...tail],
    },
    {
      label: "Route B",
      description: "Via southern loop",
      timeSaving: 2,
      color: "#A78BFA",
      coords: [...approach, ...arcOffset(-0.01, -0.004), ...tail],
    },
  ];
}
