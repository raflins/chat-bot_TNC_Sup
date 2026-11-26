import http from 'http';
import QRCode from 'qrcode';
import { config } from './config.js';
import {
  getAllKnowledge,
  addKnowledgeRecord,
  updateKnowledgeRecord,
  deleteKnowledgeRecord,
  getAllSessions,
  getSession,
  addMessageToHistory,
  searchKnowledge
} from './database.js';
import { generateBotResponse } from './gemini.js';
import {
  renderWebchatHtml,
  renderAdminLoginHtml,
  renderAdminDashboardHtml
} from './views.js';

let latestQR = null;
let latestDataUrl = null;
let isConnected = false;
let connectedPhone = '';
const activityLogs = [];

function parseBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        const params = new URLSearchParams(body);
        const obj = {};
        for (const [k, v] of params.entries()) obj[k] = v;
        resolve(obj);
      }
    });
  });
}

function getCookies(req) {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (name) list[name] = decodeURIComponent(rest.join('=').trim());
  });
  return list;
}

function isAdmin(req) {
  const cookies = getCookies(req);
  return cookies.admin_token === config.adminSecret;
}

export async function setBotState(updates) {
  if (updates.qr !== undefined) {
    latestQR = updates.qr;
    if (latestQR) {
      try {
        latestDataUrl = await QRCode.toDataURL(latestQR, {
          margin: 2,
          scale: 9,
          color: { dark: '#000000', light: '#FFFFFF' }
        });
      } catch (e) {
        latestDataUrl = null;
      }
    } else {
      latestDataUrl = null;
    }
  }
  if (updates.connected !== undefined) isConnected = updates.connected;
  if (updates.phone !== undefined) connectedPhone = updates.phone;
  if (updates.log) {
    activityLogs.unshift({
      time: new Date().toLocaleTimeString('pt-BR'),
      text: updates.log,
      type: updates.logType || 'info'
    });
    if (activityLogs.length > 50) activityLogs.pop();
  }
}

