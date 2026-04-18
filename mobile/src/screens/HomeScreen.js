import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchRoutes } from "../services/routeService";

const DEMO_STEPS = [
  { icon: "🛣️", text: "Drive through blue & orange traffic" },
  { icon: "🚨", text: "Sudden congestion detected ahead" },
  { icon: "🔀", text: "Choose a faster alternative route" },
];

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleRun = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const data = await fetchRoutes();
      if (!data || !Array.isArray(data.original_coordinates)) {
        throw new Error("Backend returned invalid route data.");
      }
      navigation.navigate("Map", { result: data });
    } catch (error) {
      setErrorMessage(error.message || "Failed to fetch route data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>Route Replanning</Text>
        <Text style={styles.appSubtitle}>Real-time congestion simulation</Text>
      </View>

      {/* ── Route card ── */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>DEMO ROUTE</Text>

        <View style={styles.routeRow}>
          <View style={styles.routeDot} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Start</Text>
            <Text style={styles.routeValue}>Evergreen, East San Jose</Text>
          </View>
        </View>

        <View style={styles.routeConnector} />

        <View style={styles.routeRow}>
          <View style={[styles.routeDot, styles.routeDotEnd]} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Destination</Text>
            <Text style={styles.routeValue}>
              SJC Mineta International Airport
            </Text>
          </View>
        </View>
      </View>

      {/* ── What to expect ── */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>WHAT TO EXPECT</Text>
        {DEMO_STEPS.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <Text style={styles.stepIcon}>{step.icon}</Text>
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}
      </View>

      {/* ── Start button ── */}
      <TouchableOpacity
        style={[styles.startButton, loading && styles.startButtonLoading]}
        onPress={handleRun}
        disabled={loading}
      >
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={styles.startButtonText}>Loading route…</Text>
          </View>
        ) : (
          <Text style={styles.startButtonText}>Start Demo</Text>
        )}
      </TouchableOpacity>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
    paddingHorizontal: 20,
    paddingTop: 72,
    gap: 16,
  },

  // ── header ──
  header: { marginBottom: 4 },
  appTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "500",
  },

  // ── cards ──
  card: {
    backgroundColor: "#1F2937",
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: "#374151",
    gap: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  // ── route rows ──
  routeRow: { flexDirection: "row", alignItems: "center", gap: 18 },
  routeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#14532D",
  },
  routeDotEnd: { backgroundColor: "#EF4444", borderColor: "#7F1D1D" },
  routeConnector: {
    width: 2,
    height: 28,
    backgroundColor: "#374151",
    marginLeft: 7,
    marginVertical: -8,
  },
  routeInfo: { flex: 1 },
  routeLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  routeValue: { fontSize: 17, color: "#FFFFFF", fontWeight: "600" },

  // ── steps ──
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepIcon: { fontSize: 18, width: 28 },
  stepText: { fontSize: 15, color: "#D1D5DB", fontWeight: "500", flex: 1 },

  // ── start button ──
  startButton: {
    backgroundColor: "#22C55E",
    paddingVertical: 22,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
  },
  startButtonLoading: { backgroundColor: "#15803D" },
  startButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  // ── error ──
  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#450A0A",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#7F1D1D",
  },
  errorIcon: { fontSize: 16, marginTop: 1 },
  errorText: { color: "#FCA5A5", fontSize: 14, lineHeight: 20, flex: 1 },
});
