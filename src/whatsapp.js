import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import {
  getSession,
  pauseSession,
  unpauseSession,
  addMessageToHistory,
  searchKnowledge
} from './database.js';
import { generateBotResponse, learnFromConversation } from './gemini.js';
import { setBotState } from './server.js';

const sleep = ms => new Promise(res => setTimeout(res, ms));

function getCleanPhone(jid) {
  if (!jid) return '';
  return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
}

let currentSock = null;

export async function adminPause(jid) {
  pauseSession(jid);
  const phone = getCleanPhone(jid);
  await setBotState({ log: `⏸️ [PAINEL ADMIN] Chat ${phone} pausado manualmente.`, logType: 'warn' });
  return { success: true, status: 'paused' };
}

export async function adminResume(jid) {
  unpauseSession(jid);
  const phone = getCleanPhone(jid);
  await setBotState({ log: `▶️ [PAINEL ADMIN] Chat ${phone} reativado.`, logType: 'success' });
  return { success: true, status: 'active' };
}

export async function adminLearn(jid) {
  const session = getSession(jid);
  if (!session.history || session.history.length === 0) {
    throw new Error('Nenhuma conversa encontrada neste chat para aprender.');
  }
  const learned = await learnFromConversation(session.history);
  if (!learned) throw new Error('A IA não conseguiu sintetizar um novo tópico com as mensagens atuais.');
  await setBotState({ log: `✨ [NOVO CONHECIMENTO ADMIN] ${learned.equipamento}`, logType: 'success' });
  return { success: true, learned };
}

export async function requestPairing(phoneNumber) {
  if (!currentSock) {
    throw new Error('O bot ainda está iniciando a conexão.');
  }
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error('Número inválido. Use formato com DDI e DDD, ex: 5561999999999');
  }
  const code = await currentSock.requestPairingCode(cleanPhone);
  return code?.match(/.{1,4}/g)?.join('-') || code;
}

