/**
 * Relatório "Geração de Cartão de Ponto" (Folha de Ponto).
 *
 * Acompanha a GERAÇÃO e o RETORNO dos cartões de ponto por competência
 * (ANOMES). Cada linha é um documento de cartão de ponto de um funcionário
 * numa competência, com:
 *   - SITUACAO: estado detalhado (PENDENTE / CONCLUÍDO / CANCELADO / LIDO);
 *   - STATUS:   estado consolidado (CONCLUÍDO = entregue; o resto = pendência).
 *
 * As "medidas" do BI saem daqui:
 *   Total      = nº de cartões
 *   Entregue   = STATUS === 'CONCLUÍDO'
 *   Pendências = STATUS === 'PENDENTE'
 *   % Entregue = Entregue / Total
 *
 * Cada linha recebe a flag "É Demitido?" comparando RE + Empresa com a base
 * compartilhada de demitidos (ver shared/demitidos.js).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { query } from '../../db.js';
import { carregarDemitidos, marcarDemitidos } from '../../shared/demitidos.js';
import { marcarGerentes } from '../../shared/gerentes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_PATH = join(__dirname, 'geracao-cartao-ponto.sql');

/** Normaliza uma linha do SQL para camelCase. */
function normalizar(row) {
  return {
    empresa: row.EMPRESA || null,
    re: row.RE_FUNCIONARIO ?? null,
    nome: row.NOME_FUNCIONARIO || null,
    cliente: row.CLIENTE || null,
    local: row.LOCAL || null,
    turno: row.TURNO || null,
    areaSupervisao: row.AREASUPERVISAO || null,
    anoMes: row.ANOMES ?? null,
    competencia: row.MES_ANO_FORMATADO || null, // 'MM/AAAA'
    situacao: row.SITUACAO || null, // PENDENTE | CONCLUÍDO | CANCELADO | LIDO
    status: row.STATUS || null, // PENDENTE | CONCLUÍDO (consolidado)
    dtGeracao: row.DTGERACAO || null,
    dtRetorno: row.DTRETORNO || null,
    usuarioGeracao: row.USUARIO_GERACAO || null,
    usuarioRetorno: row.USUARIO_RETORNO || null,
  };
}

/** Intervalo de competência (ANOMES 'YYYYMM') do ANO ATUAL. */
function intervaloAnoAtual() {
  const ano = new Date().getFullYear();
  return { ini: `${ano}01`, fim: `${ano}12` };
}

/**
 * Executa a query (+ demitidos) e devolve os registros normalizados, cada
 * linha já marcada com `ehDemitido`.
 *
 * Por regra de negócio, só o ANO ATUAL é exposto — anos anteriores ficam
 * ocultos (a query filtra por ANOMES no intervalo do ano corrente).
 */
export async function buscarGeracaoCartaoPonto() {
  const { ini, fim } = intervaloAnoAtual();
  const sql = readFileSync(SQL_PATH, 'utf-8');
  const [rows, demitidos] = await Promise.all([
    query(sql, { ANOMESINI: ini, ANOMESFIM: fim }),
    carregarDemitidos(),
  ]);
  // Enriquece cada linha com `ehDemitido` (RE+Empresa) e `gerente`
  // (Empresa+Cliente+Local+Área, via de-para da planilha do BI).
  return marcarGerentes(marcarDemitidos(rows.map(normalizar), demitidos));
}
