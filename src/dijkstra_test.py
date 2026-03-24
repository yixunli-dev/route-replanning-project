import heapq
import osmnx as ox


def add_travel_time(G):
    for u, v, k, data in G.edges(keys=True, data=True):
        length = data.get("length", 1.0)
        speed = 10.0
        data["travel_time"] = length / speed


def dijkstra_shortest_path(G, source, target):
    dist = {}
    prev = {}

    for node in G.nodes:
        dist[node] = float("inf")
        prev[node] = None

    dist[source] = 0.0
    min_heap = [(0.0, source)]

    while min_heap:
        current_dist, current_node = heapq.heappop(min_heap)

        if current_dist > dist[current_node]:
            continue

        if current_node == target:
            break

        for neighbor in G.successors(current_node):
            edge_dict = G[current_node][neighbor]

            min_weight = float("inf")
            for key in edge_dict:
                data = edge_dict[key]
                weight = data.get("travel_time", float("inf"))
                if weight < min_weight:
                    min_weight = weight

            new_dist = current_dist + min_weight

            if new_dist < dist[neighbor]:
                dist[neighbor] = new_dist
                prev[neighbor] = current_node
                heapq.heappush(min_heap, (new_dist, neighbor))

    path = []
    if dist[target] == float("inf"):
        return path, float("inf")

    cur = target
    while cur is not None:
        path.append(cur)
        cur = prev[cur]

    path.reverse()
    return path, dist[target]


def find_reachable_target(G, source):
    visited = set()
    stack = [source]

    while stack:
        node = stack.pop()

        if node in visited:
            continue

        visited.add(node)

        for neighbor in G.successors(node):
            if neighbor not in visited:
                stack.append(neighbor)

    reachable_nodes = []
    for node in visited:
        if node != source:
            reachable_nodes.append(node)

    if len(reachable_nodes) == 0:
        return None

    return reachable_nodes[-1]


print("Start downloading graph...")

G = ox.graph_from_address(
    "San Jose State University, San Jose, California, USA",
    dist=500,
    network_type="drive"
)

print("Download finished")
print("Original number of nodes:", len(G.nodes))
print("Original number of edges:", len(G.edges))

G = ox.truncate.largest_component(G, strongly=False)

print("After keeping largest weakly connected component:")
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
else:
    path, total_time = dijkstra_shortest_path(G, source, target)

    print("Shortest path:", path)
    print("Total travel time:", total_time)

    if len(path) > 0:
        fig, ax = ox.plot_graph_route(
            G,
            path,
            route_linewidth=4,
            node_size=20,
            show=False,
            close=False
        )

        fig.savefig("outputs/shortest_path.png", dpi=200, bbox_inches="tight")
        print("Shortest path figure saved to outputs/shortest_path.png")
    else:
        print("No path found, so no figure was saved.")