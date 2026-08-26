"""Auditoria somente leitura da base ENSO atual."""
import sqlite3
from pathlib import Path

connection = sqlite3.connect(Path(__file__).with_name("enso.db"))
connection.row_factory = sqlite3.Row
queries = {
    "importacao": "SELECT * FROM importacoes ORDER BY id DESC LIMIT 3",
    "por_mes": """SELECT substr(data_operacao,1,7) periodo, COUNT(*) total,
        SUM(status_meta='Fora da Meta') fora, MIN(data_operacao) menor,
        MAX(data_operacao) maior FROM operacoes GROUP BY periodo ORDER BY periodo""",
    "por_indicador": """SELECT indicador, COUNT(*) total,
        SUM(status_meta='Fora da Meta') fora, ROUND(AVG(tempo_os_min),1) media
        FROM operacoes GROUP BY indicador ORDER BY total DESC""",
    "modal": "SELECT modal, COUNT(*) total FROM operacoes GROUP BY modal ORDER BY total DESC",
    "dezembro": """SELECT os, cliente, indicador, modal, data_operacao,
        tempo_os_min, status_meta FROM operacoes
        WHERE CAST(strftime('%m',data_operacao) AS INTEGER)=12 ORDER BY data_operacao""",
    "qualidade": """SELECT COUNT(*) total, SUM(data_operacao IS NULL) sem_data,
        SUM(tempo_os_min IS NULL) sem_tempo, SUM(tempo_os_min<0) tempo_negativo,
        SUM(indicador='OUTROS') outros FROM operacoes""",
    "carregamento_1_semestre_excecoes": """SELECT os, cliente, modal, data_operacao,
        tempo_os_min, meta_min, status_meta FROM operacoes
        WHERE indicador='CARREGAMENTO GERAL'
        AND CAST(strftime('%Y',data_operacao) AS INTEGER)=2026
        AND CAST(strftime('%m',data_operacao) AS INTEGER) BETWEEN 1 AND 6
        AND status_meta NOT IN ('Dentro da Meta','Fora da Meta')""",
    "carregamento_1_semestre_reconciliacao": """SELECT COUNT(*) total,
        SUM(tempo_os_min IS NOT NULL AND tempo_os_min>=0) analisaveis,
        SUM(tempo_os_min<=meta_min AND tempo_os_min>=0) dentro_calculado,
        SUM(tempo_os_min>meta_min) fora_calculado,
        SUM(status_meta='Dentro da Meta') dentro_status,
        SUM(status_meta='Fora da Meta') fora_status
        FROM operacoes WHERE indicador='CARREGAMENTO GERAL'
        AND CAST(strftime('%Y',data_operacao) AS INTEGER)=2026
        AND CAST(strftime('%m',data_operacao) AS INTEGER) BETWEEN 1 AND 6""",
}
for name, query in queries.items():
    print(f"\n## {name}")
    for row in connection.execute(query):
        print(dict(row))
connection.close()
