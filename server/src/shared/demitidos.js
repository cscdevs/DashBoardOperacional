/**
 * Filtro transversal de DEMITIDOS.
 *
 * A maioria dos relatórios precisa identificar funcionários demitidos
 * (FUNCIONARIO.DTDEMISSAO preenchida) para marcá-los com a flag "É Demitido?".
 * A query mora em `demitidos.sql` (ao lado deste arquivo).
 *
 * IMPORTANTE: a chave de junção é RE + EMPRESA — o RE (código) pode se repetir
 * entre empresas diferentes, então casar só por RE causaria falsos positivos.
 *
 * Uso típico num relatório (as linhas precisam ter `re` e `empresa`):
 *   const demitidos = await carregarDemitidos();
 *   const linhas = marcarDemitidos(rotas, demitidos);
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { query } from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_PATH = join(__dirname, 'demitidos.sql');

/** Normaliza um RE para casar entre relatórios (string, sem espaços). */
export function normalizarRE(re) {
  return re == null ? null : String(re).trim();
}

/** Normaliza o nome da empresa (NOMERESUMIDO) para casar entre fontes. */
function normalizarEmpresa(emp) {
  return emp == null ? '' : String(emp).trim().toUpperCase();
}

/** Chave composta RE + Empresa (o RE pode repetir entre empresas). */
export function chaveDemitido(re, empresa) {
  const r = normalizarRE(re);
  return r ? `${r}|${normalizarEmpresa(empresa)}` : null;
}

/**
 * Carrega o mapa { "RE|EMPRESA" -> dados da demissão } dos funcionários demitidos.
 * A query pode trazer mais de uma linha por funcionário (joins de alocação);
 * mantemos a primeira ocorrência, suficiente para a flag.
 */
export async function carregarDemitidos() {
  const sql = readFileSync(SQL_PATH, 'utf-8');
  const rows = await query(sql);
  const porChave = new Map();
  for (const row of rows) {
    const chave = chaveDemitido(row.RE, row.EMPRESA);
    if (!chave || porChave.has(chave)) continue;
    porChave.set(chave, {
      nome: row.NOMEFUNCIONARIO || null,
      empresa: row.EMPRESA || null,
      cargo: row.DESC_CARGO || null,
      vinculo: row.VINCULO || null,
      dtAdmissao: row.DTADMISSAO || null,
      dtDemissao: row.DTDEMISSAO || null,
      motivo: row.DESC_MOTIVODEMISSAO || null,
      causaRescisao: row.CAUSARESCISAO || null,
      tipoDesligamento: row.TPDESLIGA || null,
      emExperiencia: row.EXPERIENCIA || null,
    });
  }
  return porChave;
}

/**
 * Marca cada linha com `ehDemitido` (boolean) e `demissao` (dados ou null),
 * comparando por RE + Empresa. Não remove linhas — quem decide ocultar é a tela.
 *
 * @param {Array<object>} linhas         linhas do relatório
 * @param {Map<string,object>} porChave  mapa retornado por carregarDemitidos()
 * @param {(linha:object)=>any} getRE      como extrair o RE de cada linha
 * @param {(linha:object)=>any} getEmpresa como extrair a empresa de cada linha
 */
export function marcarDemitidos(linhas, porChave, getRE = (l) => l.re, getEmpresa = (l) => l.empresa) {
  return linhas.map((linha) => {
    const chave = chaveDemitido(getRE(linha), getEmpresa(linha));
    const demissao = chave ? porChave.get(chave) || null : null;
    return { ...linha, ehDemitido: !!demissao, demissao };
  });
}
