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
    gerente: mapa.get(chaveGerente(l.empresa, l.cliente, l.local, l.areaSupervisao)) || null,
  }));
}