export async function startWhatsAppBot() {
  console.log('\n======================================================');
  console.log('🤖 INICIANDO CHATBOT DE SUPORTE TI/CPD (WHATSAPP BUSINESS)');
  console.log('======================================================');
  console.log(`🔒 Modo de Teste: ${config.modoTeste ? 'ATIVADO (Apenas Whitelist)' : 'DESATIVADO (Lojas Liberadas)'}`);
  if (config.modoTeste) {
    console.log(`📋 Números Autorizados: [${config.numerosPermitidos.join(', ') || 'Nenhum cadastrado no .env'}]`);
  }
  console.log(`📂 Pasta de Autenticação: ${config.authDir}`);
  console.log('------------------------------------------------------\n');

  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log(`Usando versão Baileys: v${version.join('.')} (Última: ${isLatest})`);

  // Browser oficial reconhecido pelo WhatsApp para não falhar na conexão
  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: Browsers.windows('Desktop'), // Perfil oficial do WhatsApp Desktop/Web no Windows
    syncFullHistory: false,               // Conexão rápida sem travar baixando mensagens antigas
    generateHighQualityLinkPreview: false
  });

  currentSock = sock;

  sock.ev.on('creds.update', saveCreds);

  // Monitora conexão e exibe QR Code
  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📌 QR CODE ATUALIZADO! ESCANEIE NO SEU WHATSAPP BUSINESS:');
      qrcodeTerminal.generate(qr, { small: true });

      // Atualiza estado do painel web
      await setBotState({
        qr,
        connected: false,
        log: 'Novo QR Code gerado e disponível no Painel.',
        logType: 'info'
      });

      // Salva imagem PNG e sincroniza com o artefato do IDE
      try {
        const qrImgPath = path.join(config.dataDir, 'qrcode.png');
        await QRCode.toFile(qrImgPath, qr, { width: 350, margin: 2 });

        const artifactDir = 'C:\\Users\\Fael\\.gemini\\antigravity\\brain\\58ffa6d7-5dc4-46c1-b000-05d65fcc4282';
        if (fs.existsSync(artifactDir)) {
          fs.copyFileSync(qrImgPath, path.join(artifactDir, 'bot_qrcode.png'));
        }
      } catch (e) {}

      console.log('Aguardando leitura pelo aparelho...\n');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      await setBotState({
        connected: false,
        log: `Conexão fechada (${lastDisconnect?.error?.message || 'reconectando'}).`,
        logType: 'warn'
      });

      console.log(
        '⚠️ Conexão encerrada. Motivo:',
        lastDisconnect?.error?.message || lastDisconnect?.error
      );

      if (shouldReconnect) {
        console.log('🔄 Reconectando em 3 segundos...');
        setTimeout(() => startWhatsAppBot(), 3000);
      } else {
        console.log('❌ Sessão deslogada (Logged Out). Limpando credenciais antigas...');
        try {
          fs.rmSync(config.authDir, { recursive: true, force: true });
        } catch (e) {}
        console.log('Reiniciando para gerar novo QR Code limpo...');
        setTimeout(() => startWhatsAppBot(), 2000);
      }
    } else if (connection === 'open') {
      const userPhone = sock.user?.id ? getCleanPhone(sock.user.id) : '';
      await setBotState({
        connected: true,
        phone: userPhone,
        qr: null,
        log: `WhatsApp conectado com sucesso como +${userPhone}!`,
        logType: 'success'
      });

      console.log('\n✅ WHATSAPP BUSINESS CONECTADO COM SUCESSO!');
      console.log('🎉 Sessão salva em auth_info/! Não precisará mais de QR Code.');
      console.log('Pronto para receber e responder chamados das lojas.\n');
    }
  });

  // Ignora chamadas/ligações
  sock.ev.on('call', async callEvents => {
    for (const call of callEvents) {
      if (call.status === 'offer') {
        console.log(`📞 Ligação recebida e ignorada de: ${call.from}`);
        await setBotState({ log: `📞 Chamada ignorada de ${call.from}`, logType: 'warn' });
        try {
          await sock.rejectCall(call.id, call.from);
        } catch (e) {}
      }
    }
  });

  // Processamento de Mensagens
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;

      const remoteJid = msg.key.remoteJid;
      const fromMe = msg.key.fromMe;

      // 1. FILTROS DE SEGURANÇA
      if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') {
        continue;
      }

      const textMessage =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        '';

      const cleanText = textMessage.trim();
      if (!cleanText) continue;

      const phoneNumber = getCleanPhone(remoteJid);
      let realPhone = phoneNumber;

      // Trata identificador @lid (Linked ID do WhatsApp)
      if (remoteJid.endsWith('@lid')) {
        const altJid = msg.key.remoteJidAlt || msg.key.participantAlt || msg.key.senderPn;
        if (altJid) {
          realPhone = getCleanPhone(altJid);
        } else {
          try {
            const mapped = await sock.signalRepository?.lidMapping?.getPNForLID?.(remoteJid);
            if (mapped) realPhone = getCleanPhone(mapped);
          } catch (e) {}
        }
      }

      // 2. CONTROLE HUMANO (fromMe = true: Mensagens enviadas por você)
      if (fromMe) {
        if (cleanText.toLowerCase() === '/voltar') {
          // Auto-delete do comando para a loja não ver
          try {
            await sock.sendMessage(remoteJid, { delete: msg.key });
          } catch (e) {}

          unpauseSession(remoteJid);
          await setBotState({ log: `▶️ [COMANDO] /voltar executado (apagado no chat). Bot reativado para ${phoneNumber}.`, logType: 'success' });
          console.log(`\n▶️ [COMANDO /voltar] Mensagem apagada e Bot reativado para o contato: ${phoneNumber}\n`);
          continue;
        }

        if (cleanText.toLowerCase() === '/aprender') {
          // Auto-delete do comando para a loja não ver
          try {
            await sock.sendMessage(remoteJid, { delete: msg.key });
          } catch (e) {}

          await setBotState({ log: `🧠 [APRENDER] Analisando atendimento de ${phoneNumber}...`, logType: 'info' });
          console.log(`\n🧠 [COMANDO /aprender] Mensagem apagada. Analisando atendimento de: ${phoneNumber}...`);
          const session = getSession(remoteJid);
          if (session.history && session.history.length > 0) {
            const learned = await learnFromConversation(session.history);
            if (learned) {
              await setBotState({ log: `✨ [NOVO CONHECIMENTO] Salvo: ${learned.equipamento}`, logType: 'success' });
              console.log(`✨ [CONHECIMENTO SALVO] Equipamento: ${learned.equipamento}`);
            } else {
              await setBotState({ log: `⚠️ Falha ao sintetizar aprendizado de ${phoneNumber}`, logType: 'warn' });
            }
          }
          continue;
        }

        // Se você mandar QUALQUER mensagem manual: PAUSA AUTOMÁTICA
        const session = getSession(remoteJid);
        if (!session.paused) {
          pauseSession(remoteJid);
          await setBotState({ log: `⏸️ [PAUSA AUTOMÁTICA] Rafael assumiu o chat ${phoneNumber}. Bot pausado.`, logType: 'warn' });
          console.log(`\n⏸️ [PAUSA AUTOMÁTICA] Rafael interveio manualmente no chat ${phoneNumber}.\n`);
        }
        continue;
      }

      // 3. MODO DE TESTE (WHITELIST)
      if (config.modoTeste) {
        const isAllowed = config.numerosPermitidos.some(
          allowed =>
            phoneNumber === allowed ||
            phoneNumber.endsWith(allowed) ||
            realPhone === allowed ||
            realPhone.endsWith(allowed) ||
            allowed === '45277629178043'
        );
        if (!isAllowed) {
          console.log(`🚫 [MODO TESTE] Mensagem de ${phoneNumber} (Real: ${realPhone}) ignorada (fora da whitelist).`);
          await setBotState({ log: `🚫 [BLOQUEADO] ${phoneNumber} fora da whitelist de teste.`, logType: 'warn' });
          continue;
        }
      }

      // 4. VERIFICA SE O ATENDIMENTO ESTÁ PAUSADO
      const session = getSession(remoteJid);
      if (session.paused) {
        console.log(`⏳ Chat ${phoneNumber} pausado aguardando Rafael. Mensagem ignorada.`);
        addMessageToHistory(remoteJid, 'user', cleanText);
        await setBotState({ log: `⏳ Mensagem recebida de ${phoneNumber} (Pausado - aguardando Rafael)`, logType: 'info' });
        continue;
      }

      console.log(`\n📩 [MENSAGEM RECEBIDA] De ${phoneNumber}: "${cleanText}"`);
      await setBotState({ log: `📩 [LOJA] ${phoneNumber}: "${cleanText.slice(0, 60)}"`, logType: 'info' });

      // 5. ATUALIZA HISTÓRICO
      addMessageToHistory(remoteJid, 'user', cleanText);

      // 6. BUSCA LOCAL NA BASE DE CONHECIMENTO
      const relevantKnowledge = searchKnowledge(cleanText, 3);

      // 7. GERA RESPOSTA COM GEMINI FLASH
      const updatedSession = getSession(remoteJid);
      const botResponse = await generateBotResponse({
        session: updatedSession,
        userMessage: cleanText,
        retrievedKnowledge: relevantKnowledge
      });

      // 8. VERIFICAÇÃO DE TRANSBORDO
      const isTransbordo = botResponse.includes('[TRANSBORDO_CPD]');
      const finalMessageText = botResponse.replace('[TRANSBORDO_CPD]', '').trim();

      // 9. DELAY HUMANO + DIGITANDO...
      const randomDelay =
        Math.floor(Math.random() * (config.delayMaxMs - config.delayMinMs + 1)) +
        config.delayMinMs;
      await sleep(randomDelay);

      await sock.sendPresenceUpdate('composing', remoteJid);
      await sleep(config.digitandoMs);
      await sock.sendPresenceUpdate('paused', remoteJid);

      // 10. ENVIA A MENSAGEM
      await sock.sendMessage(remoteJid, { text: finalMessageText });
      console.log(`🤖 [RESPOSTA ENVIADA] Para ${phoneNumber}:\n"${finalMessageText}"\n`);
      await setBotState({ log: `🤖 [RESPOSTA] Enviada para ${phoneNumber}`, logType: 'success' });

      addMessageToHistory(remoteJid, 'assistant', finalMessageText);

      if (isTransbordo) {
        pauseSession(remoteJid);
        await setBotState({ log: `🚨 [TRANSBORDO] Chamado transferido para o Rafael. Bot pausado para ${phoneNumber}.`, logType: 'warn' });
        console.log(`🚨 [TRANSBORDO CONCLUÍDO] Atendimento pausado para ${phoneNumber}. Rafael notificado.`);
      }
    }
  });
}
