import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { query } from '../db.js';
import { resolverCoordenada, validarCoordenada } from '../geo/coordenadas.js';
import { carregarCache, chaveEndereco } from '../geo/geocode.js';
import { resolverSupervisor } from './supervisores.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_PATH = join(__dirname, 'rotas-supervisao.sql');

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
 * Coordenada [lat, lng] vinda direto das colunas do banco (ENDERECO.LATITUDE/
 * LONGITUDE). Aceita string ou número; valida o range do Brasil e descarta
 * (0,0). Retorna null se não houver coordenada válida.
 */
function coordenadaDoBanco(row) {
  const lat = Number(row.LATITUDE);
  const lng = Number(row.LONGITUDE);
  const valida =
    Number.isFinite(lat) && Number.isFinite(lng) &&
    !(lat === 0 && lng === 0) &&
    lat >= -34 && lat <= 6 && lng >= -74 && lng <= -34;
  return valida ? [lat, lng] : null;
}

/**
 * Executa a query e devolve as linhas normalizadas + coordenada resolvida.
 */
export async function buscarRotas() {
  // Lê o .sql a cada execução para que edições na query valem sem reiniciar
  // o servidor (basta limpar o cache). Só roda no cache-miss (a cada ~5 min).
  const SQL_ROTAS = readFileSync(SQL_PATH, 'utf-8');
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

    // 1º: coordenada do próprio banco (ENDERECO.LATITUDE/LONGITUDE) — precisa.
    // 2º: geocache por endereço (rede de segurança p/ linhas sem lat/long).
    // 3º: fallback para o centro da cidade/UF.
    let coordinates = null;
    let preciso = false;
    let aproximado = null;
    const doBanco = coordenadaDoBanco(row);
    if (doBanco) {
      coordinates = doBanco;
      preciso = true;
      aproximado = false;
    } else {
      const precisa = geocache[chaveEndereco(dadosEndereco)];
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
    }

    // Validação: confere se a coordenada (do banco) bate com a cidade do
    // endereço. Não altera o ponto — apenas sinaliza divergências grandes.
    const { suspeita, distanciaKm } = preciso && doBanco
      ? validarCoordenada(coordinates, row.LOCALIDADE, row.UF)
      : { suspeita: false, distanciaKm: null };

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
      supervisorNome: resolverSupervisor(row.SUPERVISOR),
      coordinates,
      coordenadaPrecisa: preciso,
      coordenadaAproximada: aproximado,
      coordenadaSuspeita: suspeita,
      distanciaCidadeKm: distanciaKm,
    };
  });
}