import fs from 'fs';
import { config } from './config.js';
import { getAllKnowledge } from './database.js';
import { runSeeder } from './seeder.js';
import { startWhatsAppBot } from './whatsapp.js';
import { startWebServer } from './server.js';

async function bootstrap() {
  console.clear();
  console.log('====================================================');
  console.log('🚀 SISTEMA DE SUPORTE CPD / WHATSAPP BOT COM GEMINI');
  console.log('====================================================');

  // 1. Verifica se a base de conhecimento precisa ser semeada
  const currentKnowledge = getAllKnowledge();
  if (!currentKnowledge || currentKnowledge.length === 0) {
    console.log('📚 Base de conhecimento vazia. Executando seeder inicial...');
    runSeeder();
  } else {
    console.log(`📚 Base de conhecimento carregada: ${currentKnowledge.length} tópicos ativos.`);
  }

  // 2. Inicia o Painel Web em localhost:3000
  const PORT = process.env.PORT || 3000;
  startWebServer(PORT);

  // 3. Inicia o cliente do WhatsApp via Baileys
  await startWhatsAppBot();
}

bootstrap().catch(err => {
  console.error('❌ Falha fatal na inicialização do bot:', err);
  process.exit(1);
});
