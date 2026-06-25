/**
 * Chamadas de API do relatório "Geração de Cartão de Ponto" (Folha de Ponto).
 * Usa o helper HTTP compartilhado (services/api).
 */
import { getJSON } from '../../services/api';

/** Busca todos os cartões de ponto (a tela filtra por competência/empresa/etc). */
export function fetchGeracaoCartaoPonto() {
  return getJSON('/api/geracao-cartao-ponto');
}
