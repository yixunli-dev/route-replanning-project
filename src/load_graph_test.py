import osmnx as ox
import matplotlib.pyplot as plt

print("Start downloading graph...")

G = ox.graph_from_address(
    "San Jose State University, San Jose, California, USA",
    dist=500,
    network_type="drive"
)

print("Download finished")
print("Number of nodes:", len(G.nodes))
print("Number of edges:", len(G.edges))

fig, ax = ox.plot_graph(G, node_size=5, edge_linewidth=0.5, show=False, close=False)
plt.savefig("outputs/sanjose_graph.png", dpi=200, bbox_inches="tight")

print("Graph saved to outputs/sanjose_graph.png")

print("Adding travel time to edges...")

for u, v, k, data in G.edges(keys=True, data=True):
    length = data.get("length", 1.0)  # meters
    speed = 10.0  # m/s (先用统一速度)
    data["travel_time"] = length / speed

print("Travel time added")

# 随机打印几条 edge 看一下
count = 0
for u, v, k, data in G.edges(keys=True, data=True):
    print(data)
    count += 1
    if count == 3:
        break

node_list = list(G.nodes)

print("All nodes:")
print(node_list)

source = node_list[0]
target = node_list[-1]

print("Source:", source)
print("Target:", target)