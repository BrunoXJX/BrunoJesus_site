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
    senderResearch: document.getElementById('sender-research'),
    senderIdentity: document.getElementById('sender-identity'),
    senderOrganization: document.getElementById('sender-organization'),
    senderContext: document.getElementById('sender-context'),
    senderConfidence: document.getElementById('sender-confidence'),
    senderSources: document.getElementById('sender-sources'),
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

  function setBusy(element, isBusy) {
    if (!element) return;
    element.setAttribute('aria-busy', isBusy ? 'true' : 'false');
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

    const voiceButton = document.getElementById('btn-toggle-mic');
    const voiceStatus = document.getElementById('voice-status-text');
    if (voiceButton && voiceButton.dataset.unsupported !== 'true') {
      voiceButton.disabled = !state.connected;
      if (voiceStatus) {
        voiceStatus.textContent = state.connected ? 'Pronto' : 'Liga Google para usar voz';
      }
    }
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
    if (els.senderResearch) els.senderResearch.hidden = true;
    if (els.senderIdentity) els.senderIdentity.textContent = '';
    if (els.senderOrganization) els.senderOrganization.textContent = '';
    if (els.senderContext) els.senderContext.textContent = '';
    if (els.senderConfidence) els.senderConfidence.textContent = '';
    if (els.senderSources) els.senderSources.textContent = '';
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
    renderSenderResearch(payload.senderResearch);
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
      button.setAttribute('aria-pressed', 'false');

      const tone = document.createElement('span');
      tone.className = 'suggestion-card__tone mono';
      tone.textContent = suggestion.tone;

      const body = document.createElement('span');
      body.className = 'suggestion-card__body';
      body.textContent = suggestion.body;

      const action = document.createElement('span');
      action.className = 'suggestion-card__action mono';
      action.textContent = 'Usar resposta';

      button.appendChild(tone);
      button.appendChild(body);
      button.appendChild(action);
      button.addEventListener('click', () => {
        state.selectedSuggestionId = suggestion.id;
        if (els.replyEditor) {
          els.replyEditor.value = suggestion.body;
        }
        if (els.sendReply) els.sendReply.disabled = false;
        document.querySelectorAll('.suggestion-card').forEach((card) => {
          const isSelected = card === button;
          card.classList.toggle('is-selected', isSelected);
          card.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        });
      });
      els.suggestionsList.appendChild(button);
    });
  }

  function renderSenderResearch(research) {
    if (!els.senderResearch) return;
    if (!research) {
      els.senderResearch.hidden = true;
      return;
    }

    els.senderResearch.hidden = false;
    if (els.senderIdentity) els.senderIdentity.textContent = research.identity || 'Remetente desconhecido';
    if (els.senderOrganization) {
      els.senderOrganization.textContent = research.organization ? `Organização: ${research.organization}` : '';
    }
    if (els.senderContext) els.senderContext.textContent = research.context || 'Sem contexto público suficiente.';
    if (els.senderConfidence) {
      els.senderConfidence.textContent = research.confidence ? `confiança ${research.confidence}` : '';
    }
    if (els.senderSources) {
      els.senderSources.textContent = '';
      (research.sources || []).slice(0, 3).forEach((source) => {
        let safeUrl = null;
        try {
          const parsedUrl = new window.URL(source.url);
          if (parsedUrl.protocol === 'https:') {
            safeUrl = parsedUrl.href;
          }
        } catch {
          safeUrl = null;
        }

        if (!safeUrl) return;
        const link = document.createElement('a');
        link.href = safeUrl;
        link.target = '_blank';
        link.rel = 'noreferrer noopener';
        link.textContent = source.title || safeUrl;
        els.senderSources.appendChild(link);
      });
    }
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
    setBusy(els.inboxList, true);
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
      setBusy(els.inboxList, false);
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
      if (state.loadingMessageId !== messageId) return;
      showToast(error.message, 'error');
      resetReader('Nao foi possivel abrir este email.');
    }
  }

  async function loadSuggestions(messageId) {
    setBusy(els.messageView, true);
    try {
      const payload = await api(`/api/gmail/messages/${encodeURIComponent(messageId)}/suggestions`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      if (state.selectedMessage?.id !== messageId) return;
      renderSuggestions(payload.data);
    } catch (error) {
      if (state.selectedMessage?.id !== messageId) return;
      if (els.summaryState) els.summaryState.textContent = 'Erro';
      if (els.summaryText) els.summaryText.textContent = error.message;
      if (els.intentText) els.intentText.textContent = '-';
      showToast(error.message, 'error');
    } finally {
      if (state.selectedMessage?.id === messageId) {
        setBusy(els.messageView, false);
      }
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
    setBusy(els.replyEditor, true);
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
    } finally {
      setBusy(els.replyEditor, false);
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
    let cursorVisible = false;

    document.querySelectorAll('a, button, textarea, input, select').forEach((element) => {
      element.addEventListener('mouseenter', () => {
        hovering = true;
      });
      element.addEventListener('mouseleave', () => {
        hovering = false;
      });
    });

    window.addEventListener('mousemove', (event) => {
      if (!cursorVisible) {
        cursorVisible = true;
        document.body.classList.add('cursor-visible');
      }
      mouseX = event.clientX;
      mouseY = event.clientY;
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      cursorVisible = false;
      document.body.classList.remove('cursor-visible');
    });

    function updateCursor() {
      dotX += (mouseX - dotX) * 0.3;
      dotY += (mouseY - dotY) * 0.3;
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      dot.classList.toggle('is-hover', hovering);
      ring.classList.toggle('is-hover', hovering);
      rafId = window.requestAnimationFrame(updateCursor);
    }

    rafId = window.requestAnimationFrame(updateCursor);
    window.addEventListener('pagehide', () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    });
  }

  function initVoiceMeeting() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const supportsAudioRecording = Boolean(window.navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
    const btnMic = document.getElementById('btn-toggle-mic');
    const btnMicText = document.getElementById('btn-mic-text');
    const micIcon = document.getElementById('mic-icon');
    const liveText = document.getElementById('voice-live-text');
    const statusText = document.getElementById('voice-status-text');
    const meetingForm = document.getElementById('meeting-form');
    const inputTitle = document.getElementById('meeting-title');
    const inputDateTime = document.getElementById('meeting-datetime');
    const inputDesc = document.getElementById('meeting-desc');
    const btnConfirm = document.getElementById('btn-confirm-meeting');
    const btnCancel = document.getElementById('btn-cancel-meeting');

    if (!btnMic || !statusText) return;

    if (!supportsAudioRecording && !SpeechRecognition) {
      statusText.textContent = 'Nao suportado';
      btnMic.disabled = true;
      btnMic.dataset.unsupported = 'true';
      if (liveText) {
        liveText.textContent = 'Este navegador nao permite gravacao ou reconhecimento de voz. Usa Chrome, Edge ou Opera com permissao de microfone.';
      }
      return;
    }

    statusText.textContent = 'Pronto';
    if (supportsAudioRecording) {
      initRecorderMode();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-PT';
    recognition.interimResults = true;
    recognition.continuous = false;

    let isListening = false;
    let finalTranscriptText = '';
    let accumulatedFinalTranscript = '';
    let lastRecognitionError = null;

    recognition.onstart = () => {
      isListening = true;
      statusText.textContent = 'A escutar...';
      if (btnMicText) btnMicText.textContent = 'Parar Escuta';
      btnMic.classList.add('is-recording');
      if (micIcon) {
        micIcon.setAttribute('data-lucide', 'mic-off');
        refreshIcons();
      }
      if (liveText) liveText.textContent = '';
      if (meetingForm) meetingForm.hidden = true;
      if (btnConfirm) btnConfirm.disabled = true;
      finalTranscriptText = '';
      accumulatedFinalTranscript = '';
      lastRecognitionError = null;
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          accumulatedFinalTranscript += `${transcript} `;
        } else {
          interimTranscript += transcript;
        }
      }

      finalTranscriptText = `${accumulatedFinalTranscript} ${interimTranscript}`.replace(/\s+/g, ' ').trim();
      if (liveText) {
        liveText.textContent = finalTranscriptText;
      }
    };

    recognition.onerror = (event) => {
      lastRecognitionError = event.error || 'desconhecido';
      console.error('Erro no reconhecimento de voz:', lastRecognitionError);
      statusText.textContent = `Erro: ${lastRecognitionError}`;
      showToast(`Erro no microfone: ${lastRecognitionError}`, 'error');
      stopMicUi();
    };

    recognition.onend = () => {
      stopMicUi();
      if (lastRecognitionError) {
        statusText.textContent = `Erro: ${lastRecognitionError}`;
        return;
      }

      if (finalTranscriptText.trim()) {
        void processCommand(finalTranscriptText);
      } else {
        statusText.textContent = 'Pronto';
      }
    };

    function stopMicUi() {
      isListening = false;
      if (btnMicText) btnMicText.textContent = 'Falar comando';
      btnMic.classList.remove('is-recording');
      if (micIcon) {
        micIcon.setAttribute('data-lucide', 'mic');
        refreshIcons();
      }
    }

    function setRecordingUi(isRecording) {
      if (btnMicText) btnMicText.textContent = isRecording ? 'Parar gravacao' : 'Falar comando';
      btnMic.classList.toggle('is-recording', isRecording);
      if (micIcon) {
        micIcon.setAttribute('data-lucide', isRecording ? 'mic-off' : 'mic');
        refreshIcons();
      }
    }

    function getRecorderMimeType() {
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ];
      return candidates.find((mimeType) => window.MediaRecorder.isTypeSupported(mimeType)) || '';
    }

    function blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new window.FileReader();
        reader.onload = () => {
          const result = typeof reader.result === 'string' ? reader.result : '';
          resolve(result.includes(',') ? result.split(',').pop() : result);
        };
        reader.onerror = () => reject(reader.error || new Error('Falha ao ler audio.'));
        reader.readAsDataURL(blob);
      });
    }

    function applyParsedCommand(text, parsed) {
      if (inputTitle) inputTitle.value = parsed.summary || '';
      if (inputDateTime) inputDateTime.value = toDatetimeLocalValue(parsed.startAt);
      if (inputDesc) inputDesc.value = parsed.description || text;
      if (liveText) {
        const notes = Array.isArray(parsed.notes) && parsed.notes.length > 0
          ? `\n\nNotas: ${parsed.notes.join(' ')}`
          : '';
        liveText.textContent = `${text}${notes}`;
      }

      if (meetingForm) meetingForm.hidden = false;
      statusText.textContent = 'Confirma os detalhes';
      if (btnConfirm) btnConfirm.disabled = false;
    }

    function normalizeAudioMimeType(mimeType) {
      if (!mimeType || typeof mimeType !== 'string') {
        return 'audio/webm';
      }
      return mimeType.split(';')[0].trim().toLowerCase() || 'audio/webm';
    }

    function initRecorderMode() {
      let mediaRecorder = null;
      let mediaStream = null;
      let audioChunks = [];
      let recordingTimer = null;
      let recordingStartedAt = 0;
      const MIN_RECORDING_MS = 900;
      const RECORDING_TIMESLICE_MS = 250;

      async function processAudioBlob(blob) {
        if (!blob || blob.size < 1200) {
          statusText.textContent = 'Pronto';
          showToast('Gravacao demasiado curta. Fala durante pelo menos 1 segundo.', 'error');
          return;
        }

        statusText.textContent = 'A transcrever...';
        setBusy(liveText, true);
        if (btnConfirm) btnConfirm.disabled = true;

        try {
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Lisbon';
          const audioBase64 = await blobToBase64(blob);
          const payload = await api('/api/calendar/voice/transcribe', {
            method: 'POST',
            body: JSON.stringify({
              audioBase64,
              mimeType: normalizeAudioMimeType(blob.type),
              now: new Date().toISOString(),
              timezone
            })
          });
          applyParsedCommand(payload.data.transcript, payload.data.parsed);
        } catch (err) {
          console.error('Falha na transcricao:', err);
          const fallbackWorked = await trySpeechFallback(err.message || 'Falha ao transcrever o audio.');
          if (!fallbackWorked) {
            statusText.textContent = 'Erro ao transcrever';
            showToast(err.message || 'Falha ao transcrever o audio.', 'error');
          }
        } finally {
          setBusy(liveText, false);
        }
      }

      async function trySpeechFallback(reason) {
        if (!SpeechRecognition) {
          return false;
        }

        statusText.textContent = 'A usar reconhecimento do browser...';
        if (liveText) {
          liveText.textContent = 'Nao consegui transcrever no servidor. Fala outra vez — desta vez uso o microfone do browser.';
        }
        showToast(reason, 'error');

        return new Promise((resolve) => {
          const recognition = new SpeechRecognition();
          recognition.lang = 'pt-PT';
          recognition.interimResults = false;
          recognition.continuous = false;
          let settled = false;

          const finish = (success) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeoutId);
            resolve(success);
          };

          const timeoutId = window.setTimeout(() => {
            try {
              recognition.stop();
            } catch {
              // ignore
            }
            finish(false);
          }, 12000);

          recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
              .map((result) => result[0]?.transcript || '')
              .join(' ')
              .trim();
            if (!transcript) {
              finish(false);
              return;
            }
            settled = true;
            window.clearTimeout(timeoutId);
            void processCommand(transcript).finally(() => finish(true));
          };

          recognition.onerror = () => finish(false);
          recognition.onend = () => {
            if (!settled) {
              finish(false);
            }
          };

          try {
            recognition.start();
          } catch {
            finish(false);
          }
        });
      }

      function cleanupRecording() {
        window.clearTimeout(recordingTimer);
        recordingTimer = null;
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
          mediaStream = null;
        }
        mediaRecorder = null;
        setRecordingUi(false);
      }

      function stopRecording() {
        if (!mediaRecorder || mediaRecorder.state !== 'recording') {
          return;
        }

        const elapsed = Date.now() - recordingStartedAt;
        const finalizeStop = () => {
          try {
            mediaRecorder.requestData();
          } catch {
            // ignore
          }
          window.setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          }, 80);
        };

        if (elapsed < MIN_RECORDING_MS) {
          window.setTimeout(finalizeStop, MIN_RECORDING_MS - elapsed);
          return;
        }

        finalizeStop();
      }

      async function startRecording() {
        try {
          if (meetingForm) meetingForm.hidden = true;
          if (liveText) liveText.textContent = 'A gravar... fala agora e carrega em parar quando terminares.';
          if (btnConfirm) btnConfirm.disabled = true;
          audioChunks = [];
          const mimeType = getRecorderMimeType();
          mediaStream = await window.navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          mediaRecorder = new window.MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);

          mediaRecorder.addEventListener('dataavailable', (event) => {
            if (event.data && event.data.size > 0) {
              audioChunks.push(event.data);
            }
          });

          mediaRecorder.addEventListener('error', (event) => {
            console.error('Erro na gravacao de voz:', event.error);
            statusText.textContent = 'Erro no microfone';
            showToast('Erro no microfone. Confirma a permissao do navegador.', 'error');
            cleanupRecording();
          });

          mediaRecorder.addEventListener('stop', () => {
            const finalMimeType = normalizeAudioMimeType(mediaRecorder?.mimeType || mimeType || 'audio/webm');
            cleanupRecording();
            if (audioChunks.length === 0) {
              statusText.textContent = 'Pronto';
              showToast('Nao apanhei audio. Tenta novamente e fala mais perto do microfone.', 'error');
              return;
            }
            void processAudioBlob(new window.Blob(audioChunks, { type: finalMimeType }));
          });

          recordingStartedAt = Date.now();
          mediaRecorder.start(RECORDING_TIMESLICE_MS);
          setRecordingUi(true);
          statusText.textContent = 'A gravar...';
          recordingTimer = window.setTimeout(stopRecording, 25000);
        } catch (err) {
          console.error('Falha ao iniciar gravacao:', err);
          cleanupRecording();
          statusText.textContent = 'Erro no microfone';
          showToast('Nao consegui aceder ao microfone. Confirma a permissao do navegador.', 'error');
        }
      }

      btnMic.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          stopRecording();
          return;
        }
        void startRecording();
      });
      if (btnCancel) btnCancel.addEventListener('click', discardMeeting);
      if (btnConfirm) btnConfirm.addEventListener('click', submitMeeting);
    }

    function toggleListening() {
      if (isListening) {
        recognition.stop();
        return;
      }

      try {
        lastRecognitionError = null;
        recognition.start();
      } catch (err) {
        console.error('Falha ao iniciar escuta:', err);
        showToast('Nao consegui iniciar o microfone. Confirma a permissao do navegador.', 'error');
      }
    }

    function toDatetimeLocalValue(value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    async function processCommand(text) {
      statusText.textContent = 'A interpretar...';
      setBusy(liveText, true);
      if (btnConfirm) btnConfirm.disabled = true;

      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Lisbon';
        const payload = await api('/api/calendar/voice/parse', {
          method: 'POST',
          body: JSON.stringify({
            transcript: text,
            now: new Date().toISOString(),
            timezone
          })
        });
        const parsed = payload.data;

        applyParsedCommand(text, parsed);
      } catch (err) {
        statusText.textContent = 'Erro ao interpretar';
        showToast(err.message || 'Falha ao interpretar o comando de voz.', 'error');
      } finally {
        setBusy(liveText, false);
      }
    }

    async function submitMeeting() {
      if (!inputTitle || !inputDateTime) return;
      const title = inputTitle.value.trim();
      const datetimeVal = inputDateTime.value;
      const description = inputDesc ? inputDesc.value.trim() : '';

      if (!title || !datetimeVal) {
        showToast('Preenche o titulo e a data/hora.', 'error');
        return;
      }

      const localDate = new Date(datetimeVal);
      if (Number.isNaN(localDate.getTime())) {
        showToast('A data/hora nao e valida.', 'error');
        return;
      }

      const startAt = localDate.toISOString();
      const endAt = new Date(localDate.getTime() + 30 * 60000).toISOString();

      if (btnConfirm) btnConfirm.disabled = true;
      setBusy(meetingForm, true);
      statusText.textContent = 'A agendar...';

      try {
        await api('/api/calendar/events', {
          method: 'POST',
          body: JSON.stringify({
            summary: title,
            description,
            startAt,
            endAt,
            createMeetLink: true
          })
        });

        statusText.textContent = 'Sucesso!';
        showToast('Reuniao agendada com Google Meet!', 'success');
        discardMeeting();
      } catch (err) {
        console.error(err);
        statusText.textContent = 'Erro ao agendar';
        showToast(err.message || 'Falha ao agendar.', 'error');
        if (btnConfirm) btnConfirm.disabled = false;
      } finally {
        setBusy(meetingForm, false);
      }
    }

    function discardMeeting() {
      if (meetingForm) meetingForm.hidden = true;
      if (liveText) liveText.textContent = '';
      statusText.textContent = 'Pronto';
      finalTranscriptText = '';
      accumulatedFinalTranscript = '';
      lastRecognitionError = null;
      setBusy(meetingForm, false);
      setBusy(liveText, false);
      if (btnConfirm) btnConfirm.disabled = false;
    }

    btnMic.addEventListener('click', toggleListening);
    if (btnCancel) btnCancel.addEventListener('click', discardMeeting);
    if (btnConfirm) btnConfirm.addEventListener('click', submitMeeting);
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
  initVoiceMeeting();
  refreshIcons();
  loadStatus();
})();
