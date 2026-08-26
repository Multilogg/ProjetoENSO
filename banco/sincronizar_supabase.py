"""Sincroniza o SQLite local do ENSO com o Supabase usando a chave secreta local."""
from __future__ import annotations

import json
import os
import sqlite3
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATABASE = ROOT / "banco" / "enso.db"


def load_local_env():
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        os.environ.setdefault(name.strip(), value.strip().strip('"').strip("'"))


def request(method, endpoint, key, payload=None, prefer=None):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
    call = urllib.request.Request(endpoint, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(call, timeout=60) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        raise RuntimeError(f"Supabase retornou HTTP {error.code}: {detail}") from error


def main():
    load_local_env()
    url = os.environ.get("SUPABASE_URL", "https://ttaytuasqbncyuwxpiwq.supabase.co").rstrip("/")
    key = os.environ.get("SUPABASE_SECRET_KEY", "").strip()
    if not key or key == "cole_a_chave_secreta_aqui":
        raise SystemExit("Preencha SUPABASE_SECRET_KEY no arquivo .env antes de sincronizar.")
    if not DATABASE.exists():
        raise SystemExit("Banco local não encontrado. Importe a planilha pelo site primeiro.")

    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    rows = [dict(row) for row in connection.execute("""
        SELECT os, cliente, indicador, documento, modal, horario, status_meta,
               tipo_operacao, operacao, regime, data_operacao, tempo_os_min,
               tempo_permanencia_min, meta_min
        FROM operacoes ORDER BY id
    """)]
    latest = connection.execute("""
        SELECT arquivo, importado_em, registros, analisados, duplicados_descartados
        FROM importacoes ORDER BY id DESC LIMIT 1
    """).fetchone()
    connection.close()

    operations_endpoint = f"{url}/rest/v1/operacoes"
    imports_endpoint = f"{url}/rest/v1/importacoes"
    request("DELETE", operations_endpoint + "?id=gt.0", key)
    request("DELETE", imports_endpoint + "?id=gt.0", key)

    batch_size = 500
    for position in range(0, len(rows), batch_size):
        batch = rows[position:position + batch_size]
        request("POST", operations_endpoint, key, batch, "return=minimal")
        print(f"Enviadas {min(position + batch_size, len(rows))} de {len(rows)} operações...")

    if latest:
        request("POST", imports_endpoint, key, [dict(latest)], "return=minimal")
    print(f"Sincronização concluída: {len(rows)} operações disponíveis no Supabase.")


if __name__ == "__main__":
    main()
