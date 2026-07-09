# Universafinity

Universafinity e uma aplicacao para explorar relacoes de coautoria e afinidade de pesquisa entre docentes e coautores. O projeto parte das publicacoes de docentes do Departamento de Computacao da UFSCar, monta um grafo de coautoria e disponibiliza visualizacoes interativas para busca, subgrafos de docentes e uma visao geral filtravel.

## O que o projeto faz

- Coleta ou importa publicacoes com titulo, ano, local, link e coautores.
- Converte os dados de `web/publicacoes.csv` para o banco `web/publicacoes.db`.
- Constroi um grafo em que cada no representa um autor e cada aresta representa publicacoes em coautoria.
- Acumula peso nas arestas conforme o numero de publicacoes em comum.
- Detecta comunidades no grafo para colorir e organizar a visualizacao.
- Exibe uma interface React com busca por autor, filtro de peso, filtro temporal e visoes especificas para docentes e grafo geral.

## Fluxo dos dados

1. `scraper.py` mostra a estrategia original de coleta via Google Scholar: acessa o perfil de um docente, percorre publicacoes e extrai coautores de cada trabalho.
2. `web/publicacoes.csv` contem a base consolidada usada pela aplicacao web.
3. `web/importar_csv_sqlite.py` importa o CSV para `web/publicacoes.db`.
4. `web/back.py` le o SQLite, gera o grafo com NetworkX, detecta comunidades e expoe os dados via API Flask.
5. `web/front` consome a API e renderiza as visualizacoes com React, Graphology, Sigma e SVG.

## Estrutura principal

```text
.
├── scraper.py                     # Exemplo/rotina de coleta no Google Scholar
├── grafo_coautoria.py             # Geracao exploratoria de grafo a partir do scraper
├── web/
│   ├── back.py                    # API Flask e geracao do grafo a partir do SQLite
│   ├── gera_comunidades.py        # Deteccao de comunidades
│   ├── importar_csv_sqlite.py     # Importacao CSV -> SQLite
│   ├── publicacoes.csv            # Dados de publicacoes/coautores
│   ├── publicacoes.db             # Banco SQLite usado pela API
│   └── front/                     # Aplicacao React
└── iniciar.sh                     # Script simples para subir backend e frontend em Linux/macOS
```

## API

A API roda por padrao em `http://127.0.0.1:5000`.

Principais rotas:

- `GET /api/resumo`: estatisticas gerais, intervalo de anos e autor de exemplo para a pagina inicial.
- `GET /api/autores?limit=10000`: indice leve de autores para autocomplete.
- `GET /api/subgrafo/<autor_id>?min_weight=1&start_year=2000&end_year=2025`: subgrafo de vizinhanca direta de um autor.
- `GET /api/grafo?min_weight=2&max_nodes=1500`: grafo geral filtrado para visualizacao.
- `GET /api/grafo_dc`: subgrafo apenas entre docentes do Departamento de Computacao.
- `GET /docs`: documentacao Swagger gerada pelo Flask-RESTX.

## Interface web

A interface roda por padrao em `http://localhost:3000`.

Telas principais:

- `Busca`: pagina inicial com resumo do projeto, estatisticas gerais, busca por autor e um subgrafo inicial de exemplo.
- `Docentes DC`: grade de subgrafos leves em SVG para os docentes do departamento.
- `Grafo completo`: visualizacao geral em Sigma com filtros de peso minimo e limite de nos para manter o grafo interpretavel.

## Como rodar localmente

### Backend

Crie e ative um ambiente Python, se desejar, e instale as dependencias da API:

```bash
pip install -r web/requirements.txt
```

Suba o Flask a partir da raiz do repositorio:

```bash
python -m web.back
```

### Frontend

Instale as dependencias do React:

```bash
cd web/front
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm start
```

No PowerShell do Windows, se `npm` for bloqueado pela politica de execucao, use:

```powershell
npm.cmd start
```

## Recriar o banco a partir do CSV

Quando `web/publicacoes.csv` for atualizado, recrie/popule o SQLite com:

```bash
python -m web.importar_csv_sqlite
```

Execute o comando a partir da raiz do repositorio, porque os caminhos esperados sao `web/publicacoes.csv` e `web/publicacoes.db`.

## Build do frontend

Para gerar a versao de producao:

```bash
cd web/front
npm run build
```

No PowerShell:

```powershell
npm.cmd run build
```

## Observacoes de desenvolvimento

- O Google Scholar pode bloquear ou limitar scraping automatizado. O `scraper.py` deve ser tratado como etapa de coleta/experimentacao, nao como dependencia obrigatoria para abrir a aplicacao web.
- A pagina inicial evita baixar o grafo inteiro. Ela usa `/api/resumo`, `/api/autores` e `/api/subgrafo/<autor>`.
- A visualizacao do grafo completo usa filtros por padrao porque o grafo integral pode ter milhares de autores e mais de cem mil ligacoes.
- A pagina de docentes usa SVGs leves para evitar criar muitos contextos WebGL ao mesmo tempo.
- Os benchmarks do frontend aparecem no console e ajudam a inspecionar fetch, parsing, montagem do grafo e renderizacao.

## Status

O projeto esta em desenvolvimento academico. A base atual e o modelo de normalizacao de nomes podem exigir ajustes conforme novas publicacoes, aliases e docentes forem adicionados.
