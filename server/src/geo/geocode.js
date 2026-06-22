/**
 * Geocodificação de endereços via Nominatim (OpenStreetMap).
 *
 * A query não traz lat/long, então convertemos rua/número/cidade/UF/CEP em
 * coordenadas. Como o Nominatim tem limite de ~1 requisição/segundo, os
 * resultados ficam num cache persistente em disco (geocache.json) para não
 * geocodificar o mesmo endereço duas vezes.
 *
 * Formato do cache:  { "<chave>": [lat, lng] | null }
 *   - [lat, lng] -> geocodificado com sucesso
 *   - null       -> tentado e não encontrado (não tenta de novo)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const CACHE_PATH = join(__dirname, 'geocache.json');

const USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ||
  'PlataformaRelatorios/1.0 (eduardo.pirani@admapoio.com.br)';

export function carregarCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function salvarCache(cache) {
  writeFileSync(CACHE_PATH, JSON.stringify(cache));
}

/** Chave única e estável para um endereço (usada no cache). */
export function chaveEndereco(r) {
  return [r.logradouro, r.numero, r.localidade, r.uf, r.cep]
    .map((x) => (x || '').toString().trim().toUpperCase())
    .join('|');
}

export const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/** Normaliza o número, descartando variações de "S/N" (sem número). */
function numeroLimpo(r) {
  return r.numero && !/^s\/?n$/i.test(String(r.numero)) ? String(r.numero) : '';
}

/**
 * Monta o endereço em TEXTO LIVRE para a busca `q=` do Nominatim, juntando
 * logradouro, número, BAIRRO, cidade, UF e (opcionalmente) CEP. A busca livre
 * é mais tolerante que a estruturada e o bairro ajuda a desambiguar ruas
 * homônimas dentro da mesma cidade.
 */
export function montarEnderecoBusca(r, { comCep = true } = {}) {
  const numero = numeroLimpo(r);
  const logradouro = [r.logradouro, numero].filter(Boolean).join(', ');
  const cep = comCep ? (r.cep || '').replace(/\D/g, '') : '';
  return [logradouro, r.bairro, r.localidade, r.uf, cep, 'Brasil']
    .map((x) => (x || '').toString().trim())
    .filter(Boolean)
    .join(', ');
}

/** Dispara uma consulta ao Nominatim e devolve [lat, lng] ou null. */
async function consultarNominatim(params) {
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!resp.ok) throw new Error(`Nominatim HTTP ${resp.status}`);
  const data = await resp.json();
  if (Array.isArray(data) && data.length > 0) {
    return [Number(data[0].lat), Number(data[0].lon)];
  }
  return null;
}

/**
 * Geocodifica um único endereço. Retorna [lat, lng] ou null se não encontrar.
 *
 * Tenta várias estratégias em cascata, da mais precisa para a mais tolerante,
 * parando na primeira que resolver:
 *   1) Estruturada com CEP   (logradouro/cidade/UF/CEP)
 *   2) Texto livre com bairro + CEP
 *   3) Texto livre com bairro, sem CEP (o CEP às vezes é genérico/errado)
 *   4) Estruturada sem CEP
 *
 * Entre cada tentativa há uma pausa (`delayMs`) para respeitar o limite de
 * ~1 requisição/segundo do Nominatim.
 */
export async function geocodificar(r, { delayMs = 1100 } = {}) {
  const street = [numeroLimpo(r), r.logradouro].filter(Boolean).join(' ').trim();
  const cep = (r.cep || '').replace(/\D/g, '');
  // ATENÇÃO: o Nominatim devolve HTTP 400 se a busca em texto livre (q) for
  // misturada com parâmetros estruturados (country/city/...). Por isso cada
  // tipo de estratégia monta seus próprios params, sem compartilhar campos.
  const base = { format: 'jsonv2', limit: '1' };

  const estrategias = [];

  // 1) Estruturada com CEP (mais precisa quando há logradouro + CEP)
  if (street && cep) {
    estrategias.push(
      new URLSearchParams({ ...base, country: 'Brazil', street, city: r.localidade || '', state: r.uf || '', postalcode: cep })
    );
  }

  // 2 e 3) Texto livre, com e sem CEP (inclui o bairro; sem params estruturados)
  const qComCep = montarEnderecoBusca(r, { comCep: true });
  const qSemCep = montarEnderecoBusca(r, { comCep: false });
  estrategias.push(new URLSearchParams({ ...base, q: qComCep }));
  if (qSemCep !== qComCep) {
    estrategias.push(new URLSearchParams({ ...base, q: qSemCep }));
  }

  // 4) Estruturada sem CEP
  if (street) {
    estrategias.push(new URLSearchParams({ ...base, country: 'Brazil', street, city: r.localidade || '', state: r.uf || '' }));
  }

  // Tenta cada estratégia; um erro pontual (ex.: HTTP 400/timeout) numa delas
  // não aborta as demais. Só propaga se TODAS falharem por erro.
  let ultimoErro = null;
  let algumaRespondeu = false;
  for (let i = 0; i < estrategias.length; i++) {
    if (i > 0) await sleep(delayMs); // respeita o limite de ~1 req/seg do Nominatim
    try {
      const coord = await consultarNominatim(estrategias[i]);
      algumaRespondeu = true;
      if (coord) return coord;
    } catch (e) {
      ultimoErro = e;
    }
  }
  if (!algumaRespondeu && ultimoErro) throw ultimoErro;
  return null;
}