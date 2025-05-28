from flask import Flask, jsonify
import networkx as nx
from networkx.readwrite import json_graph
import csv
from flask_cors import CORS
from web.gera_comunidades import detectar_comunidades


app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["*"],
        "methods": ["GET", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

grafo_cache = None

def gerar_grafo_csv(caminho_csv: str, max_linhas: int = 200):
    G = nx.Graph()
    with open(caminho_csv, newline='', encoding='utf-8') as csvfile:
        leitor = csv.reader(csvfile)
        for i, linha in enumerate(leitor):
            if i >= max_linhas:
                break
            if len(linha) < 4:
                continue  # Linha malformada

            coautores_str = linha[3]
            coautores = [nome.strip() for nome in coautores_str.split(";") if nome.strip()]

            # Adiciona nós
            for autor in coautores:
                if not G.has_node(autor):
                    G.add_node(autor, label=autor)

            # Conecta todos entre si
            for i in range(len(coautores)):
                for j in range(i + 1, len(coautores)):
                    a1, a2 = coautores[i], coautores[j]
                    if G.has_edge(a1, a2):
                        G[a1][a2]['peso'] += 1
                    else:
                        G.add_edge(a1, a2, peso=1)
    return G

def processar_grafo():
    global grafo_cache
    if grafo_cache is None:
        print("Lendo dados do CSV e gerando grafo de coautoria...")
        grafo_cache = gerar_grafo_csv("web/publicacoes.csv", max_linhas=200)

        print("Detectando comunidades com Louvain...")
        comunidades = detectar_comunidades(grafo_cache)

        for no, comunidade in comunidades.items():
            print(f"Nó: {no}, Comunidade: {comunidade}")
            grafo_cache.nodes[no]['comunidade'] = comunidade
    
    return grafo_cache

@app.route('/api/grafo', methods=['GET'])
def get_grafo():
    grafo = processar_grafo()
    data = json_graph.node_link_data(grafo)

    formatted_data = {
        "nodes": [{"id": node["id"], "label": node.get("label", str(node["id"])), "comunidade": node.get("comunidade", -1)} for node in data["nodes"]],
        "edges": [{"source": edge["source"], "target": edge["target"], "weight": edge.get("peso", 1)} for edge in data["links"]]
    }
    return jsonify(formatted_data)

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
