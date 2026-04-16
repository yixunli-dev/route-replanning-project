import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchRoutes } from "../services/routeService";

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleRun = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await fetchRoutes();

      console.log("DEMO ROUTE RESPONSE:", JSON.stringify(data, null, 2));

      if (!data || !Array.isArray(data.original_coordinates)) {
        throw new Error("Backend returned invalid route data.");
      }

      navigation.navigate("Map", { result: data });
    } catch (error) {
      console.error("HOME SCREEN ERROR:", error);
      setErrorMessage(error.message || "Failed to fetch route data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Route Replanning Demo</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Fixed Demo Route</Text>

        <Text style={styles.routeText}>
          Start: Evergreen, East San Jose, CA
        </Text>

        <Text style={styles.routeText}>
          Destination: San Jose Mineta International Airport, San Jose, CA
        </Text>

        <Text style={styles.noteText}>
          This demo uses a fixed route for now.
        </Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRun}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Loading..." : "Start Demo Route"}
          </Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator style={styles.loader} size="small" />}

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#1F2937",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#374151",
  },
  label: {
    color: "#93C5FD",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 14,
  },
  routeText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  noteText: {
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 6,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loader: {
    marginTop: 12,
  },
  errorText: {
    color: "#FCA5A5",
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
});
