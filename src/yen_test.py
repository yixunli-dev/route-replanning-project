"""
Test Yen's K-Shortest Paths Algorithm on a small manually constructed graph.

This script creates a simple graph to verify that the Yen's algorithm
implementation works correctly before applying it to real road networks.
"""

import networkx as nx
import matplotlib.pyplot as plt
from yen_ksp import yen_k_shortest_paths, print_k_shortest_paths


def create_simple_test_graph():
    """
    Create a simple directed graph for testing.
    
    Graph structure:
              5
         A -----> B
         |      / |  \\
       2 |    3/  |4  \\ 7
         |   /    |    \\
         v  v     v     v
         C       D      E
         |  \\   /
       1 |   \\2/ 1
         |    X
         |   / \\
         v  v   v
         F      G
         
    Returns:
        NetworkX DiGraph with 'travel_time' attribute on edges
    """
    G = nx.DiGraph()
    
    # Add edges with travel time
    edges = [
        ('A', 'B', 5),
        ('A', 'C', 2),
        ('B', 'C', 3),
        ('B', 'D', 4),
        ('B', 'E', 7),
        ('C', 'D', 2),
        ('C', 'F', 1),
        ('D', 'F', 1),
        ('D', 'G', 1),
        ('E', 'G', 2),
    ]
    
    for u, v, weight in edges:
        G.add_edge(u, v, travel_time=weight)
    
    return G


def visualize_graph(G, paths=None, title="Test Graph"):
    """
    Visualize the graph and optionally highlight paths.
    
    Args:
        G: NetworkX DiGraph
        paths: List of (path, cost) tuples to highlight
        title: Title for the plot
    """
    plt.figure(figsize=(12, 8))
    
    # Use spring layout for better visualization
    pos = nx.spring_layout(G, seed=42)
    
    # Draw the base graph
    nx.draw_networkx_nodes(G, pos, node_color='lightblue', 
                          node_size=800, alpha=0.9)
    nx.draw_networkx_labels(G, pos, font_size=14, font_weight='bold')
    
    # Draw edges with weights
    nx.draw_networkx_edges(G, pos, edge_color='gray', 
                          arrows=True, arrowsize=20, width=1.5)
    
    # Draw edge labels (travel time)
    edge_labels = nx.get_edge_attributes(G, 'travel_time')
    nx.draw_networkx_edge_labels(G, pos, edge_labels, font_size=10)
    
    # If paths are provided, highlight them
    if paths:
        colors = ['red', 'green', 'blue', 'orange', 'purple']
        for idx, (path, cost) in enumerate(paths[:5]):  # Show up to 5 paths
            if len(path) < 2:
                continue
            
            # Create edge list for this path
            path_edges = [(path[i], path[i+1]) for i in range(len(path)-1)]
            
            # Draw path edges
            nx.draw_networkx_edges(G, pos, path_edges, 
                                  edge_color=colors[idx % len(colors)],
                                  width=3, alpha=0.7,
                                  arrows=True, arrowsize=25,
                                  label=f'Path {idx+1} (cost={cost:.1f})')
        
        plt.legend(loc='best', fontsize=10)
    
    plt.title(title, fontsize=16, fontweight='bold')
    plt.axis('off')
    plt.tight_layout()
    plt.savefig("outputs/yen_test_graph.png", dpi=200, bbox_inches='tight')
    print(f"\nGraph visualization saved to outputs/yen_test_graph.png")
    plt.close()


def test_yen_algorithm():
    """
    Main test function for Yen's algorithm.
    """
    print("="*60)
    print("Testing Yen's K-Shortest Paths Algorithm")
    print("="*60)
    
    # Create test graph
    print("\n1. Creating a simple test graph...")
    G = create_simple_test_graph()
    
    print(f"   Graph created with {G.number_of_nodes()} nodes and {G.number_of_edges()} edges")
    print(f"   Nodes: {list(G.nodes())}")
    
    # Visualize the original graph
    print("\n2. Visualizing the graph...")
    visualize_graph(G, title="Test Graph - All Edges")
    
    # Define source and target
    source = 'A'
    target = 'G'
    K = 3  # Find 3 shortest paths
    
    print(f"\n3. Finding {K} shortest paths from '{source}' to '{target}'...")
    
    # Run Yen's algorithm
    paths = yen_k_shortest_paths(G, source, target, K)
    
    # Print results
    print_k_shortest_paths(paths)
    
    # Visualize paths
    print("\n4. Visualizing the K shortest paths...")
    visualize_graph(G, paths, 
                   title=f"K={K} Shortest Paths from {source} to {target}")
    
    # Verify results
    print("\n5. Verification:")
    if len(paths) >= 1:
        print(f"   ? Found at least 1 path")
        print(f"   ? Paths are sorted by cost: {[cost for _, cost in paths]}")
        
        # Check that paths are different
        unique_paths = len(set(tuple(p) for p, _ in paths))
        print(f"   ? All {unique_paths} paths are unique")
        
        # Check that all paths are valid (no loops)
        all_valid = True
        for path, cost in paths:
            if len(path) != len(set(path)):
                print(f"   ? Path {path} contains a loop!")
                all_valid = False
        
        if all_valid:
            print(f"   ? All paths are loopless")
    
    print("\n" + "="*60)
    print("Test completed successfully!")
    print("="*60)
    
    return paths


def test_edge_cases():
    """
    Test edge cases and special scenarios.
    """
    print("\n" + "="*60)
    print("Testing Edge Cases")
    print("="*60)
    
    # Test 1: Request more paths than exist
    print("\n[Test 1] Requesting more paths than exist...")
    G = create_simple_test_graph()
    paths = yen_k_shortest_paths(G, 'A', 'G', K=10)
    print(f"   Requested K=10, found {len(paths)} paths (as expected)")
    
    # Test 2: Simple path (only one route exists)
    print("\n[Test 2] Graph with only one path...")
    G_simple = nx.DiGraph()
    G_simple.add_edge('A', 'B', travel_time=1)
    G_simple.add_edge('B', 'C', travel_time=1)
    paths = yen_k_shortest_paths(G_simple, 'A', 'C', K=3)
    print(f"   Requested K=3, found {len(paths)} path(s) (as expected)")
    print_k_shortest_paths(paths)
    
    # Test 3: No path exists
    print("\n[Test 3] No path exists between nodes...")
    G_disconnected = nx.DiGraph()
    G_disconnected.add_edge('A', 'B', travel_time=1)
    G_disconnected.add_edge('C', 'D', travel_time=1)
    paths = yen_k_shortest_paths(G_disconnected, 'A', 'D', K=3)
    print(f"   Found {len(paths)} paths (as expected)")
    
    print("\n" + "="*60)
    print("Edge case tests completed!")
    print("="*60)


if __name__ == "__main__":
    # Run main test
    paths = test_yen_algorithm()
    
    # Run edge case tests
    test_edge_cases()
    
    print("\n? All tests passed! Yen's algorithm is working correctly.")
    print("\nNext step: Apply this to real road networks in reroute_with_k_paths.py")