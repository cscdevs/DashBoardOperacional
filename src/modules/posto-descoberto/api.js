import { getJSON } from '../../services/api';

/**
 * Busca os postos descobertos no período. Datas no formato 'YYYY-MM-DD'.
 * Sem datas, o backend usa os últimos 7 dias.
 */
export function fetchPostoDescoberto({ dataInicial, dataFinal } = {}) {
  const qs = new URLSearchParams();
  if (dataInicial) qs.set('dataInicial', dataInicial);
  if (dataFinal) qs.set('dataFinal', dataFinal);
  const sufixo = qs.toString() ? `?${qs}` : '';
  return getJSON(`/api/posto-descoberto${sufixo}`);
}