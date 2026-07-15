import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Terminal, 
  Search, 
  FileText, 
  ShoppingCart, 
  RefreshCw
} from 'lucide-react';

// Interfaces de Tipo
interface Cliente {
  id: number;
  nome: string;
  email: string;
  cnpj: string;
  telefone: string;
}

interface Produto {
  id: number;
  nome: string;
  preco_base: number;
}

interface ItemOrcamento {
  id: number;
  produto_id: number | null;
  produto: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

interface Toast {
  id: number;
  mensagem: string;
  tipo: 'success' | 'error';
}

export default function App() {
  // --- Estados do Sistema ---
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  
  // Inputs do Form
  const [clienteSelected, setClienteSelected] = useState<string>('');
  const [produtoSearch, setProdutoSearch] = useState<string>('');
  const [qtd, setQtd] = useState<number>(1);
  const [preco, setPreco] = useState<string>('0.00');
  
  // Listas e Ajustes
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [desconto, setDesconto] = useState<number>(0);
  const [frete, setFrete] = useState<number>(0);
  
  // UI States
  const [showAutocomplete, setShowAutocomplete] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Referências
  const produtoInputRef = useRef<HTMLInputElement>(null);
  
  // --- Estados de Debug / Simulação do Chamado #2087 (Fernanda) ---
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [safeMode, setSafeMode] = useState<boolean>(true);
  const [serverCrashTriggered, setServerCrashTriggered] = useState<boolean>(false);
  const [reactCrashTriggered, setReactCrashTriggered] = useState<boolean>(false);

  // Carrega Clientes e Produtos no início
  useEffect(() => {
    addLog("Inicializando painel comercial Kaello ERP...", "info");
    
    // Busca clientes da API
    fetch('http://localhost:3000/api/clientes')
      .then(res => {
        if (!res.ok) throw new Error("Falha ao comunicar com a API de Clientes.");
        return res.json();
      })
      .then(data => {
        setClientes(data);
        addLog("Massa de dados de clientes carregada.", "info");
      })
      .catch(err => {
        addLog(`Erro ao carregar clientes: ${err.message}. Certifique-se de iniciar o backend "server-api.js" na porta 3000!`, "err");
      });

    // Busca produtos da API (para o Combobox)
    fetch('http://localhost:3000/api/produtos')
      .then(res => {
        if (!res.ok) throw new Error("Falha ao comunicar com a API de Produtos.");
        return res.json();
      })
      .then(data => {
        setProdutos(data);
        addLog("Cadastro geral de produtos integrado (Combobox Autocomplete pronto).", "info");
      })
      .catch(err => {
        addLog(`Erro ao carregar produtos: ${err.message}`, "err");
      });
  }, []);

  // --- Função auxiliar de Logs no Console simulado ---
  function addLog(msg: string, type: 'info' | 'err' | 'success' = 'info') {
    const time = new Date().toLocaleTimeString('pt-BR');
    const symbol = type === 'err' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    setConsoleLogs(prev => [`[${time}] ${symbol} ${msg}`, ...prev]);
  }

  // --- Sistema de Toasts ---
  function addToast(mensagem: string, tipo: 'success' | 'error' = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, mensagem, tipo }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }

  // --- Regras de Autocomplete ---
  const produtosFiltrados = produtos.filter(p => 
    p.nome.toLowerCase().includes(produtoSearch.toLowerCase())
  );

  function selecionarProduto(p: Produto) {
    setProdutoSearch(p.nome);
    setPreco(p.preco_base.toFixed(2));
    setShowAutocomplete(false);
    addLog(`Produto selecionado via Combobox: "${p.nome}" (Preço unitário padrão: R$ ${p.preco_base})`);
    
    // Foca automaticamente no campo de quantidade para acelerar a digitação
    const qtdInput = document.getElementById('qtd') as HTMLInputElement;
    if (qtdInput) qtdInput.focus();
  }

  // --- Operações do Orçamento ---
  
