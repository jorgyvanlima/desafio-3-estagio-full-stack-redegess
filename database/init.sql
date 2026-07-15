-- ====================================================================
-- BANCO DE DADOS KAELLO ERP — SISTEMA DE ORÇAMENTOS E FATURAMENTO
-- Modelagem Relacional e Automatização via Triggers
-- Compatibilidade: PostgreSQL 12+
-- ====================================================================

-- 1. Remoção de Tabelas Existentes para Inicialização Limpa
DROP TABLE IF EXISTS faturas CASCADE;
DROP TABLE IF EXISTS itens_orcamento CASCADE;
DROP TABLE IF EXISTS orcamentos CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;

-- 2. Criação das Tabelas

-- Tabela de Clientes
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Produtos / Serviços (Cadastro Geral)
CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    preco_base DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (preco_base >= 0),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Orçamentos (Cabeçalho)
CREATE TABLE orcamentos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE RESTRICT,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    desconto_pct DECIMAL(5, 2) NOT NULL DEFAULT 0.00 CHECK (desconto_pct >= 0 AND desconto_pct <= 100),
    valor_desconto DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (valor_desconto >= 0),
    frete DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (frete >= 0),
    total DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'Rascunho' CHECK (status IN ('Rascunho', 'Aprovado', 'Faturado', 'Cancelado')),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Itens do Orçamento
CREATE TABLE itens_orcamento (
    id SERIAL PRIMARY KEY,
    orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE SET NULL,
    nome_historico VARCHAR(150) NOT NULL, -- Preserva o nome do produto no momento da venda
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario DECIMAL(10, 2) NOT NULL CHECK (preco_unitario >= 0),
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0)
);

