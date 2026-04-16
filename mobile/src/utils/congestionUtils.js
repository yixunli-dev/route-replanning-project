// ─────────────────────────────────────────────────────────────
// congestionUtils.js
// Pure constants and functions for congestion simulation.
// No React dependencies.
// ─────────────────────────────────────────────────────────────

export const CONGESTION_PATTERN = [
  { level: "clear", color: "#2563EB" }, // 0–10%
  { level: "clear", color: "#2563EB" }, // 10–20%
  { level: "light", color: "#F97316" }, // 20–30%  ← trigger
  { level: "moderate", color: "#EF4444" }, // 30–40%
  { level: "heavy", color: "#991B1B" }, // 40–50%
  { level: "heavy", color: "#991B1B" }, // 50–60%
  { level: "moderate", color: "#EF4444" }, // 60–70%
  { level: "light", color: "#F97316" }, // 70–80%
  { level: "clear", color: "#2563EB" }, // 80–90%
  { level: "clear", color: "#2563EB" }, // 90–100%
];

// Alt route uses lighter colors — heavy becomes #DC2626 instead of #991B1B,
// and the distribution tapers off faster (1 heavy segment instead of 2).
const ALT_CONGESTION_PATTERN = [
  { level: "light", color: "#F97316" }, // 0–12.5%
  { level: "light", color: "#F97316" }, // 12.5–25%
  { level: "moderate", color: "#EF4444" }, // 25–37.5%
  { level: "light", color: "#F97316" }, // 37.5–50%
  { level: "light", color: "#F97316" }, // 50–62.5%
  { level: "clear", color: "#2563EB" }, // 62.5–75%
  { level: "clear", color: "#2563EB" }, // 75–87.5%
  { level: "clear", color: "#2563EB" }, // 87.5–100%
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
 * Build segment boundaries for the alt route using ALT_CONGESTION_PATTERN.
 * The alt pattern starts at orange (light) and uses a lighter red for heavy,
 * keeping it visually distinct from the original route's dark red (#991B1B).
 */
export function buildAltSegmentBoundaries(totalLen) {
  const n = ALT_CONGESTION_PATTERN.length;
  const step = (totalLen - 1) / n;
  return Array.from({ length: n }, (_, i) => ({
    startIdx: Math.round(i * step),
    endIdx: Math.round((i + 1) * step),
    ...ALT_CONGESTION_PATTERN[i],
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
