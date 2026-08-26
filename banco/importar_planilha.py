"""Importa relatórios brutos do SARA (.xls BIFF ou .xlsx) e calcula os indicadores ENSO."""
from __future__ import annotations

import os
import re
import sqlite3
import struct
import sys
import tempfile
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main", "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
HEADER_ALIASES = {
    "os": ("O.S.", "OS"), "cliente": ("Cliente",), "documento": ("Tipo Doc.", "TipoDocumento"),
    "modal": ("Modal Ajustado", "Modal"), "inicio_os": ("Inicio da OS", "Início da OS"),
    "termino_os": ("Termino da OS", "Término da OS"), "chegada": ("Data chegada", "Data Chegada"),
    "entrada": ("Data entrada", "Data Entrada"),
    "saida": ("Data saida", "Data saída", "Data Saída"), "tipo_operacao": ("TipoOperacao", "Tipo Operacao", "Tipo Operação"),
    "operacao": ("Operacao", "Operação"), "regime": ("Regime",), "status": ("Status",), "hora": ("Hora",),
}


def _rk(value):
    divided, integer = value & 1, value & 2
    if integer: result = struct.unpack("<i", struct.pack("<I", value))[0] >> 2
    else: result = struct.unpack("<d", b"\0\0\0\0" + struct.pack("<I", value & 0xFFFFFFFC))[0]
    return result / 100 if divided else result


def biff_rows(path: Path):
    """Lê o BIFF4 plano produzido pelo exportador SARA, sem Excel instalado."""
    data, position, current, current_row = path.read_bytes(), 0, {}, None
    while position + 4 <= len(data):
        record, length = struct.unpack_from("<HH", data, position)
        body = data[position + 4:position + 4 + length]; position += 4 + length
        if record == 0x0204:
            row, column, _xf, size = struct.unpack_from("<HHHH", body); value = body[8:8 + size].decode("cp1252", "replace").strip()
        elif record == 0x0203:
            row, column, _xf = struct.unpack_from("<HHH", body); value = struct.unpack_from("<d", body, 6)[0]
        elif record == 0x027E:
            row, column, _xf, packed = struct.unpack_from("<HHHI", body); value = _rk(packed)
        else: continue
        if current_row is not None and row != current_row:
            yield current; current = {}
        current_row = row; current[column] = value
    if current: yield current


def xlsx_rows(path: Path):
    with zipfile.ZipFile(path) as archive:
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml")); shared = ["".join(item.itertext()).strip() for item in root.findall("m:si", NS)]
        workbook = ET.fromstring(archive.read("xl/workbook.xml")); relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        links = {item.attrib["Id"]: item.attrib["Target"] for item in relationships}
        sheets = list(workbook.find("m:sheets", NS))
        sheet = next((item for item in sheets if item.attrib["name"].strip().casefold().startswith("basedados")), sheets[0])
        target = links[sheet.attrib[f"{{{NS['r']}}}id"]].lstrip("/"); target = target if target.startswith("xl/") else "xl/" + target
        root = ET.fromstring(archive.read(target))
        for row in root.findall(".//m:sheetData/m:row", NS):
            values = {}
            for cell in row.findall("m:c", NS):
                letters = re.match(r"[A-Z]+", cell.attrib["r"]).group(0)
                column = sum((ord(char) - 64) * 26 ** index for index, char in enumerate(reversed(letters))) - 1
                kind, node = cell.attrib.get("t"), cell.find("m:v", NS); value = ""
                if kind == "inlineStr": value = "".join(cell.itertext()).strip()
                elif node is not None:
                    value = node.text or ""
                    if kind == "s": value = shared[int(value)]
                values[column] = value
            yield values


def _text(value): return str(value).strip() if value is not None else ""


def _order_number(value):
    """Normaliza a O.S. como o Excel faz ao tratar identificadores numéricos."""
    text = _text(value)
    return re.sub(r"\.0+$", "", text) if re.fullmatch(r"\d+\.0+", text) else text


def _date(value):
    text = _text(value)
    for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y", "%Y-%m-%d"):
        try: return datetime.strptime(text, fmt)
        except ValueError: pass
    try: return datetime(1899, 12, 30) + timedelta(days=float(value))
    except (TypeError, ValueError, OverflowError): return None


def _columns(header):
    normalized = {_text(value).casefold(): column for column, value in header.items()}; found = {}
    for key, aliases in HEADER_ALIASES.items():
        for alias in aliases:
            if alias.casefold() in normalized: found[key] = normalized[alias.casefold()]; break
    missing = [key for key in ("os", "cliente", "documento", "modal", "inicio_os", "termino_os") if key not in found]
    if missing: raise ValueError("Colunas obrigatórias não encontradas: " + ", ".join(missing))
    return found


def _goal(indicator, operation_date):
    first = {"CARREGAMENTO GERAL": 40, "DTA": 110, "DTA-S MARITIMO": 150, "DTA-S AEREO": 100}
    second = {"CARREGAMENTO GERAL": 35, "DTA": 70, "DTA-S MARITIMO": 110, "DTA-S AEREO": 65}
    return (second if operation_date and operation_date.month >= 7 else first).get(indicator)


