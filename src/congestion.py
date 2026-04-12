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