"""
Yen's K-Shortest Paths Algorithm

This module implements Yen's algorithm to find the K shortest loopless paths
between a source and target node in a weighted directed graph.

Key idea:
1. First compute the shortest path using Dijkstra
2. Then iteratively find alternative paths by:
   - Deviating from previous paths at different nodes (spur nodes)
   - Temporarily removing edges to avoid duplicates
3. Maintain candidate paths using a priority queue
"""

import heapq
from dijkstra import dijkstra_shortest_path


def yen_k_shortest_paths(G, source, target, K):
    """
    Compute K shortest loopless paths from source to target.

    Args:
        G: NetworkX MultiDiGraph with 'travel_time' weights
        source: Start node
        target: End node
        K: Number of paths to find

    Returns:
        List of (path, cost) tuples sorted by cost

    Notes:
        - Uses Dijkstra as a subroutine
        - Ensures all paths are unique and loopless
    """
    A = []  # List of shortest paths found so far
    B = []  # Min-heap of candidate paths

    # Sets for fast duplicate checking
    seen_in_A = set()
    seen_in_B = set()

    # ------------------------------------------------------------
    # STEP 1: Find the first (shortest) path
    # ------------------------------------------------------------
    shortest_path, shortest_cost = dijkstra_shortest_path(G, source, target)

    if not shortest_path:
        print("No path exists from source to target.")
        return A

    A.append((shortest_path, shortest_cost))
    seen_in_A.add(tuple(shortest_path))

    # ------------------------------------------------------------
    # STEP 2: Iteratively find the next K-1 shortest paths
    # ------------------------------------------------------------
    for k in range(1, K):
        prev_path, prev_cost = A[k - 1]

        # Try deviating at each node in the previous path
        for i in range(len(prev_path) - 1):

            spur_node = prev_path[i]

            # Root path: prefix from source to spur node
            root_path = prev_path[:i + 1]

            # ----------------------------------------------------
            # STEP 2.1: Remove edges that would recreate old paths
            # ----------------------------------------------------
            excluded_edges = set()

            for path, cost in A:
                if len(path) > i and path[:i + 1] == root_path:
                    if i + 1 < len(path):
                        u = path[i]
                        v = path[i + 1]
                        excluded_edges.add((u, v))

            # ----------------------------------------------------
            # STEP 2.2: Remove nodes to prevent loops
            # ----------------------------------------------------
            excluded_nodes = set(root_path[:-1])

            for node in excluded_nodes:
                for neighbor in G.successors(node):
                    excluded_edges.add((node, neighbor))

            # ----------------------------------------------------
            # STEP 2.3: Find spur path from spur_node to target
            # ----------------------------------------------------
            spur_path, spur_cost = dijkstra_shortest_path(
                G, spur_node, target
            )

            if spur_path:
                # Combine root path and spur path
                total_path = root_path[:-1] + spur_path

                # Compute total cost manually
                total_cost = 0.0
                for j in range(len(total_path) - 1):
                    u = total_path[j]
                    v = total_path[j + 1]

                    edge_dict = G[u][v]
                    min_weight = float("inf")

                    for key in edge_dict:
                        data = edge_dict[key]
                        weight = data.get("travel_time", float("inf"))

                        if weight < min_weight:
                            min_weight = weight

                    total_cost += min_weight

                # ------------------------------------------------
                # STEP 2.4: Avoid duplicate paths
                # ------------------------------------------------
                path_key = tuple(total_path)

                if path_key not in seen_in_A and path_key not in seen_in_B:
                    heapq.heappush(B, (total_cost, total_path))
                    seen_in_B.add(path_key)

        # --------------------------------------------------------
        # STEP 2.5: Select the best candidate path
        # --------------------------------------------------------
        if not B:
            break

        best_cost, best_path = heapq.heappop(B)
        A.append((best_path, best_cost))
        seen_in_A.add(tuple(best_path))

    return A


def print_k_shortest_paths(k_paths):
    """
    Pretty-print K shortest paths.

    Args:
        k_paths: List of (path, cost) tuples
    """
    print("\n" + "=" * 60)
    print(f"Found {len(k_paths)} shortest path(s):")
    print("=" * 60)

    for idx, (path, cost) in enumerate(k_paths):
        print(f"\nRank {idx + 1}:")
        print("  Path:", " -> ".join(map(str, path)))
        print(f"  Total travel time: {cost:.2f} seconds")
        print(f"  Number of nodes: {len(path)}")

    print("\n" + "=" * 60)