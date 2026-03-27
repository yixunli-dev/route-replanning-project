"""
Real-Time Route Replanning with K Alternative Paths

This script integrates:
1. Real road network from OSMnx
2. Initial route planning with Dijkstra
3. Congestion simulation at mid-journey
4. K alternative paths generation using Yen's algorithm
5. Comparison and ranking of alternative routes

This is the main deliverable that demonstrates the complete project.
"""

import heapq
import osmnx as ox
import matplotlib.pyplot as plt
import copy
from yen_ksp import yen_k_shortest_paths, print_k_shortest_paths


def add_travel_time(G, speed=10.0):
    """
    Add travel time attribute to all edges based on length and speed.
    
    Args:
        G: NetworkX MultiDiGraph
        speed: Average speed in m/s (default: 10 m/s = 36 km/h)
    """
    for u, v, k, data in G.edges(keys=True, data=True):
        length = data.get("length", 1.0)  # meters
        data["travel_time"] = length / speed


def find_reachable_target(G, source, min_distance=None):
    """
    Find a reachable target node from source that is far enough away.
    
    Args:
        G: NetworkX MultiDiGraph
        source: Source node
        min_distance: Minimum number of edges from source (optional)
        
    Returns:
        Target node ID, or None if no suitable target found
    """
    visited = set()
    stack = [(source, 0)]  # (node, distance)
    farthest = (None, 0)
    
    while stack:
        node, dist = stack.pop()
        
        if node in visited:
            continue
        
        visited.add(node)
        
        # Update farthest node
        if dist > farthest[1]:
            farthest = (node, dist)
        
        for neighbor in G.successors(node):
            if neighbor not in visited:
                stack.append((neighbor, dist + 1))
    
    # Return farthest node (but not source itself)
    if farthest[0] != source:
        return farthest[0]
    
    # Fallback: return any reachable node
    reachable = [n for n in visited if n != source]
    if reachable:
        return reachable[-1]
    
    return None


def apply_congestion_to_edge(G, u, v, multiplier):
    """
    Apply congestion multiplier to a specific edge.
    
    Args:
        G: NetworkX MultiDiGraph
        u: Source node of edge
        v: Target node of edge
        multiplier: Congestion multiplier (e.g., 3.0 means 3x slower)
    """
    if not G.has_edge(u, v):
        return
    
    edge_dict = G[u][v]
    for key in edge_dict:
        if "travel_time" in edge_dict[key]:
            edge_dict[key]["travel_time"] = edge_dict[key]["travel_time"] * multiplier


def apply_congestion_to_path_segment(G, path, start_index, end_index, multiplier):
    """
    Apply congestion to a segment of the path.
    
    Args:
        G: NetworkX MultiDiGraph
        path: List of nodes representing a path
        start_index: Start index of congested segment
        end_index: End index of congested segment (exclusive)
        multiplier: Congestion multiplier
    """
    print(f"\n[CONGESTION] Applying multiplier={multiplier}x to path segment:")
    i = start_index
    while i < end_index and i + 1 < len(path):
        u = path[i]
        v = path[i + 1]
        print(f"   Edge {u} -> {v}")
        apply_congestion_to_edge(G, u, v, multiplier)
        i += 1


