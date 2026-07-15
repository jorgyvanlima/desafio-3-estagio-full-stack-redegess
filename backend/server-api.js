// ====================================================================
// SERVER API KAELLO ERP — SIMULAÇÃO BACKEND & CONEXÃO REAL SQL
// Tecnologia: Node.js + Express + pg (PostgreSQL Client)
// ====================================================================

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ====================================================================
// CONFIGURAÇÃO E CONEXÃO COM O POSTGRESQL (COM RETRY LOGIC)
// ====================================================================

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'kaello_db',
  port: process.env.DB_PORT || 5432,
});

async function conectarBancoComRetry(retries = 8, delay = 4000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('====================================================================');
      console.log('✅ Conexão com o banco PostgreSQL estabelecida com sucesso!');
      return;
    } catch (err) {
      console.log(`⚠️ Tentativa de conexão ao banco falhou (${i + 1}/${retries}). PostgreSQL pode estar iniciando...`);
      console.log(`   Detalhe: ${err.message}`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  console.error('❌ Erro crítico: Não foi possível conectar ao banco de dados após várias tentativas.');
  process.exit(1);
}

// ====================================================================
// REST ENDPOINTS
// ====================================================================

// GET: Lista de Produtos (Cadastro Geral)
app.get('/api/produtos', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, CAST(preco_base AS FLOAT) as preco_base FROM produtos ORDER BY id;');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar produtos:', err.message);
    res.status(500).json({ erro: 'Erro ao consultar banco de dados.' });
  }
});

// GET: Lista de Clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, email, cnpj, telefone FROM clientes ORDER BY id;');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar clientes:', err.message);
    res.status(500).json({ erro: 'Erro ao consultar banco de dados.' });
  }
});

// GET: Lista todos os Orçamentos
app.get('/api/orcamentos', async (req, res) => {
  try {
    // Busca os cabeçalhos dos orçamentos
    const orcResult = await pool.query(`
      SELECT o.id, o.cliente_id, c.nome as cliente_nome, c.cnpj as cliente_cnpj,
             CAST(o.subtotal AS FLOAT) as subtotal, 
             CAST(o.desconto_pct AS FLOAT) as desconto_pct, 
             CAST(o.valor_desconto AS FLOAT) as valor_desconto, 
             CAST(o.frete AS FLOAT) as frete, 
             CAST(o.total AS FLOAT) as total, 
             o.status
      FROM orcamentos o
      JOIN clientes c ON o.cliente_id = c.id
      ORDER BY o.id DESC;
    `);

    // Busca os itens de todos os orçamentos
    const itemResult = await pool.query(`
      SELECT id, orcamento_id, produto_id, nome_historico, quantidade, 
             CAST(preco_unitario AS FLOAT) as preco_unitario, 
             CAST(subtotal AS FLOAT) as subtotal 
      FROM itens_orcamento 
      ORDER BY id ASC;
    `);

    // Agrupa os itens em seus respectivos orçamentos
    const orcamentosArray = orcResult.rows.map(orc => {
      return {
        ...orc,
        itens: itemResult.rows.filter(i => i.orcamento_id === orc.id)
      };
    });

    res.json(orcamentosArray);
  } catch (err) {
    console.error('Erro ao buscar orçamentos:', err.message);
    res.status(500).json({ erro: 'Erro ao consultar orçamentos.' });
  }
});

