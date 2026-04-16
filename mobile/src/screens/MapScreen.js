// ─────────────────────────────────────────────────────────────
// MapScreen.js
// Rendering only — all driving logic lives in useDrivingSimulation,
// all congestion constants/math live in congestionUtils.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import { useDrivingSimulation } from "../hooks/useDrivingSimulation";
import { LEGEND } from "../utils/congestionUtils";

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
    visibleCongestionSegments,
    altVisibleCongestionSegments,
    traveledPath,
    altTraveledPath,
    carPosition,
    startDriving,
    chooseAlternative,
    continueOriginal,
  } = useDrivingSimulation(originalRoute);

  // ── Fit map to route on load ───────────────────────────────
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

  const showCar =
    phase === "driving" || phase === "alt_driving" || phase === "alt_prompt";

  // Convert carPosition (lat/lon) → screen pixel coords via MapView API.
  // This lets us render the car as a plain View overlay, completely
  // bypassing react-native-maps Marker / tracksViewChanges issues.
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
        {/* 1. Congestion-colored segments (only those ahead of car) */}
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

        {/* 2. Alt route candidates – dashed preview during prompt */}
        {/* 2. Alt route dashed preview during prompt (neutral) */}
        {phase === "alt_prompt" &&
          alternatives.map((alt) => (
            <Polyline
              key={alt.label}
              coordinates={alt.coords}
              strokeColor="#E5E7EB"
              strokeWidth={4}
              strokeDashArray={[8, 6]}
              lineCap="round"
            />
          ))}

        {/* 3. Alt route – congestion colors ahead of the car */}
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

      {/* Car dot — plain View outside MapView, positioned via pointForCoordinate.
          Completely avoids Marker / tracksViewChanges snapshot issues. */}
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

      {/* ══ IDLE / DONE: legend + stats + Start ══════════════ */}
      {(phase === "idle" || phase === "done") && (
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
            <Text style={styles.startButtonText}>
              {phase === "done" ? "Restart Demo" : "Start"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ══ DRIVING: minimal status bar ══════════════════════ */}
      {(phase === "driving" || phase === "alt_driving") && (
        <View style={styles.drivingBar}>
          <View style={[styles.drivingDot, { backgroundColor: "#22C55E" }]} />
          <Text style={styles.drivingText}>
            {phase === "alt_driving"
              ? `Following ${selectedAlt?.label} – ${selectedAlt?.description}`
              : "Following original route…"}
          </Text>
        </View>
      )}

      {/* ══ ALT PROMPT: traffic alert + route options ════════ */}
      {phase === "alt_prompt" && (
        <View style={styles.altPanel}>
          <View style={styles.altHeader}>
            <Text style={styles.altHeaderIcon}>🚨</Text>
            <View>
              <Text style={styles.altHeaderTitle}>Traffic Ahead</Text>
              <Text style={styles.altHeaderSub}>
                Heavy congestion detected on your route
              </Text>
            </View>
          </View>

          {alternatives.map((alt) => (
            <TouchableOpacity
              key={alt.label}
              style={styles.altOption}
              onPress={() => chooseAlternative(alt)}
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
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.continueBtn}
            onPress={continueOriginal}
          >
            <Text style={styles.continueBtnText}>
              Continue on current route
            </Text>
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

  // ── idle/done panel ──
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#111827",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: { color: "#D1D5DB", fontSize: 12, fontWeight: "500" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  infoText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },

  carDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#22C55E",
    borderWidth: 3,
    borderColor: "#14532D",
  },

  startButton: {
    backgroundColor: "#22C55E",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  startButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },

  // ── driving bar ──
  drivingBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#1F2937",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    paddingBottom: 32,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 10,
  },
  drivingDot: { width: 10, height: 10, borderRadius: 5 },
  drivingText: { color: "#D1D5DB", fontSize: 14, fontWeight: "500" },

  // ── alt prompt panel ──
  altPanel: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#111827",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 12,
  },
  altHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  altHeaderIcon: { fontSize: 28 },
  altHeaderTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  altHeaderSub: { color: "#9CA3AF", fontSize: 13, marginTop: 2 },

  altOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F2937",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#374151",
  },
  altColorBar: { width: 5, alignSelf: "stretch" },
  altOptionBody: { flex: 1, paddingVertical: 14, paddingHorizontal: 14 },
  altOptionTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  altOptionDesc: { color: "#9CA3AF", fontSize: 13, marginTop: 2 },
  altBadge: {
    backgroundColor: "#14532D",
    marginRight: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  altBadgeText: { color: "#4ADE80", fontSize: 13, fontWeight: "700" },
  continueBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  continueBtnText: { color: "#9CA3AF", fontSize: 15, fontWeight: "500" },
});
