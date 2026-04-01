const STORAGE_KEY = 'trade_journal_entries_v1';

const state = {
  trades: loadTrades(),
  folderHandle: null,
};

const elements = {
  tradeForm: document.getElementById('tradeForm'),
  formTitle: document.getElementById('formTitle'),
  submitBtn: document.getElementById('submitBtn'),
  tradeId: document.getElementById('tradeId'),
  date: document.getElementById('date'),
  expirationDate: document.getElementById('expirationDate'),
  ticker: document.getElementById('ticker'),
  entryPrice: document.getElementById('entryPrice'),
  exitPrice: document.getElementById('exitPrice'),
  plPercent: document.getElementById('plPercent'),
  reason: document.getElementById('reason'),
  resetBtn: document.getElementById('resetBtn'),
  tradeTableBody: document.getElementById('tradeTableBody'),
  tradeCount: document.getElementById('tradeCount'),
  runningTotal: document.getElementById('runningTotal'),
  dayPnL: document.getElementById('dayPnL'),
  weekPnL: document.getElementById('weekPnL'),
  yearPnL: document.getElementById('yearPnL'),
  yearFilter: document.getElementById('yearFilter'),
  weekFilter: document.getElementById('weekFilter'),
  dayFilter: document.getElementById('dayFilter'),
  clearFiltersBtn: document.getElementById('clearFiltersBtn'),
  excelInput: document.getElementById('excelInput'),
  saveLocalBtn: document.getElementById('saveLocalBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
};

init();

function init() {
  elements.tradeForm.addEventListener('submit', onFormSubmit);
  elements.resetBtn.addEventListener('click', resetForm);
  elements.yearFilter.addEventListener('change', render);
  elements.weekFilter.addEventListener('change', render);
  elements.dayFilter.addEventListener('change', render);
  elements.clearFiltersBtn.addEventListener('click', clearFilters);
  elements.excelInput.addEventListener('change', onExcelImport);
  elements.exportJsonBtn.addEventListener('click', exportJson);
  elements.saveLocalBtn.addEventListener('click', saveToLocalFolder);

  render();
}

function onFormSubmit(event) {
  event.preventDefault();

  const payload = {
    id: elements.tradeId.value || crypto.randomUUID(),
    date: elements.date.value,
    expirationDate: elements.expirationDate.value,
    ticker: elements.ticker.value.trim().toUpperCase(),
    entryPrice: toNum(elements.entryPrice.value),
    exitPrice: toNum(elements.exitPrice.value),
    plPercent: toNum(elements.plPercent.value),
    reason: elements.reason.value.trim(),
  };

  if (!payload.date || !payload.ticker || Number.isNaN(payload.plPercent)) {
    alert('Date, ticker, and P/L % are required.');
    return;
  }

  const index = state.trades.findIndex((trade) => trade.id === payload.id);
  if (index >= 0) {
    state.trades[index] = payload;
  } else {
    state.trades.push(payload);
  }

  sortTrades();
  persistTrades();
  resetForm();
  render();
}

function resetForm() {
  elements.tradeForm.reset();
  elements.tradeId.value = '';
  elements.formTitle.textContent = 'Add Trade';
  elements.submitBtn.textContent = 'Add Trade';
}

function editTrade(id) {
  const trade = state.trades.find((item) => item.id === id);
  if (!trade) return;

  elements.tradeId.value = trade.id;
  elements.date.value = trade.date || '';
  elements.expirationDate.value = trade.expirationDate || '';
  elements.ticker.value = trade.ticker || '';
  elements.entryPrice.value = trade.entryPrice ?? '';
  elements.exitPrice.value = trade.exitPrice ?? '';
  elements.plPercent.value = trade.plPercent ?? '';
  elements.reason.value = trade.reason || '';

  elements.formTitle.textContent = 'Edit Trade';
  elements.submitBtn.textContent = 'Update Trade';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function removeTrade(id) {
  const shouldDelete = confirm('Delete this trade log entry?');
  if (!shouldDelete) return;

  state.trades = state.trades.filter((item) => item.id !== id);
  persistTrades();
  render();
}

function render() {
  populateYearFilter();
  populateWeekFilter();

  const filtered = getFilteredTrades();
  const withRunning = computeRunningTotals(filtered);

  renderTable(withRunning);
  renderMetrics(filtered);
}

function renderTable(trades) {
  if (!trades.length) {
    elements.tradeTableBody.innerHTML = '<tr><td colspan="9" class="empty-state">No trades match the selected filters.</td></tr>';
    elements.tradeCount.textContent = '0 trades';
    return;
  }

  elements.tradeCount.textContent = `${trades.length} trade${trades.length === 1 ? '' : 's'}`;

  const rows = trades.map((trade) => {
    const pnlClass = trade.plPercent >= 0 ? 'value-win' : 'value-loss';
    const rowClass = trade.plPercent >= 0 ? 'win' : 'loss';
    return `
      <tr class="${rowClass}">
        <td>${escapeHtml(trade.date)}</td>
        <td>${escapeHtml(trade.expirationDate || '-')}</td>
        <td>${escapeHtml(trade.ticker)}</td>
        <td>${fmtPrice(trade.entryPrice)}</td>
        <td>${fmtPrice(trade.exitPrice)}</td>
        <td class="${pnlClass}">${fmtPct(trade.plPercent)}</td>
        <td class="${trade.runningTotal >= 0 ? 'value-win' : 'value-loss'}">${fmtPct(trade.runningTotal)}</td>
        <td>${escapeHtml(trade.reason || '-')}</td>
        <td>
          <div class="action-buttons">
            <button class="button secondary" data-action="edit" data-id="${trade.id}">Edit</button>
            <button class="button secondary" data-action="delete" data-id="${trade.id}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  elements.tradeTableBody.innerHTML = rows;
  elements.tradeTableBody.querySelectorAll('button[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => editTrade(btn.dataset.id));
  });
  elements.tradeTableBody.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => removeTrade(btn.dataset.id));
  });
}

function renderMetrics(filteredTrades) {
  const runningTotal = filteredTrades.reduce((sum, trade) => sum + toNum(trade.plPercent), 0);
  const now = new Date();
  const currentDay = now.toISOString().slice(0, 10);
  const currentWeek = isoWeekKey(currentDay);
  const currentYear = String(now.getUTCFullYear());

  const dayPnL = filteredTrades
    .filter((trade) => trade.date === currentDay)
    .reduce((sum, trade) => sum + toNum(trade.plPercent), 0);

  const weekPnL = filteredTrades
    .filter((trade) => isoWeekKey(trade.date) === currentWeek)
    .reduce((sum, trade) => sum + toNum(trade.plPercent), 0);

  const yearPnL = filteredTrades
    .filter((trade) => trade.date?.slice(0, 4) === currentYear)
    .reduce((sum, trade) => sum + toNum(trade.plPercent), 0);

  setMetric(elements.runningTotal, runningTotal);
  setMetric(elements.dayPnL, dayPnL);
  setMetric(elements.weekPnL, weekPnL);
  setMetric(elements.yearPnL, yearPnL);
}

function setMetric(el, value) {
  el.textContent = fmtPct(value);
  el.classList.toggle('value-win', value >= 0);
  el.classList.toggle('value-loss', value < 0);
}

function getFilteredTrades() {
  const yearFilter = elements.yearFilter.value;
  const weekFilter = elements.weekFilter.value;
  const dayFilter = elements.dayFilter.value;

  return state.trades.filter((trade) => {
    const year = trade.date?.slice(0, 4);
    const week = isoWeekKey(trade.date);

    const yearOk = yearFilter === 'all' || year === yearFilter;
    const weekOk = weekFilter === 'all' || week === weekFilter;
    const dayOk = !dayFilter || trade.date === dayFilter;

    return yearOk && weekOk && dayOk;
  });
}

function populateYearFilter() {
  const current = elements.yearFilter.value;
  const years = [...new Set(state.trades.map((trade) => trade.date?.slice(0, 4)).filter(Boolean))].sort().reverse();

  elements.yearFilter.innerHTML = '<option value="all">All</option>' + years.map((year) => `<option value="${year}">${year}</option>`).join('');
  elements.yearFilter.value = years.includes(current) || current === 'all' ? current : 'all';
}

function populateWeekFilter() {
  const current = elements.weekFilter.value;

  let pool = state.trades;
  if (elements.yearFilter.value !== 'all') {
    pool = pool.filter((trade) => trade.date?.startsWith(elements.yearFilter.value));
  }

  const weeks = [...new Set(pool.map((trade) => isoWeekKey(trade.date)).filter(Boolean))].sort().reverse();

  elements.weekFilter.innerHTML = '<option value="all">All</option>' + weeks.map((week) => `<option value="${week}">${week}</option>`).join('');
  elements.weekFilter.value = weeks.includes(current) || current === 'all' ? current : 'all';
}

function computeRunningTotals(trades) {
  let total = 0;
  return [...trades]
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((trade) => {
      total += toNum(trade.plPercent);
      return { ...trade, runningTotal: total };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

function clearFilters() {
  elements.yearFilter.value = 'all';
  elements.weekFilter.value = 'all';
  elements.dayFilter.value = '';
  render();
}

function onExcelImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!window.XLSX) {
    alert('Excel parser not loaded.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const wb = XLSX.read(e.target.result, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    const imported = rows.map(mapImportRow).filter((row) => row.date && row.ticker);
    state.trades = mergeTrades(state.trades, imported);
    sortTrades();
    persistTrades();
    render();
    alert(`Imported ${imported.length} trade(s).`);
  };
  reader.readAsArrayBuffer(file);
  event.target.value = '';
}

function mapImportRow(raw) {
  const norm = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.trim().toLowerCase(), v]));
  const date = asDateString(norm.date || norm.trade_date || norm.tradedate);
  const expirationDate = asDateString(norm.expirationdate || norm.expiration_date || norm.expiry || '');

  return {
    id: crypto.randomUUID(),
    date,
    expirationDate,
    ticker: String(norm.ticker || norm.symbol || '').toUpperCase().trim(),
    entryPrice: toNum(norm.entryprice ?? norm.entry_price ?? norm.entry ?? ''),
    exitPrice: toNum(norm.exitprice ?? norm.exit_price ?? norm.exit ?? ''),
    plPercent: toNum(norm['profitlosspercentage'] ?? norm['p/l%'] ?? norm.plpercent ?? norm.pl ?? 0),
    reason: String(norm.reasonfortrade ?? norm.reason ?? '').trim(),
  };
}

function mergeTrades(existing, incoming) {
  const hash = (trade) => `${trade.date}|${trade.ticker}|${trade.entryPrice}|${trade.exitPrice}|${trade.plPercent}`;
  const seen = new Set(existing.map(hash));
  const appended = incoming.filter((trade) => {
    const key = hash(trade);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...existing, ...appended];
}

async function saveToLocalFolder() {
  const fileName = `trade-log-${new Date().toISOString().slice(0, 10)}.json`;
  const payload = JSON.stringify(state.trades, null, 2);

  if ('showDirectoryPicker' in window) {
    try {
      state.folderHandle = state.folderHandle || await window.showDirectoryPicker();
      const fileHandle = await state.folderHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(payload);
      await writable.close();
      alert(`Saved in selected folder as ${fileName}`);
      return;
    } catch (error) {
      console.error(error);
      alert('Folder save canceled or failed. Downloading instead.');
    }
  }

  downloadBlob(payload, fileName, 'application/json');
}

function exportJson() {
  const fileName = `trade-log-export-${new Date().toISOString().slice(0, 10)}.json`;
  downloadBlob(JSON.stringify(state.trades, null, 2), fileName, 'application/json');
}

function downloadBlob(content, fileName, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function loadTrades() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistTrades() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.trades));
}

function sortTrades() {
  state.trades.sort((a, b) => (a.date > b.date ? 1 : -1));
}

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function fmtPct(value) {
  return `${toNum(value).toFixed(2)}%`;
}

function fmtPrice(value) {
  const n = toNum(value);
  return Number.isNaN(n) ? '-' : `$${n.toFixed(2)}`;
}

function isoWeekKey(dateString) {
  if (!dateString) return '';
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';

  const target = new Date(date.valueOf());
  const dayNr = (date.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);

  const weekNo = 1 + Math.round((target - firstThursday) / 604800000);
  const year = target.getUTCFullYear();
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

function asDateString(value) {
  if (!value) return '';

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return '';
    return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
