/**
 * Sondagem da API de rastreamento STC (https://ap3.stc.srv.br).
 *
 * Objetivo: descobrir, com a key real, QUAL endpoint devolve a última posição
 * (lat/lng) dos veículos e com QUAIS nomes de campo — antes de escrever a
 * integração definitiva. Não altera nada; só imprime as respostas.
 *
 * Uso (a partir de server/):
 *   node src/scripts/stc-probe.mjs
 *
 * Lê as credenciais de server/.env:
 *   STC_BASE_URL (opcional, default https://ap3.stc.srv.br)
 *   STC_KEY      (obrigatório)
 *   STC_USER     (necessário p/ endpoints de veículo do cliente)
 *   STC_PASS     (idem)
 */
import 'dotenv/config';

const BASE = process.env.STC_BASE_URL || 'https://ap3.stc.srv.br';
const KEY = process.env.STC_KEY;
const USER = process.env.STC_USER;
const PASS = process.env.STC_PASS;

if (!KEY) {
  console.error('Faltou STC_KEY no server/.env. Abortando.');
  process.exit(1);
}

async function chamar(path, body) {
  const url = `${BASE}${path}`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const texto = await resp.text();
    let json;
    try {
      json = JSON.parse(texto);
    } catch {
      json = texto;
    }
    return { ok: resp.ok, status: resp.status, json };
  } catch (err) {
    return { ok: false, status: 0, json: `ERRO DE REDE: ${err.message}` };
  }
}

/** Imprime de forma compacta: status + 1º item de data (campos reais). */
function resumir(nome, r) {
  console.log(`\n===== ${nome} -> HTTP ${r.status} =====`);
  if (typeof r.json === 'string') {
    console.log(r.json.slice(0, 500));
    return;
  }
  const { success, error, msg } = r.json;
  console.log(`success=${success} error=${error} msg=${msg ?? ''}`);
  // data pode ser array direto OU { current_page, data: [...] } (paginado)
  let lista = r.json.data;
  if (lista && !Array.isArray(lista) && Array.isArray(lista.data)) {
    console.log(`(paginado) current_page=${lista.current_page}`);
    lista = lista.data;
  }
  if (Array.isArray(lista)) {
    console.log(`itens: ${lista.length}`);
    if (lista[0]) {
      console.log('campos do 1º item:', Object.keys(lista[0]).join(', '));
      console.log('1º item:', JSON.stringify(lista[0], null, 2));
    }
  } else {
    console.log('data:', JSON.stringify(r.json.data, null, 2)?.slice(0, 800));
  }
}

const temUserPass = USER && PASS;
console.log(`Base: ${BASE}`);
console.log(`Credenciais: key=${KEY ? 'OK' : 'FALTA'} user/pass=${temUserPass ? 'OK' : 'FALTA'}`);

// 1) Última posição de TODOS os veículos do cliente (precisa user+pass).
if (temUserPass) {
  resumir(
    'getClientVehiclesV2',
    await chamar('/ws/getClientVehiclesV2', { key: KEY, user: USER, pass: PASS, page: 1 })
  );
  resumir(
    'getClientVehicles',
    await chamar('/ws/getClientVehicles', { key: KEY, user: USER, pass: PASS, page: 1, perPage: 100 })
  );
  resumir(
    'getVehiclePositions',
    await chamar('/ws/getVehiclePositions', { key: KEY, user: USER, pass: PASS })
  );
} else {
  console.log('\n(Pulando endpoints que exigem user/pass — defina STC_USER e STC_PASS no .env.)');
}

// 2) Última posição via integração Usebens (só precisa de key + page).
resumir(
  'getUsebensLastPositionVehicle',
  await chamar('/ws/getUsebensLastPositionVehicle', { key: KEY, page: 1 })
);
