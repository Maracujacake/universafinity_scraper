from flask import Flask, jsonify
from flask_restx import Api, Resource, fields, Namespace
import networkx as nx
from networkx.readwrite import json_graph
from flask_cors import CORS
import sqlite3

from web.gera_comunidades import detectar_comunidades


app = Flask(__name__)
CORS(app)

grafo_cache = None

DB_PATH = "web/publicacoes.db"

# Docentes do Departamento de Computação
DOCENTES_DC = {"Alan Valejo"}




###########################
# GERAÇÃO e ANÁLISE do grafo
###########################

def gerar_grafo_sqlite():
    G = nx.Graph()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Busca todas as publicações com seus coautores
    cursor.execute("""
        SELECT p.id, d.nome
        FROM publicacao p
        JOIN publicacao_docente pd ON p.id = pd.publicacao_id
        JOIN docente d ON d.id = pd.docente_id
    """)

    dados = cursor.fetchall()
    conn.close()

    # Agrupa docentes por publicação
    from collections import defaultdict
    pub_coautores = defaultdict(list)

    for pub_id, nome_docente in dados:
        pub_coautores[pub_id].append(nome_docente)

    # Constroi grafo
    for coautores in pub_coautores.values():

        # Adicionar nós
        for autor in coautores:
            if not G.has_node(autor):
                G.add_node(autor, label=autor)

            G.nodes[autor]["dc"] = autor in DOCENTES_DC

        # Conectar coautores
        for i in range(len(coautores)):
            for j in range(i + 1, len(coautores)):

                a1, a2 = coautores[i], coautores[j]

                if G.has_edge(a1, a2):
                    G[a1][a2]["peso"] += 1
                else:
                    G.add_edge(a1, a2, peso=1)

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
    "dc_ufscar": fields.Boolean
})

edge_model = api.model("Edge", {
    "source": fields.String,
    "target": fields.String,
    "weight": fields.Integer
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
        data = json_graph.node_link_data(grafo)

        formatted = {
            "nodes": [
                {
                    "id": node["id"],
                    "label": node.get("label", str(node["id"])),
                    "comunidade": node.get("comunidade", -1),
                    "dc_ufscar": node.get("dc", False)
                }
                for node in data["nodes"]
            ],
            "edges": [
                {
                    "source": edge["source"],
                    "target": edge["target"],
                    "weight": edge.get("peso", 1)
                }
                for edge in data["edges"]
            ],
            "info": info
        }

        #flask_restx formata pra json automaticamente
        return formatted


if __name__ == "__main__":
    print("🔥 Servidor Flask rodando em http://127.0.0.1:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)