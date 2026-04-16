// ─────────────────────────────────────────────────────────────
// useDrivingSimulation.js
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildAltSegmentBoundaries,
  buildSegmentBoundaries,
  generateMockAlternatives,
} from "../utils/congestionUtils";

// ── Animation speed per congestion level (ms per route node) ──
// Slower interval = car moves more slowly through that segment.
const LEVEL_INTERVAL_MS = {
  clear: 90, // open road, fast
  light: 170, // slight slowdown
  moderate: 290, // noticeably slower
  heavy: 450, // crawling
};

// Orange trigger: segment index 2 starts at 20% of route
const ORANGE_SEGMENT_IDX = 2;

// ─────────────────────────────────────────────────────────────

/** Return the appropriate interval for the node at `idx`. */
function getIntervalMs(idx, boundaries) {
  const seg = boundaries.find((b) => idx >= b.startIdx && idx < b.endIdx);
  return LEVEL_INTERVAL_MS[seg?.level ?? "clear"];
}

// ─────────────────────────────────────────────────────────────

/**
 * @param {Array<{latitude, longitude}>} originalRoute
 */
export function useDrivingSimulation(originalRoute) {
  const timeoutRef = useRef(null);

  // phase: 'idle' | 'driving' | 'alt_prompt' | 'alt_driving' | 'done'
  const [phase, setPhase] = useState("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [altIndex, setAltIndex] = useState(0);
  const [alternatives, setAlternatives] = useState([]);
  const [selectedAlt, setSelectedAlt] = useState(null);
  const [altTriggered, setAltTriggered] = useState(false);

  // Cleanup on unmount
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const segmentBoundaries = useMemo(
    () => buildSegmentBoundaries(originalRoute.length),
    [originalRoute.length],
  );

  const orangeTriggerIdx = useMemo(
    () => segmentBoundaries[ORANGE_SEGMENT_IDX]?.startIdx ?? 0,
    [segmentBoundaries],
  );

  // ── Driving tick (original route) ──────────────────────────
  // Each change of currentIndex re-runs this effect, scheduling
  // the next step with the correct delay for that segment.
  useEffect(() => {
    if (phase !== "driving") return;

    // Check orange trigger
    if (!altTriggered && currentIndex >= orangeTriggerIdx) {
      const alts = generateMockAlternatives(originalRoute, currentIndex);
      if (alts.length > 0) {
        setAlternatives(alts);
        setAltTriggered(true);
        setPhase("alt_prompt"); // stops this effect (phase changes)
        return;
      }
      // No alternatives → silently continue at current speed
    }

    const ms = getIntervalMs(currentIndex, segmentBoundaries);
    timeoutRef.current = setTimeout(() => {
      if (currentIndex >= originalRoute.length - 1) {
        setPhase("done");
        return;
      }
      setCurrentIndex((i) => i + 1);
    }, ms);

    return () => clearTimeout(timeoutRef.current);
  }, [
    phase,
    currentIndex,
    altTriggered,
    orangeTriggerIdx,
    originalRoute,
    segmentBoundaries,
  ]);

  // Alt route boundaries start from ORANGE_SEGMENT_IDX (=2) so that:
  // - colors begin at light/orange (matching where original route stopped)
  // - speed begins at 170ms instead of the clear route's 90ms
  const altBoundaries = useMemo(
    () =>
      selectedAlt ? buildAltSegmentBoundaries(selectedAlt.coords.length) : [],
    [selectedAlt],
  );

  // ── Alt route tick ─────────────────────────────────────────
  useEffect(() => {
    if (phase !== "alt_driving" || !selectedAlt) return;

    const ms = getIntervalMs(altIndex, altBoundaries);
    timeoutRef.current = setTimeout(() => {
      if (altIndex >= selectedAlt.coords.length - 1) {
        setPhase("done");
        return;
      }
      setAltIndex((i) => i + 1);
    }, ms);

    return () => clearTimeout(timeoutRef.current);
  }, [phase, altIndex, selectedAlt, altBoundaries]);

  // ── Actions ────────────────────────────────────────────────

  const startDriving = () => {
    clearTimeout(timeoutRef.current);
    setPhase("driving");
    setCurrentIndex(0);
    setAltIndex(0);
    setAltTriggered(false);
    setSelectedAlt(null);
    setAlternatives([]);
  };

  const chooseAlternative = (alt) => {
    clearTimeout(timeoutRef.current);
    setSelectedAlt(alt);
    setAltIndex(0);
    setPhase("alt_driving");
  };

  const continueOriginal = () => {
    clearTimeout(timeoutRef.current);
    setPhase("driving"); // resumes from current currentIndex
  };

  // ── Derived map data ───────────────────────────────────────

  /**
   * Congestion segments still AHEAD of the car.
   *
   * KEY FIX: during alt_driving, we return [] so that all 10
   * original-route Polylines are unmounted. Re-rendering them
   * on every altIndex tick (even with unchanged props) causes
   * react-native-maps to redraw them — that's the flicker.
   * The gray overlay + colored alt route are sufficient visually.
   */
  const visibleCongestionSegments = useMemo(() => {
    if (phase === "alt_driving" || phase === "done") return [];

    return segmentBoundaries
      .map((b, segIdx) => {
        if (b.endIdx <= currentIndex) return null;
        const coordinates = originalRoute.slice(
          Math.max(b.startIdx, currentIndex),
          b.endIdx + 1,
        );
        if (coordinates.length < 2) return null;
        return { segIdx, coordinates, color: b.color };
      })
      .filter(Boolean);
  }, [phase, currentIndex, segmentBoundaries, originalRoute]);

  /** Gray overlay on the original route (traveled portion). */
  const traveledPath = useMemo(
    () => (currentIndex > 0 ? originalRoute.slice(0, currentIndex + 1) : []),
    [currentIndex, originalRoute],
  );

  /** Gray overlay on the selected alt route (traveled portion). */
  const altTraveledPath = useMemo(
    () =>
      selectedAlt && altIndex > 0
        ? selectedAlt.coords.slice(0, altIndex + 1)
        : [],
    [altIndex, selectedAlt],
  );

  /**
   * Congestion-colored segments on the alt route, ahead of the car.
   * Same 4-color simulation applied to the alt coordinate array.
   */
  const altVisibleCongestionSegments = useMemo(() => {
    if (phase !== "alt_driving" || !selectedAlt) return [];

    return altBoundaries
      .map((b, segIdx) => {
        if (b.endIdx <= altIndex) return null;
        const coordinates = selectedAlt.coords.slice(
          Math.max(b.startIdx, altIndex),
          b.endIdx + 1,
        );
        if (coordinates.length < 2) return null;
        return { segIdx, coordinates, color: b.color };
      })
      .filter(Boolean);
  }, [phase, altIndex, selectedAlt, altBoundaries]);

  /** Current car position on the map. */
  const carPosition = useMemo(() => {
    if (phase === "alt_driving" && selectedAlt)
      return selectedAlt.coords[
        Math.min(altIndex, selectedAlt.coords.length - 1)
      ];
    if (originalRoute.length > 0)
      return originalRoute[Math.min(currentIndex, originalRoute.length - 1)];
    return null;
  }, [phase, currentIndex, altIndex, selectedAlt, originalRoute]);

  return {
    phase,
    alternatives,
    selectedAlt,
    visibleCongestionSegments,
    altVisibleCongestionSegments,
    traveledPath,
    altTraveledPath,
    carPosition,
    startDriving,
    chooseAlternative,
    continueOriginal,
  };
}
