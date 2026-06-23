/** Compara hodômetro (getSTT por devices) com KMINICIO do BDV p/ "km andou". */
import 'dotenv/config';
import { query } from '../db.js';

const BASE = (process.env.STC_BASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.STC_KEY;
const norm = (p) => (p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const ws = async (op, body) =>
  (await (await fetch(`${BASE}/ws/${op}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: KEY, ...body }),
  })).json());

// catálogo placa->deviceId
const cat = new Map();
for (let pg = 1; pg <= 4; pg++) {
  const j = await ws(`vehicle/list?page=${pg}`, {});
  for (const v of j.data?.data || []) cat.set(norm(v.lisencePlate), v.deviceId);
}

const viaturas = await query(`
  SELECT ENTFUNC.NOMERESUMIDO AS FUNC, ATIVO.CODIGOATIVO AS PLACA, BDV.KMINICIO
  FROM BDV
    INNER JOIN ATIVO ON BDV.VEICULO = ATIVO.ATIVO
    INNER JOIN RELACAOENTIDADE RELFUNC ON BDV.FUNCIONARIO = RELFUNC.RELACAOENTIDADE
    INNER JOIN ENTIDADE ENTFUNC ON RELFUNC.PAPEL1 = ENTFUNC.ENTIDADE
  WHERE BDV.SITUACAOBDV > 0 AND BDV.DTHRFIM IS NULL AND BDV.DTHRINICIO > '2025-11-01'
`);

const devices = viaturas.map((v) => cat.get(norm(v.PLACA))).filter(Boolean);
const stt = (await ws('getSTT', { devices })).data || [];
const odoPorDev = new Map(stt.map((p) => [String(p.deviceId), p.odometer]));

for (const v of viaturas) {
  const dev = cat.get(norm(v.PLACA));
  const odo = dev ? odoPorDev.get(String(dev)) : undefined;
  const odoKm = odo != null ? Number(odo) / 1000 : null;
  const diff = odoKm != null && v.KMINICIO != null ? (odoKm - Number(v.KMINICIO)).toFixed(1) : '?';
  console.log(`${v.PLACA} | KMINI=${v.KMINICIO} | odo=${odo} | odo/1000=${odoKm?.toFixed(1)} | andou=${diff} km | ${v.FUNC}`);
}
process.exit(0);
