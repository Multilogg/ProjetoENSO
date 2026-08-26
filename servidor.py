"""Servidor local do site ENSO e API de indicadores (Python 3, sem dependências)."""
from __future__ import annotations

import json
import os
import sqlite3
import tempfile
import zipfile
from email.parser import BytesParser
from email.policy import default
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from banco.importar_planilha import import_report

ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / "banco" / "enso.db"


def period_case():
    return "CASE WHEN horario>=7 AND horario<12 THEN '07h - 12h' WHEN horario>=12 AND horario<18 THEN '12h - 18h' WHEN horario>=18 AND horario<22 THEN '18h - 22h' ELSE '22h - 07h' END"


class EnsoHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        # O portal muda com frequência; impede o navegador de reutilizar HTML/JS antigos.
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/operacao-mensal":
            if not DATABASE.exists():
                return self.send_json({"erro": "Banco não encontrado."}, 503)
            database = sqlite3.connect(DATABASE)
            database.row_factory = sqlite3.Row
            analysis_year = database.execute("SELECT MAX(CAST(strftime('%Y',data_operacao) AS INTEGER)) FROM operacoes WHERE data_operacao IS NOT NULL").fetchone()[0]
            year_filter = "CAST(strftime('%Y',data_operacao) AS INTEGER) = ?"
            selected_months = [int(value) for value in parse_qs(parsed.query).get("meses", [""])[0].split(",") if value.isdigit() and 1 <= int(value) <= 12]
            operation_filter, operation_values = year_filter, [analysis_year]
            if selected_months:
                operation_filter += " AND CAST(strftime('%m',data_operacao) AS INTEGER) IN (" + ",".join("?" for _ in selected_months) + ")"
                operation_values.extend(selected_months)
            rows = [dict(row) for row in database.execute(f"""
                SELECT CAST(strftime('%m', data_operacao) AS INTEGER) mes,
                       COUNT(*) total,
                       SUM(status_meta = 'Dentro da Meta') dentro,
                       SUM(status_meta = 'Fora da Meta') fora
                FROM operacoes WHERE data_operacao IS NOT NULL AND {operation_filter}
                GROUP BY mes ORDER BY mes
            """, operation_values)]
            summary = dict(database.execute(f"""SELECT COUNT(*) total,
                SUM(status_meta='Dentro da Meta') dentro,
                SUM(status_meta='Fora da Meta') fora,
                AVG(CASE WHEN tempo_os_min>=0 THEN tempo_os_min END) tempo_medio
                FROM operacoes WHERE {operation_filter}""", operation_values).fetchone())
            modal = [dict(row) for row in database.execute(f"""SELECT modal nome, COUNT(*) total
                FROM operacoes WHERE {operation_filter} GROUP BY modal ORDER BY total DESC""", operation_values)]
            clients = [dict(row) for row in database.execute(f"""SELECT cliente, COUNT(*) total
                FROM operacoes WHERE {operation_filter} GROUP BY cliente ORDER BY total DESC, cliente LIMIT 8""", operation_values)]
            clients_total = database.execute(
                f"SELECT COUNT(DISTINCT cliente) FROM operacoes WHERE {operation_filter}", operation_values
            ).fetchone()[0] or 0
            indicators = [dict(row) for row in database.execute(f"""SELECT indicador,
                COUNT(*) total, SUM(status_meta='Dentro da Meta') dentro,
                SUM(status_meta='Fora da Meta') fora,
                AVG(CASE WHEN tempo_os_min>=0 THEN tempo_os_min END) tempo_medio
                FROM operacoes WHERE {operation_filter} AND indicador IN
                ('CARREGAMENTO GERAL','DTA','DTA-S MARITIMO','DTA-S AEREO')
                GROUP BY indicador""", operation_values)]
            database.close()
            for row in rows:
                row["dentro"] = row["dentro"] or 0
                row["fora"] = row["fora"] or 0
            analyzed = (summary["dentro"] or 0) + (summary["fora"] or 0)
            summary["aderencia"] = round((summary["dentro"] or 0) * 100 / analyzed, 1) if analyzed else 0
            for item in indicators:
                item["dentro"], item["fora"] = item["dentro"] or 0, item["fora"] or 0
                item_analyzed = item["dentro"] + item["fora"]
                item["aderencia"] = round(item["dentro"] * 100 / item_analyzed, 1) if item_analyzed else 0
            return self.send_json({"ano": analysis_year, "meses": rows, "resumo": summary, "modal": modal, "clientes": clients, "clientes_total": clients_total, "indicadores": indicators})
        if parsed.path != "/api/indicadores":
            return super().do_GET()
        if not DATABASE.exists():
            return self.send_json({"erro": "Banco não encontrado. Execute banco/importar_planilha.py."}, 503)

        params = parse_qs(parsed.query)
        indicator = params.get("indicador", ["DTA"])[0].upper()
        modal = params.get("modal", [""])[0].upper()
        period = params.get("horario", [""])[0]
        semester = params.get("semestre", [""])[0]
        search = params.get("busca", [""])[0].strip()
        month_start = params.get("mes_inicio", [""])[0]
        month_end = params.get("mes_fim", [""])[0]
        selected_months = [int(value) for value in params.get("meses", [""])[0].split(",") if value.isdigit() and 1 <= int(value) <= 12]
        where, values = ["indicador = ?"], [indicator]
        if modal:
            where.append("modal = ?"); values.append(modal)
        if period:
            where.append(f"{period_case()} = ?"); values.append(period)
        if not selected_months and semester == "1":
            where.append("CAST(strftime('%m', data_operacao) AS INTEGER) BETWEEN 1 AND 6")
        elif not selected_months and semester == "2":
            where.append("CAST(strftime('%m', data_operacao) AS INTEGER) BETWEEN 7 AND 12")
        if month_start and month_end:
            start, end = sorted((max(1, min(12, int(month_start))), max(1, min(12, int(month_end)))))
            where.append("CAST(strftime('%m', data_operacao) AS INTEGER) BETWEEN ? AND ?")
            values.extend((start, end))
        if selected_months:
            placeholders = ",".join("?" for _ in selected_months)
            where.append(f"CAST(strftime('%m', data_operacao) AS INTEGER) IN ({placeholders})")
            values.extend(selected_months)
        if search:
            where.append("cliente LIKE ?"); values.append(f"%{search}%")
        clause = " AND ".join(where)

        database = sqlite3.connect(DATABASE)
        database.row_factory = sqlite3.Row
        total = database.execute(f"SELECT COUNT(*) total, SUM(status_meta='Fora da Meta') fora FROM operacoes WHERE {clause}", values).fetchone()
        dimensions = {}
        for name, expression in (("modal", "modal"), ("horario", period_case()), ("regime", "regime")):
            dimensions[name] = [dict(row) for row in database.execute(
                f"SELECT {expression} nome, COUNT(*) total, SUM(status_meta='Fora da Meta') fora FROM operacoes WHERE {clause} GROUP BY nome ORDER BY total DESC", values
            )]
        clients = [dict(row) for row in database.execute(
            f"SELECT cliente, COUNT(*) total, SUM(status_meta='Fora da Meta') fora FROM operacoes WHERE {clause} GROUP BY cliente ORDER BY fora DESC, total DESC, cliente LIMIT 100", values
        )]
        database.close()

        def enrich(items):
            for item in items:
                item["fora"] = item["fora"] or 0
                item["percentual"] = round(item["fora"] * 100 / item["total"]) if item["total"] else 0
            return items
        total_count, outside = total["total"] or 0, total["fora"] or 0
        self.send_json({
            "indicador": indicator, "total": total_count, "fora": outside,
            "percentual": round(outside * 100 / total_count) if total_count else 0,
            "modal": enrich(dimensions["modal"]), "horario": enrich(dimensions["horario"]),
            "regime": enrich(dimensions["regime"]), "clientes": enrich(clients),
        })

    def do_POST(self):
        if urlparse(self.path).path != "/api/importar":
            return self.send_json({"erro": "Rota não encontrada."}, 404)
        length = int(self.headers.get("Content-Length", "0"))
        if not 0 < length <= 25 * 1024 * 1024:
            return self.send_json({"erro": "O arquivo deve ter no máximo 25 MB."}, 413)
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            return self.send_json({"erro": "Envie a planilha pelo formulário."}, 400)
        message = BytesParser(policy=default).parsebytes(
            f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode() + self.rfile.read(length))
        part = next((item for item in message.iter_parts()
                     if item.get_param("name", header="content-disposition") == "planilha"), None)
        filename = Path(part.get_filename() or "").name if part else ""
        if part is None or Path(filename).suffix.lower() not in (".xls", ".xlsx"):
            return self.send_json({"erro": "Selecione um arquivo .xls ou .xlsx válido."}, 400)
        fd, name = tempfile.mkstemp(suffix=Path(filename).suffix)
        try:
            with os.fdopen(fd, "wb") as stream:
                stream.write(part.get_payload(decode=True))
            result = import_report(Path(name), DATABASE)
            result["arquivo"] = filename
            return self.send_json(result)
        except (ValueError, OSError, zipfile.BadZipFile) as error:
            return self.send_json({"erro": str(error)}, 400)
        finally:
            try: os.unlink(name)
            except FileNotFoundError: pass


class EnsoServer(ThreadingHTTPServer):
    # Impede várias versões do servidor de compartilharem a porta no Windows.
    allow_reuse_address = False


if __name__ == "__main__":
    print("ENSO disponível em http://localhost:8001")
    EnsoServer(("127.0.0.1", 8001), EnsoHandler).serve_forever()
