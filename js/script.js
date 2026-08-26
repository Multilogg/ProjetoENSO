const themeButton = document.querySelector('#themeToggle');
document.querySelectorAll('.brand small').forEach(subtitle => {
  subtitle.textContent = 'Elevação do Nível de Serviço Operacional';
});
document.querySelectorAll('.overview-intro > .eyebrow, .strategy-intro > .eyebrow').forEach(label => label.remove());
document.querySelectorAll('.topbar nav a[href*="metas.html"]').forEach(link => link.remove());
document.querySelectorAll('.topbar nav a[href*="clientes.html"]').forEach(link => link.remove());
document.querySelectorAll('.topbar nav a[href*="indicadores-dta.html"]').forEach(link => { link.textContent = 'Indicadores'; });

if (location.pathname.endsWith('/operacao.html')) {
  const operationMain = document.querySelector('main');
  operationMain?.insertAdjacentHTML('beforeend', `
    <section class="panel clients operation-clients" id="clientes">
      <div class="panel-head"><div>
        <p class="eyebrow">315 CLIENTES ATENDIDOS</p>
        <h2>Principais clientes por volume</h2>
        <p class="client-intro">Concentração das ordens de serviço no primeiro semestre de 2026.</p>
      </div></div>
      <div class="client-table">
        <div class="table-row header"><span>#</span><span>Cliente</span><span>Ordens</span><span>Participação relativa</span></div>
        <div class="table-row"><b>01</b><span>Multilog Brasil S/A</span><strong>656</strong><div class="micro"><i style="width:100%"></i></div></div>
        <div class="table-row"><b>02</b><span>Compal Tecnologia do Brasil</span><strong>244</strong><div class="micro"><i style="width:37%"></i></div></div>
        <div class="table-row"><b>03</b><span>ZTE do Brasil</span><strong>213</strong><div class="micro"><i style="width:32%"></i></div></div>
        <div class="table-row"><b>04</b><span>Donaldson do Brasil</span><strong>206</strong><div class="micro"><i style="width:31%"></i></div></div>
        <div class="table-row"><b>05</b><span>Ciena Communications Brasil</span><strong>197</strong><div class="micro"><i style="width:30%"></i></div></div>
        <div class="table-row"><b>06</b><span>Corteva Agriscience do Brasil</span><strong>145</strong><div class="micro"><i style="width:22%"></i></div></div>
        <div class="table-row"><b>07</b><span>Randoncorp S.A.</span><strong>141</strong><div class="micro"><i style="width:21%"></i></div></div>
        <div class="table-row"><b>08</b><span>UPS SCS Logística (Brasil)</span><strong>122</strong><div class="micro"><i style="width:19%"></i></div></div>
      </div>
    </section>`);
}
themeButton?.remove();
document.body.classList.remove('dark');
document.body.dataset.theme = 'multilog';
localStorage.setItem('enso-theme', 'multilog');

const topbar = document.querySelector('.topbar');
let lastScrollPosition = window.scrollY;
let scrollFramePending = false;
window.addEventListener('scroll', () => {
  if (scrollFramePending) return;
  scrollFramePending = true;
  requestAnimationFrame(() => {
    const currentScrollPosition = window.scrollY;
    const scrollingDown = currentScrollPosition > lastScrollPosition;
    topbar?.classList.toggle('topbar-hidden', scrollingDown && currentScrollPosition > 90);
    if (currentScrollPosition < 24) topbar?.classList.remove('topbar-hidden');
    lastScrollPosition = Math.max(currentScrollPosition, 0);
    scrollFramePending = false;
  });
}, { passive: true });

