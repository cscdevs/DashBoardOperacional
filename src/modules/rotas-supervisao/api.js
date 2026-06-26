/**
 * Chamadas de API específicas do relatório de Rotas de Supervisão.
 * Usa o helper HTTP compartilhado (services/api).
 */
import { getJSON } from '../../services/api';

/** Relatório de Rotas de Supervisão (rotas + agrupamento p/ mapa). */
export function fetchRotasSupervisao() {
  return getJSON('/api/rotas-supervisao');
}

/** Posição ao vivo dos veículos (rastreamento STC). */
export function fetchPosicoesVeiculos() {
  return getJSON('/api/rotas-supervisao/posicoes');
}

/** Trajeto recente (rastro) de uma viatura nas últimas `horas`. */
export function fetchTrajetoVeiculo(placa, horas = 24) {
  return getJSON(`/api/rotas-supervisao/trajeto?placa=${encodeURIComponent(placa)}&horas=${horas}`);
}

/** Pontos de apoio dos supervisores (dado interno: nome/placa/coordenada). */
export function fetchPontosApoio() {
  return getJSON('/api/rotas-supervisao/pontos-apoio');
}
