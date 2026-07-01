/**
 * Agregação da matriz de Postos Descobertos.
 *
 * Colunas (motivos) seguem o PBI:
 *   Subtotal = PV + FA + FE + FO + RM + SU + RE
 *   Extra    = SA, CR (cobertura parcial, fora do Subtotal)
 *   Total Geral = Subtotal + SA + CR
 *
 * A matriz é hierárquica: Cliente → Local → Posto, contando ocorrências
 * (posto × dia) de cada motivo.
 */

/** Colunas que compõem o Subtotal de "descobertos". [key, rótulo]. */
export const COLS_SUBTOTAL = [
  ['PV', 'Posto Vago'],
  ['FA', 'Falta'],
  ['FE', 'Férias'],
  ['FO', 'Folga'],
  ['RM', 'Remanejamento'],
  ['SU', 'Suspensão'],
  ['RE', 'Reciclagem'],
];

/** Colunas extra (cobertura parcial), exibidas após o Subtotal. */
export const COLS_EXTRA = [
  ['SA', 'Saída Antecipada'],
  ['CR', 'Correção'],
];

export const TODAS_COLS = [...COLS_SUBTOTAL, ...COLS_EXTRA];

const norm = (t) => String(t || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase();

/** MotivoPV (texto do SQL) → chave de coluna. Desconhecido/null → null. */
const MOTIVO_COL = {
  'POSTO VAGO': 'PV',
  FALTA: 'FA',
  FERIAS: 'FE',
  FOLGA: 'FO',
  REMANEJAMENTO: 'RM',
  SUSPENSAO: 'SU',
  RECICLAGEM: 'RE',
  'SAIDA ANTECIPADA': 'SA',
  CORRECAO: 'CR',
};
export const colDoMotivo = (motivo) => MOTIVO_COL[norm(motivo)] || null;

/** Objeto de contagens zeradas para todas as colunas. */
export function zeros() {
  const o = {};
  for (const [k] of TODAS_COLS) o[k] = 0;
  return o;
}

export const subtotal = (c) => COLS_SUBTOTAL.reduce((s, [k]) => s + (c[k] || 0), 0);
export const totalGeral = (c) => subtotal(c) + COLS_EXTRA.reduce((s, [k]) => s + (c[k] || 0), 0);

/**
 * Monta a árvore de agregação. Cada nó tem { label, contagens, filhos:Map }.
 * A raiz acumula o total geral do conjunto.
 */
export function montarArvore(linhas, niveis = ['cliente', 'local', 'posto']) {
  const raiz = { contagens: zeros(), filhos: new Map() };
  for (const l of linhas) {
    const col = colDoMotivo(l.motivoPV);
    if (col) raiz.contagens[col] += 1;
    let node = raiz;
    for (const nivel of niveis) {
      const label = l[nivel] || '—';
      if (!node.filhos.has(label)) node.filhos.set(label, { label, contagens: zeros(), filhos: new Map() });
      node = node.filhos.get(label);
      if (col) node.contagens[col] += 1;
    }
  }
  return raiz;
}

const SEP = '';

/**
 * Achata a árvore nas linhas visíveis, dado o conjunto de paths expandidos.
 * Ordena cada nível por Total Geral desc. Retorna [{ label, depth, path,
 * temFilhos, contagens }].
 */
export function achatar(raiz, expandido) {
  const out = [];
  const walk = (node, depth, prefixo) => {
    const filhos = [...node.filhos.values()].sort(
      (a, b) => totalGeral(b.contagens) - totalGeral(a.contagens) || String(a.label).localeCompare(String(b.label), 'pt-BR')
    );
    for (const f of filhos) {
      const path = prefixo ? `${prefixo}${SEP}${f.label}` : f.label;
      const temFilhos = f.filhos.size > 0;
      out.push({ label: f.label, depth, path, temFilhos, contagens: f.contagens });
      if (temFilhos && expandido.has(path)) walk(f, depth + 1, path);
    }
  };
  walk(raiz, 0, '');
  return out;
}
