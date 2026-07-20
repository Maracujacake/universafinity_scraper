import json
import os
import urllib.error
import urllib.request
from collections import Counter


TRUE_VALUES = {"1", "true", "yes", "on"}


def llm_enabled():
    return os.getenv("UNIVERSAFFINITY_LLM_ENABLED", "").lower() in TRUE_VALUES


def _edge_publications(graph, source, target):
    edge_data = graph.get_edge_data(source, target) or {}
    return edge_data.get("publicacoes", [])


def build_teacher_context(graph, author_id, max_coauthors=15, max_publications=30):
    """Builds a compact, provider-neutral context for a future LLM call."""
    if author_id not in graph:
        return None

    node_data = graph.nodes[author_id]
    coauthors = []
    publications_by_title = {}
    shared_topic_counter = Counter()

    for neighbor in graph.neighbors(author_id):
        edge_data = graph.get_edge_data(author_id, neighbor) or {}
        publications = _edge_publications(graph, author_id, neighbor)
        neighbor_data = graph.nodes[neighbor]
        weight = edge_data.get("peso", edge_data.get("weight", len(publications) or 1))

        for publication in publications:
            title = publication.get("titulo")
            if title and title not in publications_by_title:
                publications_by_title[title] = {
                    "titulo": title,
                    "ano": publication.get("ano"),
                }

        shared_topic_counter.update(neighbor_data.get("classes", []))

        coauthors.append({
            "id": neighbor,
            "label": neighbor_data.get("label", neighbor),
            "peso": weight,
            "dc_ufscar": neighbor_data.get("dc", False),
            "classes": sorted(neighbor_data.get("classes", []))[:20],
        })

    coauthors.sort(key=lambda item: item["peso"], reverse=True)

    return {
        "autor": {
            "id": author_id,
            "label": node_data.get("label", author_id),
            "dc_ufscar": node_data.get("dc", False),
            "comunidade": node_data.get("comunidade", -1),
            "classes_heuristicas": sorted(node_data.get("classes", []))[:40],
        },
        "coautores_mais_frequentes": coauthors[:max_coauthors],
        "publicacoes_representativas": list(publications_by_title.values())[:max_publications],
        "topicos_compartilhados_frequentes": [
            {"termo": term, "frequencia": count}
            for term, count in shared_topic_counter.most_common(25)
        ],
        "metodo_atual": (
            "O sistema atual classifica docentes por palavras-chave extraidas dos "
            "titulos e recomenda visualmente por proximidade no grafo de coautoria."
        ),
    }


def build_llm_prompt(context):
    return (
        "Voce e um assistente academico. Use apenas o contexto fornecido, sem "
        "inventar publicacoes, areas ou colaboracoes. Responda em JSON com as "
        "chaves: resumo_tematico, classes_sugeridas, recomendacoes_docentes, "
        "justificativas e limites_dos_dados.\n\n"
        "Objetivo: apoiar a classificacao tematica do docente e sugerir possiveis "
        "colaboracoes com base em coautoria, termos dos titulos e comunidades do "
        "grafo.\n\n"
        f"Contexto:\n{json.dumps(context, ensure_ascii=False, indent=2)}"
    )


def call_configured_llm(prompt, context):
    """Optional HTTP hook. It only runs when explicitly enabled by environment."""
    endpoint = os.getenv("UNIVERSAFFINITY_LLM_ENDPOINT")
    if not endpoint:
        return {
            "status": "not_configured",
            "message": (
                "Defina UNIVERSAFFINITY_LLM_ENDPOINT para conectar um provedor "
                "LLM. O endpoint deve aceitar POST JSON com prompt e contexto."
            ),
        }

    payload = json.dumps({
        "task": "teacher_recommendation_or_classification",
        "prompt": prompt,
        "contexto": context,
    }).encode("utf-8")

    headers = {"Content-Type": "application/json"}
    token = os.getenv("UNIVERSAFFINITY_LLM_API_KEY")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = urllib.request.Request(endpoint, data=payload, headers=headers, method="POST")
    timeout = float(os.getenv("UNIVERSAFFINITY_LLM_TIMEOUT", "20"))

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8")
            try:
                return {
                    "status": "ok",
                    "response": json.loads(body),
                }
            except json.JSONDecodeError:
                return {
                    "status": "ok",
                    "response_text": body,
                }
    except (urllib.error.URLError, TimeoutError) as exc:
        return {
            "status": "error",
            "message": str(exc),
        }


def analyze_teacher_with_optional_llm(graph, author_id):
    context = build_teacher_context(graph, author_id)
    if context is None:
        return {
            "habilitado": llm_enabled(),
            "status": "author_not_found",
            "contexto": None,
            "prompt_sugerido": None,
            "resultado": None,
        }

    prompt = build_llm_prompt(context)

    if not llm_enabled():
        return {
            "habilitado": False,
            "status": "disabled",
            "message": (
                "LLM desabilitada por padrao para preservar o fluxo atual. "
                "Ative com UNIVERSAFFINITY_LLM_ENABLED=true e configure um endpoint."
            ),
            "contexto": context,
            "prompt_sugerido": prompt,
            "resultado": None,
        }

    return {
        "habilitado": True,
        "status": "enabled",
        "contexto": context,
        "prompt_sugerido": prompt,
        "resultado": call_configured_llm(prompt, context),
    }
