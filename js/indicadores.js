const elements = {
  indicator: document.querySelector('#indicator'), modal: document.querySelector('#modal'),
  period: document.querySelector('#period'), search: document.querySelector('#search'),
  total: document.querySelector('#total'), outside: document.querySelector('#outside'),
  percentage: document.querySelector('#percentage'), riskBar: document.querySelector('#riskBar'),
  modalRows: document.querySelector('#modalRows'), periodRows: document.querySelector('#periodRows'),
  regimeRows: null, regimeSection: null, kpiTitle: document.querySelector('.data-kpis article span'),
  customerRows: document.querySelector('#customerRows'), clientCount: document.querySelector('#clientCount'),
  error: document.querySelector('#apiError'), update: document.querySelector('#lastUpdate')
};

const format = value => new Intl.NumberFormat('pt-BR').format(value);
const rateClass = rate => rate <= 10 ? 'good' : rate <= 20 ? 'warn' : 'bad';
const rate = value => `<span class="rate ${rateClass(value)}">${value}%</span>`;
let requestTimer;

const kpiIllustrations = [
  '<div class="kpi-visual visual-load" aria-hidden="true"><i class="load-box box-one"></i><i class="load-box box-two"></i><i class="truck-body"></i><i class="truck-cab"></i><b class="wheel-one"></b><b class="wheel-two"></b></div>',
  '<div class="kpi-visual visual-alert" aria-hidden="true"><i class="alert-ring"></i><i class="clock-hand hand-one"></i><i class="clock-hand hand-two"></i><b>!</b></div>',
  '<div class="kpi-visual visual-percent" aria-hidden="true"><i></i><b>%</b><span></span></div>'
];
document.querySelectorAll('.data-kpis article').forEach((card, index) => {
  if (kpiIllustrations[index]) card.insertAdjacentHTML('beforeend', kpiIllustrations[index]);
});
const executiveKpiLabels = document.querySelectorAll('.data-kpis article > span');
if (executiveKpiLabels[1]) executiveKpiLabels[1].textContent = 'FORA DA META';
if (executiveKpiLabels[2]) executiveKpiLabels[2].textContent = '% FORA DA META';

elements.indicator.insertAdjacentHTML('afterbegin', '<option value="CARREGAMENTO GERAL">Carregamento Geral</option>');
elements.indicator.value = 'CARREGAMENTO GERAL';
elements.modal.closest('label').insertAdjacentHTML('beforebegin', '<label>Semestre<select id="semester"><option value="1">1º semestre</option><option value="2">2º semestre</option><option value="">Ano completo</option></select></label>');
elements.semester = document.querySelector('#semester');
elements.semester.value = '';
const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const currentMonth = new Date().getMonth() + 1;
const monthOptions = monthNames.slice(0, currentMonth).map((name, index) => `<option value="${index + 1}" selected>${name}</option>`).join('');
elements.search.closest('label').insertAdjacentHTML('beforebegin', `<label class="month-filter">Meses<select id="months" multiple size="1" aria-label="Selecionar meses">${monthOptions}</select><small>Selecione um ou mais meses</small></label>`);
elements.search.closest('label').remove();
elements.months = document.querySelector('#months');
elements.search = null;
elements.periodRows.insertAdjacentHTML('afterend', '<div id="regimeSection"><div class="panel-head second"><div><p class="eyebrow">REGIME</p><h2>Desempenho por regime</h2></div></div><div id="regimeRows" class="metric-rows"></div></div>');
elements.regimeRows = document.querySelector('#regimeRows');
elements.regimeSection = document.querySelector('#regimeSection');

const importForm = document.querySelector('#importForm');
const spreadsheet = document.querySelector('#spreadsheet');
const fileName = document.querySelector('#fileName');
const importButton = document.querySelector('#importButton');
const importMessage = document.querySelector('#importMessage');
document.body.insertAdjacentHTML('beforeend', `<div class="import-loading" id="importLoading" hidden role="status" aria-live="polite" aria-label="Importação em andamento"><div class="import-loading-card"><span class="import-spinner" aria-hidden="true"></span><p class="eyebrow">ATUALIZANDO INDICADORES</p><strong>Processando nova base</strong><small>Lendo as O.S., removendo duplicidades e recalculando as metas. Não feche esta página.</small></div></div>`);
const importLoading = document.querySelector('#importLoading');

