from flask import Flask, jsonify, request
from flask_restx import Api, Resource, fields, Namespace
import networkx as nx
from networkx.readwrite import json_graph
from flask_cors import CORS
from collections import defaultdict
import sqlite3

import unicodedata
import re


from web.gera_comunidades import detectar_comunidades
from web.llm_extensions import analyze_teacher_with_optional_llm
from web.recommendations import recommend_authors


app = Flask(__name__)
CORS(app)

grafo_cache = None

DB_PATH = "web/publicacoes.db"


def normalizar_nome(nome):
    nome = unicodedata.normalize("NFKD", nome)
    nome = "".join(c for c in nome if not unicodedata.combining(c))
    return " ".join(nome.lower().split())


def gerar_aliases(nome):
    """
    Gera algumas variações comuns:
    - nome completo
    - primeiro + último
    - primeiro + penúltimo + último
    """

    partes = normalizar_nome(nome).split()

    aliases = {normalizar_nome(nome)}

    if len(partes) >= 2:
        aliases.add(f"{partes[0]} {partes[-1]}")

    if len(partes) >= 3:
        aliases.add(f"{partes[0]} {partes[-2]} {partes[-1]}")

    return aliases


def criar_mapa_docentes(docentes):
    """
    Retorna:
        alias -> nome canônico
    """

    mapa = {}

    for docente in docentes:
        for alias in gerar_aliases(docente):
            mapa[alias] = docente

    return mapa

# Docentes do Departamento de Computacao. Os IDs internos do grafo sao sempre
# normalizados, entao mantemos esta lista em ASCII para evitar problemas de
# encoding entre CSV, SQLite e codigo-fonte.
DOCENTES_DC = {
    "Alan Demetrius Baria Valejo",
    "Fredy Valente",
    "Andre Ricardo Backes",
    "Andre Takeshi Endo",
    "Auri Marcelo Rizzo Vincenzi",
    "Delano Medeiros Beder",
    "Cesar Henrique Comin",
    "Daniel Lucredio",
    "Edilson Reis Rodrigues Kato",
    "Ednaldo Brigante Pizzolato",
    "Fabiano Cutigi Ferrari",
    "Helio Crestana Guardia",
    "Marcela Xavier Ribeiro",
}

MAPA_DOCENTES = criar_mapa_docentes(DOCENTES_DC)
DOCENTES_DC_IDS = {normalizar_nome(nome) for nome in DOCENTES_DC}


def canonicalizar_autor(nome):
    nome_normalizado = normalizar_nome(nome)
    docente_canonico = MAPA_DOCENTES.get(nome_normalizado)

    if docente_canonico:
        return {
            "id": normalizar_nome(docente_canonico),
            "label": docente_canonico,
            "dc": True,
        }

    return {
        "id": nome_normalizado,
        "label": " ".join(str(nome).strip().split()),
        "dc": False,
    }


###########################
# GERAÇÃO e ANÁLISE do grafo
###########################

###########################
# GERAÇÃO e ANÁLISE do grafo
###########################

STOPWORDS = set([
    # Preposições e artigos PT
    'de', 'do', 'da', 'dos', 'das', 'e', 'em', 'para', 'com', 'por',
    'via', 'sobre', 'nos', 'nas', 'no', 'na', 'a', 'o', 'as', 'os',
    'um', 'uma', 'uns', 'umas',
    # Termos genéricos demais para virar classe
    'uma', 'este', 'esta', 'esse', 'essa', 'seu', 'sua', 'seus', 'suas',
    'novo', 'nova', 'novos', 'novas', 'dois', 'tres', 'caso', 'casos',
    'tipo', 'tipos', 'base', 'bases', 'uso', 'usos',
    # Conectivos / advérbios comuns
    'mais', 'menos', 'muito', 'pouco', 'bem', 'mal', 'quando', 'onde',
    'como', 'que', 'qual', 'quais', 'entre', 'ate', 'apos', 'antes',
])

