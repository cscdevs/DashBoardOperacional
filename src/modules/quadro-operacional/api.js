import { getJSON } from '../../services/api';

/** Quadro Operacional — foto do dia (Contrato × Operacional × PV). Sem parâmetros. */
export function fetchQuadroOperacional() {
  return getJSON('/api/quadro-operacional');
}

/** Aba Reserva — pessoas na Reserva Técnica por tipo. Foto do dia. */
export function fetchReserva() {
  return getJSON('/api/quadro-operacional/reserva');
}

/** Ocorrências (Excedente/Treinamento/Dobra). Datas 'YYYY-MM-DD' (padrão: 7 dias). */
export function fetchOcorrencias({ dataInicial, dataFinal } = {}) {
  const qs = new URLSearchParams();
  if (dataInicial) qs.set('dataInicial', dataInicial);
  if (dataFinal) qs.set('dataFinal', dataFinal);
  const sufixo = qs.toString() ? `?${qs}` : '';
  return getJSON(`/api/quadro-operacional/ocorrencias${sufixo}`);
}