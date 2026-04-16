"""
Service Layer: Minimal Stable Demo Pipeline

Fixed route:
- Start: Evergreen, East San Jose (Yerlan Abbe Rd area)
- End: San Jose Mineta International Airport

Behavior:
- Ignore incoming addresses
- Build a local graph in San Jose
- Compute one shortest path with NetworkX
- Return distance and duration summary
- Return no alternative paths for now
"""

import os
import sys
import osmnx as ox
import networkx as nx

CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
SRC_DIR = os.path.join(PROJECT_ROOT, "src")

if SRC_DIR not in sys.path:
    sys.path.append(SRC_DIR)

from graph_utils import add_travel_time


def path_to_coordinates(G, path):
    """
    Convert a node path into latitude/longitude coordinates.
    """
    coordinates = []

    for node in path:
        node_data = G.nodes[node]
        coordinates.append({
            "lat": float(node_data["y"]),
            "lon": float(node_data["x"])
        })

    return coordinates


def to_simple_digraph(G_multi):
    """
    Convert MultiDiGraph to DiGraph by keeping the minimum travel_time
    edge between each directed pair of nodes, while also preserving length.
    """
    G_simple = nx.DiGraph()

    for node, data in G_multi.nodes(data=True):
        G_simple.add_node(node, **data)

    for u, v, edge_data in G_multi.edges(data=True):
        travel_time = float(edge_data.get("travel_time", 1.0))
        length = float(edge_data.get("length", 0.0))

        if G_simple.has_edge(u, v):
            if travel_time < G_simple[u][v]["travel_time"]:
                G_simple[u][v]["travel_time"] = travel_time
                G_simple[u][v]["length"] = length
        else:
            G_simple.add_edge(
                u,
                v,
                travel_time=travel_time,
                length=length
            )

    return G_simple


def compute_path_distance_meters(G_simple, path):
    """
    Sum edge lengths along the path.
    """
    total_distance = 0.0

    for i in range(len(path) - 1):
        u = path[i]
        v = path[i + 1]
        total_distance += float(G_simple[u][v].get("length", 0.0))

    return total_distance


def run_replanning_pipeline_by_addresses(
    start_address,
    end_address,
    dist,
    k,
    congestion_start_index,
    congestion_end_index,
    congestion_multiplier
):
    """
    Minimal stable fixed demo pipeline.
    Incoming request fields are ignored for now.
    """

    # ============================================================
    # STEP 1: Fixed demo coordinates
    # ============================================================
    # Evergreen, East San Jose
    start_lat = 37.2940
    start_lon = -121.7800

    # San Jose Mineta International Airport
    end_lat = 37.3639
    end_lon = -121.9289

    # ============================================================
    # STEP 2: Build a local graph around the two points
    # ============================================================
    center_lat = (start_lat + end_lat) / 2
    center_lon = (start_lon + end_lon) / 2

    G = ox.graph_from_point(
        (center_lat, center_lon),
        dist=12000,
        network_type="drive"
    )

    G = ox.truncate.largest_component(G, strongly=False)
    add_travel_time(G)

    if len(G.nodes) == 0:
        raise ValueError("Graph contains no nodes.")

    # ============================================================
    # STEP 3: Snap fixed coordinates to nearest graph nodes
    # ============================================================
    source = ox.distance.nearest_nodes(G, X=start_lon, Y=start_lat)
    target = ox.distance.nearest_nodes(G, X=end_lon, Y=end_lat)

    source = int(source)
    target = int(target)

    if source == target:
        raise ValueError("Start and end map to the same node.")

    # ============================================================
    # STEP 4: Compute shortest path using NetworkX
    # ============================================================
    G_simple = to_simple_digraph(G)

    if not nx.has_path(G_simple, source, target):
        raise ValueError("No path found between source and target.")

    original_path = nx.shortest_path(
        G_simple,
        source=source,
        target=target,
        weight="travel_time"
    )

    original_cost = nx.shortest_path_length(
        G_simple,
        source=source,
        target=target,
        weight="travel_time"
    )

    original_path = [int(node) for node in original_path]
    original_cost = float(original_cost)
    original_coordinates = path_to_coordinates(G, original_path)

    # ============================================================
    # STEP 5: Compute route distance and duration summary
    # ============================================================
    original_distance_meters = compute_path_distance_meters(G_simple, original_path)
    original_distance_miles = original_distance_meters / 1609.344

    original_duration_seconds = original_cost
    original_duration_minutes = original_duration_seconds / 60.0

    # ============================================================
    # STEP 6: Return stable response
    # ============================================================
    return {
        "source": source,
        "target": target,
        "original_path": original_path,
        "original_cost": original_cost,
        "original_node_count": len(original_path),
        "original_coordinates": original_coordinates,
        "original_distance_meters": float(original_distance_meters),
        "original_distance_miles": float(original_distance_miles),
        "original_duration_seconds": float(original_duration_seconds),
        "original_duration_minutes": float(original_duration_minutes),
        "alternative_paths": [],
        "did_route_change": False
    }