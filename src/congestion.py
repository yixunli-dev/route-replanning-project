"""
Congestion Simulation Utilities

This module provides helper functions to simulate traffic congestion
by increasing the travel time of selected edges in the road network.

The main idea is:
- Each edge has a 'travel_time' weight
- Congestion is modeled by multiplying that weight
- A larger multiplier means slower traffic on that road segment
"""


def apply_congestion_to_edge(G, u, v, multiplier):
    """
    Apply congestion to a single directed edge.

    Args:
        G: NetworkX MultiDiGraph
        u: Start node of the edge
        v: End node of the edge
        multiplier: Factor used to increase travel time
                    Example: 3.0 means the edge becomes 3 times slower
    """
    # If the graph does not contain this directed edge, do nothing
    if not G.has_edge(u, v):
        return

    # In a MultiDiGraph, there may be multiple parallel edges
    # between the same pair of nodes, so we update all of them
    edge_dict = G[u][v]

    for key in edge_dict:
        if "travel_time" in edge_dict[key]:
            edge_dict[key]["travel_time"] = edge_dict[key]["travel_time"] * multiplier


def apply_congestion_to_path_segment(G, path, start_index, end_index, multiplier):
    """
    Apply congestion to a consecutive segment of a path.

    Args:
        G: NetworkX MultiDiGraph
        path: List of nodes representing a route
        start_index: Start index of the congested segment
        end_index: End index of the congested segment (exclusive)
        multiplier: Factor used to increase travel time

    Example:
        If path = [A, B, C, D, E]
        and start_index = 1, end_index = 3,
        then congestion is applied to:
            B -> C
            C -> D
    """
    i = start_index

    # Walk through the selected segment of the path
    while i < end_index and i + 1 < len(path):
        u = path[i]
        v = path[i + 1]

        print("Applying congestion to edge:", u, "->", v)
        apply_congestion_to_edge(G, u, v, multiplier)

        i += 1