const originGoals = document.querySelector('.project-origin .origin-goals');
if (originGoals) {
  const ptoRules = [
    ['Carregamento geral','0h40','0h35','Término OS − Início OS'],
    ['Processo DTA','1h50','1h10','Término OS − Início OS'],
    ['DTA-S · Marítimo','2h30','1h50','Término OS − Início OS'],
    ['DTA-S · Aéreo','1h40','1h05','Término OS − Início OS'],
    ['Presença DTA','12h00','12h00','Presença − Entrada'],
    ['Presença DTA-S','4h00','3h30','Presença − Entrada']
  ];
  document.querySelector('.project-origin .origin-intro h2').textContent = 'A evolução das metas operacionais';
  document.querySelector('.project-origin .origin-intro>p:last-child').textContent = 'As regras PTO mostram o ponto de partida do primeiro semestre e a nova referência ENSO, com critérios claros e comparáveis para cada processo.';
  originGoals.innerHTML = ptoRules.map(([title,initial,current,formula]) => `<article class="pto-rule"><span>${title}</span><div class="goal-evolution"><div><small>Meta real</small><strong>${initial}</strong></div><i>→</i><div><small>Objetivo ENSO</small><strong>${current}</strong></div></div><p><b>Cálculo</b>${formula}</p></article>`).join('');
}

const showAll = document.querySelector('#showAll');
const clientTable = document.querySelector('.client-table');
showAll?.addEventListener('click', () => {
  const expanded = clientTable.classList.toggle('expanded');
  showAll.innerHTML = expanded ? 'Ver menos <span>↑</span>' : 'Ver todos <span>→</span>';
});

const sections = [...document.querySelectorAll('main section[id]')];
const links = [...document.querySelectorAll('.topbar nav a')]
  .filter(link => link.getAttribute('href')?.startsWith('#'));
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    links.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
  });
}, { rootMargin: '-30% 0px -60%' });
sections.forEach(section => observer.observe(section));

const generatedPillars = document.querySelector('#generatedPillars');
if (generatedPillars) {
  const responsibleNames = ['Wagner', 'Carlos', 'Lucas', 'Marian', 'Jaqueline', 'Edilon', 'Maria', 'Tiago', 'Guilherme'];
  const roadmapPillars = [
    { number:'03', slug:'priorizar', title:'Priorizar', leader:'A definir', description:'Direcionar esforços para as oportunidades de maior impacto.', tools:'Curva de Pareto (80/20) · Matriz impacto × Esforço', actions:['Ranking dos processos prioritários','Lista de oportunidades de maior impacto','Elaborar um roadmap de melhorias','Definição de melhorias de rápida implementação'] },
    { number:'04', slug:'otimizar', title:'Otimizar', leader:'A definir', description:'Redesenhar layout e métodos, eliminando movimentações que não agregam valor.', tools:'Diagrama de Espaguete · Layout Lean · Kaizen', actions:['Construção do Diagrama de Espaguete','Revisão do layout','Implantação do Corredor Expresso','Redistribuição dos endereços','Redução das movimentações desnecessárias'] },
    { number:'05', slug:'padronizar', title:'Padronizar', leader:'A definir', description:'Implantar padrões, gestão visual e boas práticas operacionais.', tools:'5S · Gestão visual', actions:['Padronização das atividades','Implantação do 5S','Gestão Visual','Identificação de processos críticos','Identificação de áreas expressas','Auditorias cruzadas'] },
    { number:'06', slug:'pessoas', title:'Pessoas', leader:'Jaqueline', description:'Fortalecer capacitação, engajamento e protagonismo das equipes.', tools:'DSC · Gestão à vista · Gemba', defaults:['Jaqueline','Jaqueline','Jaqueline','Edilon','Edilon','Edilon','Edilon'], actions:['Plano de capacitação','Treinamento com as equipes','Matriz de competências atualizada','Revisão mensal dos resultados','Multiplicadores internos definidos','Reconhecer equipes e colaboradores que contribuírem com melhorias e boas práticas','Feedback com equipe'] },
    { number:'07', slug:'sustentar', title:'Sustentar', leader:'Wagner', description:'Acompanhar indicadores e manter a melhoria contínua dos resultados.', tools:'PDCA · Dashboard · Indicadores', defaults:['Wagner','Wagner','Wagner','Wagner','Wagner'], actions:['Dashboard dos indicadores','Reuniões de acompanhamento','Plano de ação contínuo','Revisão mensal dos resultados','Novas oportunidades de melhoria'] }
  ];
  const options = selected => '<option value="">A definir</option>' + responsibleNames.map(name => `<option value="${name}" ${name === selected ? 'selected' : ''}>${name}</option>`).join('');
  generatedPillars.innerHTML = roadmapPillars.map(pillar => `<div class="pillar editable-pillar" data-state="pending"><div class="pillar-title"><span>${pillar.number}</span><div><h3>${pillar.title}</h3><p>${pillar.description}</p></div><b class="owner">Líder · ${pillar.leader}</b></div><div class="actions-table"><div class="action head"><span>Ação</span><span>Responsável</span><span>Prazo</span><span>Status</span></div>${pillar.actions.map((action,index) => { const key=`${pillar.slug}-${index+1}`; const savedOwner=localStorage.getItem(`enso-owner-${key}`); const owner=savedOwner === null ? (pillar.defaults?.[index] || '') : savedOwner; const deadline=localStorage.getItem(`enso-deadline-${key}`) || ''; return `<div class="action"><span>${action}</span><select class="owner-select" data-task="${key}">${options(owner)}</select><input class="deadline-input" data-task="${key}" type="date" value="${deadline}"><select class="status-select" data-task="${key}"><option value="progress">Em andamento</option><option value="delivered">Entregue</option><option value="late">Fora do prazo</option></select></div>`; }).join('')}</div><p class="tools"><b>Ferramentas</b> ${pillar.tools}</p></div>`).join('');
  const refreshPillarState = pillar => {
    const deadlines = [...pillar.querySelectorAll('.deadline-input')];
    pillar.dataset.state = deadlines.length && deadlines.every(input => input.value) ? 'defined' : 'pending';
  };
  generatedPillars.querySelectorAll('.owner-select').forEach(select => select.addEventListener('change', () => localStorage.setItem(`enso-owner-${select.dataset.task}`, select.value)));
  generatedPillars.querySelectorAll('.deadline-input').forEach(input => input.addEventListener('change', () => { localStorage.setItem(`enso-deadline-${input.dataset.task}`, input.value); refreshPillarState(input.closest('.pillar')); }));
  generatedPillars.querySelectorAll('.pillar').forEach(refreshPillarState);
}