def visualize_paths_comparison(G, original_path, k_paths, filename):
    """
    Visualize the original path and K alternative paths on the same map.
    
    Args:
        G: NetworkX MultiDiGraph
        original_path: Original path before congestion
        k_paths: List of (path, cost) tuples from Yen's algorithm
        filename: Output filename
    """
    fig, ax = plt.subplots(figsize=(16, 12))
    
    # Plot base map
    ox.plot_graph(G, ax=ax, node_size=0, edge_linewidth=0.5, 
                  edge_color='gray', show=False, close=False)
    
    # Plot original path in black (dashed)
    if original_path and len(original_path) > 1:
        ox.plot_graph_route(G, original_path, ax=ax, 
                           route_linewidth=3, route_color='black',
                           route_alpha=0.4, orig_dest_size=0,
                           show=False, close=False)
    
    # Plot K alternative paths in different colors
    colors = ['red', 'blue', 'green', 'orange', 'purple']
    for idx, (path, cost) in enumerate(k_paths[:5]):
        if len(path) > 1:
            color = colors[idx % len(colors)]
            ox.plot_graph_route(G, path, ax=ax,
                               route_linewidth=4, route_color=color,
                               route_alpha=0.7, orig_dest_size=0,
                               show=False, close=False)
    
    # Add legend
    legend_elements = []
    if original_path:
        legend_elements.append(plt.Line2D([0], [0], color='black', linewidth=3, 
                                         linestyle='--', label='Original path (before congestion)'))
    
    for idx, (path, cost) in enumerate(k_paths[:5]):
        color = colors[idx % len(colors)]
        legend_elements.append(plt.Line2D([0], [0], color=color, linewidth=4,
                                         label=f'Alternative {idx+1} (cost={cost:.1f}s)'))
    
    ax.legend(handles=legend_elements, loc='upper right', fontsize=10)
    ax.set_title('Route Comparison: Original vs Alternative Paths', fontsize=14, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(filename, dpi=200, bbox_inches='tight')
    print(f"\n[VISUALIZATION] Comparison saved to {filename}")
    plt.close()


def calculate_savings(original_cost, new_cost):
    """Calculate time savings and percentage improvement."""
    savings = original_cost - new_cost
    percentage = (savings / original_cost) * 100 if original_cost > 0 else 0
    return savings, percentage


def main():
    """
    Main function demonstrating the complete route replanning workflow.
    """
    print("="*70)
    print("REAL-TIME ROUTE REPLANNING WITH K ALTERNATIVE PATHS")
    print("="*70)
    
    # ============================================================
    # STEP 1: Load Real Road Network
    # ============================================================
    print("\n[STEP 1] Downloading road network...")
    print("   Location: San Jose State University, CA")
    print("   Radius: 1000 meters")
    
    G = ox.graph_from_address(
        "San Jose State University, San Jose, California, USA",
        dist=1000,
        network_type="drive"
    )
    
    print(f"   > Downloaded {len(G.nodes)} nodes and {len(G.edges)} edges")
    
    # Keep only largest connected component
    G = ox.truncate.largest_component(G, strongly=False)
    print(f"   > After keeping largest component: {len(G.nodes)} nodes, {len(G.edges)} edges")
    
    # Add travel time
    add_travel_time(G, speed=10.0)
    print("   > Travel time added to all edges")
    
    # ============================================================
    # STEP 2: Select Source and Target
    # ============================================================
    print("\n[STEP 2] Selecting source and target nodes...")
    node_list = list(G.nodes)
    source = node_list[0]
    target = find_reachable_target(G, source)
    
    if target is None:
        print("   [ERROR] No reachable target found. Exiting.")
        return
    
    print(f"   Source: {source}")
    print(f"   Target: {target}")
    
    # ============================================================
    # STEP 3: Calculate Original Shortest Path
    # ============================================================
    print("\n[STEP 3] Calculating original shortest path...")
    
    from yen_ksp import dijkstra_shortest_path
    original_path, original_cost = dijkstra_shortest_path(G, source, target)
    
    if not original_path:
        print("   [ERROR] No path found from source to target. Exiting.")
        return
    
    print(f"   > Original path found:")
    print(f"      - Nodes: {len(original_path)}")
    print(f"      - Total travel time: {original_cost:.2f} seconds")
    
    # Visualize original path
    fig1, ax1 = ox.plot_graph_route(
        G, original_path,
        route_linewidth=4, node_size=20,
        show=False, close=False
    )
    fig1.savefig("outputs/original_path.png", dpi=200, bbox_inches="tight")
    print("      - Visualization saved to outputs/original_path.png")
    
    # ============================================================
    # STEP 4: Simulate Congestion Event
    # ============================================================
    print("\n[STEP 4] Simulating congestion event...")
    
    # Create a copy of the graph for congestion simulation
    G_congested = copy.deepcopy(G)
    
    # Apply congestion to a segment of the original path
    # Simulate: driver reaches node at index 1, finds congestion ahead (index 1 to 4)
    congestion_start = 1
    congestion_end = min(4, len(original_path) - 1)
    congestion_multiplier = 50.0  # 50x slower (severe congestion)
    
    print(f"   Congestion detected at path indices [{congestion_start}, {congestion_end})")
    print(f"   Multiplier: {congestion_multiplier}x")
    
    apply_congestion_to_path_segment(
        G_congested, original_path, 
        congestion_start, congestion_end, 
        congestion_multiplier
    )
    
    # ============================================================
    # STEP 5: Generate K Alternative Paths
    # ============================================================
    print("\n[STEP 5] Generating K alternative paths using Yen's algorithm...")
    
    K = 3  # Find 3 alternative routes
    print(f"   Searching for K={K} shortest paths...")
    
    k_paths = yen_k_shortest_paths(G_congested, source, target, K)
    
    print(f"   > Found {len(k_paths)} alternative path(s)")
    
    # Print detailed results
    print_k_shortest_paths(k_paths)
    
    # ============================================================
    # STEP 6: Compare and Rank Alternatives
    # ============================================================
    print("\n[STEP 6] Comparing alternatives with original path...")
    
    if k_paths:
        best_path, best_cost = k_paths[0]
        
        print(f"\n   Original path (with congestion): ~{original_cost * 10:.2f}+ seconds")
        print(f"   Best alternative path: {best_cost:.2f} seconds")
        
        # Calculate savings
        # Note: We can't directly compare because original_cost is pre-congestion
        # But we can compare alternative paths to each other
        
        print("\n   Alternative paths ranking:")
        for rank, (path, cost) in enumerate(k_paths, 1):
            print(f"      Rank {rank}: {cost:.2f}s ({len(path)} nodes)")
        
        if len(k_paths) > 1:
            savings = k_paths[-1][1] - k_paths[0][1]
            pct = (savings / k_paths[-1][1]) * 100
            print(f"\n   > Best path is {savings:.2f}s ({pct:.1f}%) faster than worst alternative")
    
    # ============================================================
    # STEP 7: Visualize Results
    # ============================================================
    print("\n[STEP 7] Creating comparison visualization...")
    
    visualize_paths_comparison(
        G_congested, original_path, k_paths,
        "outputs/k_paths_comparison.png"
    )
    
    # Also save the best alternative path separately
    if k_paths:
        best_path, best_cost = k_paths[0]
        fig2, ax2 = ox.plot_graph_route(
            G_congested, best_path,
            route_linewidth=4, node_size=20,
            show=False, close=False
        )
        fig2.savefig("outputs/best_alternative_path.png", dpi=200, bbox_inches="tight")
        print("   > Best alternative path saved to outputs/best_alternative_path.png")
    
    # ============================================================
    # FINAL SUMMARY
    # ============================================================
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"[OK] Original path: {len(original_path)} nodes, {original_cost:.2f}s (before congestion)")
    print(f"[OK] Congestion detected: indices [{congestion_start}, {congestion_end}), {congestion_multiplier}x slower")
    print(f"[OK] Alternative paths found: {len(k_paths)}")
    
    if k_paths:
        best_path, best_cost = k_paths[0]
        print(f"[OK] Recommended route: Alternative 1 ({best_cost:.2f}s, {len(best_path)} nodes)")
        print(f"[OK] Route changed: {'Yes' if best_path != original_path else 'No'}")
    
    print("\n" + "="*70)
    print("[SUCCESS] Route replanning completed successfully!")
    print("="*70)
    
    print("\n[OUTPUT] Files generated:")
    print("   - outputs/original_path.png")
    print("   - outputs/k_paths_comparison.png")
    print("   - outputs/best_alternative_path.png")


if __name__ == "__main__":
    main()