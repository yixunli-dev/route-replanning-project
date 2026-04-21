// ─────────────────────────────────────────────────────────────
// MapScreen.js
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import { useDrivingSimulation } from "../hooks/useDrivingSimulation";
import { LEGEND } from "../utils/congestionSimulation";

const COUNTDOWN_SECONDS = 10;

export default function MapScreen({ route }) {
  const { result } = route.params;
  const mapRef = useRef(null);

  // ── Route data ─────────────────────────────────────────────
  const originalRoute = useMemo(() => {
    if (!result || !Array.isArray(result.original_coordinates)) return [];
    return result.original_coordinates.map((p) => ({
      latitude: p.lat,
      longitude: p.lon,
    }));
  }, [result]);

  const distanceMiles = result?.original_distance_miles ?? 0;
  const durationMinutes = result?.original_duration_minutes ?? 0;

  // ── Driving simulation ─────────────────────────────────────
  const {
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
  } = useDrivingSimulation(originalRoute);

  // ── Two-step route selection ───────────────────────────────
  // Step 1: tap a route → sets pendingAlt (highlights it)
  // Step 2: tap Confirm → calls chooseAlternative(pendingAlt)
  const [pendingAlt, setPendingAlt] = useState(null);

  // Reset pending selection when leaving alt_prompt
  useEffect(() => {
    if (phase !== "alt_prompt") setPendingAlt(null);
  }, [phase]);

  // ── Countdown (driver-friendly auto-continue) ──────────────
  // Counts down from COUNTDOWN_SECONDS → 0 during alt_prompt.
  // Pauses while the user has highlighted a route (pendingAlt set),
  // giving them time to read without pressure.
  // At 0, automatically continues on the original route —
  // the safest default for a driver whose attention is on the road.
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (phase !== "alt_prompt") {
      setCountdown(COUNTDOWN_SECONDS); // reset for next time
      return;
    }
    if (pendingAlt !== null) return; // paused: user is actively deciding
    if (countdown <= 0) {
      continueOriginal();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, pendingAlt]);

  // ── Map fit ────────────────────────────────────────────────
  const initialRegion = useMemo(() => {
    if (originalRoute.length === 0)
      return {
        latitude: 37.3382,
        longitude: -121.8863,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    return {
      latitude: originalRoute[0].latitude,
      longitude: originalRoute[0].longitude,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    };
  }, [originalRoute]);

  useEffect(() => {
    if (!mapRef.current || originalRoute.length === 0) return;
    mapRef.current.fitToCoordinates(originalRoute, {
      edgePadding: { top: 100, right: 50, bottom: 260, left: 50 },
      animated: true,
    });
  }, [originalRoute]);

  // ── Car position → screen coords ──────────────────────────
  const showCar = [
    "driving",
    "alt_driving",
    "alt_prompt",
    "jam_reveal",
  ].includes(phase);
  const [carScreen, setCarScreen] = useState(null);

  useEffect(() => {
    if (!mapRef.current || !carPosition || !showCar) {
      setCarScreen(null);
      return;
    }
    mapRef.current
      .pointForCoordinate(carPosition)
      .then((pt) => setCarScreen(pt))
      .catch(() => setCarScreen(null));
  }, [carPosition, showCar]);

  // ── Render ─────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
        {/* 1. Congestion-colored route (ahead of car) */}
        {visibleCongestionSegments.map((seg) => (
          <Polyline
            key={`cong-${seg.segIdx}`}
            coordinates={seg.coordinates}
            strokeColor={seg.color}
            strokeWidth={7}
            lineCap="round"
            lineJoin="round"
          />
        ))}

        {/* 2. Alt route dashed preview during prompt */}
        {phase === "alt_prompt" &&
          alternatives.map((alt) => (
            <Polyline
              key={alt.label}
              coordinates={alt.coords}
              strokeColor={
                pendingAlt?.label === alt.label ? alt.color : "#6B7280"
              }
              strokeWidth={pendingAlt?.label === alt.label ? 6 : 3}
              strokeDashArray={[8, 6]}
              lineCap="round"
            />
          ))}

        {/* 3. Alt route – congestion colors ahead */}
        {altVisibleCongestionSegments.map((seg) => (
          <Polyline
            key={`alt-cong-${seg.segIdx}`}
            coordinates={seg.coordinates}
            strokeColor={seg.color}
            strokeWidth={7}
            lineCap="round"
            lineJoin="round"
          />
        ))}

        {/* 4. Gray overlay – original traveled path */}
        {traveledPath.length >= 2 && (
          <Polyline
            coordinates={traveledPath}
            strokeColor="#6B7280"
            strokeWidth={7}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* 5. Gray overlay – alt traveled path */}
        {altTraveledPath.length >= 2 && (
          <Polyline
            coordinates={altTraveledPath}
            strokeColor="#6B7280"
            strokeWidth={7}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* 6. Start / end markers */}
        {originalRoute.length > 0 && (
          <>
            <Marker
              coordinate={originalRoute[0]}
              title="Start"
              pinColor="green"
              zIndex={1}
            />
            <Marker
              coordinate={originalRoute[originalRoute.length - 1]}
              title="Destination"
              pinColor="red"
              zIndex={1}
            />
          </>
        )}
      </MapView>

      {/* Car dot – plain View outside MapView */}
      {showCar && carScreen && (
        <View
          pointerEvents="none"
          style={[
            styles.carDot,
            {
              position: "absolute",
              left: carScreen.x - 11,
              top: carScreen.y - 11,
            },
          ]}
        />
      )}

      {/* ══ JAM REVEAL: top warning banner ═══════════════════ */}
      {phase === "jam_reveal" && (
        <View style={styles.jamBanner}>
          <Text style={styles.jamBannerIcon}>🚨</Text>
          <Text style={styles.jamBannerText}>
            Heavy traffic detected ahead!
          </Text>
        </View>
      )}

      {/* ══ IDLE: legend + stats + Start ═════════════════════ */}
      {phase === "idle" && (
        <View style={styles.bottomPanel}>
          <View style={styles.legendRow}>
            {LEGEND.map((item) => (
              <View key={item.label} style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: item.color }]}
                />
                <Text style={styles.legendLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>
              🛣 {distanceMiles.toFixed(2)} mi
            </Text>
            <Text style={styles.infoText}>
              🕐 {Math.round(durationMinutes)} min
            </Text>
          </View>
          <TouchableOpacity style={styles.startButton} onPress={startDriving}>
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ══ DONE: arrival summary ════════════════════════════ */}
      {phase === "done" && (
        <View style={styles.bottomPanel}>
          <View style={styles.arrivedHeader}>
            <Text style={styles.arrivedIcon}>🏁</Text>
            <View>
              <Text style={styles.arrivedTitle}>You've arrived!</Text>
              <Text style={styles.arrivedSub}>
                {selectedAlt
                  ? `${selectedAlt.miles.toFixed(2)} mi · ${selectedAlt.duration} min route`
                  : jammedActive && !selectedAlt
                    ? `${distanceMiles.toFixed(2)} mi · 60 min route`
                    : `${distanceMiles.toFixed(2)} mi · ${Math.round(durationMinutes)} min route`}
              </Text>
            </View>
          </View>

          {selectedAlt ? (
            <View style={styles.timeSavedBadge}>
              <Text style={styles.timeSavedIcon}>⚡</Text>
              <View>
                <Text style={styles.timeSavedMinutes}>
                  −{selectedAlt.timeSaving} min
                </Text>
                <Text style={styles.timeSavedLabel}>
                  saved via {selectedAlt.label}
                </Text>
              </View>
            </View>
          ) : jammedActive ? (
            <View style={[styles.timeSavedBadge, styles.timeLostBadge]}>
              <Text style={styles.timeSavedIcon}>🐢</Text>
              <View>
                <Text style={[styles.timeSavedMinutes, styles.timeLostMinutes]}>
                  +20 min
                </Text>
                <Text style={[styles.timeSavedLabel, styles.timeLostLabel]}>
                  slower than expected
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.timeSavedBadge, styles.timeSavedNeutral]}>
              <Text style={styles.timeSavedIcon}>🗺️</Text>
              <Text style={[styles.timeSavedLabel, { color: "#9CA3AF" }]}>
                Followed original route
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.startButton} onPress={startDriving}>
            <Text style={styles.startButtonText}>Restart Demo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ══ DRIVING / JAM_REVEAL: status bar + progress ═════ */}
      {(phase === "driving" ||
        phase === "alt_driving" ||
        phase === "jam_reveal") && (
        <View style={styles.drivingBar}>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress * 100)}%` },
              ]}
            />
          </View>
          <View style={styles.drivingRow}>
            <View
              style={[
                styles.drivingDot,
                {
                  backgroundColor:
                    phase === "jam_reveal" ? "#991B1B" : "#22C55E",
                },
              ]}
            />
            <Text style={styles.drivingText}>
              {phase === "alt_driving"
                ? `Following ${selectedAlt?.label} – ${selectedAlt?.description}`
                : phase === "jam_reveal"
                  ? "Analyzing traffic conditions…"
                  : "Following original route…"}
            </Text>
            <Text style={styles.progressText}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        </View>
      )}

      {/* ══ ALT PROMPT: route selection ══════════════════════ */}
      {phase === "alt_prompt" && (
        <View style={styles.altPanel}>
          {/* Header */}
          <View style={styles.altHeader}>
            <Text style={styles.altHeaderIcon}>🚨</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.altHeaderTitle}>Traffic Ahead</Text>
              <Text style={styles.altHeaderSub}>
                Heavy congestion detected — select a route
              </Text>
            </View>
          </View>

          {/* Step 1: Route options — tap to highlight */}
          {alternatives.map((alt) => {
            const isSelected = pendingAlt?.label === alt.label;
            return (
              <TouchableOpacity
                key={alt.label}
                style={[
                  styles.altOption,
                  isSelected && styles.altOptionSelected,
                ]}
                onPress={() => setPendingAlt(isSelected ? null : alt)}
              >
                <View
                  style={[styles.altColorBar, { backgroundColor: alt.color }]}
                />
                <View style={styles.altOptionBody}>
                  <Text style={styles.altOptionTitle}>{alt.label}</Text>
                  <Text style={styles.altOptionDesc}>{alt.description}</Text>
                </View>
                <View style={styles.altBadge}>
                  <Text style={styles.altBadgeText}>−{alt.timeSaving} min</Text>
                </View>
                <Text style={styles.altRadio}>{isSelected ? "●" : "○"}</Text>
              </TouchableOpacity>
            );
          })}

          {/* Step 2: Confirm button — disabled until a route is selected */}
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              !pendingAlt && styles.confirmBtnDisabled,
            ]}
            disabled={!pendingAlt}
            onPress={() => chooseAlternative(pendingAlt)}
          >
            <Text
              style={[
                styles.confirmBtnText,
                !pendingAlt && styles.confirmBtnTextDisabled,
              ]}
            >
              {pendingAlt
                ? `Confirm ${pendingAlt.label}`
                : "Select a route to confirm"}
            </Text>
          </TouchableOpacity>

          {/* Countdown continue button */}
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={continueOriginal}
          >
            <View style={styles.continueBtnInner}>
              <Text style={styles.continueBtnText}>
                Continue on current route
              </Text>
              {!pendingAlt && (
                <View style={styles.countdownBadge}>
                  <Text style={styles.countdownText}>{countdown}s</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  carDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#22C55E",
    borderWidth: 3,
    borderColor: "#14532D",
  },

  // ── idle panel ──
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#111827",
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 48,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 24,
  },
  legendRow: { flexDirection: "row", justifyContent: "space-between" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  legendLabel: { color: "#D1D5DB", fontSize: 13, fontWeight: "500" },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  startButton: {
    backgroundColor: "#22C55E",
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },

  // ── driving bar ──
  drivingBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#1F2937",
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 12,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "#374151",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: "#22C55E",
    borderRadius: 2,
  },
  drivingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  drivingDot: { width: 12, height: 12, borderRadius: 6 },
  drivingText: { color: "#D1D5DB", fontSize: 15, fontWeight: "500", flex: 1 },
  progressText: { color: "#6B7280", fontSize: 14, fontWeight: "600" },

  // ── alt prompt panel ──
  altPanel: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#111827",
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 44,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 14,
  },
  altHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 2,
  },
  altHeaderIcon: { fontSize: 28 },
  altHeaderTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  altHeaderSub: { color: "#9CA3AF", fontSize: 13, marginTop: 2 },

  altOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F2937",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  altOptionSelected: {
    borderColor: "#22C55E",
    backgroundColor: "#052e16",
  },
  altColorBar: {
    width: 6,
    alignSelf: "stretch",
    borderTopLeftRadius: 13,
    borderBottomLeftRadius: 13,
  },
  altOptionBody: { flex: 1, paddingVertical: 16, paddingHorizontal: 16 },
  altOptionTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  altOptionDesc: { color: "#9CA3AF", fontSize: 13, marginTop: 3 },
  altBadge: {
    backgroundColor: "#14532D",
    marginRight: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  altBadgeText: { color: "#4ADE80", fontSize: 14, fontWeight: "700" },
  altRadio: { fontSize: 20, color: "#22C55E", marginRight: 16 },

  // Confirm button ──
  confirmBtn: {
    backgroundColor: "#22C55E",
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#374151",
  },
  confirmBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  confirmBtnTextDisabled: { color: "#4B5563" },

  // Countdown continue button ──
  continueBtn: {
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  continueBtnInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  continueBtnText: { color: "#9CA3AF", fontSize: 15, fontWeight: "500" },
  countdownBadge: {
    backgroundColor: "#374151",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  countdownText: { color: "#D1D5DB", fontSize: 14, fontWeight: "700" },

  // ── arrived / done ──
  arrivedHeader: { flexDirection: "row", alignItems: "center", gap: 16 },
  arrivedIcon: { fontSize: 36 },
  arrivedTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  arrivedSub: { color: "#9CA3AF", fontSize: 14, marginTop: 3 },

  timeSavedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#14532D",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  timeSavedNeutral: { backgroundColor: "#1F2937" },
  timeLostBadge: { backgroundColor: "#3B1A1A" },
  timeSavedIcon: { fontSize: 26 },
  timeSavedMinutes: { color: "#4ADE80", fontSize: 30, fontWeight: "800" },
  timeLostMinutes: { color: "#FCA5A5", fontSize: 30, fontWeight: "800" },
  timeSavedLabel: {
    color: "#86EFAC",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
  },
  timeLostLabel: {
    color: "#FCA5A5",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
  },

  // ── jam reveal banner ──
  jamBanner: {
    position: "absolute",
    top: 56,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#991B1B",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  jamBannerIcon: { fontSize: 18 },
  jamBannerText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
