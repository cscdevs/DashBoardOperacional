/**
 * Integração com a API de rastreamento veicular STC (https://ap3.stc.srv.br).
 *
 * Usada pelo relatório de Rotas de Supervisão para plotar a posição ATUAL dos
 * veículos no mapa. Fluxo:
 *   1. `vehicle/list` (paginado) -> catálogo de veículos (deviceId + placa +
 *      label). Muda pouco; fica em cache longo.
 *   2. `getSTT` (só precisa da `key`) -> última posição de cada device, com
 *      latitude/longitude. É o que atualiza "ao vivo"; cache curto.
 *
 * Config via server/.env: STC_BASE_URL, STC_KEY (ver .env.example).
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { query } from '../../db.js';
import { casarSupervisorPorNome } from './supervisores.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_VIATURAS = join(__dirname, 'viaturas.sql');

const BASE = (process.env.STC_BASE_URL || 'https://ap3.stc.srv.br').replace(/\/+$/, '');
const KEY = process.env.STC_KEY;

// getSTT aceita lista de devices; chunk p/ não estourar o payload da API.
const CHUNK = Number(process.env.STC_STT_CHUNK) || 100;
// TTLs (ms): catálogo de veículos muda pouco; posições são "ao vivo".
const TTL_VEICULOS = (Number(process.env.STC_VEHICLES_TTL_SECONDS) || 3600) * 1000;
const TTL_POSICOES = (Number(process.env.STC_POSITIONS_TTL_SECONDS) || 45) * 1000;
// Viaturas em uso (BDV aberto) mudam ao longo do dia; cache curto.
const TTL_VIATURAS = (Number(process.env.STC_VIATURAS_TTL_SECONDS) || 120) * 1000;

/** Normaliza placa p/ casar formatos diferentes (maiúsculas, só alfanumérico). */
const normPlaca = (p) => (p || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');

/** POST JSON em /ws/<op>, devolve o corpo já parseado (lança em falha). */
async function postWs(op, body) {
  if (!KEY) throw new Error('STC_KEY não configurada no server/.env.');
  const resp = await fetch(`${BASE}/ws/${op}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: KEY, ...body }),
  });
  const texto = await resp.text();
  let json;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new Error(`STC ${op}: resposta não-JSON (HTTP ${resp.status}).`);
  }
  if (json.success === false) {
    throw new Error(`STC ${op}: ${json.msg || 'falha na API'}.`);
  }
  return json;
}

/** Distância em km entre dois [lat,lng] (haversine). */
function distanciaKm(a, b) {
  const R = 6371;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** lat/lng (string ou número) válidos dentro do range do Brasil, exceto (0,0). */
function coordValida(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  return (
    Number.isFinite(la) && Number.isFinite(ln) &&
    !(la === 0 && ln === 0) &&
    la >= -34 && la <= 6 && ln >= -74 && ln <= -34
  );
}

// ---- Cache em memória (módulo) ----
let cacheVeiculos = null; // { dados, expiraEm }
let cachePosicoes = null; // { dados, expiraEm }

/**
 * Catálogo de veículos (todas as páginas de vehicle/list).
 * -> [{ deviceId, plate, label, clientId }]
 */
async function listarVeiculos() {
  const agora = Date.now();
  if (cacheVeiculos && cacheVeiculos.expiraEm > agora) return cacheVeiculos.dados;

  const veiculos = [];
  let page = 1;
  let lastPage = 1;
  do {
    const json = await postWs(`vehicle/list?page=${page}`, {});
    const bloco = json.data || {};
    lastPage = Number(bloco.last_page) || page;
    for (const v of bloco.data || []) {
      if (v.deviceId == null) continue;
      veiculos.push({
        deviceId: v.deviceId,
        plate: v.lisencePlate || null, // sic: a API usa "lisencePlate"
        label: v.label || null,
        clientId: v.clientId ?? null,
      });
    }
    page += 1;
  } while (page <= lastPage);

  cacheVeiculos = { dados: veiculos, expiraEm: agora + TTL_VEICULOS };
  return veiculos;
}

/** Divide um array em pedaços de tamanho `n`. */
function emLotes(arr, n) {
  const lotes = [];
  for (let i = 0; i < arr.length; i += n) lotes.push(arr.slice(i, i + n));
  return lotes;
}

let cacheViaturas = null; // { dados: Map(placaNorm -> info), expiraEm }

// Fonte das viaturas em uso: SQL Server (dev/motor) ou Supabase (VPS, lê o
// snapshot gravado pelo motor de sync).
const DATA_SOURCE_VIATURAS = (process.env.DATA_SOURCE || 'sqlserver').toLowerCase();

/**
 * Lê do SQL Server (BDV) as viaturas EM USO agora.
 * -> array [{ placa, re, funcionario, supervisorNome, empresa, desde }]
 * Usado no modo sqlserver e pelo MOTOR de sync (que grava no Supabase).
 */
export async function listarViaturasEmUsoSQL() {
  const SQL = readFileSync(SQL_VIATURAS, 'utf-8');
  const rows = await query(SQL);
  const lista = [];
  for (const r of rows) {
    const placa = (r.PLACA || '').toString().trim();
    if (!placa) continue;
    const funcionario = (r.FUNCIONARIO || '').toString().trim();
    lista.push({
      placa,
      re: r.RE != null ? String(r.RE) : null,
      funcionario,
      supervisorNome: casarSupervisorPorNome(funcionario) || funcionario || null,
      empresa: r.EMPRESA || null,
      desde: r.DTHRINICIO || null,
    });
  }
  return lista;
}

/** Map(placaNorm -> { funcionario, supervisorNome, empresa, desde }) a partir da lista. */
function mapaPorPlaca(lista) {
  const mapa = new Map();
  for (const v of lista) {
    const placa = normPlaca(v.placa);
    if (!placa) continue;
    mapa.set(placa, {
      funcionario: v.funcionario,
      supervisorNome: v.supervisorNome,
      empresa: v.empresa,
      desde: v.desde,
    });
  }
  return mapa;
}

/**
 * Viaturas em uso indexadas pela placa normalizada. A fonte depende de
 * DATA_SOURCE: SQL Server (dev/motor) ou Supabase (produção no VPS). Degrada
 * para Map vazio se a fonte falhar — os veículos aparecem sem supervisor.
 */
async function buscarViaturasEmUso() {
  const agora = Date.now();
  if (cacheViaturas && cacheViaturas.expiraEm > agora) return cacheViaturas.dados;

  let mapa = new Map();
  try {
    if (DATA_SOURCE_VIATURAS === 'supabase') {
      const { listarViaturasEmUsoNuvem } = await import('./rotas-supervisao-nuvem.js');
      mapa = mapaPorPlaca(await listarViaturasEmUsoNuvem());
    } else {
      mapa = mapaPorPlaca(await listarViaturasEmUsoSQL());
    }
  } catch (err) {
    console.warn('[stc] Não foi possível ler viaturas em uso:', err.message);
  }

  cacheViaturas = { dados: mapa, expiraEm: agora + TTL_VIATURAS };
  return mapa;
}

/**
 * Última posição de todos os veículos da conta, já enriquecida com o supervisor
 * que está com a viatura agora (quando há BDV aberto p/ a placa).
 * -> { atualizadoEm, total, veiculos: [{ plate, deviceId, label, coordinates,
 *      date, speed, ign, bateria, emMovimento, supervisorNome, emUso, desde }] }
 *    Só inclui veículos com coordenada válida.
 */
export async function buscarPosicoesVeiculos() {
  const agora = Date.now();
  if (cachePosicoes && cachePosicoes.expiraEm > agora) return cachePosicoes.dados;

  try {
  const catalogo = await listarVeiculos();
  const porDevice = new Map(catalogo.map((v) => [String(v.deviceId), v]));
  const deviceIds = catalogo.map((v) => v.deviceId);

  // getSTT em lotes; junta tudo num só array de posições.
  const posicoesBrutas = [];
  for (const lote of emLotes(deviceIds, CHUNK)) {
    const json = await postWs('getSTT', { devices: lote });
    for (const p of json.data || []) posicoesBrutas.push(p);
  }

  // Viaturas em uso (placa -> supervisor) p/ enriquecer e colorir.
  const viaturas = await buscarViaturasEmUso();

  const veiculos = [];
  for (const p of posicoesBrutas) {
    if (!coordValida(p.latitude, p.longitude)) continue;
    const cat = porDevice.get(String(p.deviceId)) || {};
    const placa = p.plate || cat.plate || null;
    const viatura = viaturas.get(normPlaca(placa));
    const speed = p.speed != null ? Number(p.speed) : null;
    const ligado = p.ign === 'ON';
    // Em movimento = ignição ligada e velocidade > 3 km/h (evita jitter de GPS).
    const emMovimento = ligado && speed != null && speed > 3;
    veiculos.push({
      plate: placa,
      deviceId: p.deviceId,
      label: cat.label || null,
      coordinates: [Number(p.latitude), Number(p.longitude)],
      date: p.date || null,
      speed,
      ign: p.ign || null,
      bateria: p.mainBattery != null ? Number(p.mainBattery) : null,
      emMovimento,
      // Enriquecimento via BDV (só quando a viatura está em uso):
      supervisorNome: viatura?.supervisorNome || null,
      emUso: !!viatura,
      desde: viatura?.desde || null,
    });
  }

  const dados = {
    atualizadoEm: new Date().toISOString(),
    total: veiculos.length,
    veiculos,
  };
  cachePosicoes = { dados, expiraEm: agora + TTL_POSICOES };
  return dados;
  } catch (err) {
    // stale-if-error: se a STC limitar (HTTP 429) ou cair, devolve a última
    // posicao boa do cache em vez de quebrar a tela. Aplica um pequeno cooldown
    // para nao martelar a STC enquanto ela esta bloqueando.
    if (cachePosicoes?.dados) {
      console.warn("[stc] Falha ao atualizar posicoes (" + err.message + "); servindo cache.");
      cachePosicoes.expiraEm = agora + 30 * 1000;
      return cachePosicoes.dados;
    }
    throw err;
  }
}

// ---- Trajeto (rastro) com cache incremental por placa ----
const TRAJETO_MAX_PAGINAS = Number(process.env.STC_TRAJETO_MAX_PAGINAS) || 20;
// Tempo que o cache fica "fresco" antes de buscar pontos novos (ms).
const TRAJETO_FRESH = (Number(process.env.STC_TRAJETO_FRESH_SECONDS) || 25) * 1000;
// Se o cache ficou parado mais que isso, refaz tudo (evita buracos).
const TRAJETO_REFRESH_TOTAL = 30 * 60 * 1000;
// Janela máxima mantida em cache por placa (limita memória).
const TRAJETO_MAX_JANELA = 7 * 24 * 3600 * 1000;
// Parada relevante (min): ignora "desligadas" muito curtas (ex.: semáforo).
const PARADA_MIN_MIN = Number(process.env.STC_PARADA_MIN_MINUTOS) || 3;

// placa(norm) -> { pontos:[{coordinates,date,speed,ign,positionId}], atualizadoEm }
const cacheTrajetos = new Map();

/** Formata um Date como 'YYYY-MM-DD HH:MM:SS' no horário local (formato da STC). */
function fmtData(d) {
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

/** Data 'YYYY-MM-DD HH:MM:SS' -> ms (horário local). */
function parseData(s) {
  if (!s) return 0;
  const [d, t] = s.split(' ');
  const [Y, M, D] = d.split('-').map(Number);
  const [h = 0, mi = 0, se = 0] = (t || '').split(':').map(Number);
  return new Date(Y, M - 1, D, h, mi, se).getTime();
}

/** Ponto bruto da STC -> ponto do rastro (null se coordenada inválida). */
function pontoDoTrajeto(p) {
  if (!coordValida(p.latitude, p.longitude)) return null;
  return {
    coordinates: [Number(p.latitude), Number(p.longitude)],
    date: p.date || null,
    speed: p.speed != null ? Number(p.speed) : null,
    ign: p.ign || null,
    positionId: p.positionId != null ? Number(p.positionId) : null,
  };
}

/** Busca todos os pontos de uma placa entre ini e fim (paginado, antigo->novo). */
async function fetchTrajetoPeriodo(placa, ini, fim) {
  const pontos = [];
  for (let page = 1; page <= TRAJETO_MAX_PAGINAS; page += 1) {
    const json = await postWs('getPositionsByPeriodV2', {
      date_start: fmtData(ini),
      date_end: fmtData(fim),
      plate: placa,
      page,
    });
    const bloco = json.data || {};
    const arr = bloco.data || [];
    for (const p of arr) {
      const pt = pontoDoTrajeto(p);
      if (pt) pontos.push(pt);
    }
    if (!bloco.next_page_url || arr.length === 0) break;
  }
  return pontos;
}

/**
 * Detecta paradas (motor desligado) com duração >= PARADA_MIN_MIN.
 * -> [{ coordinates, inicio, fim, duracaoMin }]
 */
function detectarParadas(pontos) {
  const paradas = [];
  let i = 0;
  while (i < pontos.length) {
    if (pontos[i].ign === 'OFF') {
      let j = i;
      while (j + 1 < pontos.length && pontos[j + 1].ign === 'OFF') j += 1;
      // Fim da parada = quando voltou a ligar (próximo ponto), se houver.
      const fimPonto = pontos[j + 1] || pontos[j];
      const duracaoMin = Math.round((parseData(fimPonto.date) - parseData(pontos[i].date)) / 60000);
      if (duracaoMin >= PARADA_MIN_MIN) {
        paradas.push({
          coordinates: pontos[i].coordinates,
          inicio: pontos[i].date,
          fim: fimPonto.date,
          duracaoMin,
        });
      }
      i = j + 1;
    } else {
      i += 1;
    }
  }
  return paradas;
}

/**
 * Trajeto recente de UMA placa nas últimas `horas`, com cache INCREMENTAL:
 * a 1ª chamada busca a janela inteira; as seguintes só pegam os pontos NOVOS
 * (desde o último), tornando a atualização rápida.
 * -> { placa, horas, atualizadoEm, kmPercorrido, paradas, pontos }
 */
export async function buscarTrajetoVeiculo(placa, horas = 24) {
  const h = Math.min(Math.max(Number(horas) || 24, 1), 168); // 1h..7 dias
  const chaveP = normPlaca(placa);
  const agora = Date.now();
  const inicioJanela = agora - h * 3600 * 1000;

  let entry = cacheTrajetos.get(chaveP);
  const cobreJanela =
    entry && entry.pontos.length && parseData(entry.pontos[0].date) <= inicioJanela + 60000;
  const muitoVelho = entry && agora - entry.atualizadoEm > TRAJETO_REFRESH_TOTAL;

  if (!entry || !cobreJanela || muitoVelho) {
    // Carga completa: primeira vez, janela maior que o cache, ou cache parado.
    const pontos = await fetchTrajetoPeriodo(placa, new Date(inicioJanela), new Date(agora));
    entry = { pontos, atualizadoEm: agora };
    cacheTrajetos.set(chaveP, entry);
  } else if (agora - entry.atualizadoEm > TRAJETO_FRESH) {
    // Incremental: busca só desde o último ponto e anexa os novos (dedup).
    const ultimo = entry.pontos[entry.pontos.length - 1];
    const desde = ultimo ? new Date(parseData(ultimo.date)) : new Date(inicioJanela);
    const novos = await fetchTrajetoPeriodo(placa, desde, new Date(agora));
    const conhecidos = new Set(entry.pontos.map((p) => p.positionId));
    for (const p of novos) {
      if (p.positionId == null || !conhecidos.has(p.positionId)) entry.pontos.push(p);
    }
    entry.pontos.sort((a, b) => (a.positionId ?? 0) - (b.positionId ?? 0));
    entry.atualizadoEm = agora;
  }

  // Limita o cache à janela máxima e recorta para a janela pedida.
  const limiteCache = agora - TRAJETO_MAX_JANELA;
  entry.pontos = entry.pontos.filter((p) => parseData(p.date) >= limiteCache);
  const pontos = entry.pontos.filter((p) => parseData(p.date) >= inicioJanela);

  let kmPercorrido = 0;
  for (let i = 1; i < pontos.length; i += 1) {
    kmPercorrido += distanciaKm(pontos[i - 1].coordinates, pontos[i].coordinates);
  }

  return {
    placa,
    horas: h,
    atualizadoEm: new Date(entry.atualizadoEm).toISOString(),
    kmPercorrido: Math.round(kmPercorrido * 10) / 10,
    paradas: detectarParadas(pontos),
    pontos,
  };
}
