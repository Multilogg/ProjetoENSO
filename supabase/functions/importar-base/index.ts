import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const aliases: Record<string, string[]> = {
  os: ["O.S.", "OS"], cliente: ["Cliente"], documento: ["Tipo Doc.", "TipoDocumento"],
  modal: ["Modal Ajustado", "Modal"], inicio_os: ["Inicio da OS", "Início da OS"],
  termino_os: ["Termino da OS", "Término da OS"], chegada: ["Data chegada", "Data Chegada"],
  entrada: ["Data entrada", "Data Entrada"], saida: ["Data saida", "Data saída", "Data Saída"],
  tipo_operacao: ["TipoOperacao", "Tipo Operacao", "Tipo Operação"],
  operacao: ["Operacao", "Operação"], regime: ["Regime"], status: ["Status"], hora: ["Hora"],
};

const text = (value: unknown) => value == null ? "" : String(value).trim();
const upper = (value: unknown) => text(value).toLocaleUpperCase("pt-BR");
const orderNumber = (value: unknown) => text(value).replace(/\.0+$/, "");

function rk(value: number) {
  const divided = (value & 1) !== 0;
  const integer = (value & 2) !== 0;
  let result: number;
  if (integer) result = value >> 2;
  else {
    const bytes = new ArrayBuffer(8);
    const view = new DataView(bytes);
    view.setUint32(4, value & 0xfffffffc, true);
    result = view.getFloat64(0, true);
  }
  return divided ? result / 100 : result;
}

function* biffRows(buffer: ArrayBuffer): Generator<unknown[]> {
  const view = new DataView(buffer);
  const decoder = new TextDecoder("windows-1252");
  let position = 0;
  let currentRow: number | null = null;
  let current: unknown[] = [];
  while (position + 4 <= view.byteLength) {
    const record = view.getUint16(position, true);
    const length = view.getUint16(position + 2, true);
    const body = position + 4;
    position = body + length;
    if (position > view.byteLength) break;
    let row: number, column: number, value: unknown;
    if (record === 0x0204 && length >= 8) {
      row = view.getUint16(body, true); column = view.getUint16(body + 2, true);
      const size = view.getUint16(body + 6, true);
      value = decoder.decode(new Uint8Array(buffer, body + 8, Math.min(size, length - 8))).trim();
    } else if (record === 0x0203 && length >= 14) {
      row = view.getUint16(body, true); column = view.getUint16(body + 2, true);
      value = view.getFloat64(body + 6, true);
    } else if (record === 0x027e && length >= 10) {
      row = view.getUint16(body, true); column = view.getUint16(body + 2, true);
      value = rk(view.getUint32(body + 6, true));
    } else continue;
    if (currentRow !== null && row !== currentRow) { yield current; current = []; }
    currentRow = row; current[column] = value;
  }
  if (currentRow !== null) yield current;
}

function excelDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") return new Date(Date.UTC(1899, 11, 30) + value * 86400000);
  const raw = text(value);
  if (!raw) return null;
  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]), Number(br[4] || 0), Number(br[5] || 0), Number(br[6] || 0));
  const normalized = raw.includes(" ") ? raw.replace(" ", "T") : raw;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function goal(indicator: string) {
  const real: Record<string, number> = { "CARREGAMENTO GERAL": 40, DTA: 110, "DTA-S MARITIMO": 150, "DTA-S AEREO": 100 };
  return real[indicator] ?? null;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ erro: "Método não permitido." }, 405);
  try {
    const form = await request.formData();
    const file = form.get("planilha");
    if (!(file instanceof File)) return json({ erro: "Selecione uma planilha válida." }, 400);
    if (!/\.xlsx?$/i.test(file.name)) return json({ erro: "O arquivo deve ser .xls ou .xlsx." }, 400);
    if (file.size > 25 * 1024 * 1024) return json({ erro: "O arquivo deve ter no máximo 25 MB." }, 413);

    let rows: unknown[][];
    const fileBuffer = await file.arrayBuffer();
    if (/\.xls$/i.test(file.name)) {
      rows = [...biffRows(fileBuffer)];
    } else {
      const XLSX = await import("npm:xlsx@0.18.5");
      const workbook = XLSX.read(fileBuffer, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames.find(name => name.trim().toLocaleLowerCase("pt-BR").startsWith("basedados")) || workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "", raw: true });
    }
    if (!rows.length) return json({ erro: "A planilha está vazia." }, 400);

    const header = rows[0].map(value => text(value).toLocaleLowerCase("pt-BR"));
    const columns: Record<string, number> = {};
    Object.entries(aliases).forEach(([key, names]) => {
      const index = header.findIndex(value => names.some(name => value === name.toLocaleLowerCase("pt-BR")));
      if (index >= 0) columns[key] = index;
    });
    const required = ["os", "cliente", "documento", "modal", "inicio_os", "termino_os"];
    const missing = required.filter(key => columns[key] == null);
    if (missing.length) return json({ erro: `Colunas obrigatórias não encontradas: ${missing.join(", ")}` }, 400);

    const records: Record<string, unknown>[] = [];
    const seen = new Set<string>();
    let analyzed = 0, duplicates = 0;
    for (const row of rows.slice(1)) {
      const get = (key: string) => columns[key] == null ? "" : row[columns[key]];
      const os = orderNumber(get("os"));
      if (!os) continue;
      const orderKey = os.toLocaleLowerCase("pt-BR");
      if (seen.has(orderKey)) { duplicates++; continue; }
      seen.add(orderKey);

      const document = upper(get("documento"));
      const modal = upper(get("modal"));
      const operationType = upper(get("tipo_operacao"));
      let indicator = "OUTROS";
      if (operationType === "SAIDA") indicator = "CARREGAMENTO GERAL";
      else if (operationType === "ENTRADA" && document === "DTA-S" && modal === "MARITIMO") indicator = "DTA-S MARITIMO";
      else if (operationType === "ENTRADA" && document === "DTA-S" && modal === "AEREO") indicator = "DTA-S AEREO";
      else if (operationType === "ENTRADA" && document === "DTA") indicator = "DTA";

      const start = excelDate(get("inicio_os"));
      const finish = excelDate(get("termino_os"));
      const entry = excelDate(get("entrada"));
      const departure = excelDate(get("saida"));
      const duration = start && finish ? (finish.getTime() - start.getTime()) / 60000 : null;
      const permanence = entry && departure && departure > entry ? (departure.getTime() - entry.getTime()) / 60000 : null;
      const goalIndicator = operationType === "ENTRADA" && document !== "DTA-S" ? "DTA" : indicator;
      const applicableGoal = goal(goalIndicator);
      let status = text(get("status")) || "NÃO INFORMADO";
      if (applicableGoal !== null) {
        status = duration === null || duration <= applicableGoal ? "Dentro da Meta" : "Fora da Meta";
        analyzed++;
      }
      const rawRegime = upper(get("regime"));
      records.push({ os, cliente: text(get("cliente")) || "NÃO INFORMADO", indicador: indicator,
        documento: document || "NÃO INFORMADO", modal: modal || "NÃO INFORMADO",
        horario: start ? start.getHours() + start.getMinutes() / 60 + start.getSeconds() / 3600 : 0,
        status_meta: status, tipo_operacao: text(get("tipo_operacao")) || "NÃO INFORMADO",
        operacao: text(get("operacao")) || "NÃO INFORMADO", regime: rawRegime.includes("ENTREPOSTO") ? "ENTREPOSTO" : "COMUM",
        data_operacao: entry ? entry.toISOString() : null, tempo_os_min: duration,
        tempo_permanencia_min: permanence, meta_min: applicableGoal });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const deletedOperations = await supabase.from("operacoes").delete().gt("id", 0);
    if (deletedOperations.error) throw deletedOperations.error;
    const deletedImports = await supabase.from("importacoes").delete().gt("id", 0);
    if (deletedImports.error) throw deletedImports.error;
    for (let position = 0; position < records.length; position += 500) {
      const inserted = await supabase.from("operacoes").insert(records.slice(position, position + 500));
      if (inserted.error) throw inserted.error;
    }
    const imported = await supabase.from("importacoes").insert({ arquivo: file.name, registros: records.length,
      analisados: analyzed, duplicados_descartados: duplicates });
    if (imported.error) throw imported.error;
    return json({ arquivo: file.name, registros: records.length, analisados: analyzed, duplicados_descartados: duplicates });
  } catch (error) {
    return json({ erro: error instanceof Error ? error.message : "Falha ao importar a planilha." }, 500);
  }
});
