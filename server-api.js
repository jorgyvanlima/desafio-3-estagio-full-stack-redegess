// ====================================================================
// SERVER API KAELLO ERP — SIMULAÇÃO BACKEND & REST API
// Tecnologia: Node.js + Express
// ====================================================================

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Habilita CORS para permitir conexões do frontend React local (Vite)
app.use(cors());
app.use(express.json());

// ====================================================================
// MASSA DE DADOS IN-MEMORY (Simulando o Banco de Dados SQL)
// ====================================================================

let clientes = [
  { id: 1, nome: 'Alfa Serviços de Tecnologia Ltda', email: 'financeiro@alfaservicos.com.br', cnpj: '12.345.678/0001-90', telefone: '(11) 98765-4321' },
  { id: 2, nome: 'Contabilize Assessoria Contábil', email: 'marina@contabilize.com.br', cnpj: '23.456.789/0001-01', telefone: '(11) 97777-8888' },
  { id: 3, nome: 'Silva & Cia Artigos de Metal', email: 'roberto@silvaecia.com.br', cnpj: '34.567.890/0001-12', telefone: '(21) 96666-5555' },
  { id: 4, nome: 'NovaTech Soluções Digitais', email: 'paula@novatech.com', cnpj: '45.678.901/0001-23', telefone: '(31) 95555-4444' }
];

let produtos = [
  { id: 1, nome: 'Licença Mensal Kaello ERP', preco_base: 150.00 },
  { id: 2, nome: 'Módulo Fiscal Integrado (anual)', preco_base: 890.00 },
  { id: 3, nome: 'Implantação & Treinamento Kaello', preco_base: 1200.00 },
  { id: 4, nome: 'Consultoria de Processos (hora)', preco_base: 180.00 },
  { id: 5, nome: 'Suporte Técnico Premium (mensal)', preco_base: 300.00 },
  { id: 6, nome: 'Desenvolvimento Customizado (hora)', preco_base: 250.00 }
];

let orcamentos = [
  {
    id: 1,
    cliente_id: 2,
    subtotal: 450.00,
    desconto_pct: 0.00,
    valor_desconto: 0.00,
    frete: 20.00,
    total: 470.00,
    status: 'Rascunho',
    itens: [
      { id: 1, produto_id: 1, nome_historico: 'Licença Mensal Kaello ERP', quantidade: 1, preco_unitario: 150.00, subtotal: 150.00 },
      { id: 2, produto_id: 5, nome_historico: 'Suporte Técnico Premium (mensal)', quantidade: 1, preco_unitario: 300.00, subtotal: 300.00 }
    ]
  },
  {
    id: 2,
    cliente_id: 3,
    subtotal: 1200.00,
    desconto_pct: 10.00,
    valor_desconto: 120.00,
    frete: 0.00,
    total: 1080.00,
    status: 'Rascunho',
    itens: [
      { id: 3, produto_id: 3, nome_historico: 'Implantação & Treinamento Kaello', quantidade: 1, preco_unitario: 1200.00, subtotal: 1200.00 }
    ]
  },
  {
    id: 3,
    cliente_id: 1, // Alfa Serviços (Fernanda)
    subtotal: 2400.00,
    desconto_pct: 5.00,
    valor_desconto: 120.00,
    frete: 0.00,
    total: 2280.00,
    status: 'Aprovado', // Pronto para Faturar
    itens: [
      { id: 4, produto_id: 1, nome_historico: 'Licença Mensal Kaello ERP', quantidade: 10, preco_unitario: 150.00, subtotal: 1500.00 },
      { id: 5, produto_id: 4, nome_historico: 'Consultoria de Processos (hora)', quantidade: 5, preco_unitario: 180.00, subtotal: 900.00 }
    ]
  }
];

let faturas = [];

// ====================================================================
// REST ENDPOINTS
// ====================================================================

// GET: Lista de Produtos (Cadastro Geral - Usado no Combobox inteligente)
app.get('/api/produtos', (req, res) => {
  res.json(produtos);
});

// GET: Lista de Clientes
app.get('/api/clientes', (req, res) => {
  res.json(clientes);
});

// GET: Lista todos os Orçamentos
app.get('/api/orcamentos', (req, res) => {
  res.json(orcamentos);
});

