(function () {
  'use strict';

  // --- Theme Toggle ---
  const themeToggle = document.getElementById('theme-toggle');
  const toggleText = themeToggle?.querySelector('.theme-toggle__text');
  
  function updateThemeUI() {
    if (!themeToggle || !toggleText) return;
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'electric';
    const isElectric = currentTheme === 'electric';
    themeToggle.setAttribute('aria-pressed', isElectric.toString());
    toggleText.textContent = isElectric ? 'Verde' : 'Azul';
  }

  themeToggle?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'electric';
    const newTheme = currentTheme === 'electric' ? 'flowix' : 'electric';
    document.documentElement.setAttribute('data-theme', newTheme);
    try {
      window.localStorage.setItem('bj-theme', newTheme);
    } catch (e) {}
    updateThemeUI();
    // Re-render dashboard to pick up new colors
    if (typeof renderDashboard === 'function') {
      setTimeout(renderDashboard, 100);
    }
  });
  updateThemeUI();


  // --- Helper ---
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));


  // --- DEMO 1: Pipeline ---
  const btnRunPipeline = document.getElementById('btn-run-pipeline');
  const emailInput = document.getElementById('email-input');
  const nodes = [
    document.getElementById('node-1'),
    document.getElementById('node-2'),
    document.getElementById('node-3'),
    document.getElementById('node-4'),
    document.getElementById('node-5')
  ];
  const connectors = document.querySelectorAll('.pipeline-connector');
  const finalStatus = document.getElementById('pipeline-final-status');

  async function runPipeline() {
    if (btnRunPipeline.disabled) return;
    btnRunPipeline.disabled = true;
    btnRunPipeline.innerHTML = 'A executar... <i data-lucide="loader"></i>';
    if (window.lucide) window.lucide.createIcons();

    // Reset UI
    nodes.forEach(n => {
      n.classList.remove('is-active', 'is-done');
      n.querySelector('.node-status').textContent = '';
    });
    connectors.forEach(c => c.classList.remove('is-active', 'is-done'));
    if (finalStatus) finalStatus.textContent = '';
    
    nodes[0].querySelector('.node-status').textContent = 'A aguardar...';

    const emailText = (emailInput?.value || '').toLowerCase();
    
    // Keyword analysis (pseudo-IA)
    let isUrgent = emailText.includes('urgente') || emailText.includes('rápido');
    let category = 'Geral';
    if (emailText.includes('fatura') || emailText.includes('pagamento')) category = 'Faturação';
    else if (emailText.includes('problema') || emailText.includes('erro') || emailText.includes('reclamar')) category = 'Suporte';

    // Node 1: Receber
    nodes[0].classList.add('is-active');
    nodes[0].querySelector('.node-status').textContent = 'Email recebido';
    await sleep(1000);
    nodes[0].classList.remove('is-active');
    nodes[0].classList.add('is-done');
    connectors[0].classList.add('is-active');
    await sleep(600);
    connectors[0].classList.remove('is-active');
    connectors[0].classList.add('is-done');

    // Node 2: Classificar
    nodes[1].classList.add('is-active');
    nodes[1].querySelector('.node-status').textContent = 'A processar...';
    await sleep(1200);
    nodes[1].querySelector('.node-status').textContent = `Urgência: ${isUrgent ? 'Alta' : 'Normal'}\nCat: ${category}`;
    await sleep(600);
    nodes[1].classList.remove('is-active');
    nodes[1].classList.add('is-done');
    connectors[1].classList.add('is-active');
    await sleep(600);
    connectors[1].classList.remove('is-active');
    connectors[1].classList.add('is-done');

    // Node 3: Resposta Auto
    nodes[2].classList.add('is-active');
    nodes[2].querySelector('.node-status').textContent = 'A gerar texto...';
    await sleep(1000);
    nodes[2].querySelector('.node-status').textContent = 'Resposta enviada ✓';
    await sleep(400);
    nodes[2].classList.remove('is-active');
    nodes[2].classList.add('is-done');
    connectors[2].classList.add('is-active');
    await sleep(600);
    connectors[2].classList.remove('is-active');
    connectors[2].classList.add('is-done');

    // Node 4: Notificar Equipa
    nodes[3].classList.add('is-active');
    if (isUrgent) {
      nodes[3].querySelector('.node-status').textContent = 'Alerta Slack enviado!';
    } else {
      nodes[3].querySelector('.node-status').textContent = 'Log registado';
    }
    await sleep(1000);
    nodes[3].classList.remove('is-active');
    nodes[3].classList.add('is-done');
    connectors[3].classList.add('is-active');
    await sleep(600);
    connectors[3].classList.remove('is-active');
    connectors[3].classList.add('is-done');

    // Node 5: Registar CRM
    nodes[4].classList.add('is-active');
    nodes[4].querySelector('.node-status').textContent = 'A sincronizar...';
    await sleep(1000);
    nodes[4].querySelector('.node-status').textContent = 'Ticket #9482 criado';
    nodes[4].classList.remove('is-active');
    nodes[4].classList.add('is-done');

    if (finalStatus) finalStatus.textContent = 'Pipeline concluído com sucesso ✓';
    btnRunPipeline.disabled = false;
    btnRunPipeline.innerHTML = 'Executar Pipeline <i data-lucide="play"></i>';
    if (window.lucide) window.lucide.createIcons();
  }

  btnRunPipeline?.addEventListener('click', runPipeline);


  // --- DEMO 2: Dashboard Builder ---
  const canvas = document.getElementById('dashboard-canvas');
  const ctx = canvas?.getContext('2d');
  const btnGenerateChart = document.getElementById('btn-generate-chart');
  const csvInput = document.getElementById('csv-input');
  const chartTypeSelect = document.getElementById('chart-type');

  function getThemeColor() {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'flowix' ? '#0084ff' : '#39ff14';
  }
  
  function getSecondaryColor() {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'flowix' ? '#39ff14' : '#0084ff';
  }

  function renderDashboard() {
    if (!canvas || !ctx || !csvInput) return;
    
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth - 32; 
    canvas.height = 400;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const lines = csvInput.value.trim().split('\n');
    if (lines.length < 2) return;

    const labels = [];
    const dataset1 = [];
    const dataset2 = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 2) {
        labels.push(parts[0]);
        dataset1.push(parseFloat(parts[1]) || 0);
        if (parts.length >= 3) {
          dataset2.push(parseFloat(parts[2]) || 0);
        } else {
          dataset2.push(0);
        }
      }
    }

    const type = chartTypeSelect.value;
    const maxVal = Math.max(...dataset1, ...dataset2, 1);
    
    const primaryColor = getThemeColor();
    const secondaryColor = getSecondaryColor();
    const textColor = '#f1f3ec';

    ctx.font = '12px "JetBrains Mono"';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';

    if (type === 'bar') {
      const padX = 50;
      const padY = 40;
      const chartW = width - padX * 2;
      const chartH = height - padY * 2;
      
      const numBars = labels.length;
      const groupW = chartW / numBars;
      const barW = groupW * 0.35;

      // Draw axes
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.moveTo(padX, padY);
      ctx.lineTo(padX, height - padY);
      ctx.lineTo(width - padX, height - padY);
      ctx.stroke();

      for (let i = 0; i < numBars; i++) {
        const x = padX + i * groupW + groupW/2;
        
        // Data 1
        const h1 = (dataset1[i] / maxVal) * chartH;
        ctx.fillStyle = primaryColor;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 8;
        ctx.fillRect(x - barW - 2, height - padY - h1, barW, h1);

        // Data 2
        const h2 = (dataset2[i] / maxVal) * chartH;
        ctx.fillStyle = secondaryColor;
        ctx.shadowColor = secondaryColor;
        ctx.shadowBlur = 8;
        ctx.fillRect(x + 2, height - padY - h2, barW, h2);

        ctx.shadowBlur = 0;
        ctx.fillStyle = textColor;
        ctx.fillText(labels[i], x, height - padY + 20);
      }
    } else if (type === 'line') {
      const padX = 50;
      const padY = 40;
      const chartW = width - padX * 2;
      const chartH = height - padY * 2;
      const stepX = chartW / Math.max(1, labels.length - 1);

      ctx.beginPath();
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 12;
      
      for (let i = 0; i < labels.length; i++) {
        const x = padX + i * stepX;
        const y = height - padY - (dataset1[i] / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = textColor;
      for (let i = 0; i < labels.length; i++) {
        const x = padX + i * stepX;
        const y = height - padY - (dataset1[i] / maxVal) * chartH;
        
        ctx.beginPath();
        ctx.fillStyle = primaryColor;
        ctx.arc(x, y, 6, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = textColor;
        ctx.fillText(labels[i], x, height - padY + 20);
        ctx.fillText(dataset1[i].toString(), x, y - 15);
      }
    } else if (type === 'donut') {
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(cx, cy) * 0.7;
      const innerRadius = radius * 0.6;
      
      const total = dataset1.reduce((a, b) => a + b, 0);
      if (total === 0) return;

      let startAngle = -Math.PI / 2;

      for (let i = 0; i < dataset1.length; i++) {
        const sliceAngle = (dataset1[i] / total) * 2 * Math.PI;
        
        const alpha = 1 - (i * 0.15);
        ctx.fillStyle = `rgba(${primaryColor === '#0084ff' ? '0,132,255' : '57,255,20'}, ${alpha})`;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
        ctx.fill();

        const labelAngle = startAngle + sliceAngle / 2;
        const labelX = cx + Math.cos(labelAngle) * (radius * 1.25);
        const labelY = cy + Math.sin(labelAngle) * (radius * 1.25);
        ctx.fillStyle = textColor;
        ctx.fillText(labels[i], labelX, labelY);

        startAngle += sliceAngle;
      }

      ctx.beginPath();
      // Using a dark color that matches the container background
      ctx.fillStyle = 'rgba(7, 10, 7, 1)'; 
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = textColor;
      ctx.font = '14px "Cabinet Grotesk"';
      ctx.fillText('Total', cx, cy - 5);
      ctx.font = 'bold 18px "JetBrains Mono"';
      ctx.fillText(total.toLocaleString(), cx, cy + 18);
    }
  }

  btnGenerateChart?.addEventListener('click', renderDashboard);
  window.addEventListener('resize', renderDashboard);
  setTimeout(renderDashboard, 200); 


  // --- DEMO 3: Chatbot ---
  const rulesContainer = document.getElementById('rules-container');
  const btnAddRule = document.getElementById('btn-add-rule');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const btnSendChat = document.getElementById('btn-send-chat');

  let defaultRules = [
    { keyword: 'preço', response: 'Os nossos preços são ajustados à dimensão do desafio. Podemos agendar uma chamada para analisar o teu caso.' },
    { keyword: 'automação', response: 'A automação é o nosso forte! Utilizamos n8n, Power Automate e scripts customizados para ligar qualquer sistema.' },
    { keyword: 'olá', response: 'Olá! Como posso ajudar-te hoje com os teus processos?' }
  ];

  function renderRules() {
    if (!rulesContainer) return;
    rulesContainer.innerHTML = '';
    defaultRules.forEach((rule, index) => {
      const card = document.createElement('div');
      card.className = 'rule-card';
      card.innerHTML = `
        <button class="btn-remove" data-index="${index}" title="Remover regra"><i data-lucide="x"></i></button>
        <div class="rule-field">
          <label>Se mensagem contém:</label>
          <input type="text" class="rule-keyword" value="${rule.keyword}" data-index="${index}">
        </div>
        <div class="rule-field">
          <label>Responder:</label>
          <input type="text" class="rule-response" value="${rule.response}" data-index="${index}">
        </div>
      `;
      rulesContainer.appendChild(card);
    });
    
    rulesContainer.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'));
        defaultRules.splice(idx, 1);
        renderRules();
      });
    });
    
    rulesContainer.querySelectorAll('.rule-keyword').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        defaultRules[idx].keyword = e.target.value;
      });
    });
    
    rulesContainer.querySelectorAll('.rule-response').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        defaultRules[idx].response = e.target.value;
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  btnAddRule?.addEventListener('click', () => {
    defaultRules.push({ keyword: 'nova-palavra', response: 'Nova resposta...' });
    renderRules();
    rulesContainer.scrollTop = rulesContainer.scrollHeight;
  });

  renderRules();

  function appendMessage(text, sender) {
    const msg = document.createElement('div');
    msg.className = `chat-message ${sender}`;
    msg.innerHTML = `<div class="chat-bubble">${text}</div>`;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTyping() {
    const msg = document.createElement('div');
    msg.className = `chat-message bot typing`;
    msg.innerHTML = `
      <div class="chat-bubble typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msg;
  }

  async function handleChatSend() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    appendMessage(text, 'user');

    const typingEl = showTyping();
    await sleep(800 + Math.random() * 500); 

    typingEl.remove();

    const lowerText = text.toLowerCase();
    let foundResponse = null;

    for (const rule of defaultRules) {
      if (rule.keyword && lowerText.includes(rule.keyword.toLowerCase())) {
        foundResponse = rule.response;
        break;
      }
    }

    if (foundResponse) {
      appendMessage(foundResponse, 'bot');
    } else {
      appendMessage('Não encontrei uma regra para essa mensagem. Experimenta adicionar uma nova regra no painel ao lado!', 'bot');
    }
  }

  btnSendChat?.addEventListener('click', handleChatSend);
  chatInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatSend();
  });

  // Expose renderDashboard to global scope so theme toggle can call it
  window.renderDashboard = renderDashboard;

})();
