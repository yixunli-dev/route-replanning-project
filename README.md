# Route Replanning Project

A full-stack dynamic route replanning system built on real-world road network data. The backend computes shortest paths and simulates traffic congestion using graph algorithms; the mobile app visualizes routes and animates live rerouting decisions.

---

## Overview

| Layer     | Technology                       | Role                                     |
| --------- | -------------------------------- | ---------------------------------------- |
| Algorithm | Python · OSMnx · NetworkX        | Graph construction, Dijkstra, Yen's K-SP |
| Backend   | FastAPI                          | REST API, congestion pipeline            |
| Mobile    | React Native · react-native-maps | Map UI, driving simulation               |

---

## Features

- Construct real-world road graphs from OpenStreetMap via OSMnx
- Shortest path via Dijkstra's algorithm (custom implementation)
- K alternative paths via Yen's K-Shortest Paths algorithm
- Congestion simulation by scaling edge travel-time weights
- FastAPI backend exposing a single replanning endpoint
- React Native mobile app with:
  - 4-color congestion visualization (clear / light / moderate / heavy)
  - Animated driving simulation with speed proportional to congestion level
  - Real-time alternative route prompt when congestion is detected
  - Gray trail overlay on traveled path

---

## Project Structure

```
route-replanning-project/
├── backend/
│   ├── app.py          # FastAPI app and CORS setup
│   ├── schemas.py      # Pydantic request / response models
│   └── service.py      # Route pipeline: graph build → shortest path → response
│
├── mobile/
│   └── src/
│       ├── config/
│       │   └── api.js                  # Base URL config
│       ├── hooks/
│       │   └── useDrivingSimulation.js # Animation state machine
│       ├── navigation/
│       │   └── AppNavigator.js
│       ├── screens/
│       │   ├── HomeScreen.js           # Route entry point
│       │   └── MapScreen.js            # Map + simulation UI
│       ├── services/
│       │   └── routeService.js         # API call
│       └── utils/
│           └── congestionUtils.js      # Congestion constants + segment math
│
├── src/
│   ├── graph_utils.py
│   ├── dijkstra.py
│   ├── congestion.py
│   ├── yen_ksp.py
│   ├── reroute_demo.py
│   └── final_demo.py
│
├── tests/
│   └── yen_test.py
│
├── notebooks/
│   └── 01_osmnx_setup.ipynb
│
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Expo Go app (iOS or Android) for mobile testing

---

### Backend

```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install fastapi uvicorn osmnx networkx

# Start the server
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.  
Swagger docs: `http://localhost:8000/docs`

---

### Mobile

```bash
cd mobile

# Install dependencies
npm install

# Start Expo dev server
npx expo start
```

Then scan the QR code with Expo Go, or press `i` for iOS simulator / `a` for Android emulator.

> **Note:** Update `mobile/src/config/api.js` with your machine's local IP address before running on a physical device.

---

## API Reference

### `POST /api/routes/replan`

Compute the shortest path between two points and return congestion-aware route data.

**Request body**

```json
{
  "start_address": "Evergreen, East San Jose, CA",
  "end_address": "San Jose Mineta International Airport, San Jose, CA",
  "dist": 12000,
  "k": 3,
  "congestion_start_index": 1,
  "congestion_end_index": 4,
  "congestion_multiplier": 50
}
```

**Response**

```json
{
  "source": 123456,
  "target": 789012,
  "original_path": [123456, "..."],
  "original_cost": 1142.5,
  "original_node_count": 87,
  "original_coordinates": [{ "lat": 37.294, "lon": -121.78 }, "..."],
  "original_distance_miles": 9.84,
  "original_duration_minutes": 19.0,
  "alternative_paths": [],
  "did_route_change": false
}
```

---

## Algorithms

### Dijkstra's Algorithm

Computes the minimum travel-time path on a weighted directed graph. Edge weights are derived from road length and speed limit via OSMnx.

### Yen's K-Shortest Paths

Generates up to K loopless alternative routes. Each candidate is found by iteratively penalizing spur paths from previously discovered routes, ensuring path diversity.

### Congestion Simulation

Selected edges have their `travel_time` weight multiplied by a configurable `congestion_multiplier`. The shortest path is recomputed on the modified graph, producing a rerouted result when a faster alternative exists.

---

## Visualization

<table>
  <tr>
    <td><img src="assets/original_path.png" width="400"/></td>
    <td><img src="assets/final_original_path.png" width="400"/></td>
  </tr>
  <tr>
    <td align="center">Original Route</td>
    <td align="center">Rerouted Path after Congestion</td>
  </tr>
  <tr>
    <td><img src="assets/final_best_alternative.png" width="400"/></td>
    <td><img src="assets/final_k_paths_comparison.png" width="400"/></td>
  </tr>
  <tr>
    <td align="center">Best Alternative Route</td>
    <td align="center">K Shortest Paths Comparison</td>
  </tr>
</table>

---

## Running Tests

```bash
python3 tests/yen_test.py
```

---

## Author

Yixun Li
