(function () {
  const config = window.ENSO_SUPABASE;
  if (!config?.url || !config?.publishableKey) return;
  const nativeFetch = window.fetch.bind(window);
  const pageSize = 1000;
  const cachePrefix = 'enso-supabase-cache:';
  let operationsPromise;
  let versionPromise;
  const num = value => Number(value) || 0;
  const monthOf = value => value ? Number(String(value).slice(5, 7)) : 0;
  const yearOf = value => value ? Number(String(value).slice(0, 4)) : 0;
  const periodOf = value => {
    const hour = num(value);
    if (hour >= 7 && hour < 12) return '07h - 12h';
    if (hour >= 12 && hour < 18) return '12h - 18h';
    if (hour >= 18 && hour < 22) return '18h - 22h';
    return '22h - 07h';
  };
  const jsonResponse = (payload, status = 200) => new Response(JSON.stringify(payload), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });

  async function currentVersion() {
    if (versionPromise) return versionPromise;
    versionPromise = (async () => {
      const result = await nativeFetch(`${config.url}/rest/v1/importacoes?select=importado_em,registros&order=id.desc&limit=1`, {
        headers: { apikey: config.publishableKey, Authorization: `Bearer ${config.publishableKey}` }
      });
      if (!result.ok) throw new Error(`Supabase indisponível (${result.status})`);
      const [latest] = await result.json();
      const version = latest ? `${latest.importado_em}:${latest.registros}` : 'sem-base';
      const previous = localStorage.getItem(`${cachePrefix}version`);
      if (previous && previous !== version) {
        Object.keys(localStorage).filter(key => key.startsWith(cachePrefix)).forEach(key => localStorage.removeItem(key));
        operationsPromise = null;
      }
      localStorage.setItem(`${cachePrefix}version`, version);
      return version;
    })().catch(error => { versionPromise = null; throw error; });
    return versionPromise;
  }

  function loadOperations() {
    if (operationsPromise) return operationsPromise;
    operationsPromise = (async () => {
      const rows = [];
      const fields = 'os,cliente,indicador,modal,horario,status_meta,regime,data_operacao,tempo_os_min';
      for (let offset = 0; ; offset += pageSize) {
        const result = await nativeFetch(`${config.url}/rest/v1/operacoes?select=${fields}&offset=${offset}&limit=${pageSize}`, {
          headers: { apikey: config.publishableKey, Authorization: `Bearer ${config.publishableKey}` }
        });
        if (!result.ok) throw new Error(`Supabase indisponível (${result.status})`);
        const page = await result.json();
        rows.push(...page);
        if (page.length < pageSize) break;
      }
      return rows;
    })().catch(error => { operationsPromise = null; throw error; });
    return operationsPromise;
  }

  function groups(rows, key) {
    const map = new Map();
    rows.forEach(row => {
      const name = key(row) || 'NÃO INFORMADO';
      const item = map.get(name) || { nome: name, total: 0, fora: 0 };
      item.total++;
      if (row.status_meta === 'Fora da Meta') item.fora++;
      map.set(name, item);
    });
    return [...map.values()].map(item => ({ ...item,
      percentual: item.total ? Math.round(item.fora * 100 / item.total) : 0
    })).sort((a, b) => b.total - a.total || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  }

  function indicators(rows, url) {
    const indicator = (url.searchParams.get('indicador') || 'DTA').toUpperCase();
    const modal = (url.searchParams.get('modal') || '').toUpperCase();
    const months = (url.searchParams.get('meses') || '').split(',').map(Number).filter(value => value >= 1 && value <= 12);
    const semester = url.searchParams.get('semestre') || '';
    const period = url.searchParams.get('horario') || '';
    const filtered = rows.filter(row => {
      const month = monthOf(row.data_operacao);
      return row.indicador === indicator && (!modal || row.modal === modal) &&
        (!months.length || months.includes(month)) &&
        (months.length || semester !== '1' || (month >= 1 && month <= 6)) &&
        (months.length || semester !== '2' || (month >= 7 && month <= 12)) &&
        (!period || periodOf(row.horario) === period);
    });
    const outside = filtered.filter(row => row.status_meta === 'Fora da Meta').length;
    const clients = groups(filtered, row => row.cliente)
      .sort((a, b) => b.fora - a.fora || b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'))
      .slice(0, 100).map(item => ({ ...item, cliente: item.nome }));
    return { indicador: indicator, total: filtered.length, fora: outside,
      percentual: filtered.length ? Math.round(outside * 100 / filtered.length) : 0,
      modal: groups(filtered, row => row.modal), horario: groups(filtered, row => periodOf(row.horario)),
      regime: groups(filtered, row => row.regime), clientes: clients };
  }

  function operation(rows, url) {
    const year = Math.max(...rows.map(row => yearOf(row.data_operacao)).filter(Boolean));
    const selected = (url.searchParams.get('meses') || '').split(',').map(Number).filter(value => value >= 1 && value <= 12);
    const filtered = rows.filter(row => yearOf(row.data_operacao) === year && (!selected.length || selected.includes(monthOf(row.data_operacao))));
    const inside = filtered.filter(row => row.status_meta === 'Dentro da Meta').length;
    const outside = filtered.filter(row => row.status_meta === 'Fora da Meta').length;
    const durations = filtered.filter(row => row.tempo_os_min !== null && num(row.tempo_os_min) >= 0).map(row => num(row.tempo_os_min));
    const monthly = groups(filtered, row => monthOf(row.data_operacao)).map(item => ({ mes: Number(item.nome), total: item.total,
      dentro: filtered.filter(row => monthOf(row.data_operacao) === Number(item.nome) && row.status_meta === 'Dentro da Meta').length,
      fora: item.fora })).sort((a, b) => a.mes - b.mes);
    const clientes = groups(filtered, row => row.cliente).slice(0, 8).map(item => ({ cliente: item.nome, total: item.total }));
    const indicadores = ['CARREGAMENTO GERAL','DTA','DTA-S MARITIMO','DTA-S AEREO'].map(indicador => {
      const items = filtered.filter(row => row.indicador === indicador);
      const dentro = items.filter(row => row.status_meta === 'Dentro da Meta').length;
      const fora = items.filter(row => row.status_meta === 'Fora da Meta').length;
      const times = items.filter(row => row.tempo_os_min !== null && num(row.tempo_os_min) >= 0).map(row => num(row.tempo_os_min));
      return { indicador, total: items.length, dentro, fora,
        aderencia: dentro + fora ? Math.round(dentro * 1000 / (dentro + fora)) / 10 : 0,
        tempo_medio: times.length ? times.reduce((sum, value) => sum + value, 0) / times.length : 0 };
    });
    const analyzed = inside + outside;
    return { ano: year, meses: monthly, resumo: { total: filtered.length, dentro: inside, fora: outside,
      aderencia: analyzed ? Math.round(inside * 1000 / analyzed) / 10 : 0,
      tempo_medio: durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0 },
      modal: groups(filtered, row => row.modal).map(item => ({ nome: item.nome, total: item.total })), clientes,
      clientes_total: new Set(filtered.map(row => row.cliente)).size, indicadores };
  }

  window.fetch = async function (input, options = {}) {
    const target = typeof input === 'string' ? input : input?.url || '';
    if (!target.startsWith('/api/')) return nativeFetch(input, options);
    try {
      if (target.startsWith('/api/importar')) return jsonResponse({ erro: 'Importe localmente e sincronize com o Supabase.' }, 400);
      const version = await currentVersion();
      const cacheKey = `${cachePrefix}${target}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const entry = JSON.parse(cached);
        if (entry.version === version) return jsonResponse(entry.payload);
      }
      const rows = await loadOperations();
      const url = new URL(target, location.origin);
      let payload;
      if (url.pathname === '/api/indicadores') payload = indicators(rows, url);
      else if (url.pathname === '/api/operacao-mensal') payload = operation(rows, url);
      if (payload) {
        localStorage.setItem(cacheKey, JSON.stringify({ version, payload }));
        return jsonResponse(payload);
      }
      return jsonResponse({ erro: 'Rota não encontrada.' }, 404);
    } catch (error) { return jsonResponse({ erro: error.message }, 503); }
  };

})();
