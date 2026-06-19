import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { query } from '../db.js';
import { resolverCoordenada } from '../geo/coordenadas.js';
import { carregarCache, chaveEndereco } from '../geo/geocode.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_ROTAS = readFileSync(join(__dirname, 'rotas-supervisao.sql'), 'utf-8');

/** Monta o endereço completo em uma linha legível. */
function montarEndereco(row) {
  const partes = [
    row.LOGRADOURO,
    row.NUMERO ? `nº ${row.NUMERO}` : null,
    row.COMPLEMENTO,
    row.BAIRRO,
    row.LOCALIDADE,
    row.UF,
    row.CEP ? `CEP ${row.CEP}` : null,
  ].filter(Boolean);
  return partes.join(', ');
}

/** Monta o telefone formatado a partir das colunas DDI/DDD/NUMERO/RAMAL. */
function montarTelefone(row) {
  if (!row.TELEFONE) return null;
  const ddd = row.DDD ? `(${row.DDD}) ` : '';
  const ramal = row.RAMAL ? ` r.${row.RAMAL}` : '';
  return `${ddd}${row.TELEFONE}${ramal}`.trim();
}

/**
 * Executa a query e devolve as linhas normalizadas + coordenada resolvida.
 */
export async function buscarRotas() {
  const rows = await query(SQL_ROTAS);
  const geocache = carregarCache(); // coordenadas precisas já geocodificadas

  return rows.map((row, idx) => {
    const dadosEndereco = {
      logradouro: row.LOGRADOURO,
      numero: row.NUMERO,
      localidade: row.LOCALIDADE,
      uf: row.UF,
      cep: row.CEP,
    };

    // 1º: coordenada precisa do geocache (por endereço).
    // 2º: fallback para o centro da cidade/UF.
    const precisa = geocache[chaveEndereco(dadosEndereco)];
    let coordinates = null;
    let preciso = false;
    let aproximado = null;
    if (Array.isArray(precisa)) {
      coordinates = precisa;
      preciso = true;
      aproximado = false;
    } else {
      const geo = resolverCoordenada(row.LOCALIDADE, row.UF);
      if (geo) {
        coordinates = geo.coordinates;
        aproximado = geo.aproximado;
      }
    }

    return {
      id: idx + 1,
      empresa: row.EMPRESA || null,
      baseOperacional: row.BASEOPERACIONAL || null,
      codCliente: row.CODCLIENTE ?? null,
      cliente: row.NOMECOMPLETO_CLIENTE || null,
      clienteResumido: row.NOMERESUMIDO_CLIENTE || null,
      codLocal: row.CODLOCAL ?? null,
      local: row.NOMECOMPLETO_LOCAL || null,
      localResumido: row.NOMERESUMIDO_LOCAL || null,
      uf: row.UF || null,
      localidade: row.LOCALIDADE || null,
      bairro: row.BAIRRO || null,
      logradouro: row.LOGRADOURO || null,
      numero: row.NUMERO || null,
      complemento: row.COMPLEMENTO || null,
      pontoReferencia: row.PONTOREFERENCIA || null,
      zona: row.ZONA || null,
      cep: row.CEP || null,
      enderecoCompleto: montarEndereco(row),
      telefone: montarTelefone(row),
      email: row.EMAIL || null,
      contatoOperacional: row.CONTATOOPER || null,
      areaSupervisao: row.AREASUPERVISAO || null,
      supervisor: row.SUPERVISOR || null,
      coordinates,
      coordenadaPrecisa: preciso,
      coordenadaAproximada: aproximado,
    };
  });
}