"""
Service Layer: Demo Pipeline with Graph Caching

Fixed route:
- Start: Evergreen, East San Jose
- End: San Jose Mineta International Airport

Graph caching strategy:
1. In-memory cache  — instant on repeated requests in the same session
2. File cache       — ~2s reload after server restart (vs ~30s download)
3. Startup preload  — graph is ready before the first request arrives
"""

import os
import sys
import pickle
import osmnx as ox
import networkx as nx

CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
SRC_DIR      = os.path.join(PROJECT_ROOT, "src")
CACHE_PATH   = os.path.join(CURRENT_DIR, "graph_cache.pkl")

if SRC_DIR not in sys.path:
    sys.path.append(SRC_DIR)

from graph_utils import add_travel_time

# ── Fixed demo endpoints ───────────────────────────────────────
START_LAT, START_LON = 37.2940, -121.7800   # Evergreen, East San Jose
END_LAT,   END_LON   = 37.3639, -121.9289   # SJC Airport
GRAPH_DIST = 12000                           # metres radius around midpoint

# ── Module-level in-memory cache ──────────────────────────────
_cached_graph  = None
_cached_simple = None
_cached_source = None
_cached_target = None


# ─────────────────────────────────────────────────────────────
# Graph helpers
# ─────────────────────────────────────────────────────────────

def to_simple_digraph(G_multi):
    G_simple = nx.DiGraph()
    for node, data in G_multi.nodes(data=True):
        G_simple.add_node(node, **data)
    for u, v, edge_data in G_multi.edges(data=True):
        travel_time = float(edge_data.get("travel_time", 1.0))
        length      = float(edge_data.get("length", 0.0))
        if G_simple.has_edge(u, v):
            if travel_time < G_simple[u][v]["travel_time"]:
                G_simple[u][v]["travel_time"] = travel_time
                G_simple[u][v]["length"]      = length
        else:
            G_simple.add_edge(u, v, travel_time=travel_time, length=length)
    return G_simple


def path_to_coordinates(G, path):
    return [
        {"lat": float(G.nodes[n]["y"]), "lon": float(G.nodes[n]["x"])}
        for n in path
    ]


def compute_path_distance_meters(G_simple, path):
    return sum(
        float(G_simple[path[i]][path[i + 1]].get("length", 0.0))
        for i in range(len(path) - 1)
    )


# ─────────────────────────────────────────────────────────────
# Cache loader
# ─────────────────────────────────────────────────────────────

def _load_graph():
    """
    Return (G, G_simple, source, target).
    Priority: in-memory → file cache → OSMnx download.
    """
    global _cached_graph, _cached_simple, _cached_source, _cached_target

    # 1. In-memory hit — instant
    if _cached_graph is not None:
        return _cached_graph, _cached_simple, _cached_source, _cached_target

    # 2. File cache hit — ~2s
    if os.path.exists(CACHE_PATH):
        print("[cache] Loading graph from file…")
        with open(CACHE_PATH, "rb") as f:
            data = pickle.load(f)
        G        = data["G"]
        G_simple = data["G_simple"]
        source   = data["source"]
        target   = data["target"]

    else:
        # 3. Download from OSMnx — ~20-40s, runs only once ever
        print("[cache] Downloading graph from OSMnx (first run only)…")
        center_lat = (START_LAT + END_LAT) / 2
        center_lon = (START_LON + END_LON) / 2

        G = ox.graph_from_point(
            (center_lat, center_lon),
            dist=GRAPH_DIST,
            network_type="drive"
        )
        G = ox.truncate.largest_component(G, strongly=False)
        add_travel_time(G)

        G_simple = to_simple_digraph(G)
        source   = int(ox.distance.nearest_nodes(G, X=START_LON, Y=START_LAT))
        target   = int(ox.distance.nearest_nodes(G, X=END_LON,   Y=END_LAT))

        print("[cache] Saving graph to file cache…")
        with open(CACHE_PATH, "wb") as f:
            pickle.dump({
                "G": G, "G_simple": G_simple,
                "source": source, "target": target
            }, f)

    # Store in memory for this session
    _cached_graph  = G
    _cached_simple = G_simple
    _cached_source = source
    _cached_target = target

    print("[cache] Graph ready.")
    return G, G_simple, source, target


def preload_graph():
    """Call on server startup to warm the cache before the first request."""
    _load_graph()


# ─────────────────────────────────────────────────────────────
# Main pipeline
# ─────────────────────────────────────────────────────────────

def run_replanning_pipeline_by_addresses(
    start_address, end_address, dist, k,
    congestion_start_index, congestion_end_index, congestion_multiplier
):
    G, G_simple, source, target = _load_graph()

    if len(G.nodes) == 0:
        raise ValueError("Graph contains no nodes.")
    if source == target:
        raise ValueError("Start and end map to the same node.")
    if not nx.has_path(G_simple, source, target):
        raise ValueError("No path found between source and target.")

    original_path = nx.shortest_path(
        G_simple, source=source, target=target, weight="travel_time"
    )
    original_cost = nx.shortest_path_length(
        G_simple, source=source, target=target, weight="travel_time"
    )

    original_path        = [int(n) for n in original_path]
    original_cost        = float(original_cost)
    original_coordinates = path_to_coordinates(G, original_path)

    original_distance_meters  = compute_path_distance_meters(G_simple, original_path)
    original_distance_miles   = original_distance_meters / 1609.344
    original_duration_minutes = original_cost / 60.0

    return {
        "source":                    source,
        "target":                    target,
        "original_path":             original_path,
        "original_cost":             original_cost,
        "original_node_count":       len(original_path),
        "original_coordinates":      original_coordinates,
        "original_distance_meters":  float(original_distance_meters),
        "original_distance_miles":   float(original_distance_miles),
        "original_duration_seconds": float(original_cost),
        "original_duration_minutes": float(original_duration_minutes),
        "alternative_paths":         [],
        "did_route_change":          False,
    }