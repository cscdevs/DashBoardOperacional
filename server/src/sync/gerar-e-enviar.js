/**
 * MOTOR de sincronização (roda DENTRO da empresa).
 *
 * Uso:  node src/sync/gerar-e-enviar.js
 *
 * Fluxo:
 *   1. Lê o relatório do SQL Server (buscarRotas) já com coordenadas resolvidas
 *      pelo geocache.
 *   2. Grava o snapshot completo no Postgres do Supabase, em transação:
 *      TRUNCATE + INSERT em lotes. Se algo falhar, faz ROLLBACK (o snapshot
 *      anterior continua intacto).
 *   3. Registra a execução na tabela `sincronizacoes`.
 *
 * Só faz conexão de SAÍDA (SQL Server interno + HTTPS/TLS pro Supabase),
 * então funciona com IP dinâmico e sem abrir porta nenhuma na empresa.
 */
import 'dotenv/config';
import { buscarRotas } from '../reports/rotas-supervisao/rotas-supervisao.js';
import { getPool } from './supabase-db.js';
import { listarViaturasEmUsoSQL } from '../reports/rotas-supervisao/stc.js';

const TAMANHO_LOTE = Number(process.env.SYNC_BATCH_SIZE) || 500;

// Colunas da tabela (ordem usada no INSERT) e como extrair de cada rota.
const COLUNAS = [
  ['empresa', (r) => r.empresa],
  ['base_operacional', (r) => r.baseOperacional],
  ['cod_cliente', (r) => r.codCliente],
  ['cliente', (r) => r.cliente],
  ['cliente_resumido', (r) => r.clienteResumido],
  ['cod_local', (r) => r.codLocal],
  ['local', (r) => r.local],
  ['local_resumido', (r) => r.localResumido],
  ['uf', (r) => r.uf],
  ['localidade', (r) => r.localidade],
  ['bairro', (r) => r.bairro],
  ['logradouro', (r) => r.logradouro],
  ['numero', (r) => (r.numero != null ? String(r.numero) : null)],
  ['complemento', (r) => r.complemento],
  ['ponto_referencia', (r) => r.pontoReferencia],
  ['zona', (r) => r.zona],
  ['cep', (r) => r.cep],
  ['endereco_completo', (r) => r.enderecoCompleto],
  ['telefone', (r) => r.telefone],
  ['email', (r) => r.email],
  ['contato_operacional', (r) => r.contatoOperacional],
  ['area_supervisao', (r) => r.areaSupervisao],
  ['supervisor', (r) => r.supervisor],
  ['supervisor_nome', (r) => r.supervisorNome],
  ['lat', (r) => (Array.isArray(r.coordinates) ? r.coordinates[0] : null)],
  ['lng', (r) => (Array.isArray(r.coordinates) ? r.coordinates[1] : null)],
  ['coordenada_precisa', (r) => !!r.coordenadaPrecisa],
  ['coordenada_aproximada', (r) => r.coordenadaAproximada ?? null],
];

const NOMES_COLUNAS = COLUNAS.map(([nome]) => nome);

/** Monta um INSERT multi-linha parametrizado para um lote de rotas. */
function montarInsertLote(lote) {
  const valores = [];
  const tuplas = lote.map((rota, i) => {
    const base = i * COLUNAS.length;
    const placeholders = COLUNAS.map((_, j) => `$${base + j + 1}`);
    COLUNAS.forEach(([, extrair]) => valores.push(extrair(rota) ?? null));
    return `(${placeholders.join(', ')})`;
  });
  const texto = `INSERT INTO rotas_supervisao (${NOMES_COLUNAS.join(', ')}) VALUES ${tuplas.join(', ')}`;
  return { texto, valores };
}

async function main() {
  console.log('[sync] Lendo relatório do SQL Server...');
  const rotas = await buscarRotas();
  const precisos = rotas.filter((r) => r.coordenadaPrecisa).length;
  console.log(`[sync] ${rotas.length} linhas (${precisos} com coordenada precisa).`);

  const pool = getPool();
  const client = await pool.connect();
  let syncId = null;
  try {
    // Abre o registro de sincronização
    const ini = await client.query(
      `INSERT INTO sincronizacoes (relatorio, total_linhas, total_precisos, status)
       VALUES ('rotas-supervisao', $1, $2, 'em_andamento') RETURNING id`,
      [rotas.length, precisos]
    );
    syncId = ini.rows[0].id;

    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE rotas_supervisao');

    let inseridas = 0;
    for (let i = 0; i < rotas.length; i += TAMANHO_LOTE) {
      const lote = rotas.slice(i, i + TAMANHO_LOTE);
      const { texto, valores } = montarInsertLote(lote);
      await client.query(texto, valores);
      inseridas += lote.length;
      console.log(`[sync] inseridas ${inseridas}/${rotas.length}`);
    }

    await client.query('COMMIT');

    await client.query(
      `UPDATE sincronizacoes SET concluido_em = now(), status = 'sucesso' WHERE id = $1`,
      [syncId]
    );
    console.log(`[sync] Concluído com sucesso. Snapshot atualizado (${inseridas} linhas).`);

    // --- Viaturas EM USO (BDV) -> snapshot na nuvem (transação própria) ---
    // São poucas linhas (dezenas); insere uma a uma p/ simplicidade. Se falhar,
    // só loga: o snapshot de rotas (já commitado) não é afetado.
    try {
      const viaturas = await listarViaturasEmUsoSQL();
      await client.query('BEGIN');
      await client.query('TRUNCATE TABLE viaturas_em_uso');
      for (const v of viaturas) {
        await client.query(
          `INSERT INTO viaturas_em_uso (placa, re, funcionario, supervisor_nome, empresa, desde)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [v.placa, v.re, v.funcionario, v.supervisorNome, v.empresa, v.desde]
        );
      }
      await client.query('COMMIT');
      console.log(`[sync] Viaturas em uso: ${viaturas.length} sincronizadas.`);
    } catch (errV) {
      await client.query('ROLLBACK').catch(() => {});
      console.warn('[sync] Falha ao sincronizar viaturas em uso (segue sem elas):', errV.message);
    }
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignora */
    }
    if (syncId) {
      await client
        .query(
          `UPDATE sincronizacoes SET concluido_em = now(), status = 'erro', erro = $2 WHERE id = $1`,
          [syncId, String(err.message).slice(0, 1000)]
        )
        .catch(() => {});
    }
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[sync] FALHA:', e.message);
    process.exit(1);
  });