-- Tabela de Faturas (Geradas a partir de Orçamentos Aprovados)
CREATE TABLE faturas (
    id SERIAL PRIMARY KEY,
    orcamento_id INTEGER UNIQUE NOT NULL REFERENCES orcamentos(id) ON DELETE RESTRICT,
    valor_faturado DECIMAL(10, 2) NOT NULL CHECK (valor_faturado >= 0),
    data_emissao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Paga', 'Cancelada')),
    chave_acesso VARCHAR(44) UNIQUE, -- Simulação de NFe/NFSe
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Triggers para Automação de Cálculos

-- A. Trigger para calcular o subtotal de um item individual (Qtd * Preço Unitário)
CREATE OR REPLACE FUNCTION fn_calcular_subtotal_item()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subtotal := NEW.quantidade * NEW.preco_unitario;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_calcular_subtotal_item
BEFORE INSERT OR UPDATE ON itens_orcamento
FOR EACH ROW
EXECUTE FUNCTION fn_calcular_subtotal_item();


-- B. Trigger para recalcular totais do orçamento ao modificar itens
CREATE OR REPLACE FUNCTION fn_recalcular_totais_orcamento()
RETURNS TRIGGER AS $$
DECLARE
    v_orcamento_id INT;
    v_subtotal_geral DECIMAL(10,2);
    v_desconto_pct DECIMAL(5,2);
    v_valor_desconto DECIMAL(10,2);
    v_frete DECIMAL(10,2);
    v_total DECIMAL(10,2);
BEGIN
    -- Identifica o ID do orçamento afetado
    IF TG_OP = 'DELETE' THEN
        v_orcamento_id := OLD.orcamento_id;
    ELSE
        v_orcamento_id := NEW.orcamento_id;
    END IF;

    -- Soma os subtotais dos itens restantes
    SELECT COALESCE(SUM(subtotal), 0.00) INTO v_subtotal_geral
    FROM itens_orcamento
    WHERE orcamento_id = v_orcamento_id;

    -- Obtém o desconto e frete atuais do cabeçalho do orçamento
    SELECT desconto_pct, frete INTO v_desconto_pct, v_frete
    FROM orcamentos
    WHERE id = v_orcamento_id;

    -- Calcula descontos e total (Corrige a lógica matemática de divisão por 100)
    v_valor_desconto := ROUND(v_subtotal_geral * (v_desconto_pct / 100.0), 2);
    v_total := ROUND((v_subtotal_geral - v_valor_desconto) + v_frete, 2);

    -- Atualiza o orçamento com os novos valores consolidados
    UPDATE orcamentos
    SET subtotal = v_subtotal_geral,
        valor_desconto = v_valor_desconto,
        total = v_total,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = v_orcamento_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_recalcular_totais_orcamento
AFTER INSERT OR UPDATE OR DELETE ON itens_orcamento
FOR EACH ROW
EXECUTE FUNCTION fn_recalcular_totais_orcamento();


-- C. Trigger para atualizar totais quando desconto ou frete forem alterados no cabeçalho do orçamento
CREATE OR REPLACE FUNCTION fn_atualizar_valores_cabecalho()
RETURNS TRIGGER AS $$
BEGIN
    -- Apenas dispara o recálculo se desconto ou frete mudaram e se não foi disparado pelo trigger de itens
    IF (OLD.desconto_pct IS DISTINCT FROM NEW.desconto_pct) OR (OLD.frete IS DISTINCT FROM NEW.frete) THEN
        NEW.valor_desconto := ROUND(NEW.subtotal * (NEW.desconto_pct / 100.0), 2);
        NEW.total := ROUND((NEW.subtotal - NEW.valor_desconto) + NEW.frete, 2);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_atualizar_valores_cabecalho
BEFORE UPDATE ON orcamentos
FOR EACH ROW
EXECUTE FUNCTION fn_atualizar_valores_cabecalho();


-- 4. Inserção de Massa de Dados (Teste)

-- Inserindo Clientes do Contexto dos Chamados
INSERT INTO clientes (nome, email, cnpj, telefone) VALUES
('Alfa Serviços de Tecnologia Ltda', 'financeiro@alfaservicos.com.br', '12.345.678/0001-90', '(11) 98765-4321'), -- Fernanda (Chamado #2087)
('Contabilize Assessoria Contábil', 'marina@contabilize.com.br', '23.456.789/0001-01', '(11) 97777-8888'),       -- Marina (Chamado #1042)
('Silva & Cia Artigos de Metal', 'roberto@silvaecia.com.br', '34.567.890/0001-12', '(21) 96666-5555'),        -- Roberto (Chamado #1043)
('NovaTech Soluções Digitais', 'paula@novatech.com', '45.678.901/0001-23', '(31) 95555-4444');               -- Paula (Chamado #1044)

-- Inserindo Cadastro Geral de Produtos / Serviços para Autocomplete
INSERT INTO produtos (nome, preco_base) VALUES
('Licença Mensal Kaello ERP', 150.00),
('Módulo Fiscal Integrado (anual)', 890.00),
('Implantação & Treinamento Kaello', 1200.00),
('Consultoria de Processos (hora)', 180.00),
('Suporte Técnico Premium (mensal)', 300.00),
('Desenvolvimento Customizado (hora)', 250.00);

-- Criando Orçamento da Contabilize (Marina)
INSERT INTO orcamentos (cliente_id, desconto_pct, frete, status) VALUES
(2, 0.00, 20.00, 'Rascunho'); -- ID 1

-- Adicionando Itens ao Orçamento da Marina
-- Itens: 1x Licença (R$ 150.00) + 1x Suporte (R$ 300.00) = Subtotal R$ 450.00
-- Com o frete de R$ 20.00, o total deve ser recalculado pelo trigger para R$ 470.00 (Evita Bug #1042!)
INSERT INTO itens_orcamento (orcamento_id, produto_id, nome_historico, quantidade, preco_unitario) VALUES
(1, 1, 'Licença Mensal Kaello ERP', 1, 150.00),
(1, 5, 'Suporte Técnico Premium (mensal)', 1, 300.00);

-- Criando Orçamento da Silva & Cia (Roberto)
INSERT INTO orcamentos (cliente_id, desconto_pct, frete, status) VALUES
(3, 10.00, 0.00, 'Rascunho'); -- ID 2

-- Adicionando Itens ao Orçamento do Roberto
-- Itens: 1x Implantação (R$ 1200.00). Subtotal R$ 1200.00.
-- Com Desconto de 10%, o desconto é de R$ 120.00 e o total R$ 1080.00 (Evita Bug #1043!)
INSERT INTO itens_orcamento (orcamento_id, produto_id, nome_historico, quantidade, preco_unitario) VALUES
(2, 3, 'Implantação & Treinamento Kaello', 1, 1200.00);

-- Criando Orçamento da Alfa Serviços (Fernanda) - Já Faturado
INSERT INTO orcamentos (cliente_id, desconto_pct, frete, status) VALUES
(1, 5.00, 0.00, 'Faturado'); -- ID 3

INSERT INTO itens_orcamento (orcamento_id, produto_id, nome_historico, quantidade, preco_unitario) VALUES
(3, 1, 'Licença Mensal Kaello ERP', 10, 150.00), -- Subtotal 1500
(3, 4, 'Consultoria de Processos (hora)', 5, 180.00); -- Subtotal 900
-- Subtotal Geral: 2400.00 | Desconto 5%: 120.00 | Total: 2280.00

-- Criando Fatura da Alfa Serviços (Simulação da Fatura que gerou tela branca no chamado #2087)
INSERT INTO faturas (orcamento_id, valor_faturado, status, chave_acesso) VALUES
(3, 2280.00, 'Pendente', '35260712345678000190550010000020871987654321');

-- 5. Queries de Verificação (Comprovação de integridade dos cálculos)
-- Selecione a query abaixo para validar os cálculos:
-- SELECT o.id, c.nome as cliente, o.subtotal, o.desconto_pct, o.valor_desconto, o.frete, o.total, o.status 
-- FROM orcamentos o 
-- JOIN clientes c ON o.cliente_id = c.id;
