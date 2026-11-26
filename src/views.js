export function renderWebchatHtml({ nomeTecnico, tecnicoWhatsapp }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CPD Suporte — Atendimento das Lojas</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #25d366;
      --accent-hover: #22c55e;
      --user-msg: #1e3a8a;
      --bot-msg: #334155;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; }
    header { background: #0b1120; border-bottom: 1px solid var(--border); padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; }
    .header-title { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 16px; }
    .status-pill { background: rgba(37, 211, 102, 0.15); color: #25d366; border: 1px solid #25d366; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; }
    .chat-container { flex: 1; max-width: 900px; width: 100%; margin: 0 auto; display: flex; flex-direction: column; overflow: hidden; padding: 16px; }
    .messages-area { flex: 1; overflow-y: auto; padding-right: 8px; display: flex; flex-direction: column; gap: 14px; }
    .msg-row { display: flex; width: 100%; }
    .msg-user { justify-content: flex-end; }
    .msg-bot { justify-content: flex-start; }
    .bubble { max-width: 80%; padding: 12px 16px; border-radius: 14px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
    .bubble-user { background: var(--user-msg); color: #fff; border-bottom-right-radius: 2px; }
    .bubble-bot { background: var(--bot-msg); color: var(--text); border-bottom-left-radius: 2px; border: 1px solid var(--border); }
    .msg-time { font-size: 10px; color: var(--muted); margin-top: 4px; text-align: right; }
    .suggestions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .sug-chip { background: var(--card); border: 1px solid var(--border); padding: 6px 12px; border-radius: 9999px; font-size: 12px; cursor: pointer; color: #cbd5e1; transition: all 0.2s; }
    .sug-chip:hover { border-color: var(--accent); color: var(--accent); }
    .input-area { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 8px 12px; display: flex; gap: 8px; align-items: center; }
    .input-area textarea { flex: 1; background: transparent; border: none; color: #fff; font-size: 14px; resize: none; outline: none; height: 38px; line-height: 20px; font-family: inherit; }
    .btn-send { background: var(--accent); color: #000; border: none; font-weight: 700; padding: 0 16px; height: 38px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .btn-send:hover { background: var(--accent-hover); }
    .transbordo-card { background: rgba(245, 158, 11, 0.1); border: 1px solid var(--warning); border-radius: 12px; padding: 16px; margin-top: 8px; }
    .btn-whatsapp { display: inline-flex; align-items: center; gap: 8px; background: #25d366; color: #000; font-weight: 800; padding: 12px 20px; border-radius: 8px; text-decoration: none; margin-top: 12px; font-size: 14px; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3); }
    .typing-indicator { display: none; align-items: center; gap: 4px; padding: 8px 12px; background: var(--bot-msg); border-radius: 12px; width: fit-content; font-size: 12px; color: var(--muted); }
    .dot { width: 6px; height: 6px; background: var(--muted); border-radius: 50%; animation: blink 1.4s infinite both; }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blink { 0%, 80%, 100% { opacity: 0; } 40% { opacity: 1; } }
  </style>
</head>
<body>
  <header>
    <div class="header-title">
      <span>🏪 Suporte CPD — Atendimento de Loja</span>
    </div>
    <div style="display: flex; align-items: center; gap: 14px;">
      <span class="status-pill">🟢 Assistente de TI Online</span>
      <a href="/" style="color: var(--muted); font-size: 12px; text-decoration: none;">Painel Geral</a>
    </div>
  </header>

  <div class="chat-container">
    <div class="suggestions">
      <div class="sug-chip" onclick="quickSend('A impressora branca tá com luz vermelha e não imprime')">🖨️ Impressora Branca GC420t</div>
      <div class="sug-chip" onclick="quickSend('A impressora preta tá pulando etiqueta e cortando')">🖨️ Impressora Preta ZD220</div>
      <div class="sug-chip" onclick="quickSend('A luz da impressora tá verde mas não sai preço do Consinco')">📊 Não sai preço no Consinco</div>
      <div class="sug-chip" onclick="quickSend('A gaveta do PDV tá travada e não abre')">💵 Gaveta de Dinheiro PDV</div>
    </div>

    <div class="messages-area" id="messagesArea">
      <div class="msg-row msg-bot">
        <div class="bubble bubble-bot">
          Olá! Sou o assistente de suporte de TI das lojas. 
          
Para começarmos, por favor me informe o **número da sua Loja** e qual **equipamento ou sistema** está com problema.
          <div class="msg-time">Agora</div>
        </div>
      </div>
    </div>

    <div class="typing-indicator" id="typingIndicator">
      <span>Assistente digitando</span>
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>

    <div class="input-area" style="margin-top: 12px;">
      <textarea id="messageInput" placeholder="Descreva o problema ou responda o teste da IA..." onkeydown="handleKey(event)"></textarea>
      <button class="btn-send" id="btnSend" onclick="sendMessage()">Enviar ➔</button>
    </div>
  </div>

  <script>
    const sessionId = 'web_' + Math.random().toString(36).substring(2, 9);
    const messagesArea = document.getElementById('messagesArea');
    const messageInput = document.getElementById('messageInput');
    const typingIndicator = document.getElementById('typingIndicator');
    const btnSend = document.getElementById('btnSend');
    const tecnicoWhatsapp = '${tecnicoWhatsapp}';

    function scrollToBottom() {
      messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function appendMessage(role, text, isTransbordo = false, ticketText = '') {
      const row = document.createElement('div');
      row.className = 'msg-row ' + (role === 'user' ? 'msg-user' : 'msg-bot');

      const bubble = document.createElement('div');
      bubble.className = 'bubble ' + (role === 'user' ? 'bubble-user' : 'bubble-bot');
      bubble.textContent = text;

      const time = document.createElement('div');
      time.className = 'msg-time';
      time.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      bubble.appendChild(time);

      if (isTransbordo) {
        const transbordoCard = document.createElement('div');
        transbordoCard.className = 'transbordo-card';
        transbordoCard.innerHTML = '<strong>🚨 Chamado CPD Registrado!</strong><br><small>O problema precisa de atendimento humano do técnico Rafael.</small><br>' +
          '<a class="btn-whatsapp" target="_blank" href="https://wa.me/' + tecnicoWhatsapp + '?text=' + encodeURIComponent(ticketText || text) + '">' +
          '📲 Abrir WhatsApp do Rafael (CPD) com o Chamado' +
          '</a>';
        bubble.appendChild(transbordoCard);
      }

      row.appendChild(bubble);
      messagesArea.appendChild(row);
      scrollToBottom();
    }

    async function sendMessage() {
      const text = messageInput.value.trim();
      if (!text) return;

      appendMessage('user', text);
      messageInput.value = '';
      messageInput.disabled = true;
      btnSend.disabled = true;
      typingIndicator.style.display = 'flex';
      scrollToBottom();

      try {
        const res = await fetch('/api/webchat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, sessionId })
        });
        const data = await res.json();

        typingIndicator.style.display = 'none';
        messageInput.disabled = false;
        btnSend.disabled = false;
        messageInput.focus();

        if (data.response) {
          appendMessage('bot', data.response, data.isTransbordo, data.ticketText);
        } else {
          appendMessage('bot', 'Ocorreu um erro ao processar. Tente novamente.');
        }
      } catch (err) {
        typingIndicator.style.display = 'none';
        messageInput.disabled = false;
        btnSend.disabled = false;
        appendMessage('bot', 'Falha na comunicação com o servidor de suporte.');
      }
    }

    function handleKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    }

    function quickSend(txt) {
      messageInput.value = txt;
      sendMessage();
    }
  </script>
</body>
</html>`;
}

export function renderAdminLoginHtml(error = '') {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acesso Restrito — CPD Admin</title>
  <style>
    :root {
      --bg: #0b1120;
      --card: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #25d366;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background: var(--bg); color: var(--text); height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .login-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 32px; width: 100%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .title { font-size: 20px; font-weight: 800; margin-bottom: 6px; text-align: center; }
    .subtitle { font-size: 13px; color: var(--muted); text-align: center; margin-bottom: 24px; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #cbd5e1; }
    input { width: 100%; padding: 10px 14px; background: #090d16; border: 1px solid var(--border); border-radius: 8px; color: #fff; font-size: 14px; outline: none; }
    input:focus { border-color: var(--accent); }
    .btn-login { width: 100%; background: var(--accent); color: #000; font-weight: 800; padding: 12px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; margin-top: 10px; }
    .btn-login:hover { background: #22c55e; }
    .error-alert { background: rgba(239, 68, 68, 0.15); border: 1px solid var(--danger); color: #fca5a5; padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; text-align: center; }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="title">🔐 Área Administrativa CPD</div>
    <div class="subtitle">Faça login para gerenciar chats, base e bot</div>
    ${error ? `<div class="error-alert">${error}</div>` : ''}
    <form method="POST" action="/api/admin/login">
      <div class="form-group">
        <label>Usuário Administrador:</label>
        <input type="text" name="user" required autofocus placeholder="admin" />
      </div>
      <div class="form-group">
        <label>Senha de Acesso:</label>
        <input type="password" name="pass" required placeholder="••••••••" />
      </div>
      <button type="submit" class="btn-login">Entrar no Painel ➔</button>
    </form>
    <div style="text-align: center; margin-top: 20px;">
      <a href="/" style="color: var(--muted); font-size: 12px; text-decoration: none;">← Voltar ao Início</a>
    </div>
  </div>
</body>
</html>`;
}

export function renderAdminDashboardHtml({ sessions, knowledge, config, token }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Painel de Controle do CPD — Gestão Completa</title>
  <style>
    :root {
      --bg: #090d16;
      --card: #131c2e;
      --border: #233149;
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #25d366;
      --accent-hover: #22c55e;
      --danger: #ef4444;
      --warning: #f59e0b;
      --info: #38bdf8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 24px; min-height: 100vh; }
    .container { max-width: 1300px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
    .logo-area { display: flex; align-items: center; gap: 12px; }
    .tabs { display: flex; gap: 8px; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
    .tab-btn { background: var(--card); border: 1px solid var(--border); color: #cbd5e1; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; }
    .tab-btn.active { background: #1e3a8a; border-color: #3b82f6; color: #fff; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 22px; }
    .card-title { font-size: 18px; font-weight: 700; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
    
    /* Tabela de Chats */
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    th { padding: 12px; border-bottom: 2px solid var(--border); color: var(--muted); font-weight: 600; }
    td { padding: 14px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    .badge { padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; display: inline-block; }
    .badge-active { background: rgba(37, 211, 102, 0.15); color: #25d366; border: 1px solid #25d366; }
    .badge-paused { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid #ef4444; }
    .btn-action { padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: #1e293b; color: #fff; transition: all 0.2s; margin-right: 6px; }
    .btn-action:hover { border-color: var(--accent); color: var(--accent); }
    .btn-danger { color: #fca5a5; }
    .btn-danger:hover { background: rgba(239, 68, 68, 0.2); border-color: var(--danger); color: var(--danger); }
    .btn-learn { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border-color: #38bdf8; }
    .btn-learn:hover { background: rgba(56, 189, 248, 0.3); }

    /* Modal / Form */
    .modal-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); align-items: center; justify-content: center; z-index: 100; }
    .modal-box { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--muted); }
    .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px 12px; background: #090d16; border: 1px solid var(--border); border-radius: 6px; color: #fff; font-size: 13px; font-family: inherit; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-area">
        <h1>🛡️ CPD Admin — Central de Controle</h1>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <span style="font-size: 13px; color: var(--muted);">Técnico Responsável: <strong>${config.nomeTecnico}</strong></span>
        <a href="/" style="color: var(--info); font-size: 13px; text-decoration: none;">Painel Inicial</a>
        <a href="/chat" target="_blank" style="color: var(--accent); font-size: 13px; text-decoration: none;">Abrir Webchat Loja</a>
        <a href="/api/admin/logout" style="color: var(--danger); font-size: 13px; text-decoration: none; font-weight: 600;">Sair [Logout]</a>
      </div>
    </header>

    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('tab-chats')">💬 Chats & Atendimentos Ativos (${sessions.length})</button>
      <button class="tab-btn" onclick="switchTab('tab-knowledge')">📚 Base de Conhecimento RAG (${knowledge.length} tópicos)</button>
      <button class="tab-btn" onclick="switchTab('tab-config')">⚙️ Configurações & Segurança</button>
    </div>

    <!-- ABA 1: CHATS ATIVOS -->
    <div id="tab-chats" class="card tab-content">
      <div class="card-title">
        <span>Sessões em Andamento (WhatsApp & Web)</span>
        <button class="btn-action" onclick="location.reload()">🔄 Atualizar Lista</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Origem / Contato</th>
            <th>Status do Bot</th>
            <th>Última Mensagem</th>
            <th>Atualizado em</th>
            <th>Ações do Rafael</th>
          </tr>
        </thead>
        <tbody>
          ${sessions.map(s => {
            const lastMsg = s.history && s.history.length > 0 ? s.history[s.history.length - 1].text : 'Nenhuma mensagem';
            const cleanJid = s.jid.split('@')[0];
            return `
              <tr>
                <td>
                  <strong>${cleanJid}</strong><br>
                  <small style="color: var(--muted);">${s.jid.endsWith('@lid') ? 'WhatsApp Business (LID)' : s.jid.startsWith('web_') ? 'Webchat Loja' : 'WhatsApp Padrão'}</small>
                </td>
                <td>
                  ${s.paused ? '<span class="badge badge-paused">⏸️ Pausado (Com Rafael)</span>' : '<span class="badge badge-active">🟢 Bot Ativo</span>'}
                </td>
                <td style="max-width: 380px; word-break: break-all;">
                  "${lastMsg.slice(0, 90)}${lastMsg.length > 90 ? '...' : ''}"
                </td>
                <td style="color: var(--muted);">${new Date(s.updatedAt).toLocaleTimeString('pt-BR')}</td>
                <td>
                  ${s.paused ? 
                    `<button class="btn-action" onclick="sessionAction('${s.jid}', 'resume')">▶️ Reativar Bot</button>` :
                    `<button class="btn-action btn-danger" onclick="sessionAction('${s.jid}', 'pause')">⏸️ Assumir / Pausar</button>`
                  }
                  <button class="btn-action btn-learn" onclick="sessionAction('${s.jid}', 'learn')">🧠 Aprender</button>
                </td>
              </tr>
            `;
          }).join('')}
          ${sessions.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: var(--muted); padding: 30px;">Nenhum atendimento registrado no momento.</td></tr>' : ''}
        </tbody>
      </table>
    </div>

    <!-- ABA 2: BASE DE CONHECIMENTO -->
    <div id="tab-knowledge" class="card tab-content" style="display: none;">
      <div class="card-title">
        <span>Tópicos da Base Técnica do CPD</span>
        <button class="btn-action" style="background: var(--accent); color: #000; font-weight: 700;" onclick="openNewRecordModal()">+ Novo Tópico Técnico</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Equipamento / Sistema</th>
            <th>Categoria</th>
            <th>Gatilhos / Palavras-chave</th>
            <th>Solução Rápida Principal</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${knowledge.map(k => `
            <tr>
              <td><strong>${k.equipamento}</strong></td>
              <td><span class="badge" style="background: #1e293b; color: #cbd5e1;">${k.categoria}</span></td>
              <td style="max-width: 250px; color: var(--muted); font-size: 12px;">${(k.gatilhos || []).slice(0, 6).join(', ')}...</td>
              <td style="max-width: 320px; font-size: 12px; color: #cbd5e1;">${k.passos_rapidos ? k.passos_rapidos[0] : ''}</td>
              <td>
                <button class="btn-action" onclick="editKnowledge('${k.id}')">✏️ Editar</button>
                <button class="btn-action btn-danger" onclick="deleteKnowledge('${k.id}')">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- ABA 3: CONFIGURAÇÕES -->
    <div id="tab-config" class="card tab-content" style="display: none;">
      <div class="card-title">
        <span>Configurações Operacionais do Bot</span>
      </div>

      <div style="max-width: 600px; display: flex; flex-direction: column; gap: 16px;">
        <div class="form-group">
          <label>Modo de Teste (Bloquear Lojas Não-Autorizadas):</label>
          <select id="cfgModoTeste">
            <option value="true" ${config.modoTeste ? 'selected' : ''}>ATIVADO (Apenas Whitelist de Teste)</option>
            <option value="false" ${!config.modoTeste ? 'selected' : ''}>DESATIVADO (Liberado para Todas as Lojas da Rede)</option>
          </select>
        </div>

        <div class="form-group">
          <label>Números Autorizados no Modo Teste (Separados por vírgula):</label>
          <input type="text" id="cfgWhitelist" value="${config.numerosPermitidos.join(', ')}" />
        </div>

        <div class="form-group">
          <label>WhatsApp do Rafael para Transbordo Automático:</label>
          <input type="text" id="cfgWhatsapp" value="${config.tecnicoWhatsapp}" />
        </div>

        <button class="btn-action" style="background: var(--accent); color: #000; font-weight: 700; padding: 12px;" onclick="saveConfig()">💾 Salvar Configurações</button>
      </div>
    </div>
  </div>

  <!-- MODAL DE CADASTRO/EDIÇÃO DE CONHECIMENTO -->
  <div class="modal-backdrop" id="knowledgeModal">
    <div class="modal-box">
      <h3 style="margin-bottom: 16px;" id="modalTitle">Cadastrar Tópico Técnico</h3>
      <input type="hidden" id="recId" />
      <div class="form-group">
        <label>Nome do Equipamento ou Sistema:</label>
        <input type="text" id="recEquip" placeholder="Ex: Impressora Zebra GC420t" />
      </div>
      <div class="form-group">
        <label>Categoria:</label>
        <input type="text" id="recCat" placeholder="Ex: Impressora, Consinco, PDV, Balança" />
      </div>
      <div class="form-group">
        <label>Gatilhos / Palavras-chave de busca (separadas por vírgula):</label>
        <input type="text" id="recGatilhos" placeholder="Ex: impressora branca, pulando, duas piscadas, calibrar" />
      </div>
      <div class="form-group">
        <label>Passos Rápidos de Solução (1 por linha):</label>
        <textarea id="recPassos" rows="4" placeholder="Passo 1: Segure o botão FEED...&#10;Passo 2: Solte ao piscar 2 vezes..."></textarea>
      </div>
      <div class="form-group">
        <label>Critério de Transbordo (Quando passar para o Rafael):</label>
        <input type="text" id="recTransbordo" placeholder="Ex: Se após 2 tentativas a luz continuar vermelha" />
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
        <button class="btn-action" onclick="closeModal()">Cancelar</button>
        <button class="btn-action" style="background: var(--accent); color: #000; font-weight: 700;" onclick="saveKnowledgeRecord()">Salvar Tópico</button>
      </div>
    </div>
  </div>

  <script>
    const knowledgeData = ${JSON.stringify(knowledge)};

    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      document.getElementById(tabId).style.display = 'block';
      event.target.classList.add('active');
    }

    async function sessionAction(jid, action) {
      if (action === 'learn' && !confirm('Deseja acionar a IA para aprender com as mensagens deste atendimento e cadastrar novo tópico?')) return;
      try {
        const res = await fetch('/api/admin/sessions/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jid, action })
        });
        const data = await res.json();
        if (data.success) {
          alert('Ação executada com sucesso!');
          location.reload();
        } else {
          alert('Erro: ' + (data.error || 'Falha ao executar ação'));
        }
      } catch (e) {
        alert('Erro de conexão: ' + e.message);
      }
    }

    function openNewRecordModal() {
      document.getElementById('modalTitle').textContent = 'Cadastrar Novo Tópico Técnico';
      document.getElementById('recId').value = '';
      document.getElementById('recEquip').value = '';
      document.getElementById('recCat').value = 'Geral';
      document.getElementById('recGatilhos').value = '';
      document.getElementById('recPassos').value = '';
      document.getElementById('recTransbordo').value = 'Se não resolver em 2 tentativas, transferir para o Rafael.';
      document.getElementById('knowledgeModal').style.display = 'flex';
    }

    function editKnowledge(id) {
      const rec = knowledgeData.find(k => k.id === id);
      if (!rec) return;
      document.getElementById('modalTitle').textContent = 'Editar Tópico: ' + rec.equipamento;
      document.getElementById('recId').value = rec.id;
      document.getElementById('recEquip').value = rec.equipamento;
      document.getElementById('recCat').value = rec.categoria;
      document.getElementById('recGatilhos').value = (rec.gatilhos || []).join(', ');
      document.getElementById('recPassos').value = (rec.passos_rapidos || []).join('\\n');
      document.getElementById('recTransbordo').value = rec.criterio_transbordo || '';
      document.getElementById('knowledgeModal').style.display = 'flex';
    }

    function closeModal() {
      document.getElementById('knowledgeModal').style.display = 'none';
    }

    async function saveKnowledgeRecord() {
      const id = document.getElementById('recId').value;
      const equipamento = document.getElementById('recEquip').value.trim();
      const categoria = document.getElementById('recCat').value.trim();
      const gatilhos = document.getElementById('recGatilhos').value.split(',').map(s => s.trim()).filter(Boolean);
      const passos_rapidos = document.getElementById('recPassos').value.split('\\n').map(s => s.trim()).filter(Boolean);
      const criterio_transbordo = document.getElementById('recTransbordo').value.trim();

      if (!equipamento) return alert('Informe o nome do equipamento!');

      const payload = { id, equipamento, categoria, gatilhos, passos_rapidos, criterio_transbordo };
      const method = id ? 'PUT' : 'POST';

      try {
        const res = await fetch('/api/admin/knowledge', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          alert('Tópico salvo com sucesso!');
          location.reload();
        } else {
          alert('Erro ao salvar: ' + data.error);
        }
      } catch (e) {
        alert('Erro: ' + e.message);
      }
    }

    async function deleteKnowledge(id) {
      if (!confirm('Tem certeza que deseja excluir este tópico da base?')) return;
      try {
        const res = await fetch('/api/admin/knowledge?id=' + encodeURIComponent(id), { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          alert('Tópico removido!');
          location.reload();
        }
      } catch (e) {
        alert('Erro ao excluir: ' + e.message);
      }
    }

    async function saveConfig() {
      const modoTeste = document.getElementById('cfgModoTeste').value === 'true';
      const whitelist = document.getElementById('cfgWhitelist').value;
      const tecnicoWhatsapp = document.getElementById('cfgWhatsapp').value.trim();

      try {
        const res = await fetch('/api/admin/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modoTeste, whitelist, tecnicoWhatsapp })
        });
        const data = await res.json();
        if (data.success) {
          alert('Configurações salvas!');
          location.reload();
        }
      } catch (e) {
        alert('Erro: ' + e.message);
      }
    }
  </script>
</body>
</html>`;
}