async function loadLastUpdate() {
  try {
    const response = await fetch('/api/ultima-importacao');
    if (!response.ok) throw new Error('Data indisponível');
    const latest = await response.json();
    if (!latest?.importado_em) throw new Error('Sem importações');
    const updatedAt = new Date(latest.importado_em).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    elements.update.textContent = `${updatedAt} · ${format(latest.registros || 0)} O.S.`;
  } catch {
    elements.update.textContent = 'Data da última atualização indisponível';
  }
}

spreadsheet.addEventListener('change', () => {
  fileName.textContent = spreadsheet.files[0]?.name || 'Nenhum arquivo selecionado';
  if (spreadsheet.files.length) importForm.requestSubmit();
});
importForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!spreadsheet.files.length) return;
  importButton.disabled = true; importButton.textContent = 'Analisando...';
  importLoading.hidden = false;
  document.body.classList.add('is-importing');
  importMessage.hidden = false; importMessage.className = 'import-message';
  importMessage.textContent = 'Lendo e recalculando a base. Isso pode levar alguns segundos.';
  try {
    const body = new FormData(); body.append('planilha', spreadsheet.files[0]);
    const response = await fetch('/api/importar', { method: 'POST', body });
    const result = await response.json();
    if (!response.ok) throw new Error(result.erro || 'Não foi possível importar.');
    importMessage.classList.add('success');
    const duplicates = result.duplicados_descartados || 0;
    importMessage.textContent = `${format(result.registros)} O.S. únicas importadas; ${format(result.analisados)} analisadas; ${format(duplicates)} duplicidades descartadas.`;
    await loadData();
    await loadLastUpdate();
  } catch (error) {
    importMessage.classList.add('error'); importMessage.textContent = error.message;
  } finally {
    importButton.disabled = false; importButton.textContent = 'Importar e analisar';
    importLoading.hidden = true;
    document.body.classList.remove('is-importing');
  }
});

function dimensionRows(items, dimensionLabel) {
  if (!items.length) return '<p class="loading">Nenhum dado encontrado.</p>';
  const header = `<div class="metric-row metric-header"><span>${dimensionLabel}</span><span>Total</span><span>Qtd fora</span><span>% fora</span></div>`;
  return header + items.map(item => `<div class="metric-row"><span>${item.nome}</span><span>${format(item.total)}</span><span>${format(item.fora)}</span>${rate(item.percentual)}</div>`).join('');
}

