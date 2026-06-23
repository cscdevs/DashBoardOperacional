/**
 * Relatório "Fluxo de Atestados - Faltas por Cliente".
 *
 * Reúne, numa única página, três conjuntos de dados do SQL Server:
 *   - Atestados (HISTDISCIPLINAR): ocorrências disciplinares / atestados.
 *   - Faltas por Cliente (PONTO): faltas/suspensões por cliente e local.
 *   - Faltas Disciplinares (PONTO + COMPLPONTO): faltas/atrasos ainda não
 *     registrados como ocorrência disciplinar.
 *
 * O período (@DATAINICIAL/@DATAFINAL) é parametrizado e cada linha recebe a
 * flag "É Demitido?" comparando o RE com a base compartilhada de demitidos.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { query } from '../../db.js';
import { carregarDemitidos, marcarDemitidos } from '../../shared/demitidos.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const lerSQL = (arquivo) => readFileSync(join(__dirname, arquivo), 'utf-8');

/** Remove acentos e padroniza (maiúsculas) para casar nomes. */
const normalizar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

/**
 * Classifica o "Status" de uma falta disciplinar (regra do BI):
 * só na RESERVA TÉCNICA o local define Abandono / Falta Fixa / Afastamento;
 * fora dela (ou sem essas palavras) é sempre "Falta".
 */
function classificarStatusDisciplinar(cliente, local) {
  if (normalizar(cliente) !== 'RESERVA TECNICA') return 'Falta';
  const loc = normalizar(local);
  if (loc.includes('ABANDONO')) return 'Abandono';
  if (loc.includes('FALTANTE')) return 'Falta Fixa';
  if (loc.includes('AFASTAMENTO')) return 'Afastamento';
  return 'Falta';
}

/** Normaliza uma linha de Atestado (HISTDISCIPLINAR) para camelCase. */
function normAtestado(row) {
  return {
    empresa: row.EMPRESA || null,
    vinculo: row.VINCULO || null,
    re: row.RE ?? null,
    nome: row.NOME || null,
    tipoDoc: row.TipoDoc || null,
    ocorrencia: row.DESCRICAO || null,
    faseAtual: row.FASEATUAL || null,
    faseFantasia: row.FASEFANTASIA || null,
    cliente: row.CLIENTE || null,
    clienteRazaoSocial: row.CLIENTE_RAZAOSOCIAL || null,
    local: row.LOCAL || null,
    punicao: row.PUNICAO || null,
    dtLancamento: row['DTLançamento'] || null,
    dtInicioOcorrencia: row.DTINICIOOCORRENCIA || null,
    dtFimOcorrencia: row.DTFIMOCORRENCIA || null,
    cid: row.CID || null,
    medico: row.MEDICO || null,
    crm: row.CRM || null,
    tpAbono: row.TPABONO || null,
    localAtendimento: row.LOCALATENDIMENTO || null,
    obsDocumento: row.OBSDOCUMENTO || null,
    obsRequisitante: row.OBSREQUISITANTE || null,
  };
}

/** Normaliza uma linha de Faltas por Cliente (PONTO). */
function normFaltaCliente(row) {
  return {
    empresaCliente: row.EMPRESACLIENTE || null,
    cliente: row.NOMECLI || null,
    local: row.NOMELOCAL || null,
    dataPonto: row.DATAPONTO || null,
    empresa: row.EMPRESAFUNC || null,
    re: row.RE ?? null,
    nome: row.NOMEFUNC || null,
    escala: row.ESCALA || null,
    cargo: row.CARGO || null,
    areaSupervisao: row.AREASUPER || null,
    statusFalta: row.STATUS_FALTA || null,
  };
}

/** Normaliza uma linha de Faltas Disciplinares (PONTO + COMPLPONTO). */
function normFaltaDisciplinar(row) {
  return {
    tipo: row.TIPO ?? null,
    tipoDescricao: row.TIPO_DESCRICAO || null,
    empresa: row.EMPRESA || null,
    re: row.RE ?? null,
    nome: row.NOME_FUNCIONARIO || null,
    data: row.DATA || null,
    competencia: row.COMPETENCIA || null,
    turno: row.TURNO || null,
    escala: row.ESCALA || null,
    cliente: row.NOME_CLIENTE || null,
    local: row.NOME_LOCAL || null,
  };
}

/** 1º dia do ano corrente (default da data inicial). */
function inicioAnoCorrente() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), 0, 1);
}

/**
 * Executa as 3 queries (+ demitidos) e devolve os conjuntos normalizados,
 * cada linha já marcada com `ehDemitido`.
 *
 * @param {{dataInicial?: Date|string, dataFinal?: Date|string}} opcoes
 */
export async function buscarFluxoAtestadosFaltas({ dataInicial, dataFinal } = {}) {
  const params = {
    DATAINICIAL: dataInicial ? new Date(dataInicial) : inicioAnoCorrente(),
    DATAFINAL: dataFinal ? new Date(dataFinal) : new Date(),
  };

  const [atestadoRows, faltaClienteRows, faltaDiscRows, demitidos] = await Promise.all([
    query(lerSQL('atestado.sql'), params),
    query(lerSQL('faltas-por-cliente.sql'), params),
    query(lerSQL('faltas-disciplinares.sql'), params),
    carregarDemitidos(),
  ]);

  return {
    periodo: { dataInicial: params.DATAINICIAL, dataFinal: params.DATAFINAL },
    atestados: marcarDemitidos(atestadoRows.map(normAtestado), demitidos),
    faltasPorCliente: marcarDemitidos(faltaClienteRows.map(normFaltaCliente), demitidos),
    faltasDisciplinares: marcarDemitidos(faltaDiscRows.map(normFaltaDisciplinar), demitidos),
  };
}
