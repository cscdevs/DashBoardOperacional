/**
 * Agregação da aba Reserva: matriz Empresa → Base Operacional × Tipo de Reserva
 * (contagem de pessoas). Os 5 tipos seguem o PBI.
 */

/** Tipos na ordem das colunas do PBI. [key, rótulo, cor]. */
export const TIPOS = [
  ['Abandono', 'Abandono', '#EF4444'],
  ['Afastamento', 'Afastamento', '#22C55E'],
  ['Falta Fixa', 'Falta Fixa', '#8B5CF6'],
  ['Intermitente', 'Intermitente', '#F59E0B'],
  ['Reserva', 'Reserva', '#2563EB'],
];
export const COR_TIPO = Object.fromEntries(TIPOS.map(([k, , c]) => [k, c]));

export function zeros() {
  const o = {};
  for (const [k] of TIPOS) o[k] = 0;
  return o;
}

export const totalLinha = (c) => TIPOS.reduce((s, [k]) => s + (c[k] || 0), 0);

function acumular(c, tipo) {
  if (tipo in c) c[tipo] += 1;
}

/** Rótulo do colaborador (3º nível): "RE - Nome". */
export const rotuloPessoa = (l) => `${l.re ?? '—'} - ${l.funcionario ?? ''}`.trim();

/**
 * Monta a árvore Empresa → Base Operacional → Colaborador. Cada `nivel` pode ser
 * o nome de um campo (string) ou uma função (l) => rótulo. Cada nó:
 * { label, contagens, filhos:Map }.
 */
export function montarArvore(linhas, niveis = ['empresa', 'baseOperacional', rotuloPessoa]) {
  const raiz = { contagens: zeros(), filhos: new Map() };
  for (const l of linhas) {
    acumular(raiz.contagens, l.tipoReserva);
    let node = raiz;
    for (const nivel of niveis) {
      const bruto = typeof nivel === 'function' ? nivel(l) : l[nivel];
      const label = bruto || '—';
      if (!node.filhos.has(label)) node.filhos.set(label, { label, contagens: zeros(), filhos: new Map() });
      node = node.filhos.get(label);
      acumular(node.contagens, l.tipoReserva);
    }
  }
  return raiz;
}

export function achatar(raiz, expandido) {
  const out = [];
  const walk = (node, depth, prefixo) => {
    const filhos = [...node.filhos.values()].sort(
      (a, b) => totalLinha(b.contagens) - totalLinha(a.contagens)
        || String(a.label).localeCompare(String(b.label), 'pt-BR')
    );
    for (const f of filhos) {
      const path = prefixo ? `${prefixo}${f.label}` : f.label;
      const temFilhos = f.filhos.size > 0;
      out.push({ label: f.label, depth, path, temFilhos, contagens: f.contagens });
      if (temFilhos && expandido.has(path)) walk(f, depth + 1, path);
    }
  };
  walk(raiz, 0, '');
  return out;
}

/** [{ label, value, cor }] por tipo (para o donut), só com valor > 0. */
export function distribuicao(contagens) {
  return TIPOS
    .map(([k, rotulo, cor]) => ({ label: rotulo, value: contagens[k] || 0, cor }))
    .filter((d) => d.value > 0);
}