async function loadData() {
  const showModalPerformance = elements.indicator.value === 'CARREGAMENTO GERAL' || elements.indicator.value === 'DTA';
  elements.modalRows.hidden = !showModalPerformance;
  elements.modalRows.previousElementSibling.hidden = !showModalPerformance;
  elements.modalRows.style.display = showModalPerformance ? '' : 'none';
  elements.modalRows.previousElementSibling.style.display = showModalPerformance ? '' : 'none';
  elements.regimeSection.hidden = elements.indicator.value !== 'CARREGAMENTO GERAL';
  if (!elements.indicator.value) {
    elements.total.textContent = '—';
    elements.outside.textContent = '—';
    elements.percentage.textContent = '—';
    elements.riskBar.style.width = '0';
    elements.kpiTitle.textContent = 'QUANTIDADE';
    elements.modalRows.innerHTML = '<p class="loading">Selecione um indicador para consultar.</p>';
    elements.periodRows.innerHTML = '<p class="loading">Selecione um indicador para consultar.</p>';
    elements.customerRows.innerHTML = '<p class="loading">Selecione um indicador para consultar.</p>';
    elements.clientCount.textContent = '';
    elements.update.textContent = 'Aguardando seleção do indicador';
    elements.error.hidden = true;
    return;
  }
  const query = new URLSearchParams({ indicador: elements.indicator.value });
  if (elements.semester.value) query.set('semestre', elements.semester.value);
  if (elements.modal.value) query.set('modal', elements.modal.value);
  if (elements.period.value) query.set('horario', elements.period.value);
  const selectedMonths = [...elements.months.selectedOptions].map(option => option.value);
  if (selectedMonths.length) query.set('meses', selectedMonths.join(','));
  elements.customerRows.innerHTML = '<p class="loading">Consultando o banco...</p>';
  try {
    const response = await fetch(`/api/indicadores?${query}`);
    if (!response.ok) throw new Error('API indisponível');
    const data = await response.json();
    elements.error.hidden = true;
    elements.total.textContent = format(data.total);
    elements.kpiTitle.textContent = data.indicador === 'CARREGAMENTO GERAL' ? 'QTD. CARREGAMENTOS' : 'QUANTIDADE DTA';
    elements.outside.textContent = format(data.fora);
    elements.percentage.textContent = `${data.percentual}%`;
    elements.riskBar.style.width = `${Math.min(data.percentual, 100)}%`;
    document.querySelector('.visual-percent')?.style.setProperty('--kpi-percent', `${Math.min(data.percentual, 100)}%`);
    elements.modalRows.innerHTML = dimensionRows(data.modal, 'Modal');
    elements.periodRows.innerHTML = dimensionRows(data.horario, 'Horário');
    elements.regimeRows.innerHTML = dimensionRows(data.regime || [], 'Regime');
    const offendingClients = data.clientes.filter(item => Number(item.fora) > 0);
    elements.clientCount.textContent = `${offendingClients.length} clientes ofensores`;
    elements.customerRows.innerHTML = offendingClients.map(item => `<div class="customer-row"><span>${item.cliente}</span><span>${format(item.total)}</span><span>${format(item.fora)}</span>${rate(item.percentual)}</div>`).join('') || '<p class="loading">Nenhum cliente fora da meta no período.</p>';
    if (!Array.isArray(data.regime)) {
      elements.error.querySelector('strong').textContent = 'O servidor precisa ser reiniciado.';
      elements.error.querySelector('span').innerHTML = 'Feche a janela antiga do servidor e abra novamente pelo <code>INICIAR_SITE.bat</code>.';
      elements.error.hidden = false;
    }
  } catch (error) {
    elements.error.hidden = false;
    elements.error.querySelector('strong').textContent = 'Não foi possível acessar o banco.';
    elements.error.querySelector('span').innerHTML = 'Inicie o módulo executando <code>python servidor.py</code> na pasta do projeto.';
    elements.customerRows.innerHTML = '<p class="loading">Aguardando conexão com o banco...</p>';
  }
}

[elements.indicator, elements.modal, elements.period].forEach(input => input.addEventListener('change', loadData));
elements.months.addEventListener('change', () => {
  const monthItems = [...elements.months.options];
  const selected = monthItems.filter(option => option.selected).map(option => Number(option.value));
  elements.semester.value = selected.length && selected.every(month => month <= 6) ? '1' : (selected.length && selected.every(month => month >= 7) ? '2' : '');
  loadData();
});
elements.semester.addEventListener('change', () => {
  const available = [...elements.months.options].filter(option => option.value !== '__all__').map(option => Number(option.value));
  const allowed = elements.semester.value === '1' ? available.filter(month => month <= 6) : (elements.semester.value === '2' ? available.filter(month => month >= 7) : available);
  [...elements.months.options].forEach(option => { option.selected = allowed.includes(Number(option.value)); });
  loadData();
});
document.querySelector('#clearFilters').addEventListener('click', () => { elements.indicator.value='CARREGAMENTO GERAL'; elements.semester.value=''; elements.modal.value=''; elements.period.value=''; [...elements.months.options].forEach(option => { option.selected = option.value !== '__all__'; }); loadData(); });
loadData();
loadLastUpdate();
