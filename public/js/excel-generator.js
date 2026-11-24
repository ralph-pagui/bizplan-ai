/**
 * ExcelGenerator - Génère des fichiers Excel (.xlsx) pour BizPlan AI
 * Utilise ExcelJS (CDN) pour créer des fichiers Excel professionnels
 */
class ExcelGenerator {
  constructor() {
    this.workbook = null;
  }

  async generateAndDownload(sheets, meta) {
    if (!sheets || sheets.length === 0) {
      alert("Aucune donnée à télécharger. Générez d'abord un business plan.");
      return;
    }
    try {
      this.workbook = new ExcelJS.Workbook();
      this.workbook.creator = 'BizPlan AI - Afrique Francophone';
      this.workbook.lastModifiedBy = 'BizPlan AI';
      this.workbook.created = new Date();
      this.workbook.modified = new Date();

      for (const sheetData of sheets) this.createSheet(sheetData);

      const buffer = await this.workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      let filename = 'business_plan.xlsx';
      if (meta && meta.entreprise) {
        const safe = meta.entreprise.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ\s_-]/gi, '').replace(/\s+/g, '_');
        filename = `business_plan_${safe}.xlsx`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Excel generation error:', err);
      alert('Erreur lors de la génération du fichier Excel. Veuillez réessayer.');
    }
  }

  createSheet(sheetData) {
    const ws = this.workbook.addWorksheet(sheetData.name, {
      properties: { tabColor: { argb: '059669' }, defaultRowHeight: 20 },
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
        margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 }
      },
      views: [{ state: 'normal', showGridLines: true }]
    });

    if (!sheetData.data || sheetData.data.length === 0) return;

    let maxCols = 0;
    for (const row of sheetData.data) {
      let cs = 0;
      for (const cell of row) cs += (cell.cs || 1);
      maxCols = Math.max(maxCols, cs);
    }

    for (let c = 1; c <= maxCols; c++) {
      const col = ws.getColumn(c);
      col.width = c === 1 ? 5 : c === 2 ? 30 : 20;
    }

    const mergedCells = new Set();

    for (let r = 0; r < sheetData.data.length; r++) {
      const rowData = sheetData.data[r];
      const excelRow = ws.getRow(r + 1);
      let ci = 1;

      for (let c = 0; c < rowData.length; c++) {
        while (mergedCells.has(`${r + 1}-${ci}`)) ci++;
        const cd = rowData[c];
        const cs = cd.cs || 1;
        const rs = cd.rs || 1;
        const cell = excelRow.getCell(ci);

        if (cd.v !== null && cd.v !== undefined && cd.v !== '') {
          if (['currency', 'currency-negative', 'total-currency', 'number', 'percent'].includes(cd.s)) {
            const n = typeof cd.v === 'number' ? cd.v : parseFloat(String(cd.v).replace(/[^\d.-]/g, ''));
            cell.value = !isNaN(n) ? n : cd.v;
          } else {
            cell.value = cd.v;
          }
        }

        this.applyCellStyle(cell, cd.s);
        this.applyCellFormat(cell, cd.s);

        if (cs > 1 || rs > 1) {
          const sr = r + 1, sc = ci, er = sr + rs - 1, ec = sc + cs - 1;
          ws.mergeCells(sr, sc, er, ec);
          for (let mr = sr; mr <= er; mr++)
            for (let mc = sc; mc <= ec; mc++)
              if (mr !== sr || mc !== sc) mergedCells.add(`${mr}-${mc}`);
        }
        ci += cs;
      }

      const hasTitle = rowData.some(c => c.s === 'title');
      const hasSub = rowData.some(c => c.s === 'subtitle');
      const hasHead = rowData.some(c => c.s === 'header');
      excelRow.height = hasTitle ? 35 : hasSub ? 28 : hasHead ? 25 : 22;
    }
  }

  applyCellStyle(cell, styleName) {
    const styles = {
      'title': {
        font: { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1E293B' } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
      },
      'subtitle': {
        font: { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF374151' } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
      },
      'header': {
        font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } },
        border: this.getBorder('thin', 'FF047857')
      },
      'subheader': {
        font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF065F46' } },
        alignment: { horizontal: 'left', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } },
        border: this.getBorder('thin', 'FFA7F3D0')
      },
      'label': {
        font: { name: 'Calibri', size: 11, color: { argb: 'FF374151' } },
        alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
        border: this.getBorder('thin', 'FFE5E7EB')
      },
      'value': {
        font: { name: 'Calibri', size: 11, color: { argb: 'FF1E293B' } },
        alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
        border: this.getBorder('thin', 'FFE5E7EB')
      },
      'text-center': {
        font: { name: 'Calibri', size: 11, color: { argb: 'FF1E293B' } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: this.getBorder('thin', 'FFE5E7EB')
      },
      'number': {
        font: { name: 'Calibri', size: 11, color: { argb: 'FF1E293B' } },
        alignment: { horizontal: 'right', vertical: 'middle' },
        border: this.getBorder('thin', 'FFE5E7EB')
      },
      'currency': {
        font: { name: 'Calibri', size: 11, color: { argb: 'FF059669' } },
        alignment: { horizontal: 'right', vertical: 'middle' },
        border: this.getBorder('thin', 'FFE5E7EB')
      },
      'currency-negative': {
        font: { name: 'Calibri', size: 11, color: { argb: 'FFEF4444' } },
        alignment: { horizontal: 'right', vertical: 'middle' },
        border: this.getBorder('thin', 'FFE5E7EB')
      },
      'percent': {
        font: { name: 'Calibri', size: 11, color: { argb: 'FF1E293B' } },
        alignment: { horizontal: 'right', vertical: 'middle' },
        border: this.getBorder('thin', 'FFE5E7EB')
      },
      'total': {
        font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } },
        alignment: { horizontal: 'right', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
        border: { top: { style: 'double', color: { argb: 'FF374151' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } }
      },
      'total-currency': {
        font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF059669' } },
        alignment: { horizontal: 'right', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
        border: { top: { style: 'double', color: { argb: 'FF374151' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } }
      },
      'formula': {
        font: { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF2563EB' } },
        alignment: { horizontal: 'right', vertical: 'middle' },
        border: this.getBorder('thin', 'FFE5E7EB')
      },
      'empty': { font: { name: 'Calibri', size: 11 } },
      'highlight': {
        font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF92400E' } },
        alignment: { horizontal: 'right', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } },
        border: this.getBorder('thin', 'FFFDE68A')
      }
    };
    const style = styles[styleName] || styles['value'];
    if (style.font) cell.font = style.font;
    if (style.alignment) cell.alignment = style.alignment;
    if (style.fill) cell.fill = style.fill;
    if (style.border) cell.border = style.border;
  }

  applyCellFormat(cell, styleName) {
    const fmts = { 'currency': '#,##0 "FCFA"', 'total-currency': '#,##0 "FCFA"', 'currency-negative': '-#,##0 "FCFA"', 'number': '#,##0', 'percent': '0.0%' };
    if (fmts[styleName]) cell.numFmt = fmts[styleName];
  }

  getBorder(style, color) {
    const b = { style, color: { argb: color } };
    return { top: b, bottom: b, left: b, right: b };
  }
}

window.excelGenerator = new ExcelGenerator();