  // Adicionar Item (Implementa melhorias de usabilidade e validações)
  function adicionarItem() {
    const nomeProd = produtoSearch.trim();
    const qtdProd = qtd;
    const precoProd = parseFloat(preco) || 0;

    // Validações contra dados inválidos/negativos (Melhoria da Situação 2 e 3)
    if (!nomeProd) {
      addToast("O nome do produto/serviço é obrigatório.", "error");
      if (produtoInputRef.current) produtoInputRef.current.focus();
      return;
    }

    if (qtdProd <= 0) {
      addToast("A quantidade inserida deve ser maior que 0.", "error");
      return;
    }

    if (precoProd < 0) {
      addToast("O preço unitário não pode ser negativo.", "error");
      return;
    }

    // Busca ID no cadastro se existir
    const cadastroProd = produtos.find(p => p.nome.toLowerCase() === nomeProd.toLowerCase());
    const subtotalItem = parseFloat((qtdProd * precoProd).toFixed(2));

    const novoItem: ItemOrcamento = {
      id: Date.now(),
      produto_id: cadastroProd ? cadastroProd.id : null,
      produto: nomeProd,
      quantidade: qtdProd,
      preco_unitario: precoProd,
      subtotal: subtotalItem
    };

    setItens(prev => [...prev, novoItem]);
    addLog(`Item adicionado: ${qtdProd}x "${nomeProd}" a R$ ${precoProd.toFixed(2)}/un (Subtotal: R$ ${subtotalItem.toFixed(2)})`);
    addToast(`Item "${nomeProd}" adicionado.`);

    // Reseta inputs de adição
    setProdutoSearch('');
    setQtd(1);
    setPreco('0.00');

    // Retorna foco para o produto para inserção rápida (Melhoria da Situação 3)
    if (produtoInputRef.current) produtoInputRef.current.focus();
  }

  // Remover Item (Usa índice dinâmico / Corrige Bug #1044)
  function removerItem(id: number) {
    const item = itens.find(i => i.id === id);
    if (!item) return;
    setItens(prev => prev.filter(i => i.id !== id));
    addLog(`Item removido: "${item.produto}"`);
    addToast(`Item "${item.produto}" removido.`);
  }