export function startWebServer(port = 3000) {
  const server = http.createServer(async (req, res) => {
    const host = req.headers.host || `localhost:${port}`;
    const parsedUrl = new URL(req.url, `http://${host}`);
    const pathname = parsedUrl.pathname;

    // A. WEBCHAT PARA LOJAS
    if (pathname === '/chat') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(renderWebchatHtml({ nomeTecnico: config.nomeTecnico, tecnicoWhatsapp: config.tecnicoWhatsapp }));
    }

    // B. API DO WEBCHAT (envio de mensagens)
    if (pathname === '/api/webchat/send' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const userMsg = (body.message || '').trim();
        const sId = body.sessionId || 'web_guest';

        if (!userMsg) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Mensagem vazia' }));
        }

        const session = getSession(sId);
        addMessageToHistory(sId, 'user', userMsg);
        const relevantKnowledge = searchKnowledge(userMsg, 3);
        const botResponse = await generateBotResponse({
          session,
          userMessage: userMsg,
          retrievedKnowledge: relevantKnowledge
        });

        const isTransbordo = botResponse.includes('[TRANSBORDO_CPD]');
        const cleanResponse = botResponse.replace('[TRANSBORDO_CPD]', '').trim();
        addMessageToHistory(sId, 'assistant', cleanResponse);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          response: cleanResponse,
          isTransbordo,
          ticketText: isTransbordo ? cleanResponse : ''
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // C. LOGIN DO ADMIN
    if (pathname === '/admin/login') {
      if (isAdmin(req)) {
        res.writeHead(302, { 'Location': '/admin' });
        return res.end();
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(renderAdminLoginHtml());
    }

    // D. PROCESSA LOGIN DO ADMIN
    if (pathname === '/api/admin/login' && req.method === 'POST') {
      const { user, pass } = await parseBody(req);
      if (user === config.adminUser && pass === config.adminPass) {
        res.writeHead(302, {
          'Set-Cookie': `admin_token=${config.adminSecret}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`,
          'Location': '/admin'
        });
        return res.end();
      }
      res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(renderAdminLoginHtml('Usuário ou senha incorretos!'));
    }

    // E. LOGOUT DO ADMIN
    if (pathname === '/api/admin/logout') {
      res.writeHead(302, {
        'Set-Cookie': 'admin_token=; Path=/; Max-Age=0',
        'Location': '/admin/login'
      });
      return res.end();
    }

    // F. PAINEL DO ADMIN (PROTEGIDO)
    if (pathname === '/admin') {
      if (!isAdmin(req)) {
        res.writeHead(302, { 'Location': '/admin/login' });
        return res.end();
      }
      const sessions = getAllSessions();
      const knowledge = getAllKnowledge();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(renderAdminDashboardHtml({ sessions, knowledge, config, token: config.adminSecret }));
    }

    // G. API ADMIN: AÇÃO EM SESSÕES (PAUSAR, RETOMAR, APRENDER)
    if (pathname === '/api/admin/sessions/action' && req.method === 'POST') {
      if (!isAdmin(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Não autorizado' }));
      }
      try {
        const { jid, action } = await parseBody(req);
        const { adminPause, adminResume, adminLearn } = await import('./whatsapp.js');
        let result;
        if (action === 'pause') result = await adminPause(jid);
        else if (action === 'resume') result = await adminResume(jid);
        else if (action === 'learn') result = await adminLearn(jid);
        else throw new Error('Ação inválida');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, result }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    }

    // H. API ADMIN: CRUD DA BASE DE CONHECIMENTO
    if (pathname === '/api/admin/knowledge') {
      if (!isAdmin(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Não autorizado' }));
      }
      try {
        if (req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(getAllKnowledge()));
        }
        if (req.method === 'POST') {
          const data = await parseBody(req);
          const saved = addKnowledgeRecord(data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, saved }));
        }
        if (req.method === 'PUT') {
          const data = await parseBody(req);
          const updated = updateKnowledgeRecord(data.id, data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, updated }));
        }
        if (req.method === 'DELETE') {
          const id = parsedUrl.searchParams.get('id');
          if (!id) throw new Error('ID do registro não informado');
          deleteKnowledgeRecord(id);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    }

    // I. API ADMIN: CONFIGURAÇÕES
    if (pathname === '/api/admin/config' && req.method === 'POST') {
      if (!isAdmin(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Não autorizado' }));
      }
      try {
        const data = await parseBody(req);
        if (data.modoTeste !== undefined) config.modoTeste = data.modoTeste;
        if (data.whitelist !== undefined) {
          config.numerosPermitidos = data.whitelist
            .split(',')
            .map(s => s.replace(/\D/g, '').trim())
            .filter(Boolean);
        }
        if (data.tecnicoWhatsapp) {
          config.tecnicoWhatsapp = data.tecnicoWhatsapp.replace(/\D/g, '').trim();
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    }

    // 1. API: Imagem PNG do QR Code atual
    if (pathname === '/api/qr') {
      if (!latestQR || isConnected) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('QR Code não disponível no momento ou já conectado');
      }
      try {
        const buffer = await QRCode.toBuffer(latestQR, {
          margin: 2,
          scale: 9,
          color: { dark: '#000000', light: '#FFFFFF' }
        });
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        });
        return res.end(buffer);
      } catch (err) {
        res.writeHead(500);
        return res.end('Erro ao gerar imagem QR');
      }
    }

    // 2. API: Solicitar Código de Pareamento de 8 dígitos (sem câmera)
    if (pathname === '/api/pair') {
      const phone = parsedUrl.searchParams.get('phone') || '';
      try {
        const { requestPairing } = await import('./whatsapp.js');
        const code = await requestPairing(phone);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, code }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    }

    // 3. API: Status em JSON (inclui dataUrl direto)
    if (pathname === '/api/status') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      });
      return res.end(
        JSON.stringify({
          connected: isConnected,
          phone: connectedPhone,
          hasQR: !!latestQR,
          qrDataUrl: latestDataUrl,
          modoTeste: config.modoTeste,
          whitelist: config.numerosPermitidos,
          logs: activityLogs
        })
      );
    }

    // 3. Página HTML do Dashboard
    if (pathname === '/' || pathname === '/index.html') {
      const knowledge = getAllKnowledge();
      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Painel do Chatbot CPD — WhatsApp Business</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #25d366;
      --accent-hover: #22c55e;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 24px; min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
    .logo-area { display: flex; align-items: center; gap: 12px; }
    .badge { padding: 6px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
    .badge-online { background: rgba(37, 211, 102, 0.2); color: #25d366; border: 1px solid #25d366; }
    .badge-offline { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; }
    .grid { display: grid; grid-template-columns: 420px 1fr; gap: 24px; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); }
    .card-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
    .qr-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; text-align: center; }
    .qr-box { background: white; padding: 18px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.6); display: inline-block; margin-bottom: 16px; min-height: 290px; min-width: 290px; }
    .qr-box img { width: 280px; height: 280px; display: block; border-radius: 4px; }
    .qr-info { font-size: 13px; color: var(--muted); line-height: 1.5; }
    .connected-box { display: none; text-align: center; padding: 40px 20px; }
    .connected-box svg { width: 64px; height: 64px; fill: var(--accent); margin-bottom: 12px; }
    .logs-box { height: 420px; overflow-y: auto; background: #090d16; border-radius: 8px; padding: 14px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; line-height: 1.6; }
    .log-item { margin-bottom: 6px; word-break: break-all; }
    .log-time { color: var(--muted); margin-right: 6px; }
    .log-info { color: #38bdf8; }
    .log-success { color: #4ade80; }
    .log-warn { color: #facc15; }
    .log-error { color: #f87171; }
    .knowledge-list { display: flex; flex-direction: column; gap: 12px; }
    .knowledge-item { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
    .knowledge-header { display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 4px; font-size: 14px; }
    .tag { background: #334155; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .knowledge-triggers { font-size: 12px; color: var(--muted); margin-bottom: 6px; }
    .knowledge-steps { font-size: 12px; color: #cbd5e1; }
    .spinner { display: inline-block; width: 32px; height: 32px; border: 3px solid rgba(255,255,255,.3); border-radius: 50%; border-top-color: var(--accent); animation: spin 1s ease-in-out infinite; margin-top: 120px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-area">
        <h1>🤖 Suporte CPD — Painel WhatsApp</h1>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <a href="/chat" target="_blank" style="background: #1e3a8a; border: 1px solid #3b82f6; color: #fff; padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none;">🏪 Abrir Webchat Loja</a>
        <a href="/admin" style="background: rgba(37, 211, 102, 0.15); border: 1px solid #25d366; color: #25d366; padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none;">🛡️ Painel Admin (Restrito)</a>
        <span id="statusBadge" class="badge badge-offline">🔴 Desconectado</span>
      </div>
    </header>

    <div class="grid">
      <div class="card">
        <div class="card-title">
          <span>Conexão WhatsApp Business</span>
          <span style="font-size: 12px; color: var(--accent);">Tempo Real</span>
        </div>

        <div id="qrSection" class="qr-container">
          <div class="qr-box" id="qrBox">
            <div id="loadingSpinner" class="spinner" style="${latestDataUrl ? 'display: none;' : 'display: inline-block;'}"></div>
            <img id="qrImage" src="${latestDataUrl || ''}" alt="QR Code WhatsApp" style="${latestDataUrl ? 'display: block;' : 'display: none;'}" />
          </div>
          <div class="qr-info">
            <p><strong>Opção 1: Aponte a câmera do WhatsApp Business:</strong></p>
            <p>Menu &gt; <strong>Aparelhos conectados</strong> &gt; <strong>Conectar um aparelho</strong></p>
            <p style="margin-top: 6px;"><a href="/api/qr" target="_blank" style="color: var(--accent); text-decoration: underline; font-size: 12px;">🔗 Abrir QR Code puro em tela cheia</a></p>
          </div>

          <!-- Opção 2: Código de Pareamento de 8 dígitos (Sem Câmera) -->
          <div style="margin-top: 20px; padding: 16px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); width: 100%; text-align: left;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px; color: var(--accent); display: flex; align-items: center; gap: 6px;">
              <span>📲 Opção 2: Conectar por Código (Sem Câmera)</span>
            </div>
            <p style="font-size: 12px; color: var(--muted); margin-bottom: 10px;">
              Ideal caso o escaneamento pela câmera falhe ou diga "não foi possível conectar":
            </p>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="phoneInput" placeholder="Ex: 5561999999999" value="${config.numerosPermitidos[0] || ''}" style="flex: 1; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border); background: #090d16; color: var(--text); font-size: 13px;" />
              <button id="btnPair" onclick="solicitarCodigo()" style="background: var(--accent); color: #000; font-weight: 700; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; white-space: nowrap;">Gerar Código</button>
            </div>
            <div id="pairResult" style="display: none; margin-top: 12px; padding: 14px; background: rgba(37, 211, 102, 0.12); border: 1px solid var(--accent); border-radius: 8px; text-align: center;">
              <div style="font-size: 12px; color: var(--muted); margin-bottom: 4px;">Código de Pareamento:</div>
              <div id="codeDisplay" style="font-size: 28px; font-weight: 800; letter-spacing: 4px; color: #25d366; font-family: monospace;"></div>
              <div style="font-size: 12px; color: #cbd5e1; margin-top: 8px; line-height: 1.4; text-align: left;">
                👉 No WhatsApp: <strong>Aparelhos conectados</strong> &gt; <strong>Conectar um aparelho</strong> &gt; Toque em <strong>"Conectar com número de telefone"</strong> (link na parte inferior da tela) e digite o código acima.
              </div>
            </div>
            <div id="pairError" style="display: none; margin-top: 10px; font-size: 12px; color: var(--danger);"></div>
          </div>
        </div>

        <div id="connectedSection" class="connected-box">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          <h3 style="color: var(--accent); margin-bottom: 6px;">WhatsApp Conectado!</h3>
          <p id="connectedPhoneText" style="color: var(--muted); font-size: 14px;">Sessão ativa e salva em auth_info/</p>
          <p style="margin-top: 16px; font-size: 13px; color: #cbd5e1;">O bot está operando e pronto para responder às mensagens.</p>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          <span>Monitor de Atividades em Tempo Real</span>
          <span style="font-size: 12px; color: var(--muted);">Eventos do Bot</span>
        </div>
        <div id="logsBox" class="logs-box">
          <div class="log-item"><span class="log-time">[${new Date().toLocaleTimeString('pt-BR')}]</span> <span class="log-info">Painel Web iniciado na porta ${port}.</span></div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        <span>Base de Conhecimento Carregada (${knowledge.length} tópicos cadastrados)</span>
        <span style="font-size: 12px; color: var(--accent);">RAG Local Ativo</span>
      </div>
      <div class="knowledge-list">
        ${knowledge.map(k => `
          <div class="knowledge-item">
            <div class="knowledge-header">
              <span>${k.equipamento}</span>
              <span class="tag">${k.categoria}</span>
            </div>
            <div class="knowledge-triggers">
              <strong>Gatilhos:</strong> ${k.gatilhos.slice(0, 8).join(', ')}${k.gatilhos.length > 8 ? '...' : ''}
            </div>
            <div class="knowledge-steps">
              <strong>Solução rápida:</strong> ${k.passos_rapidos[0]}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <script>
    const qrImage = document.getElementById('qrImage');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const qrSection = document.getElementById('qrSection');
    const connectedSection = document.getElementById('connectedSection');
    const statusBadge = document.getElementById('statusBadge');
    const logsBox = document.getElementById('logsBox');
    const connectedPhoneText = document.getElementById('connectedPhoneText');

    let lastDataUrl = '';

    async function checkStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();

        if (data.connected) {
          statusBadge.className = 'badge badge-online';
          statusBadge.textContent = '🟢 Online';
          qrSection.style.display = 'none';
          connectedSection.style.display = 'block';
          if (data.phone) {
            connectedPhoneText.textContent = 'Conectado como: ' + data.phone;
          }
        } else {
          statusBadge.className = 'badge badge-offline';
          statusBadge.textContent = '🔴 Aguardando Conexão';
          qrSection.style.display = 'flex';
          connectedSection.style.display = 'none';

          if (data.qrDataUrl) {
            if (data.qrDataUrl !== lastDataUrl) {
              lastDataUrl = data.qrDataUrl;
              qrImage.src = data.qrDataUrl;
              qrImage.style.display = 'block';
              loadingSpinner.style.display = 'none';
            }
          } else {
            qrImage.style.display = 'none';
            loadingSpinner.style.display = 'inline-block';
          }
        }

        if (data.logs && data.logs.length > 0) {
          logsBox.innerHTML = data.logs.map(l => {
            let cls = 'log-info';
            if (l.type === 'success') cls = 'log-success';
            if (l.type === 'warn') cls = 'log-warn';
            if (l.type === 'error') cls = 'log-error';
            return '<div class="log-item"><span class="log-time">[' + l.time + ']</span> <span class="' + cls + '">' + l.text + '</span></div>';
          }).join('');
        }
      } catch (err) {
        console.error('Erro ao verificar status:', err);
      }
    }

    async function solicitarCodigo() {
      const phoneInput = document.getElementById('phoneInput');
      const btn = document.getElementById('btnPair');
      const resultDiv = document.getElementById('pairResult');
      const errorDiv = document.getElementById('pairError');
      const codeDisplay = document.getElementById('codeDisplay');
      
      const phone = phoneInput.value.replace(/\D/g, '');
      if (!phone || phone.length < 10) {
        errorDiv.textContent = 'Digite o número completo com DDD (ex: 5561999999999)';
        errorDiv.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Gerando...';
      errorDiv.style.display = 'none';
      resultDiv.style.display = 'none';

      try {
        const res = await fetch('/api/pair?phone=' + encodeURIComponent(phone));
        const data = await res.json();
        if (data.success) {
          codeDisplay.textContent = data.code;
          resultDiv.style.display = 'block';
        } else {
          errorDiv.textContent = data.error || 'Erro ao gerar código.';
          errorDiv.style.display = 'block';
        }
      } catch (err) {
        errorDiv.textContent = 'Falha ao conectar: ' + err.message;
        errorDiv.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Gerar Código';
      }
    }

    setInterval(checkStatus, 1500);
    checkStatus();
  </script>
</body>
</html>`;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(port, () => {
    console.log(`\n🌐 PAINEL WEB INICIADO: http://localhost:${port}\n`);
  });

  return server;
}
