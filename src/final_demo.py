"""
Final Demo: Real-Time Route Replanning with K Alternative Paths

This script demonstrates the complete workflow of the project:

1. Load real-world road network using OSMnx
2. Compute initial shortest path using Dijkstra
3. Simulate congestion by modifying edge weights
4. Generate K alternative paths using Yen's algorithm
5. Compare and visualize different routes

This file serves as the main entry point for the project demo.
"""

import copy
import osmnx as ox
import matplotlib.pyplot as plt

from graph_utils import load_graph, add_travel_time, find_reachable_target
from congestion import apply_congestion_to_path_segment
from dijkstra import dijkstra_shortest_path
from yen_ksp import yen_k_shortest_paths, print_k_shortest_paths


# ================================
# Configuration Parameters
# ================================
ADDRESS = "San Jose State University, San Jose, California, USA"
DIST = 1000   # Graph radius in meters
K = 3         # Number of alternative paths

# Congestion settings
CONGESTION_START_INDEX = 1
CONGESTION_END_INDEX = 4
CONGESTION_MULTIPLIER = 50.0


def visualize_paths_comparison(G, original_path, k_paths, filename):
    """
    Visualize the original path and K alternative paths on the same map.

    Args:
        G: Road network graph
        original_path: Path before congestion
        k_paths: List of (path, cost) tuples
        filename: Output image filename
    """
    fig, ax = plt.subplots(figsize=(16, 12))

    # Draw base map
    ox.plot_graph(
        G,
        ax=ax,
        node_size=0,
        edge_linewidth=0.5,
        edge_color="gray",
        show=False,
        close=False
    )

    # Draw original path (black dashed)
    if original_path and len(original_path) > 1:
        ox.plot_graph_route(
            G,
            original_path,
            ax=ax,
            route_linewidth=3,
            route_color="black",
            route_alpha=0.4,
            orig_dest_size=0,
            show=False,
            close=False
        )

    # Draw alternative paths
    colors = ["red", "blue", "green", "orange", "purple"]

    for idx, (path, cost) in enumerate(k_paths[:5]):
        if len(path) > 1:
            ox.plot_graph_route(
                G,
                path,
                ax=ax,
                route_linewidth=4,
                route_color=colors[idx % len(colors)],
                route_alpha=0.7,
                orig_dest_size=0,
                show=False,
                close=False
            )

    # Legend
    legend_elements = []

    if original_path:
        legend_elements.append(
            plt.Line2D([0], [0], color="black", linewidth=3,
                       linestyle="--", label="Original path")
        )

    for idx, (path, cost) in enumerate(k_paths[:5]):
        legend_elements.append(
            plt.Line2D([0], [0],
                       color=colors[idx % len(colors)],
                       linewidth=4,
                       label=f"Alternative {idx + 1} ({cost:.1f}s)")
        )

    ax.legend(handles=legend_elements, loc="upper right", fontsize=10)
    ax.set_title("Original Route vs K Alternative Paths", fontsize=14)

    plt.tight_layout()
    plt.savefig(filename, dpi=200, bbox_inches="tight")
    plt.close()


def main():
    """
    Main function that runs the complete route replanning pipeline.
    """
    print("=" * 70)
    print("REAL-TIME ROUTE REPLANNING WITH K ALTERNATIVE PATHS")
    print("=" * 70)

    # ============================================================
    # STEP 1: Load Road Network
    # ============================================================
    print("\n[STEP 1] Loading road network...")
    G = load_graph(ADDRESS, DIST)

    print("Download finished")
    print("Number of nodes:", len(G.nodes))
    print("Number of edges:", len(G.edges))

    # ============================================================
    # STEP 2: Add Travel Time Weights
    # ============================================================
    print("\n[STEP 2] Adding travel time...")
    add_travel_time(G)
    print("Travel time added")

    # ============================================================
    # STEP 3: Select Source and Target
    # ============================================================
    print("\n[STEP 3] Selecting source and target...")
    node_list = list(G.nodes)
    source = node_list[0]
    target = find_reachable_target(G, source)

    print("Source:", source)
    print("Target:", target)

    if target is None:
        print("No reachable target found.")
        return

    # ============================================================
    # STEP 4: Compute Original Shortest Path
    # ============================================================
    print("\n[STEP 4] Computing original shortest path...")
    original_path, original_cost = dijkstra_shortest_path(G, source, target)

    if not original_path:
        print("No original path found.")
        return

    print("Original shortest path:", original_path)
    print("Original total travel time:", original_cost)

    # Save original path visualization
    fig1, ax1 = ox.plot_graph_route(
        G,
        original_path,
        route_linewidth=4,
        node_size=20,
        show=False,
        close=False
    )
    fig1.savefig("outputs/final_original_path.png", dpi=200, bbox_inches="tight")
    print("Saved: outputs/final_original_path.png")

    # ============================================================
    # STEP 5: Apply Congestion
    # ============================================================
    print("\n[STEP 5] Applying congestion...")

    # Create a copy so original graph is preserved
    G_congested = copy.deepcopy(G)

    # Simulate traffic slowdown on part of the route
    apply_congestion_to_path_segment(
        G_congested,
        original_path,
        CONGESTION_START_INDEX,
        CONGESTION_END_INDEX,
        CONGESTION_MULTIPLIER
    )

    # ============================================================
    # STEP 6: Generate K Alternative Paths
    # ============================================================
    print("\n[STEP 6] Finding K alternative paths with Yen's algorithm...")

    k_paths = yen_k_shortest_paths(G_congested, source, target, K)

    print("Number of alternative paths found:", len(k_paths))
    print_k_shortest_paths(k_paths)

    if len(k_paths) == 0:
        print("No alternative paths found.")
        return

    best_path, best_cost = k_paths[0]

    # Save best alternative
    fig2, ax2 = ox.plot_graph_route(
        G_congested,
        best_path,
        route_linewidth=4,
        node_size=20,
        show=False,
        close=False
    )
    fig2.savefig("outputs/final_best_alternative.png", dpi=200, bbox_inches="tight")
    print("Saved: outputs/final_best_alternative.png")

    # ============================================================
    # STEP 7: Visualization Comparison
    # ============================================================
    print("\n[STEP 7] Creating comparison figure...")

    visualize_paths_comparison(
        G_congested,
        original_path,
        k_paths,
        "outputs/final_k_paths_comparison.png"
    )
    print("Saved: outputs/final_k_paths_comparison.png")

    # ============================================================
    # FINAL SUMMARY
    # ============================================================
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)

    print("Original path cost (before congestion):", original_cost)
    print("Best alternative cost (after congestion):", best_cost)

    print("Did route change:", best_path != original_path)
    print("Original path node count:", len(original_path))
    print("Best alternative node count:", len(best_path))
    print("K paths returned:", len(k_paths))

    print("=" * 70)


if __name__ == "__main__":
    main()