def import_report(source: Path, output: Path):
    source, output = Path(source), Path(output)
    with source.open("rb") as stream: signature = stream.read(2)
    rows = iter(xlsx_rows(source) if signature == b"PK" else biff_rows(source)); header = next(rows, None)
    if not header: raise ValueError("A planilha está vazia.")
    columns = _columns(header); output.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix="enso-", suffix=".db", dir=output.parent); os.close(fd)
    connection = sqlite3.connect(temporary)
    connection.executescript("""
        CREATE TABLE operacoes (id INTEGER PRIMARY KEY, os TEXT, cliente TEXT, indicador TEXT, documento TEXT, modal TEXT,
          horario REAL, status_meta TEXT, tipo_operacao TEXT, operacao TEXT, regime TEXT, data_operacao TEXT,
          tempo_os_min REAL, tempo_permanencia_min REAL, meta_min REAL);
        CREATE INDEX idx_indicador ON operacoes(indicador); CREATE INDEX idx_modal ON operacoes(modal);
        CREATE INDEX idx_cliente ON operacoes(cliente); CREATE INDEX idx_status ON operacoes(status_meta);
        CREATE TABLE importacoes (id INTEGER PRIMARY KEY, arquivo TEXT, importado_em TEXT, registros INTEGER,
          analisados INTEGER, duplicados_descartados INTEGER);
    """)
    insert = "INSERT INTO operacoes(os,cliente,indicador,documento,modal,horario,status_meta,tipo_operacao,operacao,regime,data_operacao,tempo_os_min,tempo_permanencia_min,meta_min) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    records, analyzed, duplicated = [], 0, 0
    seen_orders = set()
    for row in rows:
        get = lambda key: row.get(columns[key], "") if key in columns else ""
        order_number = _order_number(get("os"))
        if not order_number:
            continue
        # A BaseDados do Excel possui uma linha por O.S. O relatório bruto pode
        # repetir a mesma O.S. integralmente; repetições não entram nos CONT.SES.
        order_key = order_number.casefold()
        if order_key in seen_orders:
            duplicated += 1
            continue
        seen_orders.add(order_key)
        document, modal, operation_type = _text(get("documento")).upper(), _text(get("modal")).upper(), _text(get("tipo_operacao")).upper()
        if operation_type == "SAIDA": indicator = "CARREGAMENTO GERAL"
        elif operation_type == "ENTRADA" and document == "DTA-S" and modal == "MARITIMO": indicator = "DTA-S MARITIMO"
        elif operation_type == "ENTRADA" and document == "DTA-S" and modal == "AEREO": indicator = "DTA-S AEREO"
        elif operation_type == "ENTRADA" and document == "DTA": indicator = "DTA"
        else: indicator = "OUTROS"
        start, finish = _date(get("inicio_os")), _date(get("termino_os"))
        arrival, entry, departure = _date(get("chegada")), _date(get("entrada")), _date(get("saida"))
        duration = (finish - start).total_seconds() / 60 if start and finish else None
        permanence = (departure - entry).total_seconds() / 60 if entry and departure and departure > entry else None
        # BaseDados-35 usa Data entrada para Mês/Ano e aplica a regra DTA a
        # qualquer Entrada cujo documento seja diferente de DTA-S.
        operation_date = entry
        goal_indicator = "DTA" if operation_type == "ENTRADA" and document != "DTA-S" else indicator
        goal = _goal(goal_indicator, entry)
        if goal is not None:
            # Excel compara Tempo OS vazio como zero: vazio <= meta fica Dentro da Meta.
            status = "Dentro da Meta" if duration is None or duration <= goal else "Fora da Meta"; analyzed += 1
        else: status = _text(get("status")) or "NÃO INFORMADO"
        # Replica MOD(Início da OS,1) do Excel, inclusive sua precisão de ponto flutuante.
        clock = (((start - datetime(1899, 12, 30)).total_seconds() / 86400) % 1) * 24 if start else 0
        raw_regime = _text(get("regime")).upper()
        # CONT.SES("<>*ENTREPOSTO*") inclui valores vazios no grupo COMUM.
        regime = "ENTREPOSTO" if "ENTREPOSTO" in raw_regime else "COMUM"
        records.append((order_number, _text(get("cliente")) or "NÃO INFORMADO", indicator, document or "NÃO INFORMADO", modal or "NÃO INFORMADO", clock, status,
                        _text(get("tipo_operacao")) or "NÃO INFORMADO", _text(get("operacao")) or "NÃO INFORMADO", regime,
                        operation_date.isoformat(sep=" ") if operation_date else None, duration, permanence, goal))
        if len(records) >= 2000: connection.executemany(insert, records); records.clear()
    if records: connection.executemany(insert, records)
    total = connection.execute("SELECT COUNT(*) FROM operacoes").fetchone()[0]
    connection.execute("""INSERT INTO importacoes
        (arquivo,importado_em,registros,analisados,duplicados_descartados) VALUES(?,?,?,?,?)""",
        (source.name, datetime.now().isoformat(timespec="seconds"), total, analyzed, duplicated))
    connection.commit(); connection.close(); os.replace(temporary, output)
    return {"arquivo": source.name, "registros": total, "analisados": analyzed,
            "duplicados_descartados": duplicated}


def main():
    source = Path(sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\lucas.santana\Desktop\relatorio 35.xls")
    result = import_report(source, Path(__file__).with_name("enso.db"))
    print(f"{result['registros']} registros importados; {result['analisados']} analisados; "
          f"{result['duplicados_descartados']} duplicados descartados.")


if __name__ == "__main__": main()