  // --- Cálculos de Totais Consolidados ---
  const subtotalGeral = parseFloat(itens.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));

  // CORREÇÃO BUG #1043: Divisor de desconto por 100
  const valorDesconto = parseFloat((subtotalGeral * (desconto / 100)).toFixed(2));
  const totalComDesconto = subtotalGeral - valorDesconto;

  // CORREÇÃO BUG #1042: Soma do frete de forma aritmética segura (convertida de tipo no estado)
  const totalGeral = parseFloat((totalComDesconto + frete).toFixed(2));

  // --- Simulação de Faturamento (Situação 1 — O chamado da Fernanda) ---
  async function faturarOrcamento() {
    if (!clienteSelected) {
      addToast("Selecione um cliente para prosseguir com o faturamento.", "error");
      return;
    }

    setLoading(true);
    const cli = clientes.find(c => c.id === parseInt(clienteSelected));
    addLog(`Iniciando faturamento para o cliente: "${cli?.nome}" (ID Orçamento: 3)...`, "info");

    try {
      // Dispara requisição HTTP POST para gerar a fatura no backend
      const response = await fetch('http://localhost:3000/api/faturas/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orcamento_id: clienteSelected === '1' ? 3 : 1 }) // ID 3 força erro 500 no backend
      });

      if (!response.ok) {
        // Se ocorreu um erro no servidor
        addLog(`Servidor retornou código HTTP ${response.status}`, "err");
        
        if (safeMode) {
          // MODO SEGURO: Captura a falha graciosamente e avisa o faturista via UI amigável
          throw new Error(`Falha no faturamento (Erro HTTP ${response.status}). O servidor de cobranças está temporariamente instável. Tente novamente em alguns minutos.`);
        } else {
          // MODO SEM TRATAMENTO (Induz a tela branca do chamado da Fernanda!)
          addLog("Simulando quebra do frontend: tentando acessar propriedade inexistente de retorno nulo...", "err");
          setServerCrashTriggered(true);
          return;
        }
      }

      const data = await response.json();
      addLog(`Faturamento concluído! Fatura #${data.id} emitida com sucesso. Chave de acesso: ${data.chave_acesso}`, "success");
      addToast(`Fatura #${data.id} gerada com sucesso!`);
      setItens([]);
    } catch (err: any) {
      addLog(`Tratamento de Exceção: ${err.message}`, "err");
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  // --- Força Travamento de React (Para demonstrar a Hipótese 1 da tela branca) ---
  if (reactCrashTriggered) {
    // Tenta renderizar uma propriedade de undefined que vai quebrar a execução geral do React
    const nulo: any = null;
    return (
      <div className="blank-screen-overlay">
        <h2>React Render Crash Triggered</h2>
        <p>{nulo.propriedade_que_nao_existe.erro}</p>
      </div>
    );
  }

  return (
    <>
      {/* Simulação Visual de Tela Branca (Causada pelo Erro 500 sem tratamento do chamado da Fernanda) */}
      {serverCrashTriggered && (
        <div className="blank-screen-overlay" id="blank-screen">
          <button 
            className="blank-screen-btn"
            onClick={() => {
              setServerCrashTriggered(false);
              addLog("Recuperando tela do ERP após travamento de script (Simulação desativada).", "info");
            }}
          >
            ← Voltar para o Sistema (Painel de Estudos)
          </button>
          {/* NADA MAIS É RENDERIZADO, SIMULANDO A TELA BRANCA DA CLIENTE */}
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <span className="logo-text">kaello<span>.</span></span>
          <span className="logo-badge">ERP PRO</span>
        </div>
        <div className="header-status">
          <div className="status-indicator">
            <div className="status-dot"></div>
            <span>Servidor Conectado (Porta 3000)</span>
          </div>
        </div>
      </header>

      {/* Grid Principal */}
      <main className="app-container">
        {/* Painel do Orçamento */}
        <section className="card">
          <h2 className="card-title">
            <ShoppingCart size={20} className="text-emerald" />
            Novo Orçamento Comercial
          </h2>

          {/* Seleção do Cliente */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="cliente-select">Cliente Solicitante</label>
            <select 
              id="cliente-select"
              className="form-input"
              value={clienteSelected}
              onChange={(e) => {
                setClienteSelected(e.target.value);
                const c = clientes.find(cli => cli.id === parseInt(e.target.value));
                if (c) addLog(`Cliente alterado para: ${c.nome} (CNPJ: ${c.cnpj})`);
              }}
            >
              <option value="">Selecione um cliente cadastrado...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome} ({c.cnpj})</option>
              ))}
            </select>
          </div>

          {/* Adicionar Produto / Serviço */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="search-product">Produto / Serviço</label>
              <div style={{ position: 'relative' }}>
                <input 
                  id="search-product"
                  ref={produtoInputRef}
                  type="text"
                  className="form-input"
                  placeholder="Busque ou digite o produto..."
                  value={produtoSearch}
                  onChange={(e) => {
                    setProdutoSearch(e.target.value);
                    setShowAutocomplete(true);
                  }}
                  onFocus={() => setShowAutocomplete(true)}
                  onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                />
                <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-light)' }} />
                
                {/* Autocomplete Combobox (Melhoria de Usabilidade - Situação 3) */}
                {showAutocomplete && produtoSearch.trim() !== '' && (
                  <div className="autocomplete-list">
                    {produtosFiltrados.length > 0 ? (
                      produtosFiltrados.map(p => (
                        <div 
                          key={p.id} 
                          className="autocomplete-item"
                          onMouseDown={() => selecionarProduto(p)}
                        >
                          <span>{p.nome}</span>
                          <span className="item-price">R$ {p.preco_base.toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="autocomplete-item" style={{ color: 'var(--slate-light)', cursor: 'default' }}>
                        Nenhum produto cadastrado encontrado
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="qtd">Quantidade</label>
              <input 
                id="qtd"
                type="number"
                min="1"
                className="form-input"
                value={qtd}
                onChange={(e) => setQtd(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="price-unit">Preço Unitário (R$)</label>
              <input 
                id="price-unit"
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
              />
            </div>
          </div>

          <button 
            className="btn-primary"
            onClick={adicionarItem}
          >
            <Plus size={18} />
            Adicionar Item ao Orçamento
          </button>

          {/* Tabela de Itens Adicionados */}
          <div className="table-wrapper">
            {itens.length === 0 ? (
              /* Empty State (Melhoria de Usabilidade - Situação 3) */
              <div className="empty-state">
                <ShoppingCart size={40} className="empty-icon" />
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)' }}>Nenhum item adicionado</div>
                <p className="empty-text">Adicione produtos ou serviços acima para iniciar o cálculo do orçamento.</p>
              </div>
            ) : (
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Produto / Serviço</th>
                    <th className="num" style={{ width: '80px' }}>Qtd</th>
                    <th className="num" style={{ width: '120px' }}>Preço Un.</th>
                    <th className="num" style={{ width: '120px' }}>Subtotal</th>
                    <th style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map(item => (
                    <tr key={item.id}>
                      <td>{item.produto}</td>
                      <td className="num">{item.quantidade}</td>
                      <td className="num">R$ {item.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="num">R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>
                        <button 
                          className="btn-remove"
                          onClick={() => removerItem(item.id)}
                          title="Remover este item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Ajustes Financeiros (Desabilitados em Estado Vazio) */}
          <div className="summary-adjusts">
            <div className="form-group">
              <label className="form-label" htmlFor="adjust-discount">Desconto (%)</label>
              <input 
                id="adjust-discount"
                type="number"
                min="0"
                max="100"
                className="form-input"
                value={desconto}
                disabled={itens.length === 0}
                onChange={(e) => setDesconto(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="adjust-freight">Frete (R$)</label>
              <input 
                id="adjust-freight"
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                value={frete === 0 ? '' : frete}
                placeholder="0.00"
                disabled={itens.length === 0}
                onChange={(e) => setFrete(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>
          </div>
        </section>

        {/* Painel Lateral de Resumo e Totais */}
        <section className="summary-card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            Resumo Financeiro
          </h2>

          <div className="summary-row">
            <span>Subtotal Geral</span>
            <span className="val">R$ {subtotalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="summary-row" style={{ color: 'rgba(239, 68, 68, 0.9)' }}>
            <span>Desconto ({desconto}%)</span>
            <span className="val">- R$ {valorDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="summary-row">
            <span>Frete</span>
            <span className="val">R$ {frete.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="summary-row total">
            <span>Total</span>
            <span className="val">R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <button 
            className="btn-action"
            disabled={itens.length === 0 || loading}
            onClick={() => {
              addLog("Aprovando orçamento comercial...", "info");
              addToast("Orçamento aprovado localmente!");
            }}
          >
            Aprovar Orçamento
          </button>

          {/* Botão de Faturamento (Situação 1) */}
          <button 
            className="btn-action btn-faturar"
            disabled={loading || !clienteSelected}
            onClick={faturarOrcamento}
          >
            {loading ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <FileText size={16} />
            )}
            Faturar Orçamento
          </button>
          
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: '0.5rem' }}>
            Atenção: Faturar o cliente "Alfa Serviços" simula o erro da Fernanda.
          </div>
        </section>

        {/* PAINEL DE ESTUDOS E DEPURAÇÃO (Fernanda Debugger - Situação 1) */}
        <section className="debug-panel">
          <div className="debug-header">
            <div className="debug-title">
              <Terminal size={18} />
              Console do Desenvolvedor & Depurador (Estudos)
            </div>
            <span className="debug-badge">Chamado #2087 & #1042-1044</span>
          </div>
          
          <p className="debug-desc">
            Use os controles abaixo para simular as falhas relatadas pelas clientes em tempo real e estudar o fluxo técnico de mitigação de incidentes.
          </p>

          <div className="debug-grid">
            {/* Console de Saída */}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--slate)', marginBottom: '0.4rem' }}>Logs do Console:</div>
              <div className="debug-console">
                {consoleLogs.map((log, index) => {
                  let className = "console-line";
                  if (log.includes("❌")) className += " err";
                  if (log.includes("✅")) className += " success";
                  if (log.includes("ℹ️")) className += " info";
                  return <div key={index} className={className}>{log}</div>;
                })}
              </div>
            </div>

            {/* Controles de Falhas */}
            <div className="debug-controls">
              <div className="debug-card">
                <label className="debug-toggle">
                  <input 
                    type="checkbox" 
                    checked={safeMode} 
                    onChange={(e) => {
                      setSafeMode(e.target.checked);
                      addLog(`Modo de Tratamento de Erros: ${e.target.checked ? 'ATIVADO (Segurança)' : 'DESATIVADO (Perigo)'}`);
                    }}
                  />
                  Tratamento de Erros Seguro (Modo Recomendado)
                </label>
                <p style={{ fontSize: '0.75rem', color: 'var(--slate)', marginTop: '0.5rem' }}>
                  Quando desativado, o faturamento da <strong>Alfa Serviços (ID Orçamento 3)</strong> simulará o comportamento de erro bruto sem try/catch, travando a tela (Tela Branca).
                </p>
              </div>

              <div className="debug-card" style={{ borderLeft: '4px solid var(--danger)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.4rem', color: 'var(--danger-hover)' }}>
                  Situação 1: Tela Branca por Render Crash
                </span>
                <button 
                  className="btn-primary" 
                  style={{ backgroundColor: 'var(--danger)', fontSize: '0.8rem', padding: '0.5rem' }}
                  onClick={() => {
                    addLog("Simulando quebra de renderização de componente do React (Hipótese 1).");
                    setReactCrashTriggered(true);
                  }}
                >
                  Forçar Crash de Render (Componente React)
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Container de Notificações Toast */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast-react ${t.tipo === 'error' ? 'error' : ''}`}>
            {t.tipo === 'success' ? (
              <CheckCircle size={18} className="text-emerald" style={{ marginTop: '2px' }} />
            ) : (
              <AlertTriangle size={18} className="text-danger" style={{ marginTop: '2px' }} />
            )}
            <div className="toast-react-content">
              <div className="toast-react-title">{t.tipo === 'success' ? 'Sucesso' : 'Erro'}</div>
              <div className="toast-react-desc">{t.mensagem}</div>
            </div>
            <button className="toast-react-close" onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}>×</button>
          </div>
        ))}
      </div>
    </>
  );
}
