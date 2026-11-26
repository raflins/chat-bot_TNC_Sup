# Base de Conhecimento & Roteiro de Triagem — Chatbot CPD / Suporte de TI
*(Mapeado com base no histórico real de atendimentos às lojas da rede)*

---

## 1. O Papel do Chatbot no Suporte de Loja

O objetivo do chatbot é atuar como o **primeiro nível de suporte (N1)** para gerentes, fiscais de caixa e operadores de loja:
1. **Filtrar e resolver problemas básicos** que o operador consegue resolver sozinho em 1 minuto (calibração rápida, desenganchar gaveta, reiniciar Consinco, destravar cabo).
2. **Identificar o equipamento pela linguagem popular da loja** (ex: *"impressora branca"*, *"impressora preta"*, *"balança do fatiados"*, *"gaveta emperrada"*).
3. **Fazer o Transbordo Inteligente para o Rafael (CPD)** quando exigir acesso remoto, alteração no ERP Consinco, abertura no GLPI ou manutenção de bancada, **já entregando o resumo mastigado do que foi feito**.

---

## 2. Módulo de Impressoras Térmicas Zebra (Preços & FIFO)

### ⚪ Impressora Branca (Zebra GC420t)
* **Como a loja chama:** *"A impressora branca"*, *"a impressora do CPD"*.
* **Identificação:** Gabinete cinza-claro/branco, tampa concha com travas amarelas, 1 botão redondo FEED iluminado.
* **Calibração Real (Ciclo Curto de 2 Piscadas):**
  - **Atenção:** Na branca, a calibração de mídia é **rápida** e não exige 7 piscadas.
  - **Comando do bot para a loja:**  
    > *"Com a impressora ligada e com etiqueta dentro, segura o botão de puxar etiqueta. Ele vai piscar 1 vez... quando piscar **2 vezes seguidas**, solta o botão na hora."*
  - A impressora avança 2 a 3 etiquetas devagar e trava certinho no picote.
* **Se continuar desregulada:**
  - *"Desliga na chave atrás, espera 10 segundos, liga e aperta o botão 1 vez só pra liberar a memória."*

---

### ⚫ Impressora Preta (Zebra ZD220 / ZD230)
* **Como a loja chama:** *"A impressora preta"*, *"a zebra nova"*.
* **Identificação:** Gabinete preto/chumbo, LEDs de status e botão separados.
* **O Detalhe Crítico do Sensor Móvel:**
  - Na preta, o sensor é uma pecinha plástica amarela no fundo que **corre num trilho**. Quando a loja troca da etiqueta de gôndola para a etiqueta verde/vermelha de FIFO, esse sensor costuma sair do lugar.
  - **Comando do bot para a loja:**  
    > *"Abre a impressora preta e olha na base amarela onde o papel passa: tem uma pecinha amarela que desliza. Garanta que ela esteja bem no meio da etiqueta. Depois fecha a tampa pressionando os dois lados até fazer clique duplo."*
* **Calibração Estendida da ZD220 (Sequência longa / Reset):**
  - Aqui sim se utiliza a sequência estendida segurando o botão de avanço até completar o ciclo de reinicialização de mídia.

---

### 💻 O Fator ERP Consinco (Quando a impressora está OK mas não sai etiqueta)
* **Sintoma:** O LED da Zebra está **verde fixo** (sem erro físico), o operador clica no Consinco e a etiqueta não sai, ou o preço sai antigo.
* **Procedimento do bot antes de passar para o técnico:**
  > *"Fecha o Consinco, reinicia o computador da loja e abre o Consinco novamente para ele puxar a atualização da tabela de preços."*
* Se após reiniciar o computador e o Consinco ainda não imprimir:
  - **Causa provável:** Spooler do Windows travado ou porta USB desconectada.
  - **Ação:** Bot transfere para o Rafael acessar remotamente.

---

## 3. Matriz dos Demais Chamados de Loja (Além de Impressora)

A análise do histórico revelou os 6 tipos de chamados mais recorrentes que chegam no dia a dia:

### A. Gaveta de Dinheiro do PDV Não Abre ou Não Fecha
* **O que a loja fala:** *"A gaveta do caixa 05 tá travada"*, *"Não tá fechando"*, *"A frente tá presa"*.
* **O que você costuma verificar/orientar:**
  1. *"Pede para o operador retirar a gaveta totalmente do trilho e olhar se tem moeda, nota ou clipe caído atrás da gaveta."*
  2. *"Verifica se a gaveta saiu do trilho lateral ou se a frente de metal bateu e entortou."*
  3. *"Confere se o cabo de conexão que liga a gaveta embaixo da impressora de cupom está bem plugado (conector RJ11/tipo telefone)."*
