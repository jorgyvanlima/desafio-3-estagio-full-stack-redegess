# Relatório de Resolução do Desafio · Estágio Full Stack (Com Docker)
**Candidato:** Jorgyvan Lima
**Vaga:** Estágio Full Stack (Suporte & Produto) — redegess

---

## 📌 Situação 1: O Chamado da Fernanda (Alfa Serviços)

### 1. Mensagem de Primeiro Atendimento à Fernanda

> **Assunto:** [Urgente] Atendimento chamado #2087 — Emissão de Fatura / Alfa Serviços
>
> Olá, Fernanda. Tudo bem?
>
> Sou o Jorgyvan, do time de suporte da redegess, e serei o responsável por resolver esse problema com você hoje. 
>
> Entendo perfeitamente o impacto e a urgência dessa emissão para a Alfa Serviços hoje. Fique tranquila, pois já estamos tratando o seu caso como prioridade absoluta aqui na equipe técnica.
>
> Nosso time já iniciou a análise técnica do botão "Gerar fatura" no nosso sistema de faturamento para diagnosticar o motivo dessa instabilidade. Vou te acompanhar de perto durante todo o processo e te manterei informada a cada avanço técnico que fizermos.
>
> Enquanto nossos engenheiros analisam os servidores, você poderia nos ajudar respondendo a algumas perguntas simples? Suas respostas podem nos apontar o caminho mais rápido para a solução.
>
> Obrigado pela paciência e parceria. Estou inteiramente à sua disposição.
>
> Atenciosamente,  
> **Jorgyvan Lima**  
> Suporte ao Cliente & Produto · redegess

---

### 2. Perguntas de Investigação Rápida
As perguntas são voltadas para capturar o contexto de faturamento sem jargões técnicos para a cliente:
1. **Identificação do Registro:** "Fernanda, qual é o número da fatura, o ID do orçamento ou o nome do cliente da Alfa Serviços para a qual você estava tentando gerar essa cobrança no momento do travamento?"
2. **Contexto Temporal:** "Você se lembra do horário aproximado em que clicou no botão e a tela ficou branca?"
3. **Isolamento de Ambiente:** "Se for possível, você poderia tentar clicar no botão usando uma **aba anônima** do seu navegador ou através de outro navegador (como Firefox, Chrome ou Edge)? Isso nos ajuda a saber se é algo local no navegador."
4. **Coleta Visual:** "Caso apareça alguma mensagem rápida de erro antes de a tela apagar ou se houver algo escrito na barra de endereços (o link da página), você poderia tirar um print ou copiar e nos enviar?"

---

### 3. Três Hipóteses Técnicas e Plano de Investigação (Enriquecido com Docker)
Com um ambiente local dockerizado em `docker-compose`, a equipe técnica pode replicar de forma idêntica os containers do banco de dados relacional e da API para depurar e investigar:

#### Hipótese 1: Erro de Execução no JavaScript (Uncaught Runtime Error / Crash do React)
* **Causa técnica:** Ocorre quando o frontend tenta ler uma propriedade de uma variável que veio nula ou indefinida da API (ex: `fatura.cliente.cnpj` quando o objeto `cliente` não existe), gerando um erro de referência. Sem um *Error Boundary* implementado no React, qualquer erro não tratado durante o ciclo de renderização causa o travamento total da interface, exibindo a temida "tela branca".
* **Como Investigar:**
  1. Abrir o console do desenvolvedor do navegador (F12 > guia *Console*) e buscar por erros marcados em vermelho, como `TypeError: Cannot read properties of undefined` ou `Uncaught Error`.
  2. Verificar o arquivo e a linha que dispararam a falha (analisando o *source map* do bundle).
  3. Replicar o bug em nosso container local do frontend para verificar se a tipagem do TypeScript ou regras de fallback impedem a quebra.

