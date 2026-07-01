/**
 * Relatório "Quadro Operacional" — 1ª tela do PBI "PV - RS - EXC - TN - DB".
 *
 * Foto do dia (a query usa @DATA_ATUAL = hoje, sem parâmetros). Cada linha é
 * uma composição de item de contrato por turno, com a contagem de vagas. A tela
 * monta a matriz por Cliente × (Contrato / Operacional / PV) × (Diurno/Noturno):
 *   Contrato    = QTDEEFETIVO    (vagas efetivas do contrato, ORIGEMVAGA=1)
 *   Operacional = QTDEIMPLANTADOS (vagas com alocação ativa = posto ocupado)
 *   PV          = Contrato − Operacional  (posto vago)
 *
 * Turno vem pronto do SQL ('Diurno' | 'Noturno').
 *
 * Exclusão de negócio: clientes que são a própria empresa (Loyal/Pressseg/
 * Partner/Works) saem do relatório. Empresas ficam todas (inclui Partner DF/
 * Brasília).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { query } from '../../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_PATH = join(__dirname, 'quadro-operacional.sql');

const semAcento = (t) => String(t ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();

/** Clientes "internos" (a própria empresa como cliente) excluídos do relatório. */
const RE_CLIENTE_EXCLUIDO = /LOYAL|PRESS|PARTNER|WORKS/;
const clienteExcluido = (cliente) => RE_CLIENTE_EXCLUIDO.test(semAcento(cliente));

/** Normaliza a linha do SQL para o subconjunto usado na tela. */
function normalizar(row) {
  return {
    empresa: row.EMPRESA || null,
    cliente: row.NOMEFANTASIA || row.NOMECLIENTE || null,
    local: row.LOCALSERVICO || null,
    turno: row.Turno || null, // 'Diurno' | 'Noturno'
    contrato: Number(row.QTDEEFETIVO) || 0, // vagas efetivas
    operacional: Number(row.QTDEIMPLANTADOS) || 0, // vagas ocupadas
  };
}

/**
 * Executa a query do Quadro Operacional (foto de hoje) e devolve os registros
 * normalizados, já sem os clientes internos.
 */
export async function buscarQuadroOperacional() {
  const sql = readFileSync(SQL_PATH, 'utf-8');
  const rows = await query(sql);
  return rows.map(normalizar).filter((l) => !clienteExcluido(l.cliente));
}