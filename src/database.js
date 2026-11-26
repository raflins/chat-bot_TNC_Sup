import fs from 'fs';
import path from 'path';
import { config } from './config.js';

// Garante que a pasta data/ existe
if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

// Inicializa arquivos de banco se não existirem
if (!fs.existsSync(config.knowledgeDbPath)) {
  fs.writeFileSync(config.knowledgeDbPath, JSON.stringify([], null, 2), 'utf-8');
}

if (!fs.existsSync(config.sessionsDbPath)) {
  fs.writeFileSync(config.sessionsDbPath, JSON.stringify({}, null, 2), 'utf-8');
}

function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lê todos os registros da base de conhecimento
 */
export function getAllKnowledge() {
  try {
    const raw = fs.readFileSync(config.knowledgeDbPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler base de conhecimento:', err);
    return [];
  }
}

/**
 * Salva toda a base de conhecimento
 */
export function saveAllKnowledge(records) {
  fs.writeFileSync(config.knowledgeDbPath, JSON.stringify(records, null, 2), 'utf-8');
}

/**
 * Adiciona um novo registro estruturado (usado pelo /aprender)
 */
export function addKnowledgeRecord(record) {
  const records = getAllKnowledge();
  const id = record.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newRecord = {
    id,
    equipamento: record.equipamento || 'Equipamento Geral',
    categoria: record.categoria || 'Geral',
    gatilhos: Array.isArray(record.gatilhos) ? record.gatilhos : [record.gatilhos],
    passos_rapidos: Array.isArray(record.passos_rapidos) ? record.passos_rapidos : [record.passos_rapidos],
    criterio_transbordo: record.criterio_transbordo || 'Se não resolver em 2 tentativas, transferir para o Rafael.',
    criado_em: new Date().toISOString()
  };

  records.push(newRecord);
  saveAllKnowledge(records);
  return newRecord;
}

/**
 * Atualiza um registro existente na base de conhecimento
 */
export function updateKnowledgeRecord(id, updatedData) {
  const records = getAllKnowledge();
  const index = records.findIndex(r => r.id === id);
  if (index === -1) throw new Error('Registro não encontrado');

  records[index] = {
    ...records[index],
    ...updatedData,
    id, // Mantém ID original
    atualizado_em: new Date().toISOString()
  };
  saveAllKnowledge(records);
  return records[index];
}

/**
 * Remove um registro da base de conhecimento
 */
export function deleteKnowledgeRecord(id) {
  const records = getAllKnowledge();
  const filtered = records.filter(r => r.id !== id);
  saveAllKnowledge(filtered);
  return { success: true };
}

/**
 * Retorna todas as sessões ativas (usado no painel Admin)
 */
export function getAllSessions() {
  const sessions = readSessions();
  return Object.values(sessions).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

/**
 * Busca inteligente por similaridade e palavras-chave.
 * Retorna no máximo `limit` registros mais relevantes (economia de tokens).
 */
export function searchKnowledge(userMessage, limit = 3) {
  const records = getAllKnowledge();
  if (!records.length) return [];

  const normQuery = normalizeText(userMessage);
  const queryWords = normQuery.split(' ').filter(w => w.length > 2);

  const scored = records.map(rec => {
    let score = 0;
    const normEquip = normalizeText(rec.equipamento);
    const normCat = normalizeText(rec.categoria);
    const normTriggers = (rec.gatilhos || []).map(normalizeText);

    // 1. Checagem direta de gatilhos (peso maior)
    for (const trig of normTriggers) {
      if (normQuery.includes(trig)) {
        score += 10;
      }
      for (const w of queryWords) {
        if (trig.includes(w)) {
          score += 3;
        }
      }
    }

    // 2. Palavras no nome do equipamento
    for (const w of queryWords) {
      if (normEquip.includes(w)) score += 4;
      if (normCat.includes(w)) score += 2;
    }

    return { record: rec, score };
  });

  // Ordena por maior pontuação
  scored.sort((a, b) => b.score - a.score);

  // Filtra registros que tiveram alguma relevância
  const relevant = scored.filter(s => s.score > 0).slice(0, limit).map(s => s.record);

  // Se nenhum registro específico pontuou, retorna os 2 primeiros genéricos (como Zebra básica)
  if (relevant.length === 0 && records.length > 0) {
    return records.slice(0, 2);
  }

  return relevant;
}

/**
 * Gerenciamento de sessões dos usuários (conversas e estados)
 */
function readSessions() {
  try {
    const raw = fs.readFileSync(config.sessionsDbPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

function writeSessions(sessions) {
  fs.writeFileSync(config.sessionsDbPath, JSON.stringify(sessions, null, 2), 'utf-8');
}

export function getSession(jid) {
  const sessions = readSessions();
  if (!sessions[jid]) {
    sessions[jid] = {
      jid,
      loja: null,
      equipamento: null,
      paused: false,
      history: [],
      updatedAt: new Date().toISOString()
    };
    writeSessions(sessions);
  }
  return sessions[jid];
}

export function updateSession(jid, updates) {
  const sessions = readSessions();
  const current = sessions[jid] || { jid, history: [] };
  sessions[jid] = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  writeSessions(sessions);
  return sessions[jid];
}

export function pauseSession(jid) {
  return updateSession(jid, { paused: true });
}

export function unpauseSession(jid) {
  return updateSession(jid, { paused: false, history: [] }); // Limpa o histórico antigo no /voltar
}

/**
 * Adiciona mensagem ao histórico mantendo apenas as últimas 6 mensagens (ECONOMIA DE TOKENS)
 */
export function addMessageToHistory(jid, role, text) {
  const session = getSession(jid);
  const history = session.history || [];
  history.push({ role, text, time: new Date().toISOString() });

  // Mantém estritamente as últimas 6 mensagens
  const trimmed = history.slice(-6);
  return updateSession(jid, { history: trimmed });
}
