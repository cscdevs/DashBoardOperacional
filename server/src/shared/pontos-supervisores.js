/**
 * Pontos de apoio dos supervisores (1 ponto por supervisor), gerados a partir
 * da planilha pelo script `scripts/gerar-pontos-supervisores.py`.
 *
 * PRIVACIDADE: por design o JSON guarda apenas { nome, placa, coordinates } —
 * sem endereço textual nem CPF. É dado interno e sensível; o frontend expõe de
 * forma discreta (rótulo neutro "Ponto de apoio").
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { casarSupervisorPorNome } from '../reports/rotas-supervisao/supervisores.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PONTOS_PATH = join(__dirname, 'pontos-supervisores.json');

let _cache = null;
/** Carrega (1x, em cache) a lista de pontos. Lista vazia se o arquivo não existe. */
export function carregarPontosSupervisores() {
  if (_cache) return _cache;
  if (!existsSync(PONTOS_PATH)) {
    _cache = [];
    return _cache;
  }
  try {
    const lista = JSON.parse(readFileSync(PONTOS_PATH, 'utf-8'));
    // Enriquece com o nome CURTO do supervisor (o mesmo que vem nas viaturas via
    // BDV, ex.: "CARLA"), para o frontend casar cada viatura ao SEU próprio
    // ponto de apoio — e não a qualquer ponto.
    _cache = lista.map((p) => ({ ...p, supervisor: casarSupervisorPorNome(p.nome) }));
  } catch {
    _cache = [];
  }
  return _cache;
}