#### Hipótese 2: Falha Crítica / Exceção Não Tratada na API REST (Erro HTTP 500 ou Timeout)
* **Causa técnica:** O endpoint do backend responsável pelo faturamento (`POST /api/faturas`) falhou ao processar a requisição devido a um erro inesperado (ex: deadlock no banco Postgres, falha na geração do PDF da fatura ou timeout) e retornou um status HTTP `500 Internal Server Error`. Se o frontend não tiver tratamento adequado de promessas rejeitadas, a tela pode ficar travada indefinidamente ou quebrar a renderização.
* **Como Investigar:**
  1. Abrir a aba de inspeção de Rede do navegador (F12 > guia *Network/Rede*) para ver o código de retorno (500) e a mensagem de resposta.
  2. Acessar os logs consolidados da API executando `docker logs kaello_backend_api` no servidor ou localmente buscando logs de erro na data e hora informadas pela cliente.
  3. Inspecionar o container de banco de dados (`docker logs kaello_postgres_db`) para buscar evidências de deadlocks ou queries bloqueadas.

#### Hipótese 3: Conflito de Versões de Cache e Script no Navegador (Bundle Mismatch)
* **Causa técnica:** Após um deploy recente de atualização no backend, o formato dos dados enviados ou os endpoints mudaram. No entanto, o navegador da Fernanda está usando uma versão em cache antiga do arquivo JavaScript (`bundle.js`) que envia dados em um formato descontinuado ou faz requisições a rotas antigas.
* **Como Investigar:**
  1. Verificar se a tela volta a funcionar quando a cliente acessa por uma aba anônima (que ignora o cache de scripts padrão).
  2. Inspecionar os cabeçalhos de requisição e resposta do servidor para conferir as diretivas de cache (`Cache-Control: no-cache, no-store`).
  3. Revisar as definições do Dockerfile do frontend e do Nginx (`nginx.conf`) para certificar que os cabeçalhos de expiração de cache de arquivos estáticos não estão retendo versões obsoletas de bundles JS.

---

## 🛠 Situação 2: Diagnóstico e Correção dos Bugs (sistema-com-bugs.html)

Abaixo estão detalhados os três problemas diagnosticados no código legado e as respectivas soluções implementadas.

### 📋 Diagnóstico dos Chamados

#### Chamado #1042 (Marina — Frete Gigante)
* **Onde está:** Linhas 169 e 176 da tag `<script>` do arquivo original.
* **Causa:** O campo de frete é lido usando `document.getElementById('frete').value`, o que retorna uma string (`"20"`). No cálculo final `const total = totalComDesconto + frete`, o operador `+` realiza uma **concatenação de strings** ao invés de uma soma aritmética, pois um dos operandos é string (ex: `130 + "20" = "13020"`).
* **Correção:** Realizou-se o *parsing* numérico do valor com `parseFloat()` no JavaScript, e no backend real com a modelagem do Postgres que força a coerção numérica nas triggers SQL.
  ```javascript
  const frete = parseFloat(document.getElementById('frete').value) || 0;
  ```

#### Chamado #1043 (Roberto — Desconto Zerando Total)
* **Onde está:** Linha 172 do arquivo original.
* **Causa:** O cálculo do desconto aplicava a fórmula dividindo a taxa por 10 em vez de 100: `subtotalGeral * (descontoPct / 10)`. Ao inserir 10%, o desconto calculado era `10 / 10 = 1`, o que representa 100% do subtotal, resultando em um desconto igual ao subtotal e zerando o total do orçamento.
* **Correção:** Ajustou-se o divisor para `100` para converter corretamente a taxa percentual em fator decimal.
  ```javascript
  const valorDesconto = subtotalGeral * (descontoPct / 100);
  ```

#### Chamado #1044 (Paula — Remoção Incorreta de Itens)
* **Onde está:** Linha 135 do arquivo original (na função `removerItem`).
* **Causa:** A função `removerItem(indice)` recebia o índice correto do elemento clicado, porém, internamente, continha uma linha estática fixa: `itens.splice(0, 1)`. Isso removia sempre o primeiro elemento do array (índice 0), independentemente da linha selecionada.
* **Correção:** Substituiu-se o parâmetro estático `0` pela variável dinâmica `indice`.
  ```javascript
  function removerItem(indice) {
    itens.splice(indice, 1);
    render();
  }
  ```

