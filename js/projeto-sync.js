(function () {
  const settings = window.ENSO_SUPABASE;
  const sdk = window.supabase;
  if (!settings || !sdk?.createClient) return;
  const client = sdk.createClient(settings.url, settings.publishableKey);
  const prefix = 'enso-';
  let applyingRemote = false;

  function projectKeysFromPage() {
    const values = new Map();
    document.querySelectorAll('.status-select[data-task]').forEach(element => values.set(`enso-status-${element.dataset.task}`, element.value));
    document.querySelectorAll('.owner-select[data-task]').forEach(element => values.set(`enso-owner-${element.dataset.task}`, element.value));
    document.querySelectorAll('.deadline-input[data-task]').forEach(element => values.set(`enso-deadline-${element.dataset.task}`, element.value));
    document.querySelectorAll('.pillar').forEach(pillar => {
      const number = pillar.querySelector('.pillar-title>span')?.textContent.trim();
      const leader = pillar.querySelector('.leader-select');
      if (number && leader) values.set(`enso-leader-${number}`, leader.value);
    });
    return values;
  }

  function applyValue(key, value) {
    if (!key.startsWith(prefix)) return;
    applyingRemote = true;
    localStorage.setItem(key, value ?? '');
    let element;
    if (key.startsWith('enso-status-')) {
      element = document.querySelector(`.status-select[data-task="${CSS.escape(key.slice(12))}"]`);
      if (element) { element.value = value; element.dataset.status = value; }
    } else if (key.startsWith('enso-owner-')) {
      element = document.querySelector(`.owner-select[data-task="${CSS.escape(key.slice(11))}"]`);
      if (element) element.value = value;
    } else if (key.startsWith('enso-deadline-')) {
      element = document.querySelector(`.deadline-input[data-task="${CSS.escape(key.slice(14))}"]`);
      if (element) element.value = value;
    } else if (key.startsWith('enso-leader-')) {
      element = document.querySelector(`#pilar-${CSS.escape(key.slice(12))} .leader-select`);
      if (element) element.value = value;
    }
    applyingRemote = false;
    window.dispatchEvent(new Event('storage'));
  }

  async function save(key, value) {
    if (applyingRemote) return;
    const { error } = await client.from('configuracoes_projeto').upsert({ chave: key, valor: value ?? '', atualizado_em: new Date().toISOString() }, { onConflict: 'chave' });
    if (error) console.error('ENSO: não foi possível sincronizar a alteração.', error.message);
  }

  function bindChanges() {
    document.querySelectorAll('.status-select[data-task]').forEach(element => element.addEventListener('change', () => save(`enso-status-${element.dataset.task}`, element.value)));
    document.querySelectorAll('.owner-select[data-task]').forEach(element => element.addEventListener('change', () => save(`enso-owner-${element.dataset.task}`, element.value)));
    document.querySelectorAll('.deadline-input[data-task]').forEach(element => element.addEventListener('change', () => save(`enso-deadline-${element.dataset.task}`, element.value)));
    document.querySelectorAll('.pillar').forEach(pillar => {
      const number = pillar.querySelector('.pillar-title>span')?.textContent.trim();
      const leader = pillar.querySelector('.leader-select');
      if (number && leader) leader.addEventListener('change', () => save(`enso-leader-${number}`, leader.value));
    });
  }

  async function start() {
    const { data, error } = await client.from('configuracoes_projeto').select('chave,valor');
    if (error) { console.error('ENSO: tabela de sincronização indisponível.', error.message); return; }
    if (data.length) data.forEach(item => applyValue(item.chave, item.valor));
    else {
      const initial = [...projectKeysFromPage()].map(([chave, valor]) => ({ chave, valor, atualizado_em: new Date().toISOString() }));
      if (initial.length) await client.from('configuracoes_projeto').upsert(initial, { onConflict: 'chave' });
    }
    bindChanges();
    client.channel('enso-projeto-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes_projeto' }, event => {
        if (event.new?.chave) applyValue(event.new.chave, event.new.valor);
      })
      .subscribe();
  }

  start();
})();