if (generatedPillars) {
  const existingNames = ['Wagner', 'Carlos', 'Lucas', 'Marian', 'Jaqueline', 'Edilon', 'Maria', 'Tiago', 'Guilherme'];
  const dateByText = { '17 jul 2026': '2026-07-17', '31 jul 2026': '2026-07-31' };
  document.querySelectorAll('.pillar:not(.editable-pillar) .action:not(.head)').forEach(row => {
    const task = row.querySelector('.status-select')?.dataset.task;
    const currentOwner = row.querySelector('b');
    const currentDeadline = row.querySelector('time');
    if (!task || !currentOwner || !currentDeadline) return;
    const defaultOwner = currentOwner.textContent.trim();
    const owner = localStorage.getItem(`enso-owner-${task}`) ?? defaultOwner;
    const deadline = localStorage.getItem(`enso-deadline-${task}`) || dateByText[currentDeadline.textContent.trim()] || '';
    const ownerSelect = document.createElement('select');
    ownerSelect.className = 'owner-select'; ownerSelect.dataset.task = task;
    ownerSelect.innerHTML = '<option value="">A definir</option>' + existingNames.map(name => `<option value="${name}" ${name === owner ? 'selected' : ''}>${name}</option>`).join('');
    const deadlineInput = document.createElement('input');
    deadlineInput.className = 'deadline-input'; deadlineInput.dataset.task = task; deadlineInput.type = 'date'; deadlineInput.value = deadline;
    currentOwner.replaceWith(ownerSelect); currentDeadline.replaceWith(deadlineInput);
    ownerSelect.addEventListener('change', () => localStorage.setItem(`enso-owner-${task}`, ownerSelect.value));
    deadlineInput.addEventListener('change', () => localStorage.setItem(`enso-deadline-${task}`, deadlineInput.value));
  });
}

