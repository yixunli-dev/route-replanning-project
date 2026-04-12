"""
Graph Utility Functions

This module contains helper functions for loading and preprocessing
the real-world road network used in the route replanning project.

Main responsibilities:
- Load a road network graph from OpenStreetMap using OSMnx
- Keep only the largest connected component
- Add travel time weights to edges
- Select a reachable target node from a source
"""

import osmnx as ox


def load_graph(address, dist):
    """
    Load a drivable road network centered around a given address.

    Args:
        address: String address used as the center point
        dist: Radius in meters around the address

    Returns:
        A NetworkX MultiDiGraph representing the road network

    Notes:
        - The graph is restricted to drivable roads only
        - Only the largest weakly connected component is kept
          so that route search is more likely to succeed
    """
    G = ox.graph_from_address(
        address,
        dist=dist,
        network_type="drive"
    )

    # Keep the largest weakly connected component
    # This helps avoid disconnected subgraphs that cannot be routed through
    G = ox.truncate.largest_component(G, strongly=False)

    return G


def add_travel_time(G):
    """
    Add a 'travel_time' attribute to each edge in the graph.

    Args:
        G: NetworkX MultiDiGraph

    Notes:
        - Travel time is estimated using:
              travel_time = length / speed
        - Here we use a fixed average speed of 10 m/s
          as a simplified baseline model
        - This is enough for demonstrating rerouting behavior
    """
    for u, v, k, data in G.edges(keys=True, data=True):
        length = data.get("length", 1.0)  # edge length in meters
        speed = 10.0                      # average speed in m/s
        data["travel_time"] = length / speed


def find_reachable_target(G, source):
    """
    Find a target node that is reachable from the given source node.

    Args:
        G: NetworkX MultiDiGraph
        source: Start node

    Returns:
        A reachable target node, or None if no such node exists

    Approach:
        - Perform a graph traversal starting from source
        - Collect all reachable nodes
        - Return one reachable node that is not the source itself

    Notes:
        This helper is used so that shortest path algorithms
        have a valid source-target pair for testing and demos.
    """
    visited = set()
    stack = [source]

    while stack:
        node = stack.pop()

        if node in visited:
            continue

        visited.add(node)

        # Explore outgoing neighbors because this is a directed graph
        for neighbor in G.successors(node):
            if neighbor not in visited:
                stack.append(neighbor)

    # Collect all reachable nodes except the source itself
    reachable_nodes = []
    for node in visited:
        if node != source:
            reachable_nodes.append(node)

    if len(reachable_nodes) == 0:
        return None

    # Return one reachable node as the target
    return reachable_nodes[-1]