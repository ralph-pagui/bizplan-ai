/**
 * ChatManager - Gère l'interface de chat pour BizPlan AI
 * Communication avec Gemini via Netlify Function, streaming des réponses
 */
class ChatManager {
  constructor() {
    this.messagesContainer = document.getElementById('chat-messages');
    this.inputEl = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('chat-send-btn');
    this.welcomeScreen = document.getElementById('welcome-screen');

    this.messages = [];
    this.isGenerating = false;
    this.currentBusinessPlan = null;
    this.abortController = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.sendBtn.addEventListener('click', () => this.sendMessage());

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
    });

    this.inputEl.addEventListener('input', () => {
      this.inputEl.style.height = 'auto';
      this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 120) + 'px';
    });

    document.querySelectorAll('.prompt-card').forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.dataset.prompt;
        if (prompt) { this.inputEl.value = prompt; this.sendMessage(); }
      });
    });
  }

  async sendMessage() {
    const text = this.inputEl.value.trim();
    if (!text || this.isGenerating) return;

    // Vérifier les crédits
    if (window.paymentManager && !window.paymentManager.canGenerate()) {
      window.paymentManager.showModal();
      return;
    }

    if (this.welcomeScreen) this.welcomeScreen.classList.add('hidden');

    this.addMessage('user', text);
    this.inputEl.value = '';
    this.inputEl.style.height = 'auto';

    this.isGenerating = true;
    this.updateSendButton();
    const typingEl = this.showTypingIndicator();

    try {
      this.abortController = new AbortController();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: this.messages, businessPlan: this.currentBusinessPlan }),
        signal: this.abortController.signal
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Erreur serveur (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      typingEl.remove();
      const aiMsgEl = this.createAiMessageEl();
      const contentEl = aiMsgEl.querySelector('.message-content');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value, { stream: true });
        const displayText = this.extractDisplayText(fullResponse);
        contentEl.innerHTML = this.renderMarkdown(displayText);
        this.scrollToBottom();
      }

      const bizPlanData = this.extractBusinessPlanData(fullResponse);
      const displayText = this.extractDisplayText(fullResponse);
      contentEl.innerHTML = this.renderMarkdown(displayText);

      this.messages.push({ role: 'assistant', content: fullResponse });

      if (bizPlanData) {
        // Utiliser un crédit
        if (window.paymentManager) window.paymentManager.useCredit();

        if (this.currentBusinessPlan && bizPlanData.sheets) {
          const isPartial = bizPlanData.sheets.length < (this.currentBusinessPlan.sheets || []).length;
          if (isPartial) {
            if (bizPlanData.meta) this.currentBusinessPlan.meta = { ...this.currentBusinessPlan.meta, ...bizPlanData.meta };
            window.spreadsheetViewer.updateSheets(bizPlanData.sheets);
            for (const us of bizPlanData.sheets) {
              const idx = this.currentBusinessPlan.sheets.findIndex(s => s.name === us.name);
              if (idx >= 0) this.currentBusinessPlan.sheets[idx] = us;
              else this.currentBusinessPlan.sheets.push(us);
            }
          } else {
            this.currentBusinessPlan = bizPlanData;
            window.spreadsheetViewer.loadData(bizPlanData, true);
          }
        } else {
          this.currentBusinessPlan = bizPlanData;
          window.spreadsheetViewer.loadData(bizPlanData, true);
        }

        if (window.innerWidth <= 768) {
          document.getElementById('show-spreadsheet-btn')?.click();
        }
      }

    } catch (error) {
      typingEl.remove();
      if (error.name === 'AbortError') {
        this.addAssistantMessage('*Génération annulée.*');
      } else {
        console.error('Chat error:', error);
        this.addAssistantMessage(`⚠️ **Erreur:** ${error.message}\n\nVeuillez réessayer.`);
      }
    } finally {
      this.isGenerating = false;
      this.abortController = null;
      this.updateSendButton();
    }
  }

  addMessage(role, content) {
    const el = document.createElement('div');
    el.className = `message message-${role} message-appear`;
    if (role === 'user') {
      el.innerHTML = `<div class="message-bubble user-bubble"><div class="message-content">${this.escapeHtml(content)}</div></div>`;
      this.messages.push({ role: 'user', content });
    } else {
      el.innerHTML = `<div class="message-bubble ai-bubble"><div class="ai-avatar">📊</div><div class="message-body"><div class="message-sender">BizPlan AI</div><div class="message-content">${this.renderMarkdown(content)}</div></div></div>`;
      if (content) this.messages.push({ role: 'assistant', content });
    }
    this.messagesContainer.appendChild(el);
    this.scrollToBottom();
    return el;
  }

  addAssistantMessage(content) {
    return this.addMessage('assistant', content);
  }

  createAiMessageEl() {
    const el = document.createElement('div');
    el.className = 'message message-assistant message-appear';
    el.innerHTML = `<div class="message-bubble ai-bubble"><div class="ai-avatar">📊</div><div class="message-body"><div class="message-sender">BizPlan AI</div><div class="message-content"></div></div></div>`;
    this.messagesContainer.appendChild(el);
    this.scrollToBottom();
    return el;
  }

  showTypingIndicator() {
    const el = document.createElement('div');
    el.className = 'message message-assistant message-appear';
    el.id = 'typing-indicator';
    el.innerHTML = `<div class="message-bubble ai-bubble"><div class="ai-avatar">📊</div><div class="message-body"><div class="message-sender">BizPlan AI</div><div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div></div></div>`;
    this.messagesContainer.appendChild(el);
    this.scrollToBottom();
    return el;
  }

  extractDisplayText(text) {
    const idx = text.indexOf('|||BIZPLAN_START|||');
    return idx === -1 ? text : text.substring(0, idx).trim();
  }

  extractBusinessPlanData(text) {
    const si = text.indexOf('|||BIZPLAN_START|||');
    const ei = text.indexOf('|||BIZPLAN_END|||');
    if (si === -1 || ei === -1 || ei <= si) return null;
    let json = text.substring(si + 18, ei).trim();
    if (json.startsWith('```json')) json = json.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    else if (json.startsWith('```')) json = json.replace(/^```\s*/, '').replace(/\s*```$/, '');
    try { return JSON.parse(json); }
    catch (e) {
      try { return JSON.parse(json.replace(/,\s*([\]}])/g, '$1')); }
      catch (e2) { console.error('JSON parse failed:', e2); return null; }
    }
  }

  renderMarkdown(text) {
    if (!text) return '';
    try {
      if (typeof marked !== 'undefined') {
        marked.setOptions({ breaks: true, gfm: true });
        return marked.parse(text);
      }
    } catch (e) { console.error('Markdown error:', e); }
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
  }

  escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  scrollToBottom() {
    requestAnimationFrame(() => { this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight; });
  }

  updateSendButton() {
    if (this.isGenerating) {
      this.sendBtn.disabled = true;
      this.sendBtn.innerHTML = '<div class="btn-spinner"></div>';
    } else {
      this.sendBtn.disabled = false;
      this.sendBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>';
    }
  }

  reset() {
    this.messages = [];
    this.currentBusinessPlan = null;
    this.messagesContainer.innerHTML = '';
    if (this.welcomeScreen) this.welcomeScreen.classList.remove('hidden');
    window.spreadsheetViewer.hide();
    this.inputEl.value = '';
    this.inputEl.focus();
  }

  getBusinessPlan() { return this.currentBusinessPlan; }
}

window.chatManager = new ChatManager();