def extract_keywords(titulo: str) -> set[str]:
    """
    Extrai palavras-chave relevantes de um título de publicação.

    Heurísticas aplicadas:
    - Converte para minúsculas e remove acentos
    - Remove pontuação e caracteres especiais
    - Filtra stopwords
    - Filtra tokens muito curtos (< 4 chars), exceto siglas em maiúsculas (ex: 'HIV', 'NLP')
    - Remove sufixos de plural simples para normalizar ('modelos' -> 'modelo')
    - Descarta tokens puramente numéricos
    """
    if not titulo:
        return set()

    # Preserva siglas antes de lowercasing (sequências de 2-5 letras maiúsculas)
    siglas = set(re.findall(r'\b[A-Z]{2,5}\b', titulo))

    # Normaliza: minúsculas + remove acentos
    texto = titulo.lower()
    texto = unicodedata.normalize('NFKD', texto)
    texto = ''.join(c for c in texto if not unicodedata.combining(c))

    # Remove tudo que não for letra ou espaço
    texto = re.sub(r'[^a-z0-9 ]', ' ', texto)

    tokens = texto.split()

    keywords = set()
    for token in tokens:
        # Descarta números puros
        if token.isdigit():
            continue
        # Descarta stopwords
        if token in STOPWORDS:
            continue
        # Aceita siglas (vindas do texto original)
        if token.upper() in siglas:
            keywords.add(token.upper())
            continue
        # Descarta tokens curtos
        if len(token) < 4:
            continue
        # Normalização leve de plural (apenas sufixos mais comuns em PT)
        if token.endswith('ções'):
            token = token[:-4] + 'cao'  # redes -> rede etc não se aplica, mas "soluções"->"solucao"
        elif token.endswith('oes'):
            token = token[:-3] + 'ao'
        elif token.endswith('ais') and len(token) > 5:
            token = token[:-2]  # "redes neurais" -> "neural"
        elif token.endswith('es') and len(token) > 5:
            token = token[:-1]  # aproximação simples
        elif token.endswith('s') and len(token) > 5:
            token = token[:-1]

        keywords.add(token)

    return keywords