// POST: Cria um novo Orçamento (Calculando totais com segurança matemática)
app.post('/api/orcamentos', (req, res) => {
  const { cliente_id, itens_entrada, desconto_pct, frete } = req.body;

  if (!cliente_id || !itens_entrada || itens_entrada.length === 0) {
    return res.status(400).json({ erro: 'Dados inválidos. Cliente e itens do orçamento são obrigatórios.' });
  }

  // Valida e calcula cada item
  let subtotalGeral = 0;
  const itensCalculados = itens_entrada.map((item, index) => {
    const descProduto = item.nome || 'Produto não cadastrado';
    const qtd = Math.max(1, parseInt(item.quantidade) || 1);
    const preco = Math.max(0, parseFloat(item.preco_unitario) || 0);
    const subtotalItem = parseFloat((qtd * preco).toFixed(2));
    subtotalGeral += subtotalItem;

    return {
      id: index + 1,
      produto_id: item.produto_id || null,
      nome_historico: descProduto,
      quantidade: qtd,
      preco_unitario: preco,
      subtotal: subtotalItem
    };
  });

  const descontoVal = Math.max(0, Math.min(100, parseFloat(desconto_pct) || 0));
  const freteVal = Math.max(0, parseFloat(frete) || 0);

  // FÓRMULA CORRIGIDA: Divisor por 100
  const valorDesconto = parseFloat((subtotalGeral * (descontoVal / 100)).toFixed(2));
  const total = parseFloat((subtotalGeral - valorDesconto + freteVal).toFixed(2));

  const novoOrcamento = {
    id: orcamentos.length + 1,
    cliente_id: parseInt(cliente_id),
    subtotal: subtotalGeral,
    desconto_pct: descontoVal,
    valor_desconto: valorDesconto,
    frete: freteVal,
    total: total,
    status: 'Rascunho',
    itens: itensCalculados
  };

  orcamentos.push(novoOrcamento);
  console.log(`[API] Orçamento #${novoOrcamento.id} gerado com sucesso.`);
  res.status(201).json(novoOrcamento);
});

// ====================================================================
// SITUAÇÃO 1: SIMULAÇÃO DO CHAMADO #2087 (FERNANDA - ALFA SERVIÇOS)
// Endpoint de faturamento que dispara erro 500 sob condições específicas.
// ====================================================================

app.post('/api/faturas/gerar', (req, res) => {
  const { orcamento_id } = req.body;

  // Chamado #2087: Fernanda relata que ao gerar fatura para o Orçamento #3 (Alfa Serviços) o sistema falha.
  // Simulamos um erro catastrófico 500 se o cliente tentar faturar o orçamento da Alfa Serviços (ID 3)
  if (parseInt(orcamento_id) === 3) {
    console.error(`[CRITICAL ERROR 500] Database deadlock detected on transaction invoice_generation_sp.`);
    console.error(`Trace: at Connection.query (d:/server/db.js:142:11)`);
    
    // Retorna HTTP 500 sem tratamento JSON amigável, induzindo a falha no front-end
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>500 Internal Server Error</title></head>
      <body>
        <h1>500 Internal Server Error</h1>
        <p>Unhandled Exception: SequelizeDatabaseError: dead lock detected on lock Table "Faturas".</p>
      </body>
      </html>
    `);
  }

  // Comportamento normal para outros orçamentos
  const orc = orcamentos.find(o => o.id === parseInt(orcamento_id));
  if (!orc) {
    return res.status(404).json({ error: 'Orçamento não encontrado.' });
  }

  if (orc.status !== 'Aprovado') {
    return res.status(400).json({ error: 'Apenas orçamentos com status "Aprovado" podem ser faturados.' });
  }

  orc.status = 'Faturado';

  const novaFatura = {
    id: faturas.length + 2087, // Começa no ID 2087 para simular o chamado
    orcamento_id: orc.id,
    valor_faturado: orc.total,
    data_emissao: new Date().toISOString(),
    status: 'Pendente',
    chave_acesso: '35' + Math.floor(Math.random() * 1000000000000000).toString().padStart(42, '0')
  };

  faturas.push(novaFatura);
  console.log(`[API] Fatura #${novaFatura.id} emitida com sucesso para o Orçamento #${orc.id}.`);
  res.status(201).json(novaFatura);
});

// Middleware genérico para tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ erro: 'Erro interno no servidor de cobranças.' });
});

// Inicialização do servidor local
app.listen(PORT, () => {
  console.log(`====================================================================`);
  console.log(`🚀 API REST Kaello rodando localmente em http://localhost:${PORT}`);
  console.log(`📂 Endpoints disponíveis:`);
  console.log(`   - GET  http://localhost:${PORT}/api/produtos (Lista autocomplete)`);
  console.log(`   - GET  http://localhost:${PORT}/api/clientes (Lista de clientes)`);
  console.log(`   - GET  http://localhost:${PORT}/api/orcamentos (Histórico)`);
  console.log(`   - POST http://localhost:${PORT}/api/orcamentos (Criação de orçamento)`);
  console.log(`   - POST http://localhost:${PORT}/api/faturas/gerar (Simulação de faturamento)`);
  console.log(`====================================================================`);
});
