/**
 * Chamadas de API do relatório "Fluxo de Atestados - Faltas por Cliente".
 * Usa o helper HTTP compartilhado (services/api).
 */
import { getJSON } from '../../services/api';

/**
 * Busca os 3 conjuntos (atestados, faltas por cliente, faltas disciplinares)
 * para o período informado (datas no formato YYYY-MM-DD).
 */
export function fetchFluxoAtestadosFaltas({ dataInicial, dataFinal } = {}) {
  const qs = new URLSearchParams();
  if (dataInicial) qs.set('dataInicial', dataInicial);
  if (dataFinal) qs.set('dataFinal', dataFinal);
  const sufixo = qs.toString() ? `?${qs}` : '';
  return getJSON(`/api/fluxo-atestados-faltas${sufixo}`);
}