---

### 🎁 Bônus: Correções Extras e Melhorias de Robustez
Durante o escaneamento do código legado, foram detectadas e corrigidas as seguintes falhas de segurança e lógica:
1. **Validação de Quantidades e Preços Negativos:** No código original era possível cadastrar itens com quantidade ou preço unitário zerados ou negativos. Agora há uma validação para impedir isso, exibindo mensagens claras.
2. **Campos Vazios:** O sistema original aceitava adicionar produtos com strings em branco. Adicionamos validações que impedem itens sem nome de produto.
3. **Tratamento de NaN (Not a Number):** Se o usuário limpasse completamente os inputs de frete ou desconto, o sistema calculava com valores vazios/nulos, gerando `NaN` no total. Implementamos tratamento com operadores de coalescência nula para garantir fallbacks para `0`.
4. **Focus Automático e UX:** Quando o faturista adiciona um produto com sucesso, o cursor do teclado retorna automaticamente para o campo "Produto / Serviço", acelerando o cadastro consecutivo de múltiplos itens.
5. **Toast Notifications Nativos:** Substituição de `alert()` intrusivos e bloqueantes por notificações leves baseadas em animações CSS.

---

## 🎨 Situação 3: Olhar de Produto e Usabilidade

Pensando na jornada de quem fura orçamentos diariamente, propomos as seguintes melhorias que foram materializadas na nossa versão modernizada em React + TypeScript e encapsulada em Docker:

### 1. Dropdown Inteligente com Autocomplete (Combobox de Produtos)
* **O que é:** Substituição do campo de texto simples de produto por uma caixa de busca inteligente (Combobox) integrada a uma base de dados real (PostgreSQL). À medida que o faturista digita o nome do produto, o sistema sugere opções pré-cadastradas e, ao selecionar uma, autocompleta o preço unitário padrão.
* **Por que melhora a experiência:**
  * **Velocidade:** Elimina a necessidade de consultar tabelas externas de preços ou digitar nomes longos manualmente.
  * **Segurança:** Previne erros de digitação de nomes e impede que o faturista insira valores defasados ou incorretos por engano.

### 2. Estado Vazio (Empty State) Direcionado e Elementos Condicionais
* **O que é:** Quando o orçamento não possui nenhum item adicionado, a tabela exibe uma ilustração limpa com uma mensagem explicativa ensinando o usuário a adicionar o primeiro item para começar. Além disso, as caixas de **Desconto** e **Frete** ficam ocultas ou desabilitadas até que haja ao menos um produto listado.
* **Por que melhora a experiência:**
  * **Clareza de Fluxo:** Evita a poluição cognitiva na tela inicial e guia visualmente o usuário sobre qual ação ele deve tomar primeiro.
  * **Prevenção de Erros:** Impede que o usuário insira desconto ou frete em um orçamento sem itens, o que não faria sentido matemático nem comercial.

### 3. Foco Dinâmico e Toasts Não-Bloqueantes
* **O que é:** Uso de comportamento inteligente de foco (após a inserção bem-sucedida, o cursor do teclado volta automaticamente ao campo de produto e seleciona o texto) e a substituição dos alertas nativos do navegador (`alert()`) por Toasts no canto superior da tela com contagens regressivas de fechamento automático.
* **Por que melhora a experiência:**
  * **Trabalho Fluido:** O faturista pode preencher `Produto -> Tab -> Qtd -> Tab -> Preço -> Enter` e continuar digitando o próximo produto imediatamente sem encostar no mouse.
  * **Sem Bloqueios de Interface:** O pop-up nativo de `alert()` congela a execução do navegador e exige um clique manual em "OK", quebrando o ritmo de digitação rápida do operador. Os toasts mantêm o fluxo livre.
