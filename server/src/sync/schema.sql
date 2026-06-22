-- ============================================================================
-- Esquema do banco na nuvem (Supabase / PostgreSQL)
--
-- Fluxo: o MOTOR (dentro da empresa) lê o SQL Server + geocache, resolve as
-- coordenadas e GRAVA aqui. O BACKEND (no VPS) apenas LÊ desta base e serve
-- o relatório. O SQL Server interno nunca é exposto.
--
-- Carga: a cada execução o motor faz TRUNCATE + INSERT dentro de uma transação
-- (snapshot completo). Por isso a PK é um id sequencial próprio da nuvem, e não
-- depende do id volátil que vem do relatório.
-- ============================================================================

-- Locais de serviço do relatório de Rotas de Supervisão (snapshot atual).
CREATE TABLE IF NOT EXISTS rotas_supervisao (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Hierarquia / identificação
  empresa                TEXT,
  base_operacional       TEXT,
  cod_cliente            INTEGER,
  cliente                TEXT,
  cliente_resumido       TEXT,
  cod_local              INTEGER,
  local                  TEXT,
  local_resumido         TEXT,

  -- Endereço
  uf                     TEXT,
  localidade             TEXT,
  bairro                 TEXT,
  logradouro             TEXT,
  numero                 TEXT,
  complemento            TEXT,
  ponto_referencia       TEXT,
  zona                   TEXT,
  cep                    TEXT,
  endereco_completo      TEXT,

  -- Contato
  telefone               TEXT,
  email                  TEXT,
  contato_operacional    TEXT,

  -- Supervisão
  area_supervisao        TEXT,   -- rótulo bruto da rota (coluna original)
  supervisor             TEXT,   -- idem (mantido p/ referência)
  supervisor_nome        TEXT,   -- nome resolvido pelo de-para ("Sem supervisor" qd não há)

  -- Geolocalização (coordinates [lat,lng] dividido em duas colunas)
  lat                    DOUBLE PRECISION,
  lng                    DOUBLE PRECISION,
  coordenada_precisa     BOOLEAN NOT NULL DEFAULT FALSE,
  coordenada_aproximada  BOOLEAN,

  sincronizado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices p/ os filtros/agrupamentos mais usados no relatório.
CREATE INDEX IF NOT EXISTS idx_rotas_uf              ON rotas_supervisao (uf);
CREATE INDEX IF NOT EXISTS idx_rotas_empresa         ON rotas_supervisao (empresa);
CREATE INDEX IF NOT EXISTS idx_rotas_base            ON rotas_supervisao (base_operacional);
CREATE INDEX IF NOT EXISTS idx_rotas_supervisor_nome ON rotas_supervisao (supervisor_nome);
CREATE INDEX IF NOT EXISTS idx_rotas_cod_local       ON rotas_supervisao (cod_local);

-- Log de cada sincronização (auditoria / saúde do motor).
CREATE TABLE IF NOT EXISTS sincronizacoes (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  relatorio         TEXT NOT NULL DEFAULT 'rotas-supervisao',
  iniciado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em      TIMESTAMPTZ,
  total_linhas      INTEGER,
  total_precisos    INTEGER,
  status            TEXT NOT NULL DEFAULT 'em_andamento', -- em_andamento | sucesso | erro
  erro              TEXT
);
