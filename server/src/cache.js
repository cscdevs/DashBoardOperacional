/**
 * Cache resiliente para os relatórios.
 *
 * Objetivo: a plataforma NÃO pode "cair" quando a conexão até o SQL Server
 * oscila. Estratégia em três camadas:
 *
 *  1. stale-while-revalidate — responde NA HORA com o último dado em memória e,
 *     se ele expirou, dispara a atualização em segundo plano (sem travar a
 *     resposta esperando o banco).
 *  2. stale-if-error — se a atualização falhar (banco inacessível), mantém e
 *     continua servindo o último dado bom, em vez de devolver erro.
 *  3. persistência em disco — grava o último snapshot de cada relatório. No
 *     boot, hidrata a memória a partir do disco, então mesmo reiniciando
 *     DURANTE uma queda o serviço já sobe com os dados pré-carregados.
 *
 * `CACHE_DIR` (env) define a pasta dos snapshots (use um volume Docker p/ os
 * dados sobreviverem a um redeploy do container). Default: ./.cache
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const TTL = (Number(process.env.CACHE_TTL_SECONDS) || 30) * 1000;
// Após uma falha de atualização, espera este tempo antes de tentar de novo
// (evita martelar o banco a cada request enquanto a conexão está fora).
const RETRY_APOS_ERRO = (Number(process.env.CACHE_RETRY_SECONDS) || 10) * 1000;
const DIR = process.env.CACHE_DIR || join(process.cwd(), '.cache');

try { mkdirSync(DIR, { recursive: true }); } catch { /* ignora */ }

// chave -> { data, expiraEm, atualizadoEm, revalidando, produtor }
const mem = new Map();

const arquivo = (chave) =>
  join(DIR, createHash('sha1').update(chave).digest('hex') + '.json');

function persistir(chave, data, atualizadoEm) {
  try {
    writeFileSync(arquivo(chave), JSON.stringify({ chave, atualizadoEm, data }));
  } catch (e) {
    console.warn(`[cache] não consegui gravar '${chave}' em disco: ${e.message}`);
  }
}

function carregarDoDisco(chave) {
  try {
    const p = arquivo(chave);
    if (!existsSync(p)) return null;
    const j = JSON.parse(readFileSync(p, 'utf8'));
    return { data: j.data, atualizadoEm: j.atualizadoEm || null };
  } catch {
    return null;
  }
}

function revalidar(chave, item) {
  if (item.revalidando) return;
  item.revalidando = true;
  Promise.resolve()
    .then(item.produtor)
    .then((data) => {
      mem.set(chave, {
        data,
        expiraEm: Date.now() + TTL,
        atualizadoEm: Date.now(),
        revalidando: false,
        produtor: item.produtor,
      });
      persistir(chave, data, Date.now());
    })
    .catch((err) => {
      // Banco fora: mantém o dado antigo e tenta de novo daqui a pouco.
      console.warn(`[cache] revalidação de '${chave}' falhou (servindo cache antigo): ${err.message}`);
      item.revalidando = false;
      item.expiraEm = Date.now() + RETRY_APOS_ERRO;
    });
}

/**
 * Lê do cache servindo o último dado bom imediatamente; atualiza em background.
 * Só aguarda o `produtor` (e pode lançar) quando NUNCA houve dado — nem em
 * memória, nem em disco.
 */
export async function comCache(chave, produtor) {
  const agora = Date.now();
  let item = mem.get(chave);

  // Hidrata da memória a partir do disco na primeira vez.
  if (!item) {
    const disco = carregarDoDisco(chave);
    if (disco) {
      item = { data: disco.data, expiraEm: 0, atualizadoEm: disco.atualizadoEm, revalidando: false, produtor };
      mem.set(chave, item);
    }
  }

  if (item) {
    item.produtor = produtor; // mantém o produtor mais recente
    if (item.expiraEm <= agora) revalidar(chave, item); // expirou: atualiza em background
    return item.data;          // responde já (fresco ou stale)
  }

  // Nunca houve dado: precisa buscar de fato (pode lançar se o banco estiver fora).
  const data = await produtor();
  mem.set(chave, { data, expiraEm: agora + TTL, atualizadoEm: agora, revalidando: false, produtor });
  persistir(chave, data, agora);
  return data;
}

/**
 * Força a atualização AGORA (usado pelo botão "Atualizar"). Aguarda o refetch
 * de tudo que está em cache; se algum falhar, mantém o último dado bom.
 */
export async function forcarAtualizacao() {
  const entradas = [...mem.entries()].filter(([, v]) => typeof v.produtor === 'function');
  await Promise.allSettled(
    entradas.map(([chave, item]) =>
      Promise.resolve()
        .then(item.produtor)
        .then((data) => {
          mem.set(chave, { data, expiraEm: Date.now() + TTL, atualizadoEm: Date.now(), revalidando: false, produtor: item.produtor });
          persistir(chave, data, Date.now());
        })
    )
  );
  return infoCache();
}

/**
 * Pré-carrega relatórios no boot, UM DE CADA VEZ (sequencial) para não somar o
 * pico de memória de vários datasets grandes ao mesmo tempo. Ignora falhas.
 */
export async function aquecer(tarefas) {
  for (const { chave, produtor } of tarefas) {
    try {
      await comCache(chave, produtor);
    } catch (e) {
      console.warn(`[cache] aquecimento de '${chave}' falhou: ${e.message}`);
    }
  }
}

/** Diagnóstico: idade de cada item em cache. */
export function infoCache() {
  return [...mem.entries()].map(([chave, v]) => ({
    chave,
    atualizadoEm: v.atualizadoEm ? new Date(v.atualizadoEm).toISOString() : null,
    idadeSegundos: v.atualizadoEm ? Math.round((Date.now() - v.atualizadoEm) / 1000) : null,
  }));
}
