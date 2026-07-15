# Kaello ERP Comercial · Gestão de Orçamentos e Faturamento

Este repositório contém a resolução completa do **Desafio Técnico Inicial para a vaga de Estágio Full Stack** (Suporte & Produto) da **redegess**. 

O projeto foi construído com foco em demonstrar **maestria técnica, rigor lógico e visão de produto**, entregando soluções para os três cenários propostos no desafio, organizados em uma estrutura de portfólio profissional para estudo local e avaliação.

---

## 🚀 Tecnologias Utilizadas

A solução foi estruturada utilizando as ferramentas indicadas para o ecossistema tecnológico do desafio:

1. **Frontend Legado**: HTML5, Vanilla CSS e Vanilla JavaScript (DOM nativo).
2. **Frontend Moderno**: React.js (Vite), TypeScript (tipagem estrita) e Lucide Icons.
3. **Backend / API**: Node.js e Express (simulação de REST API e in-memory DB).
4. **Banco de Dados**: Modelagem Relacional SQL (PostgreSQL com triggers de cálculo e massa de teste).
5. **Controle de Versão**: Git e GitHub.

---

## 📂 Estrutura do Projeto

O repositório está organizado da seguinte forma:

```bash
├── respostas-desafio.md       # Relatório formal respondendo às Situações 1, 2 e 3
├── sistema-com-bugs.html      # Arquivo original legado contendo as falhas relatadas
├── sistema-corrigido.html     # Versão legada 100% corrigida, segura e com melhorias de UX
├── server-api.js              # Servidor backend local em Express com simulação de erros
├── banco-de-dados.sql         # Script SQL contendo modelagem relacional, triggers e dados
└── novo-orcamento-react/      # Modernização completa da tela de orçamentos (React + TS + Vite)
    ├── src/
    │   ├── App.tsx            # Lógica comercial, autocomplete, toasts e simulação de erros
    │   ├── index.css          # Sistema de design premium responsivo
    │   └── main.tsx
    ├── package.json
    └── tsconfig.json
```

---

## 📋 Resumo das Resoluções

### 📌 Situação 1: O Chamado da Fernanda (Alfa Serviços)
* **Atendimento**: Redação de e-mail empático, focado no cliente e contendo um plano de ação transparente.
* **Perguntas**: 4 perguntas rápidas e não-técnicas para capturar o ID do orçamento, o horário exato, comportamento em aba anônima e evidências visuais.
* **Hipóteses Técnicas**:
  1. *React Render Crash (Erro de JavaScript)*: O frontend tenta ler uma propriedade de um objeto nulo (`null.propriedade`), travando a árvore de componentes por falta de *Error Boundaries*.
  2. *Erro 500 no Servidor (REST API)*: Falha de conexão ou exceção no banco durante a requisição de faturamento, travando o estado da UI sem feedback de erro.
  3. *Incompatibilidade de Cache (Bundle Mismatch)*: Script local antigo incompatível com as novas rotas do backend recém-implantadas.

### 📌 Situação 2: Correção dos Bugs (HTML Legado)
* **Bug #1042 (Marina — Frete Gigante)**: O valor do frete era concatenado como String. Corrigido com conversão numérica explícita usando `parseFloat()`.
* **Bug #1043 (Roberto — Desconto Zerando Total)**: A fórmula de desconto multiplicava a taxa em um fator incorreto (dividido por 10). Corrigido para `desconto / 100`.
* **Bug #1044 (Paula — Remoção Incorreta)**: A função de remoção continha o índice rígido `0` no `splice`. Corrigido para o índice dinâmico `indice` passado por parâmetro.
* **Melhorias Bônus**: Validação contra quantidade/preço negativos ou campos de texto vazios, tratamento de erros `NaN` com coalescência nula e retorno de foco para entrada contínua de dados.

### 📌 Situação 3: Olhar de Produto e Usabilidade (React + TS)
* **Combobox inteligente (Autocomplete)**: Campo de busca que lê a lista de produtos cadastrados da API REST e autocompleta os preços correspondentes.
* **Empty State (Estado Vazio)**: Layout limpo que desabilita campos de descontos e fretes enquanto o orçamento estiver sem itens cadastrados.
* **Toasts Animados e Foco Dinâmico**: Substituição de alertas do navegador (`alert()`) por notificações flutuantes não obstrutivas, com retorno automático de foco no campo de produto após inserção.

---

## ⚙️ Como Executar o Projeto Localmente

### 1. Testar o HTML Legado (Situação 2)
* Basta abrir os arquivos `sistema-com-bugs.html` e `sistema-corrigido.html` diretamente em qualquer navegador moderno para interagir e visualizar as correções acontecendo em tempo real.

### 2. Iniciar o Servidor Backend (API REST)
O backend simula os cadastros de clientes e produtos, as rotas de orçamento e a falha de faturamento que causou o chamado da Fernanda.

No diretório raiz do projeto, instale as dependências e inicie o servidor:
```bash
# Instale o express e o cors no diretório raiz
npm install express cors

# Inicie o servidor Node.js
node server-api.js
```
O servidor estará rodando em `http://localhost:3000`.

### 3. Iniciar o Frontend Moderno (React + TypeScript)
Com o servidor Node.js rodando, abra outro terminal no diretório `novo-orcamento-react`:

```bash
# Entre na pasta do frontend
cd novo-orcamento-react

# Instale as dependências do Vite, React e Lucide Icons
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```
Abra a URL indicada no terminal (normalmente `http://localhost:5173`) no navegador.

---

## 🧪 Como Testar a Simulação da "Tela Branca" (Chamado #2087)

O painel moderno em React inclui um **Console do Desenvolvedor e Depurador de Estudos** no rodapé:
1. **Simular Erro 500 sem Tratamento**: Desmarque a caixa *"Tratamento de Erros Seguro (Modo Recomendado)"*. Selecione o cliente **Alfa Serviços** no topo da tela e clique em **Faturar Orçamento**. O frontend tentará processar a resposta HTML de erro 500 do servidor como se fosse JSON, gerando um erro não tratado que simula o travamento e a **tela branca** reportada pela Fernanda.
2. **Tratamento Seguro**: Deixe a caixa ativa. Ao clicar em faturar, o frontend captura o erro 500 através do bloco `try/catch` e apresenta um alerta seguro de instabilidade sem travar a interface.
3. **Simular Crash de Renderização (React)**: Clique no botão *"Forçar Crash de Render"*. O React tentará ler uma propriedade de uma variável nula em tempo de execução, quebrando a árvore e demonstrando visualmente a Hipótese 1 da tela branca.

---

**Desenvolvido por [Jorgyvan Lima](https://github.com/jorgyvanlima)**  
*Desafio Técnico · redegess*
