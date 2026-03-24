import heapq
import osmnx as ox
import copy


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


def apply_congestion_to_edge(G, u, v, multiplier):
    if not G.has_edge(u, v):
        return

    edge_dict = G[u][v]
    for key in edge_dict:
        if "travel_time" in edge_dict[key]:
            edge_dict[key]["travel_time"] = edge_dict[key]["travel_time"] * multiplier


def apply_congestion_to_path_segment(G, path, start_index, end_index, multiplier):
    i = start_index
    while i < end_index and i + 1 < len(path):
        u = path[i]
        v = path[i + 1]
        print("Applying congestion to edge:", u, "->", v)
        apply_congestion_to_edge(G, u, v, multiplier)
        i += 1


print("Start downloading graph...")

G = ox.graph_from_address(
    "San Jose State University, San Jose, California, USA",
    dist=1000,
    network_type="drive"
)

print("Download finished")

G = ox.truncate.largest_component(G, strongly=False)
add_travel_time(G)

node_list = list(G.nodes)
source = node_list[0]
target = find_reachable_target(G, source)

print("Source:", source)
print("Target:", target)

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

apply_congestion_to_path_segment(G_congested, original_path, 1, 4, 50.0)

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