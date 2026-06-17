(function () {
  'use strict';

  const API_ROOT = window.BRUNO_PORTFOLIO_API_URL || '';
  const state = {
    connected: false,
    messages: [],
    selectedMessage: null,
    selectedSuggestionId: null,
    loadingMessageId: null
  };

  const els = {
    themeToggle: document.getElementById('theme-toggle'),
    gmailStatus: document.getElementById('gmail-status'),
    connect: document.getElementById('btn-connect-gmail'),
    disconnect: document.getElementById('btn-disconnect-gmail'),
    refresh: document.getElementById('btn-refresh-inbox'),
    inboxEmpty: document.getElementById('inbox-empty'),
    inboxList: document.getElementById('inbox-list'),
    messageEmpty: document.getElementById('message-empty'),
    messageView: document.getElementById('message-view'),
    messageFrom: document.getElementById('message-from'),
    messageSubject: document.getElementById('message-subject'),
    messageDate: document.getElementById('message-date'),
    messageBody: document.getElementById('message-body'),
    messagePriority: document.getElementById('message-priority'),
    summaryState: document.getElementById('summary-state'),
    summaryText: document.getElementById('summary-text'),
    intentText: document.getElementById('intent-text'),
    suggestionsList: document.getElementById('suggestions-list'),
    replyEditor: document.getElementById('reply-editor'),
    replyState: document.getElementById('reply-state'),
    sendReply: document.getElementById('btn-send-reply'),
    toast: document.getElementById('lab-toast')
  };

  function refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function showToast(message, tone) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.dataset.tone = tone || 'info';
    els.toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      els.toast.hidden = true;
    }, 3600);
  }

  async function api(path, options) {
    const response = await fetch(`${API_ROOT}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options && options.headers ? options.headers : {})
      },
      ...options
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || 'Pedido falhou.');
    }

    return payload;
  }

  function formatDate(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('pt-PT', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  function setConnectedUi(status) {
    state.connected = Boolean(status.connected);
    if (els.gmailStatus) {
      els.gmailStatus.textContent = state.connected
        ? `Ligado: ${status.email || 'Gmail'}`
        : 'Gmail desligado';
      els.gmailStatus.dataset.state = state.connected ? 'connected' : 'disconnected';
    }

    if (els.connect) els.connect.hidden = state.connected;
    if (els.disconnect) els.disconnect.hidden = !state.connected;
    if (els.refresh) els.refresh.disabled = !state.connected;
    if (els.inboxEmpty && !state.connected) els.inboxEmpty.textContent = 'Liga o Gmail para carregar a inbox.';
  }

  function resetReader(message) {
    state.selectedMessage = null;
    state.selectedSuggestionId = null;
    if (els.messageEmpty) {
      els.messageEmpty.hidden = false;
      const label = els.messageEmpty.querySelector('span');
      if (label) label.textContent = message || 'Seleciona um email.';
    }
    if (els.messageView) els.messageView.hidden = true;
    if (els.sendReply) els.sendReply.disabled = true;
    if (els.replyEditor) els.replyEditor.value = '';
  }

  function renderInbox() {
    if (!els.inboxList || !els.inboxEmpty) return;
    els.inboxList.textContent = '';

    if (!state.connected) {
      els.inboxEmpty.hidden = false;
      return;
    }

    if (state.messages.length === 0) {
      els.inboxEmpty.textContent = 'Sem emails recentes na Inbox.';
      els.inboxEmpty.hidden = false;
      return;
    }

    els.inboxEmpty.hidden = true;

    state.messages.forEach((message) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'mail-item';
      item.dataset.messageId = message.id;
      item.setAttribute('role', 'listitem');
      if (state.selectedMessage?.id === message.id) {
        item.classList.add('is-active');
      }

      const top = document.createElement('span');
      top.className = 'mail-item__top';

      const from = document.createElement('strong');
      from.textContent = message.from || 'Remetente desconhecido';
      top.appendChild(from);

      if (message.unread) {
        const unread = document.createElement('span');
        unread.className = 'mail-unread';
        unread.textContent = 'novo';
        top.appendChild(unread);
      }

      const subject = document.createElement('span');
      subject.className = 'mail-item__subject';
      subject.textContent = message.subject || '(sem assunto)';

      const snippet = document.createElement('span');
      snippet.className = 'mail-item__snippet';
      snippet.textContent = message.snippet || '';

      const date = document.createElement('span');
      date.className = 'mail-item__date mono';
      date.textContent = formatDate(message.date);

      item.appendChild(top);
      item.appendChild(subject);
      item.appendChild(snippet);
      item.appendChild(date);
      item.addEventListener('click', () => selectMessage(message.id));
      els.inboxList.appendChild(item);
    });
  }

  function renderMessage(message) {
    state.selectedMessage = message;
    state.selectedSuggestionId = null;

    if (els.messageEmpty) els.messageEmpty.hidden = true;
    if (els.messageView) els.messageView.hidden = false;
    if (els.messageFrom) els.messageFrom.textContent = message.from || 'Remetente desconhecido';
    if (els.messageSubject) els.messageSubject.textContent = message.subject || '(sem assunto)';
    if (els.messageDate) els.messageDate.textContent = formatDate(message.date);
    if (els.messageBody) els.messageBody.textContent = message.bodyText || message.snippet || 'Sem corpo de email.';
    if (els.summaryState) els.summaryState.textContent = 'A gerar resumo...';
    if (els.summaryText) els.summaryText.textContent = '-';
    if (els.intentText) els.intentText.textContent = '-';
    if (els.suggestionsList) els.suggestionsList.textContent = '';
    if (els.messagePriority) {
      els.messagePriority.hidden = true;
      els.messagePriority.textContent = '';
    }
    if (els.replyEditor) els.replyEditor.value = '';
    if (els.replyState) els.replyState.textContent = '';
    if (els.sendReply) els.sendReply.disabled = true;

    renderInbox();
  }

  function renderSuggestions(payload) {
    if (els.summaryText) els.summaryText.textContent = payload.summary;
    if (els.intentText) els.intentText.textContent = payload.intent;
    if (els.summaryState) els.summaryState.textContent = 'Pronto';
    if (els.messagePriority) {
      els.messagePriority.hidden = false;
      els.messagePriority.textContent = payload.priority;
      els.messagePriority.dataset.priority = payload.priority;
    }
    if (!els.suggestionsList) return;

    els.suggestionsList.textContent = '';
    payload.suggestions.forEach((suggestion) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'suggestion-card';
      button.dataset.suggestionId = suggestion.id;

      const tone = document.createElement('span');
      tone.className = 'suggestion-card__tone mono';
      tone.textContent = suggestion.tone;

      const body = document.createElement('span');
      body.className = 'suggestion-card__body';
      body.textContent = suggestion.body;

      button.appendChild(tone);
      button.appendChild(body);
      button.addEventListener('click', () => {
        state.selectedSuggestionId = suggestion.id;
        if (els.replyEditor) {
          els.replyEditor.value = suggestion.body;
          els.replyEditor.focus();
        }
        if (els.sendReply) els.sendReply.disabled = false;
        document.querySelectorAll('.suggestion-card').forEach((card) => {
          card.classList.toggle('is-selected', card === button);
        });
      });
      els.suggestionsList.appendChild(button);
    });
  }

  async function loadStatus() {
    try {
      const payload = await api('/api/gmail/status');
      setConnectedUi(payload.data);
      if (payload.data.connected) {
        await loadInbox();
      } else {
        resetReader('Liga o Gmail para comecar.');
      }
    } catch (error) {
      setConnectedUi({ connected: false });
      resetReader('Nao foi possivel verificar a ligacao.');
      showToast(error.message, 'error');
    }
  }

  async function startGmailAuth() {
    if (!els.connect) return;
    els.connect.disabled = true;
    try {
      const payload = await api('/api/gmail/auth/start');
      window.location.href = payload.data.authUrl;
    } catch (error) {
      showToast(error.message, 'error');
      els.connect.disabled = false;
    }
  }

  async function disconnectGmail() {
    if (!els.disconnect) return;
    els.disconnect.disabled = true;
    try {
      await api('/api/gmail/auth/logout', { method: 'POST', body: JSON.stringify({}) });
      state.messages = [];
      setConnectedUi({ connected: false });
      renderInbox();
      resetReader('Gmail desligado.');
      showToast('Gmail desligado.', 'info');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      els.disconnect.disabled = false;
    }
  }

  async function loadInbox() {
    if (!state.connected || !els.refresh) return;
    els.refresh.disabled = true;
    if (els.inboxEmpty) {
      els.inboxEmpty.hidden = false;
      els.inboxEmpty.textContent = 'A carregar inbox...';
    }

    try {
      const payload = await api('/api/gmail/messages?limit=10');
      state.messages = payload.data.messages || [];
      renderInbox();
    } catch (error) {
      showToast(error.message, 'error');
      if (els.inboxEmpty) {
        els.inboxEmpty.textContent = 'Nao foi possivel carregar a inbox.';
        els.inboxEmpty.hidden = false;
      }
    } finally {
      els.refresh.disabled = false;
    }
  }

  async function selectMessage(messageId) {
    state.loadingMessageId = messageId;
    resetReader('A carregar email...');

    try {
      const payload = await api(`/api/gmail/messages/${encodeURIComponent(messageId)}`);
      if (state.loadingMessageId !== messageId) return;
      renderMessage(payload.data.message);
      await loadSuggestions(messageId);
    } catch (error) {
      showToast(error.message, 'error');
      resetReader('Nao foi possivel abrir este email.');
    }
  }

  async function loadSuggestions(messageId) {
    try {
      const payload = await api(`/api/gmail/messages/${encodeURIComponent(messageId)}/suggestions`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      renderSuggestions(payload.data);
    } catch (error) {
      if (els.summaryState) els.summaryState.textContent = 'Erro';
      if (els.summaryText) els.summaryText.textContent = error.message;
      if (els.intentText) els.intentText.textContent = '-';
      showToast(error.message, 'error');
    }
  }

  async function sendReply() {
    if (!state.selectedMessage || !els.replyEditor || !els.sendReply) return;
    const message = els.replyEditor.value.trim();
    if (!message) {
      showToast('Escreve uma resposta antes de enviar.', 'error');
      return;
    }

    const confirmed = window.confirm('Enviar esta resposta pelo Gmail?');
    if (!confirmed) return;

    els.sendReply.disabled = true;
    if (els.replyState) els.replyState.textContent = 'A enviar...';

    try {
      await api(`/api/gmail/messages/${encodeURIComponent(state.selectedMessage.id)}/reply`, {
        method: 'POST',
        body: JSON.stringify({
          message,
          suggestionId: state.selectedSuggestionId || undefined
        })
      });
      if (els.replyState) els.replyState.textContent = 'Enviado';
      showToast('Resposta enviada.', 'success');
      await loadInbox();
    } catch (error) {
      if (els.replyState) els.replyState.textContent = 'Erro';
      els.sendReply.disabled = false;
      showToast(error.message, 'error');
    }
  }

  function initThemeToggle() {
    const toggleText = els.themeToggle?.querySelector('.theme-toggle__text');
    const themeNext = { flowix: 'electric', electric: 'nebula', nebula: 'flowix' };
    const themeNextLabel = { flowix: 'Verde', electric: 'Roxo', nebula: 'Azul' };

    function getCurrentTheme() {
      const attr = document.documentElement.getAttribute('data-theme');
      return attr === 'flowix' || attr === 'nebula' ? attr : 'electric';
    }

    function updateThemeUI() {
      if (!els.themeToggle || !toggleText) return;
      const currentTheme = getCurrentTheme();
      els.themeToggle.setAttribute('aria-pressed', (currentTheme !== 'flowix').toString());
      toggleText.textContent = themeNextLabel[currentTheme];
    }

    els.themeToggle?.addEventListener('click', () => {
      const newTheme = themeNext[getCurrentTheme()];
      if (newTheme === 'electric') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', newTheme);
      }

      try {
        if (newTheme === 'flowix') {
          window.localStorage.removeItem('bj-theme');
        } else {
          window.localStorage.setItem('bj-theme', newTheme);
        }
      } catch {
        // Storage can be unavailable in private contexts.
      }

      updateThemeUI();
      window.dispatchEvent(new CustomEvent('bj-theme-change', { detail: { theme: newTheme } }));
    });

    updateThemeUI();
  }

  function initCustomCursor() {
    const dot = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    const hasFinePointer = window.matchMedia('(pointer:fine)');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (!dot || !ring || !hasFinePointer.matches || prefersReducedMotion.matches) {
      document.body.classList.add('pointer-disabled');
      return;
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let dotX = mouseX;
    let dotY = mouseY;
    let ringX = mouseX;
    let ringY = mouseY;
    let rafId = null;
    let hovering = false;

    document.querySelectorAll('a, button, textarea, input, select').forEach((element) => {
      element.addEventListener('mouseenter', () => {
        hovering = true;
      });
      element.addEventListener('mouseleave', () => {
        hovering = false;
      });
    });

    window.addEventListener('mousemove', (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    }, { passive: true });

    function updateCursor() {
      dotX += (mouseX - dotX) * 0.3;
      dotY += (mouseY - dotY) * 0.3;
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      dot.classList.toggle('is-hover', hovering);
      ring.classList.toggle('is-hover', hovering);
      rafId = window.requestAnimationFrame(updateCursor);
    }

    rafId = window.requestAnimationFrame(updateCursor);
    window.addEventListener('pagehide', () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    });
  }

  els.connect?.addEventListener('click', startGmailAuth);
  els.disconnect?.addEventListener('click', disconnectGmail);
  els.refresh?.addEventListener('click', loadInbox);
  els.sendReply?.addEventListener('click', sendReply);
  els.replyEditor?.addEventListener('input', () => {
    if (els.sendReply) els.sendReply.disabled = !els.replyEditor.value.trim();
  });

  initThemeToggle();
  initCustomCursor();
  refreshIcons();
  loadStatus();
})();
