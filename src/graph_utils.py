import osmnx as ox


def load_graph(address, dist):
    G = ox.graph_from_address(
        address,
        dist=dist,
        network_type="drive"
    )

    G = ox.truncate.largest_component(G, strongly=False)
    return G


def add_travel_time(G):
    for u, v, k, data in G.edges(keys=True, data=True):
        length = data.get("length", 1.0)
        speed = 10.0
        data["travel_time"] = length / speed


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