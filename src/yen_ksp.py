"""
Yen's K-Shortest Paths Algorithm Implementation

This module implements Yen's algorithm to find the k shortest loopless paths
between a source and target node in a weighted directed graph.

Reference:
    Yen, J. Y. (1971). Finding the k shortest loopless paths in a network.
    Management Science, 17(11), 712-716.
"""

import heapq
import copy


def dijkstra_shortest_path(G, source, target, excluded_edges=None):
    """
    Find the shortest path from source to target using Dijkstra's algorithm.
    
    Args:
        G: NetworkX MultiDiGraph
        source: Source node
        target: Target node
        excluded_edges: Set of (u, v) tuples representing edges to exclude
        
    Returns:
        tuple: (path, total_cost)
            path: List of nodes representing the shortest path
            total_cost: Total travel time of the path
    """
    if excluded_edges is None:
        excluded_edges = set()
    
    dist = {}
    prev = {}
    
    # Initialize distances
    for node in G.nodes:
        dist[node] = float("inf")
        prev[node] = None
    
    dist[source] = 0.0
    min_heap = [(0.0, source)]
    
    while min_heap:
        current_dist, current_node = heapq.heappop(min_heap)
        
        # Skip if we've already found a better path
        if current_dist > dist[current_node]:
            continue
        
        # Early termination if we reached the target
        if current_node == target:
            break
        
        # Explore neighbors
        for neighbor in G.successors(current_node):
            # Skip excluded edges
            if (current_node, neighbor) in excluded_edges:
                continue
            
            edge_dict = G[current_node][neighbor]
            
            # Find minimum weight among parallel edges
            min_weight = float("inf")
            for key in edge_dict:
                data = edge_dict[key]
                if isinstance(data, dict):
                    weight = data.get("travel_time", float("inf"))
                else:
                    weight = data  # Direct value (int or float)
                if weight < min_weight:
                    min_weight = weight
            
            new_dist = current_dist + min_weight
            
            if new_dist < dist[neighbor]:
                dist[neighbor] = new_dist
                prev[neighbor] = current_node
                heapq.heappush(min_heap, (new_dist, neighbor))
    
    # Reconstruct path
    path = []
    if dist[target] == float("inf"):
        return path, float("inf")
    
    cur = target
    while cur is not None:
        path.append(cur)
        cur = prev[cur]
    
    path.reverse()
    return path, dist[target]


def yen_k_shortest_paths(G, source, target, K):
    """
    Find K shortest loopless paths from source to target using Yen's algorithm.
    
    Algorithm Overview:
        1. Find the shortest path (using Dijkstra)
        2. For k=2 to K:
            a. For each node in the (k-1)th path:
                - Remove edges used by previous paths with the same root path
                - Find shortest path from current node to target
                - Add this candidate path to potential k-shortest paths
            b. Select the path with minimum cost as the k-th shortest path
    
    Args:
        G: NetworkX MultiDiGraph with 'travel_time' attribute on edges
        source: Source node
        target: Target node
        K: Number of shortest paths to find
        
    Returns:
        list: List of tuples (path, cost), sorted by cost
            Each tuple contains:
                path: List of nodes
                cost: Total travel time
    """
    # A list to store the K shortest paths
    A = []
    
    # A heap to store potential k-th shortest paths
    B = []
    
    # Find the shortest path
    shortest_path, shortest_cost = dijkstra_shortest_path(G, source, target)
    
    if not shortest_path:
        print("No path exists from source to target.")
        return A
    
    A.append((shortest_path, shortest_cost))
    
    # Find K-1 additional paths
    for k in range(1, K):
        # Get the (k-1)th shortest path
        prev_path, prev_cost = A[k - 1]
        
        # Iterate over all nodes in the previous path except the target
        for i in range(len(prev_path) - 1):
            # Spur node: the node where we branch off
            spur_node = prev_path[i]
            
            # Root path: the portion from source to spur node
            root_path = prev_path[:i + 1]
            
            # Edges to be removed temporarily
            excluded_edges = set()
            
            # Remove edges that are part of previous paths with the same root
            for path, cost in A:
                if len(path) > i and path[:i + 1] == root_path:
                    # Remove the edge going out from the spur node in this path
                    if i + 1 < len(path):
                        u = path[i]
                        v = path[i + 1]
                        excluded_edges.add((u, v))
            
            # Also remove nodes in the root path (except spur node) to avoid loops
            excluded_nodes = set(root_path[:-1])
            
            # Temporarily remove these nodes by excluding all their outgoing edges
            for node in excluded_nodes:
                for neighbor in G.successors(node):
                    excluded_edges.add((node, neighbor))
            
            # Find the spur path from spur_node to target
            spur_path, spur_cost = dijkstra_shortest_path(
                G, spur_node, target, excluded_edges
            )
            
            # If a valid spur path is found
            if spur_path:
                # Concatenate root path and spur path
                total_path = root_path[:-1] + spur_path
                
                # Calculate total cost
                total_cost = 0.0
                for j in range(len(total_path) - 1):
                    u = total_path[j]
                    v = total_path[j + 1]
                    
                    edge_dict = G[u][v]
                    min_weight = float("inf")
                    for key in edge_dict:
                        data = edge_dict[key]
                        if isinstance(data, dict):
                            weight = data.get("travel_time", float("inf"))
                        else:
                            weight = data  # Direct value (int or float)
                        if weight < min_weight:
                            min_weight = weight
                    
                    total_cost += min_weight
                
                # Add to candidate paths if not already found
                if (total_path, total_cost) not in B and (total_path, total_cost) not in A:
                    heapq.heappush(B, (total_cost, total_path))
        
        # If no more candidate paths, we're done
        if not B:
            break
        
        # Select the path with minimum cost from candidates
        best_cost, best_path = heapq.heappop(B)
        A.append((best_path, best_cost))
    
    return A


def print_k_shortest_paths(paths):
    """
    Pretty print the K shortest paths.
    
    Args:
        paths: List of (path, cost) tuples from yen_k_shortest_paths
    """
    print(f"\n{'='*60}")
    print(f"Found {len(paths)} shortest path(s):")
    print(f"{'='*60}")
    
    for rank, (path, cost) in enumerate(paths, 1):
        print(f"\nRank {rank}:")
        print(f"  Path: {' -> '.join(map(str, path))}")
        print(f"  Total travel time: {cost:.2f} seconds")
        print(f"  Number of nodes: {len(path)}")
    
    print(f"\n{'='*60}")


if __name__ == "__main__":
    # This file is meant to be imported
    # See yen_test.py for usage examples
    print("yen_ksp.py: Yen's K-Shortest Paths Algorithm")
    print("Import this module to use the functions.")