if (generatedPillars) {
  const leaderNames = ['Wagner', 'Carlos', 'Lucas', 'Marian', 'Jaqueline', 'Edilon', 'Maria', 'Tiago', 'Guilherme'];
  document.querySelectorAll('.pillar').forEach(pillar => {
    const currentLeader = pillar.querySelector('.pillar-title .owner');
    const number = pillar.querySelector('.pillar-title>span')?.textContent.trim();
    if (!currentLeader || !number) return;
    const defaultLeader = currentLeader.textContent.includes('·') ? currentLeader.textContent.split('·').pop().trim() : 'A definir';
    const savedLeader = localStorage.getItem(`enso-leader-${number}`);
    const leader = savedLeader === null ? (defaultLeader === 'A definir' ? '' : defaultLeader) : savedLeader;
    const select = document.createElement('select');
    select.className = 'owner leader-select';
    select.setAttribute('aria-label', `Líder da etapa ${number}`);
    select.innerHTML = '<option value="">Líder · A definir</option>' + leaderNames.map(name => `<option value="${name}" ${name === leader ? 'selected' : ''}>Líder · ${name}</option>`).join('');
    currentLeader.replaceWith(select);
    select.addEventListener('change', () => localStorage.setItem(`enso-leader-${number}`, select.value));
  });
}

const filters = [...document.querySelectorAll('.filter')];
const pillars = [...document.querySelectorAll('.pillar[data-state]')];
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  pillars.forEach(pillar => pillar.classList.toggle('is-hidden', button.dataset.filter !== 'all' && pillar.dataset.state !== button.dataset.filter));
}));

document.querySelectorAll('.status-select').forEach(select => {
  const storageKey = `enso-status-${select.dataset.task}`;
  const savedStatus = localStorage.getItem(storageKey);
  const currentStatus = savedStatus || select.value || 'progress';
  const normalizedStatus = currentStatus === 'ontime' ? 'delivered' : currentStatus;
  select.innerHTML = '<option value="progress">Em andamento</option><option value="delivered">Entregue</option><option value="late">Fora do prazo</option>';
  select.value = ['progress', 'delivered', 'late'].includes(normalizedStatus) ? normalizedStatus : 'progress';
  select.dataset.status = select.value;
  localStorage.setItem(storageKey, select.value);
  select.addEventListener('change', () => {
    select.dataset.status = select.value;
    localStorage.setItem(storageKey, select.value);
  });
});

document.querySelectorAll('.pillar').forEach(pillar => {
  const number = pillar.querySelector('.pillar-title>span')?.textContent.trim();
  if (number) pillar.id = `pilar-${number}`;
});
if (location.hash.startsWith('#pilar-')) requestAnimationFrame(() => {
  document.querySelector(location.hash)?.scrollIntoView({ behavior:'smooth', block:'start' });
});

const overviewPillars = [...document.querySelectorAll('.overview-pillars article')];
if (overviewPillars.length) {
  const pillarTasks = {
    '01': Array.from({ length: 7 }, (_, index) => `diagnostico-${index + 1}`),
    '02': Array.from({ length: 4 }, (_, index) => `analise-${index + 1}`),
    '03': Array.from({ length: 4 }, (_, index) => `priorizar-${index + 1}`),
    '04': Array.from({ length: 5 }, (_, index) => `otimizar-${index + 1}`),
    '05': Array.from({ length: 6 }, (_, index) => `padronizar-${index + 1}`),
    '06': Array.from({ length: 7 }, (_, index) => `pessoas-${index + 1}`),
    '07': Array.from({ length: 5 }, (_, index) => `sustentar-${index + 1}`)
  };
  const refreshOverviewStatuses = () => overviewPillars.forEach(pillar => {
    const number = pillar.querySelector(':scope > b')?.textContent.trim();
    const statuses = (pillarTasks[number] || []).map(task => localStorage.getItem(`enso-status-${task}`) || 'notstarted');
    const allDone = statuses.length > 0 && statuses.every(status => status === 'delivered');
    const hasLate = statuses.some(status => status === 'late');
    const hasProgress = statuses.some(status => status === 'progress');
    const state = allDone ? 'completed' : (hasLate ? 'pending' : 'progress');
    const label = allDone ? 'Entregue' : (hasLate ? 'Fora do prazo' : 'Em andamento');
    let badge = pillar.querySelector('.pillar-status');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'pillar-status';
      const actions = document.createElement('div');
      actions.className = 'pillar-overview-actions';
      actions.appendChild(badge);
      const details = document.createElement('a');
      details.className = 'pillar-details';
      details.href = `paginas/projeto-segundo-semestre.html#pilar-${number}`;
      details.textContent = 'Detalhes';
      actions.appendChild(details);
      pillar.appendChild(actions);
    }
    badge.dataset.status = state;
    badge.textContent = label;
  });
  refreshOverviewStatuses();
  window.addEventListener('storage', refreshOverviewStatuses);
  window.addEventListener('pageshow', refreshOverviewStatuses);
}

