import copy
import osmnx as ox

from graph_utils import load_graph, add_travel_time, find_reachable_target
from dijkstra import dijkstra_shortest_path
from congestion import apply_congestion_to_path_segment


ADDRESS = "San Jose State University, San Jose, California, USA"
DIST = 1000
CONGESTION_START_INDEX = 1
CONGESTION_END_INDEX = 4
CONGESTION_MULTIPLIER = 50.0


def main():
    print("Start downloading graph...")

    G = load_graph(ADDRESS, DIST)

    print("Download finished")
    print("Number of nodes:", len(G.nodes))
    print("Number of edges:", len(G.edges))

    print("Adding travel time to edges...")
    add_travel_time(G)
    print("Travel time added")

    node_list = list(G.nodes)
    source = node_list[0]
    target = find_reachable_target(G, source)

    print("Source:", source)
    print("Target:", target)

    if target is None:
        print("No reachable target found from source.")
        return

    original_path, original_time = dijkstra_shortest_path(G, source, target)

    print("Original shortest path:", original_path)
    print("Original total travel time:", original_time)

    fig1, ax1 = ox.plot_graph_route(
        G,
        original_path,
        route_linewidth=4,
        node_size=20,
        show=False,
        close=False
    )
    fig1.savefig("outputs/original_path.png", dpi=200, bbox_inches="tight")
    print("Original path figure saved to outputs/original_path.png")

    G_congested = copy.deepcopy(G)

    apply_congestion_to_path_segment(
        G_congested,
        original_path,
        CONGESTION_START_INDEX,
        CONGESTION_END_INDEX,
        CONGESTION_MULTIPLIER
    )

    new_path, new_time = dijkstra_shortest_path(G_congested, source, target)

    print("New shortest path:", new_path)
    print("New total travel time:", new_time)

    fig2, ax2 = ox.plot_graph_route(
        G_congested,
        new_path,
        route_linewidth=4,
        node_size=20,
        show=False,
        close=False
    )
    fig2.savefig("outputs/rerouted_path.png", dpi=200, bbox_inches="tight")
    print("Rerouted path figure saved to outputs/rerouted_path.png")

    print("----- Summary -----")
    print("Did route change:", original_path != new_path)
    print("Original total travel time:", original_time)
    print("New total travel time:", new_time)
    print("Original path node count:", len(original_path))
    print("New path node count:", len(new_path))


if __name__ == "__main__":
    main()