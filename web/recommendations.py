from itertools import islice


DEFAULT_RECOMMENDATION_LIMIT = 8

# Pesos simples e explicitos para manter o ranking auditavel.
COLLABORATION_WEIGHT = 3
SHARED_CLASS_WEIGHT = 2
COMMON_NEIGHBOR_WEIGHT = 1


def _node_payload(graph, node_id):
    data = graph.nodes[node_id]
    return {
        "id": node_id,
        "label": data.get("label", node_id),
        "comunidade": data.get("comunidade", -1),
        "dc_ufscar": data.get("dc", False),
        "classes": sorted(data.get("classes", [])),
    }


def _edge_weight(graph, source, target):
    if not graph.has_edge(source, target):
        return 0

    edge_data = graph.get_edge_data(source, target) or {}
    return edge_data.get("peso", edge_data.get("weight", 1))


def _candidate_pool(graph, author_id):
    """Returns direct collaborators plus second-hop authors as recommendation candidates."""
    direct_neighbors = set(graph.neighbors(author_id))
    candidates = set(direct_neighbors)

    for neighbor in direct_neighbors:
        candidates.update(graph.neighbors(neighbor))

    candidates.discard(author_id)
    return candidates, direct_neighbors


def recommend_authors(graph, author_id, limit=DEFAULT_RECOMMENDATION_LIMIT, only_dc=False):
    """Ranks authors by collaboration strength, shared title classes and common graph neighbors."""
    if author_id not in graph:
        return None

    limit = max(1, min(int(limit or DEFAULT_RECOMMENDATION_LIMIT), 30))
    author_classes = set(graph.nodes[author_id].get("classes", []))
    author_neighbors = set(graph.neighbors(author_id))
    candidates, direct_neighbors = _candidate_pool(graph, author_id)

    recommendations = []
    for candidate_id in candidates:
        candidate_data = graph.nodes[candidate_id]
        if only_dc and not candidate_data.get("dc", False):
            continue

        candidate_classes = set(candidate_data.get("classes", []))
        shared_classes = sorted(author_classes & candidate_classes)

        # Vizinhos em comum ajudam a encontrar afinidade estrutural mesmo sem aresta direta.
        common_neighbors = sorted(author_neighbors & set(graph.neighbors(candidate_id)))
        collaboration_weight = _edge_weight(graph, author_id, candidate_id)

        score = (
            collaboration_weight * COLLABORATION_WEIGHT
            + len(shared_classes) * SHARED_CLASS_WEIGHT
            + len(common_neighbors) * COMMON_NEIGHBOR_WEIGHT
        )

        if score <= 0:
            continue

        recommendation = _node_payload(graph, candidate_id)
        recommendation.update({
            "score": round(score, 2),
            "peso_colaboracao": collaboration_weight,
            "classes_em_comum": shared_classes[:20],
            "nos_em_comum": len(common_neighbors),
            "amostra_nos_em_comum": list(islice(common_neighbors, 5)),
            "colaborador_direto": candidate_id in direct_neighbors,
        })
        recommendations.append(recommendation)

    recommendations.sort(
        key=lambda item: (
            item["score"],
            item["peso_colaboracao"],
            len(item["classes_em_comum"]),
            item["nos_em_comum"],
        ),
        reverse=True,
    )

    return {
        "autor": _node_payload(graph, author_id),
        "pesos": {
            "colaboracao": COLLABORATION_WEIGHT,
            "classes_em_comum": SHARED_CLASS_WEIGHT,
            "nos_em_comum": COMMON_NEIGHBOR_WEIGHT,
        },
        "recomendacoes": recommendations[:limit],
    }
