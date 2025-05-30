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
            # descomente a linha abaixo para depuração
            # print(f"Nó: {no}, Comunidade: {comunidade}")
            grafo_cache.nodes[no]['comunidade'] = comunidade
    
    # Infos adicionais
    num_nos = grafo_cache.number_of_nodes()
    num_arestas = grafo_cache.number_of_edges()
    comunidades_set = set(nx.get_node_attributes(grafo_cache, 'comunidade').values())
    num_comunidades = len(comunidades_set)

    # Tamanho médio das comunidades
    from collections import Counter
    contagem_comunidades = Counter(nx.get_node_attributes(grafo_cache, 'comunidade').values())
    tamanho_medio_communidade = sum(contagem_comunidades.values()) / num_comunidades if num_comunidades > 0 else 0

    # Graus
    graus = [grafo_cache.degree(n) for n in grafo_cache.nodes()]
    grau_max = max(graus) if graus else 0
    grau_medio = sum(graus) / len(graus) if graus else 0
    grau_min = min(graus) if graus else 0

    info_cache = {
        "num_nos": num_nos,
        "num_arestas": num_arestas,
        "num_comunidades": num_comunidades,
        "tamanho_medio_comunidade": tamanho_medio_communidade,
        "grau_maximo": grau_max,
        "grau_medio": grau_medio,
        "grau_minimo": grau_min,
    }

    for chave, valor in info_cache.items():
        print(f"{chave}: {valor}")

    return grafo_cache, info_cache

@app.route('/api/grafo', methods=['GET'])
def get_grafo():
    grafo, info = processar_grafo()
    data = json_graph.node_link_data(grafo)

    formatted_data = {
        "nodes": [{"id": node["id"], "label": node.get("label", str(node["id"])), "comunidade": node.get("comunidade", -1)} for node in data["nodes"]],
        "edges": [{"source": edge["source"], "target": edge["target"], "weight": edge.get("peso", 1)} for edge in data["links"]],
         "info": info
    }
    return jsonify(formatted_data)

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
