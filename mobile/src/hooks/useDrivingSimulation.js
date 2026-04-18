// ─────────────────────────────────────────────────────────────
// useDrivingSimulation.js
//
// Driving animation state machine.
// All congestion constants and math live in congestionSimulation.js.
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

// ─────────────────────────────────────────────────────────────
// Phases:
//   idle → driving → jam_reveal → alt_prompt → alt_driving | driving → done
// ─────────────────────────────────────────────────────────────

export function useDrivingSimulation(originalRoute) {
  const timeoutRef = useRef(null);

  const [phase, setPhase] = useState("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [altIndex, setAltIndex] = useState(0);
  const [alternatives, setAlternatives] = useState([]);
  const [selectedAlt, setSelectedAlt] = useState(null);
  const [altTriggered, setAltTriggered] = useState(false);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  // Normal (blue/orange) segment boundaries
  const segmentBoundaries = useMemo(
    () => buildSegmentBoundaries(originalRoute.length),
    [originalRoute.length],
  );

  // Jammed (dark-red) boundaries — shown during jam_reveal and alt_prompt
  const jammedBoundaries = useMemo(
    () => buildJammedSegmentBoundaries(originalRoute.length),
    [originalRoute.length],
  );

  // Index at which the orange zone begins (triggers jam reveal)
  const orangeTriggerIdx = useMemo(
    () => segmentBoundaries[ORANGE_SEGMENT_IDX]?.startIdx ?? 0,
    [segmentBoundaries],
  );

  // ── Driving tick ────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "driving") return;

    if (!altTriggered && currentIndex >= orangeTriggerIdx) {
      const alts = generateMockAlternatives(originalRoute, currentIndex);
      if (alts.length > 0) {
        setAlternatives(alts);
        setAltTriggered(true);
        setPhase("jam_reveal");
        return;
      }
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

  // ── Jam reveal timer ────────────────────────────────────────
  useEffect(() => {
    if (phase !== "jam_reveal") return;
    timeoutRef.current = setTimeout(
      () => setPhase("alt_prompt"),
      JAM_REVEAL_DURATION_MS,
    );
    return () => clearTimeout(timeoutRef.current);
  }, [phase]);

  // ── Alt route boundaries ────────────────────────────────────
  const altBoundaries = useMemo(
    () =>
      selectedAlt ? buildAltSegmentBoundaries(selectedAlt.coords.length) : [],
    [selectedAlt],
  );

  // ── Alt route tick ──────────────────────────────────────────
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

  // ── Actions ─────────────────────────────────────────────────

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
    setPhase("driving");
  };

  // ── Derived map data ─────────────────────────────────────────

  const visibleCongestionSegments = useMemo(() => {
    if (phase === "alt_driving" || phase === "done") return [];

    const boundaries =
      phase === "jam_reveal" || phase === "alt_prompt"
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

  // 0.0 → 1.0 along the active route (used for progress bar in UI)
  const progress = useMemo(() => {
    if (phase === "alt_driving" && selectedAlt)
      return altIndex / Math.max(selectedAlt.coords.length - 1, 1);
    return currentIndex / Math.max(originalRoute.length - 1, 1);
  }, [phase, currentIndex, altIndex, selectedAlt, originalRoute.length]);

  return {
    phase,
    alternatives,
    selectedAlt,
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
