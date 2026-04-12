"""
Dijkstra Shortest Path Algorithm

This module implements Dijkstra's algorithm for finding the shortest path
in a weighted directed graph.

In this project:
- Nodes represent intersections or road points
- Edges represent directed road segments
- Edge weights are stored in the 'travel_time' attribute
"""

import heapq


def dijkstra_shortest_path(G, source, target):
    """
    Compute the shortest path from source to target using Dijkstra's algorithm.

    Args:
        G: NetworkX MultiDiGraph with 'travel_time' on edges
        source: Start node
        target: End node

    Returns:
        A tuple (path, total_cost)
            path: List of nodes representing the shortest route
            total_cost: Total travel time of that route

    Notes:
        - This implementation assumes non-negative edge weights
        - If no path exists, it returns ([], inf)
        - For parallel edges between the same two nodes, the minimum
          travel_time among them is used
    """
    # dist[node] stores the current best known cost from source to node
    dist = {}

    # prev[node] stores the previous node on the best path
    prev = {}

    # Initialize all nodes as unreachable
    for node in G.nodes:
        dist[node] = float("inf")
        prev[node] = None

    # Distance from source to itself is zero
    dist[source] = 0.0

    # Min-heap stores (current_cost, node)
    # This allows us to always expand the cheapest frontier node first
    min_heap = [(0.0, source)]

    while min_heap:
        current_dist, current_node = heapq.heappop(min_heap)

        # Skip outdated heap entries
        # If a better path has already been found, ignore this one
        if current_dist > dist[current_node]:
            continue

        # Early stop if target is reached
        if current_node == target:
            break

        # Explore all outgoing neighbors of the current node
        for neighbor in G.successors(current_node):
            edge_dict = G[current_node][neighbor]

            # In a MultiDiGraph, there may be multiple parallel edges
            # between current_node and neighbor.
            # We use the edge with minimum travel_time.
            min_weight = float("inf")

            for key in edge_dict:
                data = edge_dict[key]
                weight = data.get("travel_time", float("inf"))

                if weight < min_weight:
                    min_weight = weight

            # Candidate cost to reach the neighbor through current_node
            new_dist = current_dist + min_weight

            # Relaxation step:
            # If this route is better, update distance and predecessor
            if new_dist < dist[neighbor]:
                dist[neighbor] = new_dist
                prev[neighbor] = current_node
                heapq.heappush(min_heap, (new_dist, neighbor))

    # Reconstruct path from target back to source
    path = []

    # If target is still unreachable, return empty path
    if dist[target] == float("inf"):
        return path, float("inf")

    cur = target
    while cur is not None:
        path.append(cur)
        cur = prev[cur]

    # Reverse the path so it goes from source to target
    path.reverse()

    return path, dist[target]