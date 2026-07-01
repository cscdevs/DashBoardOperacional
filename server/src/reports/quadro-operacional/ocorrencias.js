/**
 * Quadro Operacional — abas Excedente / Treinamento / Dobra ("Ocorrências
 * Operacionais"). Saem todas da MESMA query (nível-ponto), que já vem filtrada
 * na origem para Resultado em (EXCEDENTE, TREINAMENTO, Dobra). A tela separa
 * por `resultado` em cada aba.
 *
 * Gerente: não vem na query — é resolvido pelo de-para Empresa+Cliente+Local+Área
 * (mesmo do Cartão de Ponto, ver shared/gerentes.js). Período via @DATA_INICIO /
 * @DATA_FIM (padrão: últimos 7 dias).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { query } from '../../db.js';
import { carregarGerentes, resolverGerente } from '../../shared/gerentes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_PATH = join(__dirname, 'excedente.sql');

function dataISO(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function intervaloUltimos7Dias() {
  const fim = new Date();
  const ini = new Date();
  ini.setDate(ini.getDate() - 7);
  return { ini, fim };
}

function normalizar(row, mapaGerentes) {
  // Gerente: casa por Empresa+Cliente+Local+Área (usa os nomes "crus", não a fantasia).
  const gerente = resolverGerente(mapaGerentes, row.NOMEEMPRESA, row.NOMECLIENTE, row.NOMELOCAL, row.AREASUPERVISAO, row.DESC_CARGO);
  return {
    empresa: row.NOMEEMPRESA || null,
    cliente: row.NOMEFANTASIA || row.NOMECLIENTE || null, // fantasia (com desmembramento por serviço)
    posto: row.POSTO || null,
    local: row.NOMELOCAL || null,
    re: row.RE ?? null,
    funcionario: row.NOMEFUNCIONARIO || null,
    data: dataISO(row.DATA),
    resultado: row.Resultado || null, // EXCEDENTE | TREINAMENTO | Dobra
    cargo: row.DESC_CARGO || null,
    areaSupervisao: row.AREASUPERVISAO || null,
    gerente,
  };
}

/**
 * Executa a query de ocorrências no período e devolve os registros normalizados
 * (já com `gerente`). Os 3 tipos (EXCEDENTE/TREINAMENTO/Dobra) vêm juntos; a tela
 * filtra por `resultado`.
 */
export async function buscarOcorrencias({ dataInicial, dataFinal } = {}) {
  const padrao = intervaloUltimos7Dias();
  const params = {
    DATA_INICIO: dataInicial ? new Date(dataInicial) : padrao.ini,
    DATA_FIM: dataFinal ? new Date(dataFinal) : padrao.fim,
  };
  const sql = readFileSync(SQL_PATH, 'utf-8');
  const mapaGerentes = carregarGerentes();
  const rows = await query(sql, params);
  return {
    periodo: { dataInicial: dataISO(params.DATA_INICIO), dataFinal: dataISO(params.DATA_FIM) },
    registros: rows.map((r) => normalizar(r, mapaGerentes)),
  };
}