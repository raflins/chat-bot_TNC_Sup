import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

function parseAllowedNumbers(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map(n => n.replace(/\D/g, '').trim())
    .filter(Boolean);
}

export const config = {
  rootDir,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  modoTeste: process.env.MODO_TESTE !== 'false', // Padrão: true por segurança
  numerosPermitidos: parseAllowedNumbers(process.env.NUMEROS_PERMITIDOS),
  delayMinMs: parseInt(process.env.DELAY_MIN_MS, 10) || 2000,
  delayMaxMs: parseInt(process.env.DELAY_MAX_MS, 10) || 4000,
  digitandoMs: parseInt(process.env.DIGITANDO_MS, 10) || 1500,
  nomeTecnico: process.env.NOME_TECNICO || 'Rafael (CPD)',
  tecnicoWhatsapp: process.env.TECNICO_WHATSAPP || '556198360951',
  adminUser: process.env.ADMIN_USER || 'admin',
  adminPass: process.env.ADMIN_PASS || 'cpd@2026',
  adminSecret: process.env.ADMIN_SECRET || 'cpd_secret_token_2026',
  authDir: path.join(rootDir, 'auth_info'),
  dataDir: path.join(rootDir, 'data'),
  knowledgeDbPath: path.join(rootDir, 'data', 'knowledge_base.json'),
  sessionsDbPath: path.join(rootDir, 'data', 'sessions.json')
};
