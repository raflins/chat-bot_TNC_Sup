import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config.js';
import { addKnowledgeRecord } from './database.js';

let genAI = null;

function getClient() {
  if (!genAI) {
    if (!config.geminiApiKey) {
      console.warn('⚠️ AVISO: GEMINI_API_KEY não configurada no .env!');
    }
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return genAI;
}

/**
 * Constrói o System Prompt enxuto contendo apenas os dados necessários (ECONOMIA DE TOKENS)
 */
function buildSystemPrompt(retrievedKnowledge) {
  const knowledgeText = retrievedKnowledge.map(k => `
[EQUIPAMENTO]: ${k.equipamento} (${k.categoria})
[PASSOS RÁPIDOS]:
${k.passos_rapidos.map((p, i) => `${i + 1}. ${p}`).join('\n')}
[CRITÉRIO TRANSBORDO]: ${k.criterio_transbordo}
`).join('\n---\n');

  return `Você é o assistente virtual de triagem de TI/CPD das lojas (Rede de Supermercados).
Seu objetivo é ajudar os operadores de loja com soluções rápidas ou encaminhar para o ${config.nomeTecnico}.

REGRAS OBRIGATÓRIAS DE ATENDIMENTO:
1. IDENTIFICAÇÃO: Se não souber a Loja e o Equipamento exato (ex: "impressora branca" ou "impressora preta"), pergunte primeiro.
2. ECONOMIA E CLAREZA: Responda de forma curta, direta e simples (tom de TI prático).
3. UM PASSO POR VEZ: NUNCA mande uma lista de testes. Envie SEMPRE APENAS 1 PASSO DE CADA VEZ e pergunte se funcionou.
4. CONSINCO: Se a impressora estiver com luz verde e o preço não sair, lembre-se de orientar fechar o Consinco, reiniciar o PC e abrir de novo.
5. TRANSBORDO: Se o operador relatar que o teste falhou, se o problema for físico irreversível ou se precisar de acesso remoto, você DEVE emitir a palavra-chave "[TRANSBORDO_CPD]" seguida do resumo padrão abaixo:

[TRANSBORDO_CPD]
🚨 *[CHAMADO CPD] — Transbordo de Suporte*
📍 *Unidade:* Loja [Identificada]
📂 *Categoria:* [Categoria]
🔎 *Equipamento:* [Equipamento]
📝 *Relato da Loja:* [Resumo do problema]
⚙️ *Testes já realizados:*
- [x] [Passo 1 testado]
- [x] [Passo 2 testado]
⚠️ *Situação atual:* [Problema persiste / Precisa de acesso remoto]
🔑 *Ação necessária:* Atendimento manual assumido pelo ${config.nomeTecnico}.

E na linha seguinte avise a loja: "Já registrei o transbordo para o ${config.nomeTecnico}. Deixe o computador e o equipamento ligados que ele vai assumir o suporte agora!"

BASE DE CONHECIMENTO ESPECÍFICA DISPONÍVEL NESTA CONSULTA:
${knowledgeText}
`;
}

/**
 * Gera a resposta do bot para o operador da loja com fallback resiliente de modelos
 */
export async function generateBotResponse({ session, userMessage, retrievedKnowledge }) {
  const client = getClient();
  const modelsToTry = [
    config.geminiModel,
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.8-flash'
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  // Histórico anterior para o chat (excluindo a mensagem atual que será enviada no sendMessage e eventuais erros)
  const priorMessages = (session.history || []).filter(h => {
    return h.text !== userMessage && !h.text.includes('instabilidade rápida de comunicação');
  });

  // Mantém as últimas mensagens para não estourar tokens
  let formattedHistory = priorMessages.slice(-6).map(h => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.text }]
  }));

  // O Gemini EXIGE que o histórico comece com role 'user'
  while (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
    formattedHistory.shift();
  }

  // O Gemini não aceita terminar com 'user' antes de um sendMessage() de 'user'
  while (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
    formattedHistory.pop();
  }

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: buildSystemPrompt(retrievedKnowledge)
      });

      const chat = model.startChat({
        history: formattedHistory
      });

      const result = await chat.sendMessage(userMessage);
      const responseText = result.response.text();
      return responseText;
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Modelo ${modelName} falhou: ${err.message}. Tentando próximo...`);
    }
  }

  console.error('Erro em todos os modelos do Gemini:', lastError);
  return `Opa! Tive uma instabilidade rápida de comunicação. Se for urgente, por favor informe a Loja e o equipamento que já passo direto para o ${config.nomeTecnico}.`;
}

/**
 * Aprendizado Contínuo (/aprender):
 * Analisa as mensagens resolvidas manualmente pelo Rafael e sintetiza um novo registro de base.
 */
export async function learnFromConversation(messages) {
  const client = getClient();
  const modelsToTry = [
    config.geminiModel,
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash'
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  const prompt = `
Analise a seguinte conversa real de suporte de TI onde o técnico (${config.nomeTecnico}) resolveu ou instruiu um problema na loja.
Extraia e sintetize um NOVO registro de base de conhecimento em formato JSON.

Conversa:
${messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}

Retorne estritamente um JSON no seguinte formato:
{
  "equipamento": "Nome do equipamento ou sistema",
  "categoria": "Impressoras" | "Sistemas" | "Hardware" | "Rede" | "PDV",
  "gatilhos": ["palavra1", "palavra2", "gíria de loja"],
  "passos_rapidos": [
    "Passo 1 curto e direto",
    "Passo 2 curto e direto"
  ],
  "criterio_transbordo": "Quando encaminhar para o Rafael (CPD)"
}
`;

  for (const modelName of modelsToTry) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' }
      });
      const result = await model.generateContent(prompt);
      const record = JSON.parse(result.response.text());
      const saved = addKnowledgeRecord(record);
      console.log(`🧠 [APRENDIZADO CONCLUÍDO] Novo conhecimento registrado: "${saved.equipamento}" (${saved.categoria})`);
      return saved;
    } catch (e) {
      console.warn(`⚠️ Falha ao aprender com ${modelName}:`, e.message);
    }
  }
  return null;
}
