# Route Replanning with Congestion Simulation

This project implements a dynamic route replanning system using real-world road network data from OpenStreetMap. It demonstrates how shortest path algorithms adapt to traffic congestion by updating edge weights and recomputing routes.

---

## Features

- Build real-world road network using OSMnx
- Convert road network into a weighted directed graph
- Implement Dijkstra’s algorithm from scratch
- Simulate traffic congestion by modifying edge travel time
- Perform dynamic rerouting based on updated weights
- Implement Yen’s algorithm to compute K shortest alternative paths
- Visualize original and alternative routes on real maps

---

## Algorithms Used

- **Dijkstra’s Algorithm**
  - Computes the shortest path based on travel time
- **Yen’s K-Shortest Paths Algorithm**
  - Finds multiple loopless alternative routes
  - Avoids duplicate paths and ensures diversity
- **Graph Traversal (DFS)**
  - Used to ensure reachable source-target selection

---

## Tech Stack

- Python
- OSMnx
- NetworkX
- Matplotlib

---

## Project Structure

```
route-replanning-project/
├── src/
│ ├── graph_utils.py
│ ├── dijkstra.py
│ ├── congestion.py
│ ├── yen_ksp.py
│ ├── reroute_demo.py
│ └── final_demo.py
│
├── tests/
│ └── yen_test.py
│
├── notebooks/
│ └── 01_osmnx_setup.ipynb
│
├── outputs/ (ignored)
│
└── README.md
```

---

## How It Works

1. Load real-world road network using OSMnx
2. Assign edge weights based on travel time
3. Compute shortest path using Dijkstra
4. Simulate congestion by increasing travel time on selected edges
5. Recompute routes using updated graph
6. Generate K alternative paths using Yen’s algorithm
7. Compare and visualize all routes

---

## Example Result

- Original path vs rerouted path
- Congestion increases travel time significantly
- Alternative route is selected when available

---

## Visualization

### Original Route

![Original Path](assets/original_path.png)

### Rerouted Path after Congestion

![Original Route](assets/final_original_path.png)

### Best Alternative Route (After Congestion)

![Best Alternative](assets/final_best_alternative.png)

### K Shortest Paths Comparison

![K Paths](assets/final_k_paths_comparison.png)

---

## How to Run

```bash
python3 src/reroute_demo.py
```

---

## Testing

Run Yen’s algorithm test:

```bash
python3 tests/yen_test.py
```

---

## Future Work

- Use real-time traffic data (API integration)
- Improve travel time estimation using speed limits
- Add user-defined source/target selection
- Expand to larger city-scale networks

---

## Author

Yixun Li
