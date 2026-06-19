/**
 * Batch de geocodificação dos endereços do relatório de Rotas de Supervisão.
 *
 * Uso:  node src/scripts/geocode-rotas.js
 *
 * - Busca as rotas no banco, deduplica por endereço e geocodifica via Nominatim
 *   (respeitando ~1 req/seg). Salva o progresso em geo/geocache.json a cada 20.
 * - Pode ser interrompido e retomado: endereços já no cache são pulados.
 */
import { buscarRotas } from '../reports/rotas-supervisao.js';
import {
  carregarCache,
  salvarCache,
  chaveEndereco,
  geocodificar,
  sleep,
  CACHE_PATH,
} from '../geo/geocode.js';

const INTERVALO_MS = Number(process.env.GEOCODE_INTERVALO_MS) || 1100;

async function main() {
  console.log('[geocode] Buscando rotas no banco...');
  const rotas = await buscarRotas();

  // Deduplica por endereço
  const porChave = new Map();
  for (const r of rotas) {
    const k = chaveEndereco(r);
    if (!porChave.has(k)) porChave.set(k, r);
  }
  const chaves = [...porChave.keys()];

  const cache = carregarCache();
  const pendentes = chaves.filter((k) => cache[k] === undefined);

  console.log(`[geocode] ${rotas.length} locais | ${chaves.length} endereços únicos | ${pendentes.length} a geocodificar`);
  const estimativaMin = Math.ceil((pendentes.length * INTERVALO_MS) / 60000);
  console.log(`[geocode] Estimativa: ~${estimativaMin} min. Cache: ${CACHE_PATH}`);

  let feitos = 0, ok = 0, falhas = 0;
  for (const k of pendentes) {
    const r = porChave.get(k);
    try {
      const coord = await geocodificar(r);
      cache[k] = coord;
      coord ? ok++ : falhas++;
    } catch (e) {
      cache[k] = null;
      falhas++;
      console.warn(`[geocode] erro em "${r.enderecoCompleto}": ${e.message}`);
    }
    feitos++;
    if (feitos % 20 === 0) {
      salvarCache(cache);
      console.log(`[geocode] ${feitos}/${pendentes.length} (ok=${ok}, falhas=${falhas})`);
    }
    await sleep(INTERVALO_MS);
  }

  salvarCache(cache);
  console.log(`[geocode] Concluído. Geocodificados=${ok}, não encontrados=${falhas}, total no cache=${Object.keys(cache).length}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('[geocode] Falha geral:', e.message);
  process.exit(1);
});