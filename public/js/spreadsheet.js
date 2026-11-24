/**
 * SpreadsheetViewer - Afficheur de tableur Excel pour BizPlan AI
 * Renders business plan data in an Excel-like grid interface
 */
class SpreadsheetViewer {
  constructor() {
    this.container = document.getElementById('spreadsheet-container');
    this.tabsContainer = document.getElementById('sheet-tabs');
    this.toolbar = document.getElementById('spreadsheet-toolbar');
    this.formulaBar = document.getElementById('formula-bar');
    this.emptyState = document.getElementById('spreadsheet-empty');
    this.filenameEl = document.getElementById('spreadsheet-filename');
    this.cellRefEl = document.getElementById('cell-ref');
    this.cellValueEl = document.getElementById('cell-value');

    this.sheets = [];
    this.activeSheetIndex = 0;
    this.selectedCell = null;
    this.businessPlanData = null;

    // Inject dynamic styles
    const style = document.createElement('style');
    style.textContent = `
      .cell-selected { outline: 2px solid #2563eb !important; outline-offset: -1px; background-color: #eff6ff !important; }
      .cell-text-center { text-align: center; }
    `;
    document.head.appendChild(style);
  }

  show() {
    if (this.emptyState) this.emptyState.setAttribute('hidden','');
    if (this.toolbar) this.toolbar.removeAttribute('hidden');
    if (this.formulaBar) this.formulaBar.removeAttribute('hidden');
    if (this.container) this.container.removeAttribute('hidden');
    if (this.tabsContainer) this.tabsContainer.removeAttribute('hidden');
  }

  hide() {
    if (this.emptyState) this.emptyState.removeAttribute('hidden');
    if (this.toolbar) this.toolbar.setAttribute('hidden','');
    if (this.formulaBar) this.formulaBar.setAttribute('hidden','');
    if (this.container) this.container.setAttribute('hidden','');
    if (this.tabsContainer) this.tabsContainer.setAttribute('hidden','');
  }