def gerar_grafo_sqlite():
    G = nx.Graph()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT p.id, p.titulo, p.ano, d.nome
        FROM publicacao p
        JOIN publicacao_docente pd ON p.id = pd.publicacao_id
        JOIN docente d ON d.id = pd.docente_id
    """)

    dados = cursor.fetchall()
    conn.close()

    # Agrupa docentes por publicação
    pub_coautores: dict = defaultdict(lambda: {"ano": None, "titulo": None, "coautores": []})

    for pub_id, titulo, ano, nome_docente in dados:
        pub_coautores[pub_id]["id"]      = pub_id
        pub_coautores[pub_id]["titulo"]  = titulo
        pub_coautores[pub_id]["ano"]     = ano
        pub_coautores[pub_id]["coautores"].append(nome_docente)

    # Constrói grafo
    for publicacao in pub_coautores.values():

        ano      = publicacao["ano"]
        titulo   = publicacao["titulo"]
        coautores = publicacao["coautores"]

        # 1️⃣  Extrai keywords do título ANTES de mexer nos nós
        keywords = extract_keywords(titulo)

        # 2️⃣  Normaliza/canonicaliza nomes (sem duplicatas)
        docentes_pub = []
        metadados_autores = {}
        for autor in coautores:
            autor_info = canonicalizar_autor(autor)
            autor_id = autor_info["id"]

            if autor_id not in metadados_autores:
                metadados_autores[autor_id] = autor_info

            if autor_id not in docentes_pub:
                docentes_pub.append(autor_id)

        # 3️⃣  Cria ou ATUALIZA os nós acumulando classes de todas as publicações
        for docente in docentes_pub:
            autor_info = metadados_autores[docente]

            if not G.has_node(docente):
                G.add_node(
                    docente,
                    label=autor_info["label"],
                    dc=autor_info["dc"],
                    classes=set()
                )
            elif autor_info["dc"]:
                G.nodes[docente]["dc"] = True
                G.nodes[docente]["label"] = autor_info["label"]

            # Acumula as keywords deste título nas classes do docente
            G.nodes[docente]["classes"].update(keywords)

        # 4️⃣  Cria ou atualiza arestas
        for i in range(len(docentes_pub)):
            for j in range(i + 1, len(docentes_pub)):
                a1, a2 = docentes_pub[i], docentes_pub[j]

                if G.has_edge(a1, a2):
                    G[a1][a2]["peso"] += 1
                    G[a1][a2]["publicacoes"].append({"ano": ano, "titulo": titulo})
                else:
                    G.add_edge(a1, a2, peso=1, publicacoes=[{"ano": ano, "titulo": titulo}])

    # Converte sets para listas (mais fácil de serializar depois)
    for _, data in G.nodes(data=True):
        data["classes"] = list(data["classes"])

    return G




def processar_grafo():
    global grafo_cache

    if grafo_cache is None:
        print("Gerando grafo a partir do SQLite...")
        grafo_cache = gerar_grafo_sqlite()

        print("Detectando comunidades (Louvain)...")
        comunidades = detectar_comunidades(grafo_cache)

        for no, comunidade in comunidades.items():
            grafo_cache.nodes[no]["comunidade"] = comunidade

    # Estatísticas
    num_nos = grafo_cache.number_of_nodes()
    num_arestas = grafo_cache.number_of_edges()

    comunidades_set = set(nx.get_node_attributes(grafo_cache, "comunidade").values())
    num_comunidades = len(comunidades_set)

    from collections import Counter
    contagem = Counter(nx.get_node_attributes(grafo_cache, "comunidade").values())

    tamanho_medio = sum(contagem.values()) / num_comunidades if num_comunidades else 0

    graus = [grafo_cache.degree(n) for n in grafo_cache.nodes()]
    grau_max = max(graus) if graus else 0
    grau_medio = sum(graus) / len(graus) if graus else 0
    grau_min = min(graus) if graus else 0

    info = {
        "num_nos": num_nos,
        "num_arestas": num_arestas,
        "num_comunidades": num_comunidades,
        "tamanho_medio_comunidade": tamanho_medio,
        "grau_maximo": grau_max,
        "grau_medio": grau_medio,
        "grau_minimo": grau_min,
    }

    return grafo_cache, info


def calcular_info_grafo(grafo):
    num_nos = grafo.number_of_nodes()
    num_arestas = grafo.number_of_edges()
    graus = [grafo.degree(n) for n in grafo.nodes()]
    comunidades_set = set(nx.get_node_attributes(grafo, "comunidade").values())
    num_comunidades = len(comunidades_set)

    return {
        "num_nos": num_nos,
        "num_arestas": num_arestas,
        "num_comunidades": num_comunidades,
        "tamanho_medio_comunidade": (num_nos / num_comunidades) if num_comunidades else 0,
        "grau_maximo": max(graus) if graus else 0,
        "grau_medio": sum(graus) / len(graus) if graus else 0,
        "grau_minimo": min(graus) if graus else 0,
    }


def formatar_grafo(grafo, info=None):
    data = json_graph.node_link_data(grafo)

    return {
        "nodes": [
            {
                "id": node["id"],
                "label": node.get("label", str(node["id"])),
                "comunidade": node.get("comunidade", -1),
                "dc_ufscar": node.get("dc", False),
                "classes": node.get("classes", [])
            }
            for node in data["nodes"]
        ],
        "edges": [
            {
                "source": edge["source"],
                "target": edge["target"],
                "weight": edge.get("peso", edge.get("weight", 1)),
                "publicacoes": edge.get("publicacoes", [])
            }
            for edge in data["edges"]
        ],
        "info": info if info is not None else calcular_info_grafo(grafo)
    }


def autores_ordenados(grafo):
    autores = []

    for node_id, data in grafo.nodes(data=True):
        autores.append({
            "id": node_id,
            "label": data.get("label", node_id),
            "dc_ufscar": data.get("dc", False),
            "grau": grafo.degree(node_id),
        })

    return sorted(autores, key=lambda autor: (not autor["dc_ufscar"], autor["label"].lower()))


def filtrar_publicacoes_por_periodo(publicacoes, start_year=None, end_year=None):
    if not start_year and not end_year:
        return publicacoes

    filtradas = []
    for publicacao in publicacoes:
        try:
            ano = int(publicacao.get("ano"))
        except (TypeError, ValueError):
            continue

        if start_year and ano < start_year:
            continue
        if end_year and ano > end_year:
            continue

        filtradas.append(publicacao)

    return filtradas


def montar_subgrafo(grafo, autor_id, min_weight=1, start_year=None, end_year=None):
    autor_id = normalizar_nome(autor_id)

    if autor_id not in grafo:
        return None

    subgrafo = nx.Graph()
    subgrafo.add_node(autor_id, **grafo.nodes[autor_id])

    for vizinho in grafo.neighbors(autor_id):
        edge_data = grafo.get_edge_data(autor_id, vizinho) or {}
        publicacoes = filtrar_publicacoes_por_periodo(
            edge_data.get("publicacoes", []),
            start_year=start_year,
            end_year=end_year
        )
        peso = len(publicacoes) if publicacoes else edge_data.get("peso", 1)

        if peso < min_weight:
            continue

        subgrafo.add_node(vizinho, **grafo.nodes[vizinho])
        subgrafo.add_edge(
            autor_id,
            vizinho,
            peso=peso,
            publicacoes=publicacoes if publicacoes else edge_data.get("publicacoes", [])
        )

    return subgrafo


def filtrar_grafo_visualizacao(grafo, min_weight=1, max_nodes=None):
    if min_weight <= 1 and not max_nodes:
        return grafo

    filtrado = nx.Graph()

    for origem, destino, data in grafo.edges(data=True):
        peso = data.get("peso", data.get("weight", 1))
        if peso < min_weight:
            continue

        if not filtrado.has_node(origem):
            filtrado.add_node(origem, **grafo.nodes[origem])
        if not filtrado.has_node(destino):
            filtrado.add_node(destino, **grafo.nodes[destino])

        filtrado.add_edge(origem, destino, **data)

    if max_nodes and filtrado.number_of_nodes() > max_nodes:
        selected_nodes = sorted(
            filtrado.nodes(),
            key=lambda node: filtrado.degree(node, weight="peso"),
            reverse=True
        )[:max_nodes]
        filtrado = filtrado.subgraph(selected_nodes).copy()

    return filtrado


def calcular_intervalo_anos(grafo):
    anos = []

    for _, _, data in grafo.edges(data=True):
        for publicacao in data.get("publicacoes", []):
            try:
                anos.append(int(publicacao.get("ano")))
            except (TypeError, ValueError):
                pass

    if not anos:
        return None

    return {"min": min(anos), "max": max(anos)}



###########################
# API
###########################

api = Api(
    app, 
    title = "Universafinity",
    version = "1.0",
    description = "API para geração e análise de grafos de coautoria e afinidade em campos de pesquisa",
    doc = "/docs",
)

# Modelos do swagger ( para mostrar ao usuário qual resposta ele deve sseperar)
node_model = api.model("Node", {
    "id": fields.String,
    "label": fields.String,
    "comunidade": fields.Integer,
    "dc_ufscar": fields.Boolean,
    "classes": fields.List(fields.String)
})

edge_model = api.model("Edge", {
    "source": fields.String,
    "target": fields.String,
    "weight": fields.Integer,
    "publicacoes": fields.List(fields.Nested({
        "ano": fields.Integer,
        "titulo": fields.String
    }))
})

info_model = api.model("GraphInfo", {
    "num_nos": fields.Integer,
    "num_arestas": fields.Integer,
    "num_comunidades": fields.Integer,
    "tamanho_medio_comunidade": fields.Float,
    "grau_maximo": fields.Integer,
    "grau_medio": fields.Float,
    "grau_minimo": fields.Integer
})

graph_model = api.model("GraphResponse", {
    "nodes": fields.List(fields.Nested(node_model)),
    "edges": fields.List(fields.Nested(edge_model)),
    "info": fields.Nested(info_model)
})

grafo_ns = Namespace(
    "grafo",
    description="Informações gerais do grafo"
)

api.add_namespace(grafo_ns, path="/api")


# Para cada rota atribuímos uma classe com as funções necessárias para disponibilizar os dados
@grafo_ns.route("/grafo")
class Grafo(Resource):

    @grafo_ns.doc(
        summary="Retorna o grafo completo de coautoria",
        description="""
        Gera e retorna o grafo completo a partir do banco SQLite.

        ⚠️ Pode retornar muitos nós e arestas.
        Abra diretamente no navegador ou use via fetch.
        """
    )

    @grafo_ns.marshal_with(graph_model)
    def get(self):
        grafo, info = processar_grafo()
        min_weight = request.args.get("min_weight", default=1, type=int)
        max_nodes = request.args.get("max_nodes", type=int)

        grafo_visualizacao = filtrar_grafo_visualizacao(
            grafo,
            min_weight=max(1, min_weight),
            max_nodes=max_nodes if max_nodes and max_nodes > 0 else None,
        )

        if grafo_visualizacao is grafo:
            return formatar_grafo(grafo, info)

        return formatar_grafo(grafo_visualizacao)


@grafo_ns.route("/autores")
class Autores(Resource):

    @grafo_ns.doc(
        summary="Retorna um indice leve de autores para busca",
        description="Retorna IDs, nomes exibidos e grau dos autores sem enviar todas as arestas do grafo."
    )
    def get(self):
        grafo, _ = processar_grafo()
        query = normalizar_nome(request.args.get("query", ""))
        limit = request.args.get("limit", type=int) or 10000

        autores = autores_ordenados(grafo)
        if query:
            autores = [
                autor for autor in autores
                if query in autor["id"] or query in normalizar_nome(autor["label"])
            ]

        return jsonify({
            "autores": autores[:max(1, min(limit, 10000))]
        })


@grafo_ns.route("/resumo")
class Resumo(Resource):

    @grafo_ns.doc(
        summary="Retorna estatisticas gerais e um autor de exemplo",
        description="Usado pela pagina inicial para mostrar uma introducao sem baixar o grafo completo."
    )
    def get(self):
        grafo, info = processar_grafo()
        autores = autores_ordenados(grafo)
        docentes = [autor for autor in autores if autor["dc_ufscar"] and autor["grau"] > 0]
        candidatos = docentes or [autor for autor in autores if autor["grau"] > 0]
        exemplo = max(candidatos, key=lambda autor: autor["grau"]) if candidatos else None

        return jsonify({
            "info": info,
            "intervalo_anos": calcular_intervalo_anos(grafo),
            "exemplo": exemplo,
        })


@grafo_ns.route("/subgrafo/<path:autor_id>")
class SubgrafoAutor(Resource):

    @grafo_ns.doc(
        summary="Retorna o subgrafo de vizinhanca de um autor",
        description="Retorna apenas o autor pesquisado, seus coautores diretos e as arestas filtradas."
    )
    @grafo_ns.marshal_with(graph_model)
    def get(self, autor_id):
        grafo, _ = processar_grafo()
        min_weight = request.args.get("min_weight", default=1, type=int)
        start_year = request.args.get("start_year", type=int)
        end_year = request.args.get("end_year", type=int)

        subgrafo = montar_subgrafo(
            grafo,
            autor_id,
            min_weight=max(1, min_weight),
            start_year=start_year,
            end_year=end_year,
        )

        if subgrafo is None:
            return {"nodes": [], "edges": [], "info": calcular_info_grafo(nx.Graph())}

        return formatar_grafo(subgrafo)


@grafo_ns.route("/llm/docente/<path:autor_id>")
class LLMDocente(Resource):

    @grafo_ns.doc(
        summary="Prepara uma analise opcional com LLM para um docente",
        description="""
        Rota experimental e desligada por padrao. Ela nao altera o fluxo atual
        de classificacao por palavras-chave nem a recomendacao visual por grafo.

        Para conectar uma LLM futuramente:
        - UNIVERSAFFINITY_LLM_ENABLED=true
        - UNIVERSAFFINITY_LLM_ENDPOINT=<endpoint HTTP que aceite POST JSON>
        - UNIVERSAFFINITY_LLM_API_KEY=<opcional, enviada como Bearer token>
        """
    )
    def get(self, autor_id):
        grafo, _ = processar_grafo()
        autor_id = normalizar_nome(autor_id)

        return jsonify(analyze_teacher_with_optional_llm(grafo, autor_id))


@grafo_ns.route("/recomendacoes/<path:autor_id>")
class RecomendacoesAutor(Resource):

    @grafo_ns.doc(
        summary="Retorna recomendacoes deterministicas para um autor",
        description="""
        Combina tres sinais ja presentes no sistema: peso de colaboracao direta,
        classes extraidas dos titulos e quantidade de vizinhos em comum no grafo.
        Esta rota e independente da extensao futura com LLM.
        """
    )
    def get(self, autor_id):
        grafo, _ = processar_grafo()
        autor_id = normalizar_nome(autor_id)
        limit = request.args.get("limit", default=8, type=int)
        only_dc = request.args.get("only_dc", "").lower() in {"1", "true", "yes", "on"}

        recomendacoes = recommend_authors(
            grafo,
            autor_id,
            limit=limit,
            only_dc=only_dc,
        )

        if recomendacoes is None:
            return jsonify({
                "autor": None,
                "pesos": {},
                "recomendacoes": [],
            })

        return jsonify(recomendacoes)


@grafo_ns.route("/grafo_dc")
class GrafoDC(Resource):

    @grafo_ns.doc(
        summary="Retorna o grafo de coautoria entre os docentes do DC",
        description="""
        Filtra e retorna apenas os nós correspondentes aos docentes do Departamento de Computação e as conexões (arestas) entre eles.
        """
    )

    @grafo_ns.marshal_with(graph_model)
    def get(self):
        grafo, _ = processar_grafo()
        
        # Filtrar os nós
        nos_dc = [n for n in grafo.nodes() if n in DOCENTES_DC_IDS]
        subgrafo = grafo.subgraph(nos_dc)
        return formatar_grafo(subgrafo)



if __name__ == "__main__":
    print("🔥 Servidor Flask rodando em http://127.0.0.1:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)
