/**
 * PaymentManager - Paiement Mobile Money via kpay.site
 * Gestion des crédits et abonnement BizPlan Pro
 */
class PaymentManager {
  constructor() {
    this.modal = document.getElementById('payment-modal');
    this.closeBtn = document.getElementById('close-payment');
    this.payBtn = document.getElementById('pay-btn');
    this.upgradeBtn = document.getElementById('upgrade-btn');
    this.creditsDisplay = document.getElementById('credits-display');

    this.isPro = false;
    this.freeCredits = 3;
    this.usedCredits = 0;

    this.loadState();
    this.setupEventListeners();
    this.updateDisplay();
  }

  setupEventListeners() {
    if (this.upgradeBtn) this.upgradeBtn.addEventListener('click', () => this.showModal());
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.hideModal());
    if (this.modal) this.modal.addEventListener('click', (e) => { if (e.target === this.modal) this.hideModal(); });
    if (this.payBtn) this.payBtn.addEventListener('click', () => this.initiatePayment());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.modal?.classList.contains('show')) this.hideModal(); });
  }

  canGenerate() { return this.isPro || this.usedCredits < this.freeCredits; }

  useCredit() {
    if (!this.isPro) { this.usedCredits++; this.saveState(); this.updateDisplay(); }
  }

  showModal() { if (this.modal) { this.modal.removeAttribute('hidden'); this.modal.classList.add('show'); document.body.style.overflow = 'hidden'; } }
  hideModal() { if (this.modal) { this.modal.classList.remove('show'); this.modal.setAttribute('hidden',''); document.body.style.overflow = ''; } }

  initiatePayment() {
    const config = {
      amount: 5000,
      currency: 'XAF',
      description: 'BizPlan AI Pro - Abonnement Mensuel',
      merchant: 'bizplan-ai',
      callback_url: window.location.origin + '/payment-success'
    };

    const kpayUrl = `https://kpay.site/pay?amount=${config.amount}&currency=${config.currency}&description=${encodeURIComponent(config.description)}&merchant=${config.merchant}&callback=${encodeURIComponent(config.callback_url)}`;

    const payWin = window.open(kpayUrl, '_blank', 'width=500,height=700');
    this.payBtn.textContent = '⏳ Paiement en cours...';
    this.payBtn.disabled = true;

    const check = setInterval(() => {
      try {
        if (payWin && payWin.closed) {
          clearInterval(check);
          this.payBtn.textContent = '📱 Payer avec Mobile Money';
          this.payBtn.disabled = false;
          if (localStorage.getItem('bizplan_payment_success')) {
            this.activatePro();
            localStorage.removeItem('bizplan_payment_success');
          }
        }
      } catch (e) { /* cross-origin */ }
    }, 1000);
  }

  activatePro() {
    this.isPro = true;
    this.saveState();
    this.updateDisplay();
    this.hideModal();
    this.showNotification('🎉 Bienvenue dans BizPlan Pro ! Accès illimité activé.');
  }

  showNotification(msg) {
    const n = document.createElement('div');
    n.style.cssText = 'position:fixed;top:70px;right:20px;z-index:2000;background:#059669;color:#fff;padding:16px 24px;border-radius:12px;font-size:14px;font-weight:500;box-shadow:0 10px 25px rgba(0,0,0,0.3);animation:fadeIn 0.3s ease;max-width:350px;';
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => { n.style.opacity = '0'; n.style.transition = 'opacity 0.3s'; setTimeout(() => n.remove(), 300); }, 4000);
  }

  updateDisplay() {
    if (!this.creditsDisplay) return;
    if (this.isPro) {
      this.creditsDisplay.textContent = '⭐ Pro';
      this.creditsDisplay.style.color = '#d97706';
      if (this.upgradeBtn) this.upgradeBtn.style.display = 'none';
    } else {
      const r = this.freeCredits - this.usedCredits;
      this.creditsDisplay.textContent = `${r} plan${r > 1 ? 's' : ''} gratuit${r > 1 ? 's' : ''}`;
      this.creditsDisplay.style.color = r > 0 ? '#94a3b8' : '#ef4444';
    }
  }

  saveState() { localStorage.setItem('bizplan_state', JSON.stringify({ isPro: this.isPro, usedCredits: this.usedCredits, ts: Date.now() })); }

  loadState() {
    try {
      const s = JSON.parse(localStorage.getItem('bizplan_state'));
      if (s) { this.isPro = s.isPro || false; this.usedCredits = s.usedCredits || 0; }
    } catch (e) {}
  }
}

window.paymentManager = new PaymentManager();

// Handle payment callback
if (window.location.pathname === '/payment-success') {
  localStorage.setItem('bizplan_payment_success', 'true');
  window.close();
}
