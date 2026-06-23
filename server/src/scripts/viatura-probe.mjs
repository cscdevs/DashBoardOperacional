/**
 * Valida o cruzamento viatura (BDV) x posição ao vivo (STC) pela PLACA.
 * Não altera nada. Uso (em server/): node src/scripts/viatura-probe.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { query } from '../db.js';
import { buscarPosicoesVeiculos } from '../reports/rotas-supervisao/stc.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL = readFileSync(join(__dirname, '../reports/rotas-supervisao/viaturas.sql'), 'utf-8');

/** Normaliza placa p/ casar formatos (maiúsculas, só alfanumérico). */
const norm = (p) => (p || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');

const viaturas = await query(SQL);
console.log(`Viaturas em uso (BDV aberto): ${viaturas.length}`);
for (const v of viaturas.slice(0, 8)) {
  console.log(`  ${v.PLACA}  ->  RE ${v.RE} ${v.FUNCIONARIO}  | ${v.EMPRESA} | desde ${v.DTHRINICIO?.toISOString?.() || v.DTHRINICIO}`);
}

const { veiculos } = await buscarPosicoesVeiculos();
const placasStc = new Set(veiculos.map((x) => norm(x.plate)));
console.log(`\nPlacas com posição na STC: ${placasStc.size}`);

const mapaViatura = new Map(viaturas.map((v) => [norm(v.PLACA), v]));
const casadas = [...mapaViatura.keys()].filter((p) => placasStc.has(p));
console.log(`\n>>> Placas que CASAM (BDV ∩ STC): ${casadas.length} de ${mapaViatura.size} viaturas`);
for (const p of casadas.slice(0, 12)) {
  const v = mapaViatura.get(p);
  console.log(`  ${v.PLACA}  ${v.FUNCIONARIO}`);
}

const naoCasam = [...mapaViatura.keys()].filter((p) => !placasStc.has(p));
if (naoCasam.length) {
  console.log(`\nViaturas SEM posição na STC (${naoCasam.length}):`, naoCasam.slice(0, 10).join(', '));
}
process.exit(0);
