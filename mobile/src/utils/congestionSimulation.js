// ─────────────────────────────────────────────────────────────
// congestionSimulation.js
//
// Single source of truth for all congestion simulation logic:
//   - Color patterns (normal / jammed / alt route)
//   - Speed intervals per congestion level
//   - Segment boundary builders
//   - Alternative route generator
//   - Timing and trigger constants
//
// No React dependencies — pure JS, fully testable in isolation.
// ─────────────────────────────────────────────────────────────

// ── Trigger & timing constants ────────────────────────────────

/** Segment index (in CONGESTION_PATTERN) where the orange zone starts.
 *  The car reaching this point triggers the jam reveal. */
export const ORANGE_SEGMENT_IDX = 2;

/** How long (ms) to freeze the car and show the jammed colors
 *  before the alternative-route prompt appears. */
export const JAM_REVEAL_DURATION_MS = 2000;

// ── Animation speed per congestion level (ms per route node) ──
export const LEVEL_INTERVAL_MS = {
  clear:    90,   // open road — fast
  light:    170,  // slight slowdown
  moderate: 290,  // noticeably slower
  heavy:    450,  // crawling
};

// ── Color patterns ─────────────────────────────────────────────

/** Initial route: only clear (blue) and light (orange).
 *  Looks like a normal, mostly-clear drive at the start. */
export const CONGESTION_PATTERN = [
  { level: "clear", color: "#2563EB" }, // 0–10%
  { level: "clear", color: "#2563EB" }, // 10–20%
  { level: "light", color: "#F97316" }, // 20–30%  ← ORANGE_SEGMENT_IDX
  { level: "light", color: "#F97316" }, // 30–40%
  { level: "light", color: "#F97316" }, // 40–50%
  { level: "light", color: "#F97316" }, // 50–60%
  { level: "light", color: "#F97316" }, // 60–70%
  { level: "clear", color: "#2563EB" }, // 70–80%
  { level: "clear", color: "#2563EB" }, // 80–90%
  { level: "clear", color: "#2563EB" }, // 90–100%
];

/** Jammed version: segments 3–7 suddenly turn heavy/dark red.
 *  Swapped in during jam_reveal and alt_prompt phases. */
export const JAMMED_PATTERN = [
  { level: "clear",  color: "#2563EB" }, // 0–10%
  { level: "clear",  color: "#2563EB" }, // 10–20%
  { level: "light",  color: "#F97316" }, // 20–30%  (car is here)
  { level: "heavy",  color: "#991B1B" }, // 30–40%  ← suddenly jammed
  { level: "heavy",  color: "#991B1B" }, // 40–50%
  { level: "heavy",  color: "#991B1B" }, // 50–60%
  { level: "heavy",  color: "#991B1B" }, // 60–70%
  { level: "light",  color: "#F97316" }, // 70–80%
  { level: "clear",  color: "#2563EB" }, // 80–90%
  { level: "clear",  color: "#2563EB" }, // 90–100%
];

/** Alt route pattern: no heavy segments, tapers off quickly.
 *  Visually communicates that the bypass is faster. */
export const ALT_CONGESTION_PATTERN = [
  { level: "light",    color: "#F97316" }, // 0–12.5%
  { level: "light",    color: "#F97316" }, // 12.5–25%
  { level: "moderate", color: "#EF4444" }, // 25–37.5%
  { level: "light",    color: "#F97316" }, // 37.5–50%
  { level: "light",    color: "#F97316" }, // 50–62.5%
  { level: "clear",    color: "#2563EB" }, // 62.5–75%
  { level: "clear",    color: "#2563EB" }, // 75–87.5%
  { level: "clear",    color: "#2563EB" }, // 87.5–100%
];

/** Legend entries shown in the map UI. */
export const LEGEND = [
  { label: "Clear",    color: "#2563EB" },
  { label: "Light",    color: "#F97316" },
  { label: "Moderate", color: "#EF4444" },
  { label: "Heavy",    color: "#991B1B" },
];

// ── Segment boundary builders ─────────────────────────────────

/**
 * Divide a route of `totalLen` nodes into segments according to `pattern`.
 * Returns [{ startIdx, endIdx, level, color }, ...].
 */
export function buildSegmentBoundaries(totalLen, pattern = CONGESTION_PATTERN) {
  const n    = pattern.length;
  const step = (totalLen - 1) / n;
  return Array.from({ length: n }, (_, i) => ({
    startIdx: Math.round(i * step),
    endIdx:   Math.round((i + 1) * step),
    ...pattern[i],
  }));
}

/** Boundaries using the jammed (dark red) pattern. */
export function buildJammedSegmentBoundaries(totalLen) {
  return buildSegmentBoundaries(totalLen, JAMMED_PATTERN);
}

/** Boundaries for the alt route (lighter colors). */
export function buildAltSegmentBoundaries(totalLen) {
  return buildSegmentBoundaries(totalLen, ALT_CONGESTION_PATTERN);
}

// ── Speed helper ──────────────────────────────────────────────

/**
 * Return the animation delay (ms) for the node at `idx`
 * based on which segment it falls in.
 */
export function getIntervalMs(idx, boundaries) {
  const seg = boundaries.find((b) => idx >= b.startIdx && idx < b.endIdx);
  return LEVEL_INTERVAL_MS[seg?.level ?? "clear"];
}

// ── Alternative route generator ───────────────────────────────

/**
 * Generate 2 mock detour routes that bypass the congested zone
 * (40–62% of the original route) using a smooth sin-arc offset.
 *
 * Both routes start from `triggerIdx` (current car position) and
 * re-join the original route after the congested section.
 *
 * Returns [] if the route is too short for a meaningful detour.
 */
export function generateMockAlternatives(coords, triggerIdx) {
  const totalLen  = coords.length;
  const congStart = Math.floor(totalLen * 0.40);
  const congEnd   = Math.floor(totalLen * 0.62);

  if (congStart <= triggerIdx || congEnd >= totalLen - 1) return [];

  const approach = coords.slice(triggerIdx, congStart + 1);
  const tail     = coords.slice(congEnd);
  const middle   = coords.slice(congStart, congEnd + 1);

  function arcOffset(latScale, lonScale) {
    return middle.map((p, i) => {
      const t     = i / (middle.length - 1 || 1);
      const curve = Math.sin(t * Math.PI); // smooth 0 → 1 → 0 arc
      return {
        latitude:  p.latitude  + latScale * curve,
        longitude: p.longitude + lonScale * curve,
      };
    });
  }

  return [
    {
      label:       "Route A",
      description: "Via northern bypass",
      timeSaving:  4,
      color:       "#22C55E",
      coords:      [...approach, ...arcOffset(+0.013, +0.005), ...tail],
    },
    {
      label:       "Route B",
      description: "Via southern loop",
      timeSaving:  2,
      color:       "#A78BFA",
      coords:      [...approach, ...arcOffset(-0.010, -0.004), ...tail],
    },
  ];
}
