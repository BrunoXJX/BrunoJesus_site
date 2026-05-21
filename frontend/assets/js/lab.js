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


  // --- DEMO 1: Node Editor (Drag & Drop Canvas) ---
  const nodeEditorContainer = document.getElementById('node-editor-container');
  const svgEdges = document.getElementById('node-edges');
  const btnRunPipeline = document.getElementById('btn-run-pipeline');
  const emailInput = document.getElementById('email-input');
  const finalStatus = document.getElementById('pipeline-final-status');

  let workflowNodes = [
    { id: 'n1', title: 'Receber Email', icon: 'mail', x: 20, y: 150, type: 'trigger', status: 'A aguardar...' },
    { id: 'n2', title: 'Classificar (IA)', icon: 'bot', x: 260, y: 150, type: 'action', status: 'Inativo' },
    { id: 'n3', title: 'Notificar Equipa', icon: 'bell', x: 520, y: 60, type: 'action', status: 'Inativo' },
    { id: 'n4', title: 'Registar CRM', icon: 'database', x: 520, y: 240, type: 'action', status: 'Inativo' }
  ];

  let workflowConnections = [
    { from: 'n1', to: 'n2', pathEl: null },
    { from: 'n2', to: 'n3', pathEl: null },
    { from: 'n2', to: 'n4', pathEl: null }
  ];

  function createBezierPath(x1, y1, x2, y2) {
    const cp1x = x1 + (x2 - x1) / 2;
    const cp2x = x2 - (x2 - x1) / 2;
    return `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
  }

  function renderEdges() {
    if (!svgEdges) return;
    svgEdges.innerHTML = '';
    workflowConnections.forEach(conn => {
      const elFrom = document.getElementById(conn.from);
      const elTo = document.getElementById(conn.to);
      if (elFrom && elTo) {
        const portFrom = elFrom.querySelector('.wf-port--out');
        const portTo = elTo.querySelector('.wf-port--in');
        
        // Use getBoundingClientRect to find exact positions inside container
        const containerRect = nodeEditorContainer.getBoundingClientRect();
        const fromRect = portFrom.getBoundingClientRect();
        const toRect = portTo.getBoundingClientRect();
        
        const x1 = fromRect.left - containerRect.left + (fromRect.width / 2);
        const y1 = fromRect.top - containerRect.top + (fromRect.height / 2);
        const x2 = toRect.left - containerRect.left + (toRect.width / 2);
        const y2 = toRect.top - containerRect.top + (toRect.height / 2);
        
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('d', createBezierPath(x1, y1, x2, y2));
        path.setAttribute('class', 'node-edge-path');
        svgEdges.appendChild(path);
        conn.pathEl = path;
      }
    });
  }

  function initNodeEditor() {
    if (!nodeEditorContainer) return;
    // Render Nodes
    workflowNodes.forEach(n => {
      const nodeEl = document.createElement('div');
      nodeEl.className = 'wf-node';
      nodeEl.id = n.id;
      nodeEl.style.left = `${n.x}px`;
      nodeEl.style.top = `${n.y}px`;
      
      let portsHtml = '';
      if (n.type !== 'trigger') portsHtml += '<div class="wf-port wf-port--in"></div>';
      portsHtml += '<div class="wf-port wf-port--out"></div>';
      
      nodeEl.innerHTML = `
        ${portsHtml}
        <div class="wf-node__header"><i data-lucide="${n.icon}"></i> ${n.title}</div>
        <div class="wf-node__status" id="status-${n.id}">${n.status}</div>
      `;
      nodeEditorContainer.appendChild(nodeEl);
      
      // Pointer Drag Logic
      let isDragging = false;
      let startX, startY;
      
      nodeEl.addEventListener('pointerdown', (e) => {
        isDragging = true;
        nodeEl.setPointerCapture(e.pointerId);
        const rect = nodeEl.getBoundingClientRect();
        const containerRect = nodeEditorContainer.getBoundingClientRect();
        startX = e.clientX - (rect.left - containerRect.left);
        startY = e.clientY - (rect.top - containerRect.top);
      });
      
      nodeEl.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        let nx = e.clientX - startX;
        let ny = e.clientY - startY;
        nodeEl.style.left = `${nx}px`;
        nodeEl.style.top = `${ny}px`;
        renderEdges();
      });
      
      nodeEl.addEventListener('pointerup', () => {
        isDragging = false;
      });
    });
    
    if (window.lucide) window.lucide.createIcons();
    // Allow rendering layout before drawing edges
    setTimeout(renderEdges, 50);
  }

  // Handle Resize
  window.addEventListener('resize', renderEdges);

  initNodeEditor();

  async function runWorkflowEngine() {
    if (!btnRunPipeline || btnRunPipeline.disabled) return;
    btnRunPipeline.disabled = true;
    btnRunPipeline.innerHTML = 'A executar... <i data-lucide="loader"></i>';
    if (window.lucide) window.lucide.createIcons();

    // Reset Visuals
    document.querySelectorAll('.wf-node').forEach(el => el.classList.remove('is-running', 'is-done'));
    if (svgEdges) svgEdges.querySelectorAll('.node-edge-path').forEach(p => p.classList.remove('is-active'));
    workflowNodes.forEach(n => document.getElementById(`status-${n.id}`).textContent = 'A aguardar...');
    if (finalStatus) finalStatus.textContent = '';

    const emailText = (emailInput?.value || '').toLowerCase();
    let isUrgent = emailText.includes('urgente') || emailText.includes('rápido');
    let category = 'Geral';
    if (emailText.includes('fatura') || emailText.includes('pagamento')) category = 'Faturação';
    else if (emailText.includes('problema') || emailText.includes('erro') || emailText.includes('reclamar')) category = 'Suporte';

    const getNode = id => document.getElementById(id);
    const setStatus = (id, txt) => document.getElementById(`status-${id}`).textContent = txt;
    const activateConn = (from, to) => {
      const conn = workflowConnections.find(c => c.from === from && c.to === to);
      if (conn && conn.pathEl) conn.pathEl.classList.add('is-active');
    };
    const deactivateConn = (from, to) => {
      const conn = workflowConnections.find(c => c.from === from && c.to === to);
      if (conn && conn.pathEl) conn.pathEl.classList.remove('is-active');
    };

    // Node 1: Receber
    let n1 = getNode('n1');
    n1.classList.add('is-running');
    setStatus('n1', 'Email ingerido');
    await sleep(800);
    n1.classList.replace('is-running', 'is-done');
    activateConn('n1', 'n2');
    await sleep(600);
    deactivateConn('n1', 'n2');

    // Node 2: Classificar
    let n2 = getNode('n2');
    n2.classList.add('is-running');
    setStatus('n2', 'A extrair intenção...');
    await sleep(1000);
    setStatus('n2', `Urgência: ${isUrgent ? 'Alta' : 'Baixa'}\nTema: ${category}`);
    await sleep(800);
    n2.classList.replace('is-running', 'is-done');
    
    activateConn('n2', 'n3');
    activateConn('n2', 'n4');
    await sleep(600);
    deactivateConn('n2', 'n3');
    deactivateConn('n2', 'n4');

    // Nodes 3 & 4 (Parallel)
    let n3 = getNode('n3');
    let n4 = getNode('n4');
    n3.classList.add('is-running');
    n4.classList.add('is-running');
    setStatus('n3', isUrgent ? 'Alerta Slack > Equipa' : 'Nenhuma ação (Baixa)');
    setStatus('n4', 'A enviar para DB...');
    await sleep(1000);
    setStatus('n4', 'Criado Ticket #4928');
    n3.classList.replace('is-running', 'is-done');
    n4.classList.replace('is-running', 'is-done');

    if (finalStatus) finalStatus.textContent = 'Workflow concluído com sucesso ✓';
    btnRunPipeline.disabled = false;
    btnRunPipeline.innerHTML = 'Executar Workflow <i data-lucide="play"></i>';
    if (window.lucide) window.lucide.createIcons();
  }

  btnRunPipeline?.addEventListener('click', runWorkflowEngine);


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
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = parent.clientWidth - 32;
    const displayHeight = 400;
    
    canvas.width = displayWidth * dpr; 
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.scale(dpr, dpr);

    const width = displayWidth;
    const height = displayHeight;

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

  // Custom Cursor
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
    let isHovering = false;
    let rafId = null;

    const onMouseMove = (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      const target = event.target;
      if (target instanceof Element) {
        const style = window.getComputedStyle(target);
        isHovering =
          style.cursor === "pointer" ||
          target.tagName.toLowerCase() === "a" ||
          target.tagName.toLowerCase() === "button" ||
          target.closest("a, button, [role='button']") !== null;
      }
    };

    const updateCursor = () => {
      dotX += (mouseX - dotX) * 0.3;
      dotY += (mouseY - dotY) * 0.3;
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;

      dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;

      if (isHovering) {
        dot.classList.add("is-hover");
        ring.classList.add("is-hover");
      } else {
        dot.classList.remove("is-hover");
        ring.classList.remove("is-hover");
      }

      rafId = requestAnimationFrame(updateCursor);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    rafId = requestAnimationFrame(updateCursor);
  }

  initCustomCursor();

})();