  loadData(planData, animate = true) {
    this.businessPlanData = planData;
    this.sheets = planData.sheets || [];
    if (this.sheets.length === 0) { this.hide(); return; }

    if (planData.meta && planData.meta.entreprise) {
      const safeName = planData.meta.entreprise.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ\s_-]/gi, '').replace(/\s+/g, '_');
      if (this.filenameEl) this.filenameEl.textContent = `business_plan_${safeName}.xlsx`;
    }

    this.show();
    this.activeSheetIndex = 0;
    this.renderTabs();
    this.renderSheet(0, animate);
  }

  updateSheets(updatedSheets) {
    for (const updated of updatedSheets) {
      const idx = this.sheets.findIndex(s => s.name === updated.name);
      if (idx >= 0) this.sheets[idx] = updated;
      else this.sheets.push(updated);
    }
    this.renderTabs();
    const firstIdx = this.sheets.findIndex(s => s.name === updatedSheets[0].name);
    if (firstIdx >= 0) this.switchSheet(firstIdx, true);
  }

  renderTabs() {
    if (!this.tabsContainer) return;
    this.tabsContainer.innerHTML = '';
    this.sheets.forEach((sheet, i) => {
      const tab = document.createElement('button');
      tab.className = `sheet-tab${i === this.activeSheetIndex ? ' active' : ''}`;
      tab.textContent = sheet.name;
      tab.addEventListener('click', () => this.switchSheet(i));
      this.tabsContainer.appendChild(tab);
    });
  }

  switchSheet(index, animate = false) {
    this.activeSheetIndex = index;
    this.renderTabs();
    this.renderSheet(index, animate);
  }

  renderSheet(sheetIndex, animate = false) {
    const sheet = this.sheets[sheetIndex];
    if (!sheet || !sheet.data || sheet.data.length === 0) {
      if (this.container) this.container.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8;">Feuille vide</div>';
      return;
    }

    const data = sheet.data;
    let maxCols = 0;
    for (const row of data) {
      let cs = 0;
      for (const cell of row) cs += (cell.cs || 1);
      if (cs > maxCols) maxCols = cs;
    }
    maxCols = Math.max(maxCols, 6);

    let html = '<table class="spreadsheet-table"><thead><tr><th class="corner-cell"></th>';
    for (let c = 0; c < maxCols; c++) html += `<th class="col-header">${this.getColLetter(c)}</th>`;
    html += '</tr></thead><tbody>';

    const merged = new Set();

    for (let r = 0; r < data.length; r++) {
      const row = data[r];
      html += `<tr><td class="row-number">${r + 1}</td>`;
      let ci = 0;

      for (let c = 0; c < row.length; c++) {
        while (merged.has(`${r}-${ci}`)) ci++;
        const cell = row[c];
        const cs = cell.cs || 1;
        const rs = cell.rs || 1;

        if (cs > 1 || rs > 1) {
          for (let mr = 0; mr < rs; mr++)
            for (let mc = 0; mc < cs; mc++)
              if (mr !== 0 || mc !== 0) merged.add(`${r + mr}-${ci + mc}`);
        }

        const sc = this.getCellStyleClass(cell.s);
        const csA = cs > 1 ? ` colspan="${cs}"` : '';
        const rsA = rs > 1 ? ` rowspan="${rs}"` : '';
        const ac = animate ? ' cell-animate' : '';
        const ad = animate ? ` style="animation-delay:${r * 25 + c * 8}ms"` : '';
        const dv = this.formatCellValue(cell.v, cell.s);
        const da = ` data-row="${r}" data-col="${ci}" data-raw="${this.escapeAttr(String(cell.v || ''))}"`;
        html += `<td class="cell ${sc}${ac}"${csA}${rsA}${ad}${da}>${dv}</td>`;
        ci += cs;
      }

      while (ci < maxCols) {
        if (!merged.has(`${r}-${ci}`)) html += `<td class="cell cell-empty" data-row="${r}" data-col="${ci}" data-raw=""></td>`;
        ci++;
      }
      html += '</tr>';
    }

    for (let r = data.length; r < data.length + 4; r++) {
      html += `<tr><td class="row-number">${r + 1}</td>`;
      for (let c = 0; c < maxCols; c++) html += `<td class="cell cell-empty" data-row="${r}" data-col="${c}" data-raw=""></td>`;
      html += '</tr>';
    }

    html += '</tbody></table>';
    this.container.innerHTML = html;
    this.container.scrollTop = 0;

    this.container.querySelectorAll('td.cell').forEach(td => {
      td.addEventListener('click', () => this.selectCell(td));
    });
    this.updateFormulaBar('A1', '');
  }

  selectCell(td) {
    this.container.querySelectorAll('.cell-selected').forEach(el => el.classList.remove('cell-selected'));
    td.classList.add('cell-selected');
    const r = parseInt(td.dataset.row);
    const c = parseInt(td.dataset.col);
    this.updateFormulaBar(`${this.getColLetter(c)}${r + 1}`, td.dataset.raw);
  }

  updateFormulaBar(ref, val) {
    if (this.cellRefEl) this.cellRefEl.textContent = ref;
    if (this.cellValueEl) this.cellValueEl.textContent = val;
  }

  getColLetter(i) {
    let l = '';
    while (i >= 0) { l = String.fromCharCode(65 + (i % 26)) + l; i = Math.floor(i / 26) - 1; }
    return l;
  }

  getCellStyleClass(s) {
    const m = {
      'title':'cell-title','subtitle':'cell-subtitle','header':'cell-header','subheader':'cell-subheader',
      'label':'cell-label','value':'cell-value','text':'cell-value','text-center':'cell-value cell-text-center',
      'number':'cell-number','currency':'cell-currency','currency-negative':'cell-currency-negative',
      'percent':'cell-percent','total':'cell-total','total-currency':'cell-total cell-currency',
      'formula':'cell-formula','empty':'cell-empty','highlight':'cell-highlight'
    };
    return m[s] || 'cell-value';
  }

  formatCellValue(v, s) {
    if (v === null || v === undefined || v === '') return '';
    if (s === 'currency' || s === 'total-currency' || s === 'currency-negative') {
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.-]/g, ''));
      if (!isNaN(n)) return `${n < 0 ? '-' : ''}${Math.abs(n).toLocaleString('fr-FR', {maximumFractionDigits: 0})}`;
    }
    if (s === 'percent') {
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.-]/g, ''));
      if (!isNaN(n)) return `${n.toLocaleString('fr-FR', {maximumFractionDigits: 1})}%`;
    }
    if (s === 'number') {
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.-]/g, ''));
      if (!isNaN(n)) return n.toLocaleString('fr-FR');
    }
    return this.escapeHtml(String(v));
  }

  escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  escapeAttr(t) { return t.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  getSheetsData() { return this.sheets; }
  getMeta() { return this.businessPlanData?.meta || {}; }
}

window.spreadsheetViewer = new SpreadsheetViewer();
