import community as community_louvain
import networkx as nx

def detectar_comunidades(grafo: nx.Graph) -> dict:
    """
    Retorna um dicionário {nó: comunidade}
    """
    return community_louvain.best_partition(grafo)
