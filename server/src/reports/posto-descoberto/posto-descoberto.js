/**
 * Relatório "Posto Descoberto — Produtividade".
 *
 * Origem: PBI "Posto Descoberto - Produtividade.pbix". Cada linha é um
 * PONTOVAGA (posto-vaga) NÃO coberto numa data, classificado por `motivoPV`:
 *   Posto Vago, Falta, Férias, Folga, Remanejamento, Suspensão, Reciclagem
 *   (compõem o Subtotal de "descobertos"), além de Saída Antecipada e Correção
 *   (situações em que houve cobertura parcial; contadas à parte).
 *
 * A tela monta uma matriz Cliente → Local → Posto × motivo (contagem de
 * ocorrências posto×dia). O período vem por @DATA_INICIO / @DATA_FIM; por
 * padrão, os últimos 7 dias.
 *
 * Observação: a query traz ~44 colunas (incl. endereço do posto); aqui só
 * normalizamos o subconjunto que a tela usa, para o payload ficar leve.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { query } from '../../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_PATH = join(__dirname, 'posto-descoberto.sql');

/** Formata uma data (Date/ISO do SQL) para 'YYYY-MM-DD' sem deslocar fuso. */
function dataISO(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Normaliza uma linha do SQL para o subconjunto camelCase usado na tela. */
function normalizar(row) {
  return {
    empresa: row.DESCEMPRESA || null,
    baseOperacional: row.DESCBASEOPERACIONAL || null,
    data: dataISO(row.DATA),
    cliente: row.CLIENTE || null,
    local: row.LOCALSERVICO || null,
    posto: row.POSTO || null,
    turno: row.DESCTURNO || null, // DIURNO | NOTURNO
    cargo: row.DESCCARGO || null,
    escala: row.ESCALA || null,
    re: row.RE ?? null,
    nomeFunc: row.NOMEFUNC || null,
    areaSupervisao: row.NOMEAREASUPERVISAO || null,
    gestorOp: row.NOME_GESTOR_OP || null,
    situacaoCoberta: row.DESCSITUACAOCOBERTA || null, // DESCOBERTA | JUSTIFICADA | BLOQUEADA
    motivoPV: row.MotivoPV || 'Outros', // CASE pode não casar → Outros
    tpMensalEvento: row.TPMENSALEVENTO || null,
    vagaItemContrato: row.VAGAITEMCONTRATO ?? null,
  };
}

const semAcento = (t) => String(t || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();

/**
 * Exclusões fixas do relatório (regra de negócio):
 *  - Clientes que são a própria empresa como cliente (Loyal, Pressseg, Partner, Works).
 *  - Empresa "Partner DF" (PARTNER SECURITY DF) — mantém PARTNER SECURITY e PARTNER SECURITY BA.
 */
const RE_CLIENTE_EXCLUIDO = /LOYAL|PRESS|PARTNER|WORKS/;
const clienteExcluido = (cliente) => RE_CLIENTE_EXCLUIDO.test(semAcento(cliente));
const empresaExcluida = (empresa) => {
  const n = semAcento(empresa);
  return n.includes('PARTNER') && /\bDF\b/.test(n);
};

/** Intervalo padrão: últimos 7 dias (inclui hoje). */
function intervaloUltimos7Dias() {
  const fim = new Date();
  const ini = new Date();
  ini.setDate(ini.getDate() - 7);
  return { ini, fim };
}

/**
 * Executa a query de postos descobertos no período informado e devolve os
 * registros normalizados.
 *
 * @param {{ dataInicial?: string, dataFinal?: string }} opts datas 'YYYY-MM-DD'
 */
export async function buscarPostoDescoberto({ dataInicial, dataFinal } = {}) {
  const padrao = intervaloUltimos7Dias();
  const params = {
    DATA_INICIO: dataInicial ? new Date(dataInicial) : padrao.ini,
    DATA_FIM: dataFinal ? new Date(dataFinal) : padrao.fim,
  };
  const sql = readFileSync(SQL_PATH, 'utf-8');
  const rows = await query(sql, params);
  const registros = rows
    .map(normalizar)
    .filter((l) => !clienteExcluido(l.cliente) && !empresaExcluida(l.empresa));
  return {
    periodo: { dataInicial: dataISO(params.DATA_INICIO), dataFinal: dataISO(params.DATA_FIM) },
    registros,
  };
}