const formatLiveNumber = value => new Intl.NumberFormat('pt-BR').format(value || 0);
const loadOperationalSummary = () => fetch('/api/operacao-mensal').then(response => {
  if (!response.ok) throw new Error('API indisponível');
  return response.json();
});

const portalKpis = document.querySelector('.portal-kpis');
if (portalKpis) {
  loadOperationalSummary().then(data => {
    const summary = data.resumo || {};
    const cards = portalKpis.querySelectorAll('article');
    const months = data.meses || [];
    const firstMonth = months[0]?.mes;
    const lastMonth = months[months.length - 1]?.mes;
    const monthNamesLong = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    if (cards[0]) {
      cards[0].querySelector('strong').textContent = `${String(summary.aderencia || 0).replace('.', ',')}%`;
      cards[0].querySelector('small').textContent = `${formatLiveNumber(summary.dentro)} operações no prazo`;
    }
    if (cards[1]) {
      cards[1].querySelector('strong').textContent = formatLiveNumber(summary.total);
      cards[1].querySelector('small').textContent = firstMonth && lastMonth ? `${monthNamesLong[firstMonth - 1]} a ${monthNamesLong[lastMonth - 1]} de ${data.ano}` : 'consulta atual';
    }
    if (cards[2]) {
      cards[2].querySelector('strong').textContent = formatLiveNumber(data.clientes_total);
      cards[2].querySelector('small').textContent = 'clientes com operações na consulta';
    }
  }).catch(() => {});
}

