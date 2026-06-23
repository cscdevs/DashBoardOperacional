/**
 * Regra TRANSVERSAL de locais "administrativos" que, por padrão, não devem
 * aparecer nos relatórios: locais cujo NOME contém "Abandono", "Afastamento"
 * ou "Faltante" (são buckets da Reserva Técnica, não locais reais de trabalho).
 *
 * Usado por todos os relatórios: esses locais são SEMPRE excluídos da tela.
 */
const PADROES = ['ABANDONO', 'AFASTAMENTO', 'FALTANTE'];

/** Normaliza removendo acentos e caixa, para casar o nome de forma robusta. */
function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();
}

/** True se o nome do local for de Abandono/Afastamento/Faltante. */
export function ehLocalEspecial(nomeLocal) {
  const n = normalizar(nomeLocal);
  return PADROES.some((p) => n.includes(p));
}
