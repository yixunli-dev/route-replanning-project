import heapq


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