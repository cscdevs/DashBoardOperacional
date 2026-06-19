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

/**
 * Geocodifica um único endereço. Retorna [lat, lng] ou null se não encontrar.
 * Usa busca estruturada (street/city/state/postalcode) que costuma ser mais
 * precisa no Brasil.
 */
export async function geocodificar(r) {
  const numero = r.numero && !/^s\/?n$/i.test(String(r.numero)) ? String(r.numero) : '';
  const street = [numero, r.logradouro].filter(Boolean).join(' ').trim();
  const cep = (r.cep || '').replace(/\D/g, '');

  const params = new URLSearchParams({
    city: r.localidade || '',
    state: r.uf || '',
    country: 'Brazil',
    format: 'jsonv2',
    limit: '1',
  });
  if (street) params.set('street', street);
  if (cep) params.set('postalcode', cep);

  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!resp.ok) throw new Error(`Nominatim HTTP ${resp.status}`);

  const data = await resp.json();
  if (Array.isArray(data) && data.length > 0) {
    return [Number(data[0].lat), Number(data[0].lon)];
  }
  return null;
}