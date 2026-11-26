# 🤖 Suporte TI/CPD — Chatbot Omnichannel com IA & RAG Local

[![Node.js Version](https://img.shields.io/badge/Node.js-v20.x-green.svg)](https://nodejs.org/)
[![WhatsApp Baileys](https://img.shields.io/badge/WhatsApp-Baileys%20Socket-25D366.svg)](https://github.com/WhiskeySockets/Baileys)
[![Google Gemini API](https://img.shields.io/badge/AI-Google%20Gemini%20Flash-4285F4.svg)](https://aistudio.google.com/)
[![LGPD Compliant](https://img.shields.io/badge/Compliance-LGPD%20(Lei%2013.709%2F18)-blue.svg)](#-conformidade-com-a-lgpd-lei-137092018)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Sistema de triagem autônoma e suporte técnico nível 1 (N1) para filiais e lojas de varejo/supermercados. Integração direta com **WhatsApp Business** (via WebSockets nativo com Baileys), **Webchat interno para estações de trabalho** e painel administrativo protegido com **Base de Conhecimento RAG (Retrieval-Augmented Generation)** e aprendizado contínuo.

---

## 🏛️ Arquitetura do Sistema

```text
                               +----------------------------------------+
                               |        Canais de Entrada (Lojas)       |
                               +-------------------+--------------------+
                                                   |
                     +-----------------------------+-----------------------------+
                     |                                                           |
          [ WhatsApp Business ]                                        [ Webchat da Loja ]
       (@whiskeysockets/baileys)                                    (/chat - Estações PDV/Escritório)
                     |                                                           |
                     +-----------------------------+-----------------------------+
                                                   |
                                                   v
                               +----------------------------------------+
                               |     Camada de Segurança & Filtragem    |
                               |  - Anti-Spam / Grupos / Broadcast      |
                               |  - Modo Teste (Whitelist de Telefones) |
                               |  - Detecção de Intervenção Humana      |
                               +-------------------+--------------------+
                                                   |
                                                   v
                               +----------------------------------------+
                               |         Motor RAG Local (Tokens)       |
                               |  - Busca semântica por palavras-chave  |
                               |  - Top 2-3 tópicos relevantes          |
                               |  - Histórico restrito às últimas 6 msgs|
                               +-------------------+--------------------+
                                                   |
                                                   v
                               +----------------------------------------+
                               |       Google Gemini (Flash-Lite)       |
                               |  - 1 instrução de teste por vez        |
                               |  - Detecção de Transbordo Humano       |
                               +-------------------+--------------------+
                                                   |
                     +-----------------------------+-----------------------------+
                     | Solução Concluída                                         | Falha / Acesso Remoto Necessário
                     v                                                           v
       [ Envia Passo com Delay ]                                   [ Dispara Ficha [CHAMADO CPD] ]
       (Status 'digitando...' 2-4s)                                (Pausa bot + Link Direto wa.me)
```

---

## 💡 Estratégia de Redução Contínua de Tokens (Custo Zero a Longo Prazo)

Para evitar dependência financeira da API e prevenir estouro de cotas (*Rate Limits*), o projeto adota uma arquitetura em camadas focada em **redução progressiva de tokens**:

1. **RAG Local Cirúrgico (Implementado):** Em vez de injetar manuais extensos no *System Prompt*, a base técnica fica em JSON local. Antes da chamada à IA, o sistema extrai apenas os 2 ou 3 tópicos estritamente correlacionados e alimenta um prompt enxuto.
2. **Janela Deslizante de Contexto (Implementado):** O histórico enviado à IA é podado para manter apenas as últimas 6 mensagens, mantendo a chamada rápida e barata.
3. **Cache Determinístico / Resposta Direta (Roadmap):** Com o crescimento do banco de conhecimento via `/aprender`, o bot pode comparar a mensagem do usuário contra a base local. Se a pontuação de similaridade ultrapassar 85%, o bot despacha `passos_rapidos[0]` **sem acionar a API externa**, reduzindo em até 90% as chamadas externas.
4. **LLM On-Premise / Local (Opção Enterprise):** O endpoint da IA é desacoplado em `src/gemini.js`, permitindo apontar alternativamente para um modelo local (como Ollama rodando *Llama 3.2 3B* ou *Phi-3* no servidor do CPD), eliminando 100% dos custos com tokens de terceiros.

---

## 🔒 Conformidade com a LGPD (Lei 13.709/2018)

Este projeto foi desenhado sob as diretrizes de **Privacy by Design** e segurança da informação:

* **Minimização de Dados (Art. 6º, III):** O sistema não armazena dados sensíveis desnecessários (CPF, dados de clientes finais ou dados de cartão). Coleta estritamente: número da loja e sintoma do equipamento.
* **Segregação de Credenciais (Art. 46):** Todas as chaves criptográficas (`auth_info/`), tokens de autenticação e variáveis de ambiente (`.env`) são isoladas e protegidas via `.gitignore`, prevenindo qualquer vazamento no GitHub.
* **Auto-Delete de Comandos Operacionais:** Mensagens de controle administrativo (`/aprender` e `/voltar`) são imediatamente excluídas para todos no WhatsApp via API de deleção, garantindo sigilo das rotinas internas do CPD.
* **Painel Administrativo Autenticado:** Acesso restrito via sessão com Cookie `HttpOnly` e `SameSite=Lax`, impedindo visualização de logs operacionais por terceiros.

---

## ⚡ Funcionalidades Principais

* **Conexão WhatsApp Business sem Quedas:** Pareamento via QR Code em tempo real no painel ou por **Código de 8 Dígitos (Pairing Code)**, sem depender de câmera.
* **Simulação de Comportamento Humano:** Delay randômico de 2 a 4 segundos com status de *"digitando..."* para proteção de banimento da conta corporativa.
* **Transbordo Automático [CHAMADO CPD]:** Quando o problema foge do escopo de testes rápidos ou exige AnyDesk/VNC, a IA emite o resumo estruturado e pausa o bot para aquele contato.
* **Comando Silencioso `/aprender`:** O técnico pode resolver um chamado manualmente e digitar `/aprender`. O bot lê a resolução, chama a IA para estruturar um novo registro de conhecimento e salva no banco local.
* **Webchat para Lojas (`/chat`):** Permite aos operadores do supermercado abrirem chamados pelo navegador do PDV/Caixa, com botão direto para transbordo no WhatsApp.
* **Painel Administrativo (`/admin`):**
  - Monitoramento de conversas em tempo real com botões de ação rápida (`Pausar`, `Retomar`, `Aprender`).
  - Gestão da Base de Conhecimento (adicionar, editar e remover tópicos técnicos).
  - Controle do Modo Teste e Whitelist.

---

## 📁 Estrutura de Pastas

```text
chat-bot/
├── data/
│   ├── knowledge_base.json    # Base de conhecimento local RAG (equipamentos e soluções)
│   └── sessions.json          # Histórico temporário de conversas (ignorado no Git)
├── src/
│   ├── config.js              # Configurações centralizadas e leitura do .env
│   ├── database.js            # Gerenciamento de arquivos JSON, buscas e sessões
│   ├── gemini.js              # Integração Google Gemini Flash com fallback e RAG
│   ├── seeder.js              # Carga inicial da base a partir do histórico CPD
│   ├── server.js              # Servidor HTTP: Dashboard, Webchat e APIs do Admin
│   ├── views.js               # Templates HTML das páginas (Webchat, Login e Admin)
│   ├── whatsapp.js            # Conexão Baileys, filtros, auto-delete e eventos
│   └── index.js               # Ponto de inicialização do bot
├── .env.example               # Modelo de variáveis de ambiente sem dados sensíveis
├── .gitignore                 # Regras de exclusão estritas (LGPD e segurança)
├── package.json               # Dependências do projeto
└── README.md                  # Documentação técnica oficial
```

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
* **Node.js** v20.x ou superior instalado.
* **NPM** instalado.
* Chave de API do **Google Gemini** (gratuita em [Google AI Studio](https://aistudio.google.com/)).

### 1. Clonar o Repositório e Instalar Dependências
```bash
git clone https://github.com/raflins/chat-bot.git
cd chat-bot
npm install
```

### 2. Configurar o Arquivo `.env`
Copie o modelo de exemplo:
```bash
cp .env.example .env
```

Abra o `.env` e preencha suas variáveis:
```ini
# Chave obtida no Google AI Studio
GEMINI_API_KEY=sua_chave_aqui
GEMINI_MODEL=gemini-3.5-flash-lite

# Modo de Teste (true para responder apenas aos números listados)
MODO_TESTE=true
NUMEROS_PERMITIDOS=5511999999999,5511988888888

# Contato do Técnico Responsável (com DDI + DDD)
NOME_TECNICO=Rafael (CPD)
TECNICO_WHATSAPP=5511999999999

# Credenciais do Painel de Administração
ADMIN_USER=admin
ADMIN_PASS=sua_senha_forte_aqui
ADMIN_SECRET=chave_secreta_para_cookies
```

### 3. Iniciar o Sistema
```bash
npm start
```

### 4. Conectar o WhatsApp Business
1. Acesse no navegador: `http://localhost:3000`
2. **Opção A:** Aponte a câmera do WhatsApp Business (*Aparelhos Conectados > Conectar um aparelho*).
3. **Opção B (Sem Câmera):** Na seção *Opção 2*, digite seu número com DDD e clique em **Gerar Código**. No celular, toque em *"Conectar com número de telefone"* e digite o código de 8 dígitos.
4. Após o primeiro pareamento, a sessão é salva em `auth_info/` e não será mais necessário escanear novamente.

---

## 🖥️ Rotas do Sistema Web

| Rota | Descrição | Nível de Acesso |
| :--- | :--- | :--- |
| `http://localhost:3000/` | Dashboard inicial, status do bot e QR Code ao vivo | Público |
| `http://localhost:3000/chat` | Webchat de suporte direto para terminais da loja | Público (Lojas) |
| `http://localhost:3000/admin/login` | Tela de autenticação administrativa | Público |
| `http://localhost:3000/admin` | Painel de controle de chats, edição da base e configurações | **Restrito (Admin)** |

---

## 🛡️ Lista de Arquivos Protegidos contra Vazamento (.gitignore)

Nunca envie para o GitHub:
* `.env` (Chaves privadas, telefones e senhas)
* `auth_info/` (Chaves criptográficas de sessão do WhatsApp)
* `data/sessions.json` (Histórico real de conversas e dados de operadores)
* `extracted_data/` e `*.png` (Dumps e prints contendo dados de filiais)

---

## 📄 Licença

Este projeto é distribuído sob a licença **MIT**. Consulte o arquivo `LICENSE` para mais detalhes.
