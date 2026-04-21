// ─────────────────────────────────────────────────────────────
// useDrivingSimulation.js
//
// Driving animation state machine.
// All congestion constants and math live in congestionSimulation.js.
//
// Phase flow:
//   idle → driving → jam_reveal → alt_prompt → alt_driving | driving → done
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import {
  JAM_REVEAL_DURATION_MS,
  ORANGE_SEGMENT_IDX,
  buildAltSegmentBoundaries,
  buildJammedSegmentBoundaries,
  buildSegmentBoundaries,
  generateMockAlternatives,
  getIntervalMs,
} from "../utils/congestionSimulation";

export function useDrivingSimulation(originalRoute) {
  // Each effect gets its own ref to avoid timer overwrites between phases.
  const driveTimerRef = useRef(null);
  const jamTimerRef = useRef(null);
  const altTimerRef = useRef(null);

  const [phase, setPhase] = useState("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [altIndex, setAltIndex] = useState(0);
  const [alternatives, setAlternatives] = useState([]);
  const [selectedAlt, setSelectedAlt] = useState(null);
  // altTriggered stays true after the first jam reveal so continueOriginal
  // never re-triggers the jam sequence when driving resumes from the same spot.
  const [altTriggered, setAltTriggered] = useState(false);
  // jammedActive: true after jam reveal fires, keeps jammed colors visible
  // even if the user chooses to continue on the original route.
  const [jammedActive, setJammedActive] = useState(false);

  // Cleanup all timers on unmount
  useEffect(
    () => () => {
      clearTimeout(driveTimerRef.current);
      clearTimeout(jamTimerRef.current);
      clearTimeout(altTimerRef.current);
    },
    [],
  );

  // ── Segment boundaries ──────────────────────────────────────
  const segmentBoundaries = useMemo(
    () => buildSegmentBoundaries(originalRoute.length),
    [originalRoute.length],
  );

  const jammedBoundaries = useMemo(
    () => buildJammedSegmentBoundaries(originalRoute.length),
    [originalRoute.length],
  );

  const orangeTriggerIdx = useMemo(
    () => segmentBoundaries[ORANGE_SEGMENT_IDX]?.startIdx ?? 0,
    [segmentBoundaries],
  );

  const altBoundaries = useMemo(
    () =>
      selectedAlt ? buildAltSegmentBoundaries(selectedAlt.coords.length) : [],
    [selectedAlt],
  );

  // ── Driving tick (original route) ──────────────────────────
  useEffect(() => {
    if (phase !== "driving") return;

    // altTriggered guard ensures this only fires once even if the car
    // resumes from the same index after the user chose continueOriginal.
    if (!altTriggered && currentIndex >= orangeTriggerIdx) {
      const alts = generateMockAlternatives(originalRoute, currentIndex);
      if (alts.length > 0) {
        setAlternatives(alts);
        setAltTriggered(true);
        setJammedActive(true); // keep jammed colors from here onwards
        setPhase("jam_reveal");
        return;
      }
      // No alternatives found — silently continue at current speed.
    }

    const ms = getIntervalMs(currentIndex, segmentBoundaries);
    driveTimerRef.current = setTimeout(() => {
      if (currentIndex >= originalRoute.length - 1) {
        setPhase("done");
        return;
      }
      setCurrentIndex((i) => i + 1);
    }, ms);

    return () => clearTimeout(driveTimerRef.current);
  }, [
    phase,
    currentIndex,
    altTriggered,
    orangeTriggerIdx,
    originalRoute,
    segmentBoundaries,
  ]);

  // ── Jam reveal timer ────────────────────────────────────────
  useEffect(() => {
    if (phase !== "jam_reveal") return;
    jamTimerRef.current = setTimeout(
      () => setPhase("alt_prompt"),
      JAM_REVEAL_DURATION_MS,
    );
    return () => clearTimeout(jamTimerRef.current);
  }, [phase]);

  // ── Alt route tick ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== "alt_driving" || !selectedAlt) return;

    // getIntervalMs returns "clear" speed when idx is past the last boundary —
    // this is intentional: the final nodes play at full speed.
    const ms = getIntervalMs(altIndex, altBoundaries);
    altTimerRef.current = setTimeout(() => {
      if (altIndex >= selectedAlt.coords.length - 1) {
        setPhase("done");
        return;
      }
      setAltIndex((i) => i + 1);
    }, ms);

    return () => clearTimeout(altTimerRef.current);
  }, [phase, altIndex, selectedAlt, altBoundaries]);

  // ── Actions ─────────────────────────────────────────────────

  const startDriving = () => {
    clearTimeout(driveTimerRef.current);
    clearTimeout(jamTimerRef.current);
    clearTimeout(altTimerRef.current);
    setPhase("driving");
    setCurrentIndex(0);
    setAltIndex(0);
    setAltTriggered(false);
    setJammedActive(false);
    setSelectedAlt(null);
    setAlternatives([]);
  };

  const chooseAlternative = (alt) => {
    clearTimeout(driveTimerRef.current);
    clearTimeout(jamTimerRef.current);
    setSelectedAlt(alt);
    setAltIndex(0);
    setPhase("alt_driving");
  };

  const continueOriginal = () => {
    clearTimeout(jamTimerRef.current);
    // altTriggered remains true so the jam sequence doesn't re-fire
    // when driving resumes from the current position.
    setPhase("driving");
  };

  // ── Derived map data ─────────────────────────────────────────

  const visibleCongestionSegments = useMemo(() => {
    if (phase === "alt_driving" || phase === "done") return [];

    const boundaries =
      phase === "jam_reveal" || phase === "alt_prompt" || jammedActive
        ? jammedBoundaries
        : segmentBoundaries;

    return boundaries
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
  }, [phase, currentIndex, segmentBoundaries, jammedBoundaries, originalRoute]);

  const traveledPath = useMemo(
    () => (currentIndex > 0 ? originalRoute.slice(0, currentIndex + 1) : []),
    [currentIndex, originalRoute],
  );

  const altTraveledPath = useMemo(
    () =>
      selectedAlt && altIndex > 0
        ? selectedAlt.coords.slice(0, altIndex + 1)
        : [],
    [altIndex, selectedAlt],
  );

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

  const carPosition = useMemo(() => {
    if (phase === "alt_driving" && selectedAlt)
      return selectedAlt.coords[
        Math.min(altIndex, selectedAlt.coords.length - 1)
      ];
    if (originalRoute.length > 0)
      return originalRoute[Math.min(currentIndex, originalRoute.length - 1)];
    return null;
  }, [phase, currentIndex, altIndex, selectedAlt, originalRoute]);

  // 0.0 → 1.0 progress along the active route (used for progress bar in UI)
  const progress = useMemo(() => {
    if (phase === "alt_driving" && selectedAlt)
      return altIndex / Math.max(selectedAlt.coords.length - 1, 1);
    return currentIndex / Math.max(originalRoute.length - 1, 1);
  }, [phase, currentIndex, altIndex, selectedAlt, originalRoute.length]);

  return {
    phase,
    alternatives,
    selectedAlt,
    jammedActive,
    progress,
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
