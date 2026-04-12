# Route Replanning with Congestion Simulation

This project implements a dynamic route replanning system using real-world road network data from OpenStreetMap. It demonstrates how shortest path algorithms adapt to traffic congestion by updating edge weights and recomputing routes.

## Features

- Build road network graph using OSMnx
- Convert road network into a weighted directed graph
- Implement Dijkstra’s algorithm from scratch
- Simulate congestion by modifying edge travel time
- Perform dynamic rerouting based on updated weights
- Visualize routes before and after congestion

## Tech Stack

- Python
- OSMnx
- NetworkX
- Matplotlib

## Project Structure
```
route-replanning-project/
├── src/
│ ├── graph_utils.py
│ ├── dijkstra.py
│ ├── congestion.py
│ └── reroute_demo.py
├── notebooks/
│ └── 01_osmnx_setup.ipynb
├── outputs/ (ignored)
└── README.md
```
## How It Works

1. Download road network using OSMnx
2. Assign edge weight based on travel time
3. Compute shortest path using Dijkstra
4. Introduce congestion by increasing edge weights
5. Recompute shortest path
6. Compare routes before and after congestion

## Example Result

- Original path vs rerouted path
- Congestion increases travel time significantly
- Alternative route is selected when available

## Visualization

### Original Route

![Original Path](assets/original_path.png)

### Rerouted Path after Congestion

![Rerouted Path](assets/rerouted_path.png)

## Future Work

- Implement Yen’s K-shortest paths
- Add more realistic congestion models
- Support real-time traffic updates
- Extend to larger geographic regions

## How to Run

```bash
python3 src/reroute_demo.py
Author

Yixun Li
```