const monthlyBars = document.querySelector('.chart-panel .bars');
if (monthlyBars) {
  const monthNames = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const formatMonthly = value => new Intl.NumberFormat('pt-BR').format(value);
  const escapeOperationDetail = value => String(value ?? '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  const formatDetailMinutes = value => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
    const minutes = Math.max(0, Math.round(Number(value)));
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}`;
  };
  const formatOperationDateTime = (value, totalSeconds = null) => {
    if (!value) return '—';
    const raw = String(value);
    const date = totalSeconds === null
      ? new Date(`${raw}${/[zZ]|[+-]\d\d:\d\d$/.test(raw) ? '' : 'Z'}`)
      : new Date(`${raw.slice(0, 10)}T00:00:00Z`);
    if (totalSeconds !== null) date.setUTCSeconds(Math.round(totalSeconds));
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).format(date).replace(',', '');
  };
  document.body.insertAdjacentHTML('beforeend', `<dialog class="outside-goal-dialog" id="outsideGoalDialog" aria-labelledby="outsideGoalTitle"><div class="outside-goal-shell"><header><div><span>DETALHAMENTO OPERACIONAL</span><h2 id="outsideGoalTitle">OS fora da meta</h2><p id="outsideGoalSubtitle"></p></div><button class="outside-goal-close" type="button" aria-label="Fechar">×</button></header><div class="outside-goal-toolbar"><label>Buscar OS ou cliente<input id="outsideGoalSearch" type="search" placeholder="Digite para filtrar..."></label><strong id="outsideGoalCount"></strong></div><div class="outside-goal-table-wrap"><table class="outside-goal-table"><thead><tr><th>OS</th><th>Cliente</th><th>Modal</th><th>Data/Início</th><th>Data/Término</th><th>Tempo</th><th>Meta</th><th>Atraso</th></tr></thead><tbody id="outsideGoalRows"></tbody></table></div></div></dialog>`);
  const outsideGoalDialog = document.querySelector('#outsideGoalDialog');
  const outsideGoalRows = document.querySelector('#outsideGoalRows');
  const outsideGoalSearch = document.querySelector('#outsideGoalSearch');
  let currentOutsideGoalRows = [];
  const renderOutsideGoalRows = () => {
    const query = outsideGoalSearch.value.trim().toLocaleLowerCase('pt-BR');
    const visible = currentOutsideGoalRows.filter(item => !query || `${item.os} ${item.cliente} ${item.modal}`.toLocaleLowerCase('pt-BR').includes(query));
    document.querySelector('#outsideGoalCount').textContent = `${formatMonthly(visible.length)} OS`;
    outsideGoalRows.innerHTML = visible.length ? visible.map(item => {
      const start = Number(item.horario || 0) * 3600;
      const duration = Number(item.tempo_os_min || 0);
      const finish = start + duration * 60;
      const delay = item.meta_min === null ? null : Math.max(0, duration - Number(item.meta_min));
      return `<tr><td><strong>${escapeOperationDetail(item.os || '—')}</strong></td><td>${escapeOperationDetail(item.cliente || 'NÃO INFORMADO')}</td><td>${escapeOperationDetail(item.modal || '—')}</td><td class="outside-date">${formatOperationDateTime(item.data_operacao, start)}</td><td class="outside-date">${formatOperationDateTime(item.data_operacao, finish)}</td><td>${formatDetailMinutes(duration)}</td><td>${formatDetailMinutes(item.meta_min)}</td><td><b class="outside-delay">${delay === null ? '—' : `+${formatDetailMinutes(delay)}`}</b></td></tr>`;
    }).join('') : '<tr><td colspan="8" class="outside-goal-empty">Nenhuma OS encontrada.</td></tr>';
  };
  const openOutsideGoalDetails = (indicator, label) => {
    const selectedMonths = [...operationMonths.selectedOptions].map(option => option.value);
    document.querySelector('#outsideGoalTitle').textContent = `OS fora da meta · ${label}`;
    document.querySelector('#outsideGoalSubtitle').textContent = 'Carregando os registros da consulta atual...';
    document.querySelector('#outsideGoalCount').textContent = '';
    outsideGoalRows.innerHTML = '<tr><td colspan="8" class="outside-goal-empty">Carregando...</td></tr>';
    outsideGoalSearch.value = '';
    outsideGoalDialog.showModal();
    fetch(`/api/operacoes-fora-meta?indicador=${encodeURIComponent(indicator)}&meses=${selectedMonths.join(',')}`).then(response => {
      if (!response.ok) throw new Error('API indisponível');
      return response.json();
    }).then(rows => {
      currentOutsideGoalRows = rows;
      document.querySelector('#outsideGoalSubtitle').textContent = 'Datas no padrão SARA, duração, limite aplicável e atraso.';
      renderOutsideGoalRows();
    }).catch(() => {
      currentOutsideGoalRows = [];
      document.querySelector('#outsideGoalSubtitle').textContent = 'Não foi possível consultar os registros.';
      outsideGoalRows.innerHTML = '<tr><td colspan="8" class="outside-goal-empty">Tente novamente em instantes.</td></tr>';
    });
  };
  outsideGoalSearch.addEventListener('input', renderOutsideGoalRows);
  outsideGoalDialog.querySelector('.outside-goal-close').addEventListener('click', () => outsideGoalDialog.close());
  outsideGoalDialog.addEventListener('click', event => { if (event.target === outsideGoalDialog) outsideGoalDialog.close(); });
  const operationMonthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const operationAvailableMonth = new Date().getMonth() + 1;
  const operationParams = new URLSearchParams(location.search);
  const savedOperationMonths = localStorage.getItem('enso-operation-months');
  const operationSelected = (operationParams.get('meses') || savedOperationMonths || Array.from({length:operationAvailableMonth},(_,index)=>index+1).join(',')).split(',');
  document.querySelector('.kpi-grid').insertAdjacentHTML('beforebegin', `<div class="operation-month-only"><label>Meses<select id="operationMonths" multiple size="1">${operationMonthNames.slice(0,operationAvailableMonth).map((name,index) => `<option value="${index+1}" ${operationSelected.includes(String(index+1))?'selected':''}>${name}</option>`).join('')}</select></label></div>`);
  const operationMonths = document.querySelector('#operationMonths');
  const loadOperationData = () => {
  const selectedMonths = [...operationMonths.selectedOptions].map(option => option.value);
  return fetch(`/api/operacao-mensal?meses=${selectedMonths.join(',')}`).then(response => {
    if (!response.ok) throw new Error('API indisponível');
    return response.json();
  }).then(data => {
    const summary = data.resumo || {};
    const analyzed = (summary.dentro || 0) + (summary.fora || 0);
    const duration = Math.round(summary.tempo_medio || 0);
    const durationLabel = `${Math.floor(duration / 60)}h ${String(duration % 60).padStart(2, '0')}`;
    document.querySelector('.hero .lead').textContent = `Volumes e perfil das ${formatMonthly(summary.total || 0)} ordens de serviço de ${data.ano}.`;
    const indicatorLabels = { 'CARREGAMENTO GERAL':'Carregamento geral', DTA:'Descarga DTA', 'DTA-S MARITIMO':'DTA-S Marítimo', 'DTA-S AEREO':'DTA-S Aéreo' };
    const indicatorGoals = ['0h35','1h10','1h50','1h05'];
    const indicatorOrder = ['CARREGAMENTO GERAL','DTA','DTA-S MARITIMO','DTA-S AEREO'];
    const indicatorMap = Object.fromEntries((data.indicadores || []).map(item => [item.indicador,item]));
    const kpiContainer = document.querySelector('.kpi-grid, .indicator-kpi-groups');
    if (kpiContainer) {
      kpiContainer.className = 'indicator-kpi-groups';
      kpiContainer.innerHTML = indicatorOrder.map(key => {
        const item = indicatorMap[key] || { total:0,dentro:0,fora:0,aderencia:0,tempo_medio:0 };
        const itemDuration = Math.round(item.tempo_medio || 0);
        const itemDurationLabel = `${Math.floor(itemDuration / 60)}h ${String(itemDuration % 60).padStart(2,'0')}`;
        const itemAnalyzed = item.dentro + item.fora;
        return `<section class="indicator-kpi-section"><div class="indicator-kpi-title"><span>PROCESSO</span><h2>${indicatorLabels[key]}</h2><small>${formatMonthly(itemAnalyzed)} operações analisáveis</small></div><div class="indicator-kpi-row"><article class="kpi featured"><span>ADERÊNCIA À META</span><strong>${String(item.aderencia).replace('.',',')}%</strong><p>Percentual dentro do prazo</p></article><article class="kpi"><span>ORDENS DE SERVIÇO</span><strong>${formatMonthly(item.total)}</strong><p>Volume total do processo</p></article><article class="kpi success-kpi"><span>DENTRO DA META</span><strong>${formatMonthly(item.dentro)}</strong><p>Operações dentro do prazo</p></article><article class="kpi danger-kpi"><button class="outside-goal-open" type="button" data-indicator="${key}" data-label="${indicatorLabels[key]}" aria-label="Ver OS fora da meta de ${indicatorLabels[key]}">+</button><span>FORA DA META</span><strong>${formatMonthly(item.fora)}</strong><p>Operações acima do prazo</p></article><article class="kpi"><span>TEMPO MÉDIO</span><strong>${itemDurationLabel}</strong><p>Do início ao término da OS</p></article></div></section>`;
      }).join('');
      kpiContainer.querySelectorAll('.indicator-kpi-section').forEach((section, index) => {
        const timeCard = section.querySelector('.indicator-kpi-row .kpi:last-child');
        timeCard.classList.add('time-kpi');
        timeCard.insertAdjacentHTML('beforeend', `<small class="enso-goal">Objetivo ENSO <b>${indicatorGoals[index]}</b></small>`);
      });
      kpiContainer.querySelectorAll('.outside-goal-open').forEach(button => button.addEventListener('click', () => openOutsideGoalDetails(button.dataset.indicator, button.dataset.label)));
    }
    const modalTotal = data.modal.reduce((sum, item) => sum + item.total, 0);
    const modalColors = ['var(--green)','var(--teal)','var(--sand)'];
    const modalPanel = document.querySelector('.modal-panel');
    const modalDonut = modalPanel?.querySelector('.donut');
    let accumulated = 0;
    if (modalDonut && modalTotal) {
      const segments = data.modal.map((item, index) => { const start = accumulated; accumulated += item.total * 100 / modalTotal; return `${modalColors[index] || '#a9bbb5'} ${start}% ${accumulated}%`; });
      modalDonut.style.background = `conic-gradient(${segments.join(',')})`;
      modalDonut.querySelector('strong').textContent = formatMonthly(modalTotal);
    }
    const legend = modalPanel?.querySelector('.legend');
    if (legend) legend.innerHTML = data.modal.map((item, index) => `<li><i style="background:${modalColors[index] || '#a9bbb5'}"></i><span>${item.nome}</span><b>${formatMonthly(item.total)} · ${Math.round(item.total * 100 / modalTotal)}%</b></li>`).join('');
    const operationClients = document.querySelector('.operation-clients .client-table');
    if (operationClients) operationClients.innerHTML = '<div class="table-row header"><span>#</span><span>Cliente</span><span>Ordens</span><span>Participação relativa</span></div>' + data.clientes.map((item,index) => `<div class="table-row"><b>${String(index+1).padStart(2,'0')}</b><span>${item.cliente}</span><strong>${formatMonthly(item.total)}</strong><div class="micro"><i style="width:${item.total * 100 / data.clientes[0].total}%"></i></div></div>`).join('');
    const maximum = Math.max(...data.meses.map(item => item.total), 1);
    monthlyBars.innerHTML = data.meses.map(item => `
      <div class="month-group">
        <div class="month-total"><span>${formatMonthly(item.total)}</span><em>total</em></div>
        <div class="bar-pair">
          <div class="bar-column" style="--h:${item.dentro * 100 / maximum}%" data-tooltip="${monthNames[item.mes - 1]} · Dentro da meta: ${formatMonthly(item.dentro)}" tabindex="0"><span>${formatMonthly(item.dentro)}</span><i class="inside-bar"></i></div>
          <div class="bar-column" style="--h:${item.fora * 100 / maximum}%" data-tooltip="${monthNames[item.mes - 1]} · Fora da meta: ${formatMonthly(item.fora)}" tabindex="0"><span>${formatMonthly(item.fora)}</span><i class="outside-bar"></i></div>
        </div>
        <small>${monthNames[item.mes - 1]}</small>
      </div>`).join('');
    document.querySelector('.chart-panel .bar-legend')?.remove();
    document.querySelector('.chart-panel .panel-head').insertAdjacentHTML('beforeend', '<div class="bar-legend" aria-label="Legenda do gráfico"><span><i></i><b>Azul</b> · Dentro da meta</span><span><i></i><b>Vermelho</b> · Fora da meta</span></div>');
  }).catch(() => { monthlyBars.innerHTML = '<p class="loading">Não foi possível carregar o volume mensal.</p>'; });
  };
  operationMonths.addEventListener('change', () => {
    localStorage.setItem('enso-operation-months', [...operationMonths.selectedOptions].map(option => option.value).join(','));
    loadOperationData();
  });
  loadOperationData();
}