// POST: Cria um novo Orçamento (Valores recalculados automaticamente pelas triggers SQL!)
app.post('/api/orcamentos', async (req, res) => {
  const { cliente_id, itens_entrada, desconto_pct, frete } = req.body;

  if (!cliente_id || !itens_entrada || itens_entrada.length === 0) {
    return res.status(400).json({ erro: 'Dados inválidos. Cliente e itens do orçamento são obrigatórios.' });
  }

  const client = pool.connect();
  
  try {
    const dbClient = await client;
    await dbClient.query('BEGIN');

    // 1. Insere o cabeçalho do orçamento.
    // Observação: Os totais financeiros começam zerados e serão recalculados pelas triggers SQL do banco de dados!
    const orcInsert = await dbClient.query(
      `INSERT INTO orcamentos (cliente_id, desconto_pct, frete, status) 
       VALUES ($1, $2, $3, 'Rascunho') RETURNING id;`,
      [parseInt(cliente_id), parseFloat(desconto_pct) || 0.00, parseFloat(frete) || 0.00]
    );

    const novoOrcamentoId = orcInsert.rows[0].id;

    // 2. Insere os itens
    for (const item of itens_entrada) {
      const nomeProd = item.nome || 'Produto não cadastrado';
      const qtd = Math.max(1, parseInt(item.quantidade) || 1);
      const preco = Math.max(0, parseFloat(item.preco_unitario) || 0);

      await dbClient.query(
        `INSERT INTO itens_orcamento (orcamento_id, produto_id, nome_historico, quantidade, preco_unitario)
         VALUES ($1, $2, $3, $4, $5);`,
        [novoOrcamentoId, item.produto_id || null, nomeProd, qtd, preco]
      );
    }

    // 3. Efetua o commit. As triggers de banco 'tg_calcular_subtotal_item' e 'tg_recalcular_totais_orcamento'
    // serão disparadas automaticamente no banco para ajustar todos os totais.
    await dbClient.query('COMMIT');

    // 4. Busca o orçamento final atualizado pelo banco de dados
    const finalOrc = await dbClient.query(`
      SELECT o.id, o.cliente_id, 
             CAST(o.subtotal AS FLOAT) as subtotal, 
             CAST(o.desconto_pct AS FLOAT) as desconto_pct, 
             CAST(o.valor_desconto AS FLOAT) as valor_desconto, 
             CAST(o.frete AS FLOAT) as frete, 
             CAST(o.total AS FLOAT) as total, 
             o.status
      FROM orcamentos o
      WHERE o.id = $1;
    `, [novoOrcamentoId]);

    const finalItens = await dbClient.query(`
      SELECT id, orcamento_id, produto_id, nome_historico, quantidade, 
             CAST(preco_unitario AS FLOAT) as preco_unitario, 
             CAST(subtotal AS FLOAT) as subtotal
      FROM itens_orcamento
      WHERE orcamento_id = $1;
    `, [novoOrcamentoId]);

    res.status(201).json({
      ...finalOrc.rows[0],
      itens: finalItens.rows
    });

  } catch (err) {
    const dbClient = await client;
    await dbClient.query('ROLLBACK');
    console.error('Erro na transação de orçamento:', err.message);
    res.status(500).json({ erro: 'Erro interno ao salvar orçamento no banco.' });
  } finally {
    (await client).release();
  }
});

// ====================================================================
// SITUAÇÃO 1: SIMULAÇÃO DO CHAMADO #2087 (FERNANDA - ALFA SERVIÇOS)
// ====================================================================

app.post('/api/faturas/gerar', async (req, res) => {
  const { orcamento_id } = req.body;

  // Chamado #2087: Fernanda relata que ao gerar fatura para o Orçamento #3 (Alfa Serviços) o sistema falha.
  // Simulamos um erro catastrófico 500 se o cliente tentar faturar o orçamento da Alfa Serviços (ID 3 no db de produção)
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

  try {
    // Busca o orçamento
    const orcResult = await pool.query('SELECT id, total, status FROM orcamentos WHERE id = $1;', [parseInt(orcamento_id)]);
    if (orcResult.rows.length === 0) {
      return res.status(404).json({ erro: 'Orçamento não encontrado.' });
    }

    const orc = orcResult.rows[0];

    // Insere a Fatura no banco de dados real
    const chaveAcesso = '35' + Math.floor(Math.random() * 1000000000000000).toString().padStart(42, '0');
    
    const fatResult = await pool.query(
      `INSERT INTO faturas (orcamento_id, valor_faturado, status, chave_acesso)
       VALUES ($1, $2, 'Pendente', $3) RETURNING id, orcamento_id, CAST(valor_faturado AS FLOAT) as valor_faturado, data_emissao, status, chave_acesso;`,
      [orc.id, orc.total, chaveAcesso]
    );

    // Atualiza o status do orçamento
    await pool.query("UPDATE orcamentos SET status = 'Faturado' WHERE id = $1;", [orc.id]);

    console.log(`[API] Fatura #${fatResult.rows[0].id} emitida com sucesso para o Orçamento #${orc.id}.`);
    res.status(201).json(fatResult.rows[0]);

  } catch (err) {
    console.error('Erro ao faturar orçamento:', err.message);
    res.status(500).json({ erro: 'Erro no banco de dados ao faturar.' });
  }
});

// Middleware genérico para tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ erro: 'Erro interno no servidor de cobranças.' });
});

// Inicialização do servidor local após conexão bem sucedida
conectarBancoComRetry().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 API REST do Kaello ERP conectada e rodando na porta ${PORT}`);
    console.log(`====================================================================`);
  });
});