* **Transbordo para CPD:** Se o cabo estiver remendado/rompido ou o solenoide de abertura queimado -> Chamado para troca física.

---

### B. Leitor de Código de Barras (Datalogic / Caixa / Coletor)
* **O que a loja fala:** *"O leitor não tá passando nada"*, *"Apagou o laser"*, *"Coletor tá lento"*.
* **O que você costuma verificar/orientar:**
  1. *"Verifica o cabo USB atrás da CPU do caixa se não desconectou com o pé do operador."*
  2. *"Troca de porta USB: tira de onde tá e conecta numa porta USB traseira da CPU."*
  3. *"O leitor dá bipe quando liga na porta?"*
* **Transbordo para CPD:** Leitor sem sinal luminoso mesmo em outra porta USB ou cabo quebrado -> Envio de leitor reserva.

---

### C. Balanças (Toledo Prix / Açougue / Fatiados / Hortifrúti)
* **O que a loja fala:** *"Balança do açougue não entra carga"*, *"Defeito cabeça térmica balança fatiados"*, *"Não tá pesando"*.
* **O que você costuma verificar/orientar:**
  1. **Falha de Carga de Preço do Consinco:**
     - *"A carga foi enviada pelo Consinco hoje cedo?"*
     - *"A balança tá ligada no cabo de rede azul? Confere se a luz do cabo de rede tá piscando atrás dela."*
  2. **Etiqueta da Balança Falhando / Fraca:**
     - *"Puxa a gavetinha lateral da balança, verifica se não colou etiqueta no rolete preto e passa um pano seco na cabeça térmica."*
* **Transbordo:** Se o código de barras sair com falha vertical branca permanente -> Acionar técnico externo especializado (ex: Renner Balanças).

---

### D. Código de Operador de Caixa / Permissão no Consinco
* **O que a loja fala:** *"Operadora sem permissão para abrir caixa"*, *"Liberar operador loja 30"*, *"Troca de loja da operadora"*.
* **O que o bot deve responder:**
  > *"Chamados de cadastro e liberação de operador de caixa são realizados pelo sistema de chamados (GLPI) para registro de auditoria. Por favor, confirme o Nome Completo da operadora, Matrícula e Loja que o Rafael/CPD já vai validar e liberar no sistema."*

---

### E. Computador da Loja / CPU do PDV que Não Liga
* **O que a loja fala:** *"O computador da gerência não liga"*, *"Caixa 01 e 02 apagados"*.
* **O que você costuma orientar:**
  > *"Tira o cabo de energia da tomada ou da fonte do computador, espera 30 segundos com ele fora e tenta ligar novamente, por favor."*
* Se não der sinal nenhum de energia:
  - Verificar se o disjuntor/estabilizador/nobreak do caixa não desarmou.

---

### F. Queda de Link / Internet da Loja
* **O que a loja fala:** *"Loja 03 sem internet"*, *"Consinco caiu"*, *"Sistema fora do ar"*.
* **O que o bot deve verificar:**
  - O bot checa o status de monitoramento de link do CPD.
  - Se for geral na loja: *"O CPD já detectou a queda de comunicação do link. Por favor, enviem uma foto do rack/modem da operadora para acionamento do chamado com a operadora de telecom."*
  - *"Lembrando que o aplicativo de registro de ponto funciona offline; os operadores podem bater o ponto normal que as batidas sobem assim que a internet restabelecer."*

---

## 4. Roteiro de Transbordo Automático (Quando passar para o Rafael)

Quando os testes básicos da loja não funcionarem, o chatbot monta o resumo pronto e te notifica:

```markdown
🚨 [CHAMADO CPD] — Transbordo de Suporte
📍 Unidade: Loja [Ex: 11]
📂 Categoria: [Impressora / Gaveta / Balança / Consinco / PDV]
🔎 Equipamento: [Ex: Impressora Branca GC420t / Gaveta PDV 03]
📝 O que a loja relatou: "Não tá saindo etiqueta de preço do Consinco"
⚙️ O que o bot já fez:
- [x] Orientou calibração física de 2 piscadas (operador fez)
- [x] Solicitou fechar e reabrir o Consinco
- [x] Testou conexão do cabo USB
⚠️ Situação atual: Impressora permanece sem imprimir; necessita de acesso remoto.
👤 Atendente: Encaminhado para Rafael (CPD).
```

---

*(Base consolidada para integração direta no motor de conversação do Chatbot)*
