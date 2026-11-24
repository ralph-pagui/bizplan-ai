/**
 * App - Contrôleur principal de BizPlan AI
 * Initialise et coordonne tous les modules
 */
document.addEventListener('DOMContentLoaded', () => {
  // === Bouton Nouveau Chat ===
  const newChatBtn = document.getElementById('new-chat-btn');
  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      if (window.chatManager) window.chatManager.reset();
    });
  }

  // === Bouton Télécharger Excel ===
  const downloadBtn = document.getElementById('download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (window.excelGenerator && window.spreadsheetViewer) {
        const sheets = window.spreadsheetViewer.getSheetsData();
        const meta = window.spreadsheetViewer.getMeta();
        window.excelGenerator.generateAndDownload(sheets, meta);
      }
    });
  }

  // === Bouton Plein Écran ===
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const spreadsheetPanel = document.getElementById('spreadsheet-panel');
  if (fullscreenBtn && spreadsheetPanel) {
    fullscreenBtn.addEventListener('click', () => {
      spreadsheetPanel.classList.toggle('fullscreen');
      fullscreenBtn.innerHTML = spreadsheetPanel.classList.contains('fullscreen')
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
    });
  }

  // === Toggle Mobile ===
  const showChatBtn = document.getElementById('show-chat-btn');
  const showSpreadBtn = document.getElementById('show-spreadsheet-btn');
  const chatPanel = document.getElementById('chat-panel');

  if (showChatBtn && showSpreadBtn) {
    showChatBtn.addEventListener('click', () => {
      chatPanel.classList.remove('hidden');
      spreadsheetPanel.classList.add('hidden');
      showChatBtn.classList.add('active');
      showSpreadBtn.classList.remove('active');
    });
    showSpreadBtn.addEventListener('click', () => {
      chatPanel.classList.add('hidden');
      spreadsheetPanel.classList.remove('hidden');
      showSpreadBtn.classList.add('active');
      showChatBtn.classList.remove('active');
    });
  }

  // === Focus input au chargement ===
  const chatInput = document.getElementById('chat-input');
  if (chatInput) setTimeout(() => chatInput.focus(), 300);

  // === Style fullscreen dynamique ===
  const fsStyle = document.createElement('style');
  fsStyle.textContent = `
    .spreadsheet-panel.fullscreen {
      position: fixed !important; inset: 0 !important; z-index: 200 !important;
      width: 100% !important; height: 100vh !important;
    }
    .btn-spinner {
      width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite;
    }
    @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes fadeOut { to { opacity: 0; } }
  `;
  document.head.appendChild(fsStyle);

  console.log('✅ BizPlan AI initialisé avec succès');
});
