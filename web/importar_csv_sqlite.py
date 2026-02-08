import sqlite3
import csv

CSV_PATH = "web/publicacoes.csv"
DB_PATH = "web/publicacoes.db"


def criar_tabelas(conn):
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS publicacao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT,
        ano INTEGER,
        local TEXT,
        link_externo TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS docente (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS publicacao_docente (
        publicacao_id INTEGER,
        docente_id INTEGER,
        FOREIGN KEY(publicacao_id) REFERENCES publicacao(id),
        FOREIGN KEY(docente_id) REFERENCES docente(id)
    )
    """)

    conn.commit()


def obter_docente_id(conn, nome):
    cursor = conn.cursor()

    # tenta inserir docente novo
    cursor.execute("""
        INSERT OR IGNORE INTO docente (nome)
        VALUES (?)
    """, (nome,))

    # busca id existente
    cursor.execute("""
        SELECT id FROM docente WHERE nome = ?
    """, (nome,))

    return cursor.fetchone()[0]


def importar_csv():
    conn = sqlite3.connect(DB_PATH)
    criar_tabelas(conn)

    cursor = conn.cursor()

    with open(CSV_PATH, newline="", encoding="utf-8") as csvfile:
        leitor = csv.reader(csvfile)

        # pula cabeçalho
        next(leitor)

        for linha in leitor:
            if len(linha) < 5:
                continue

            titulo, ano, local, coautores_str, link = linha
            
            # tratar ano inválido
            try:
                ano_int = int(ano)
            except:
                ano_int = None  # salva como NULL

            cursor.execute("""
                INSERT INTO publicacao (titulo, ano, local, link_externo)
                VALUES (?, ?, ?, ?)
            """, (titulo, ano_int, local, link))

            publicacao_id = cursor.lastrowid

            # coautores separados por ;
            coautores = [
                nome.strip()
                for nome in coautores_str.split(";")
                if nome.strip()
            ]

            # relacionar docentes
            for nome_docente in coautores:
                docente_id = obter_docente_id(conn, nome_docente)

                cursor.execute("""
                    INSERT INTO publicacao_docente (publicacao_id, docente_id)
                    VALUES (?, ?)
                """, (publicacao_id, docente_id))

    conn.commit()
    conn.close()

    print("✅ Banco SQLite criado e populado com sucesso!")


if __name__ == "__main__":
    importar_csv()