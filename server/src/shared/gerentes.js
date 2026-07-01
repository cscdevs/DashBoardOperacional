/**
 * De-para Área/Local -> GERENTE.
 *
 * O relatório "Geração de Cartão de Ponto" agrupa por GERENTE, mas o SQL Server
 * NÃO traz o gerente em nenhuma coluna. Essa informação vem de uma planilha
 * mantida fora do sistema (BI), convertida no JSON ao lado deste arquivo
 * (`gerentes.depara.json`) pelo script `scripts/gerar-depara-gerentes.py`.
 *
 * IMPORTANTE: a chave de junção é EMPRESA + CLIENTE + LOCAL + AREASUPERVISAO —
 * é a única combinação que identifica o gerente sem ambiguidade. Área sozinha
 * (ou Cliente+Local) mapeia o mesmo grupo para gerentes diferentes.
 *
 * Para atualizar o de-para quando a planilha mudar:
 *   python src/scripts/gerar-depara-gerentes.py "caminho/da/planilha.xlsx"
 *
 * Uso típico (as linhas precisam ter empresa/cliente/local/areaSupervisao):
 *   const linhas = marcarGerentes(rows);
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEPARA_PATH = join(__dirname, 'gerentes.depara.json');

/**
 * Normaliza um texto para casar entre a planilha e o SQL (sem acento, sem
 * espaço duplo, maiúsculas). DEVE ser idêntica à `normalizar()` do script
 * Python que gera o JSON — senão a chave não casa.
 */
function normalizar(t) {
  return String(t ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/** Chave composta Empresa + Cliente + Local + Área (única que não conflita). */
export function chaveGerente(empresa, cliente, local, area) {
  return [normalizar(empresa), normalizar(cliente), normalizar(local), normalizar(area)].join('|');
}

/**
 * Fallback por palavra-chave na ÁREA de supervisão, aplicado SÓ quando a
 * combinação exata (Empresa+Cliente+Local+Área) não está na planilha. Regras
 * informadas pela operação. Ordem importa (primeira que casar vence).
 */
const REGRAS_AREA = [
  [/TIC TRENS - NASCIMENTO/, 'Wederson Carlos'],
  [/TIC TREM/, 'Ellington'],
  // SME Portaria é do Wederson (vem ANTES da regra geral SME). Vigilância é por
  // CARGO (ver REGRAS_CLIENTE_CARGO), não por área.
  [/SME PORTARIA/, 'Wederson Carlos'],
  [/\bSME\b/, 'Vitor Guedes'],
  [/METRO/, 'Hebert Alves'],
  [/TENIS/, 'Wederson Carlos'],
  [/RIBEIRAO PRETO/, 'Felipe Torres'],
  [/CAMPINAS/, 'Felipe Torres'],
  [/MEQUI/, 'Wederson Carlos'],
  [/CGU/, 'Luiz Claudio'],
  [/SAMU/, 'Wederson Carlos'],
  [/BUTANTAN/, 'Wederson Carlos'],
  [/TJ - ROBSON/, 'Wederson Carlos'],
  [/NATALIA/, 'Wederson Carlos'],
];

/** Gerente pela Área (palavra-chave), ou null se nenhuma regra casar. */
export function gerentePorArea(area) {
  const n = normalizar(area);
  if (!n) return null;
  for (const [re, gerente] of REGRAS_AREA) if (re.test(n)) return gerente;
  return null;
}

/**
 * Fallback por CLIENTE — último recurso, para casos sem Área de Supervisão
 * (ex.: Jacobina Mineração). Aplicado só quando exato e Área falham.
 */
const REGRAS_CLIENTE = [
  [/JACOBINA/, 'Luiz Claudio'],
  [/\bSME\b/, 'Vitor Guedes'], // SME sem área (ex.: SME 240/2025 - DRE CS)
];

/** Gerente pelo Cliente (palavra-chave), ou null. */
export function gerentePorCliente(cliente) {
  const n = normalizar(cliente);
  if (!n) return null;
  for (const [re, gerente] of REGRAS_CLIENTE) if (re.test(n)) return gerente;
  return null;
}

/**
 * Fallback por CLIENTE + CARGO. No SME, Porteiro e Vigilante são do Wederson
 * (o restante do SME é do Vitor). [regexCliente, regexCargo, gerente].
 */
const REGRAS_CLIENTE_CARGO = [
  [/\bSME\b/, /PORTEIRO|VIGILANTE/, 'Wederson Carlos'],
];

/** Gerente por Cliente+Cargo, ou null. */
export function gerentePorClienteCargo(cliente, cargo) {
  const c = normalizar(cliente);
  const g = normalizar(cargo);
  if (!c || !g) return null;
  for (const [reCli, reCargo, gerente] of REGRAS_CLIENTE_CARGO) {
    if (reCli.test(c) && reCargo.test(g)) return gerente;
  }
  return null;
}

/**
 * Resolve o gerente em cascata: chave exata (planilha) → Cliente+Cargo (ex.:
 * SME Porteiro/Vigilante → Wederson) → fallback por Área → fallback por Cliente.
 * Retorna null se nada casar.
 */
export function resolverGerente(mapa, empresa, cliente, local, area, cargo) {
  return mapa.get(chaveGerente(empresa, cliente, local, area))
    || gerentePorClienteCargo(cliente, cargo)
    || gerentePorArea(area)
    || gerentePorCliente(cliente)
    || null;
}

let _mapa = null;
/** Carrega (1x, em cache) o mapa { "EMP|CLI|LOC|AREA" -> gerente }. */
export function carregarGerentes() {
  if (_mapa) return _mapa;
  const raw = JSON.parse(readFileSync(DEPARA_PATH, 'utf-8'));
  _mapa = new Map(Object.entries(raw));
  return _mapa;
}

/**
 * Adiciona `gerente` (string ou null) a cada linha, casando por
 * Empresa + Cliente + Local + Área. Não remove nem altera as demais linhas.
 *
 * @param {Array<object>} linhas linhas do relatório (com empresa/cliente/local/areaSupervisao)
 * @param {Map<string,string>} mapa mapa retornado por carregarGerentes()
 */
export function marcarGerentes(linhas, mapa = carregarGerentes()) {
  return linhas.map((l) => ({
    ...l,
    gerente: resolverGerente(mapa, l.empresa, l.cliente, l.local, l.areaSupervisao, l.cargo),
  }));
}
