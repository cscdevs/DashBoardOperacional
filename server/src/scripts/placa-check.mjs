/** Investiga uma placa no BDV/ATIVO. Uso: node src/scripts/placa-check.mjs EJV0A39 */
import { query } from '../db.js';

const placa = (process.argv[2] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
if (!placa) { console.error('Informe a placa.'); process.exit(1); }

const rows = await query(`
  SELECT TOP 10
    ENTFUNC.NOMERESUMIDO AS FUNCIONARIO,
    ATIVO.CODIGOATIVO    AS PLACA,
    BDV.DTHRINICIO, BDV.DTHRFIM, BDV.SITUACAOBDV
  FROM BDV
    INNER JOIN ATIVO ON BDV.VEICULO = ATIVO.ATIVO
    INNER JOIN RELACAOENTIDADE RELFUNC ON BDV.FUNCIONARIO = RELFUNC.RELACAOENTIDADE
    INNER JOIN ENTIDADE ENTFUNC ON RELFUNC.PAPEL1 = ENTFUNC.ENTIDADE
  WHERE REPLACE(REPLACE(ATIVO.CODIGOATIVO,'-',''),' ','') = '${placa}'
  ORDER BY BDV.DTHRINICIO DESC
`);
console.log(`BDV para placa ${placa}: ${rows.length} registro(s)`);
for (const r of rows) {
  console.log(`  ${r.FUNCIONARIO} | ini=${r.DTHRINICIO?.toISOString?.()||r.DTHRINICIO} fim=${r.DTHRFIM?.toISOString?.()||r.DTHRFIM} sit=${r.SITUACAOBDV}`);
}

const ativo = await query(`SELECT CODIGOATIVO, DESCRICAO FROM ATIVO WHERE REPLACE(REPLACE(CODIGOATIVO,'-',''),' ','') = '${placa}'`);
console.log(`\nNo cadastro ATIVO: ${ativo.length} -> ${ativo.map(a=>a.CODIGOATIVO+' / '+a.DESCRICAO).join(' | ')}`);
process.exit(0);
