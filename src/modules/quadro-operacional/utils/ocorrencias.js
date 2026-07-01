/**
 * Agregações das abas Excedente / Treinamento / Dobra ("Ocorrências").
 * Cada registro é uma ocorrência (1 ponto). Contamos ocorrências por:
 *   - árvore Cliente → Posto → Colaborador (tabela principal);
 *   - Cliente (donut), Gerente (tabela) e Empresa (barra).
 */

export const rotuloPessoa = (l) => `${l.re ?? '—'} - ${l.funcionario ?? ''}`.trim();

/** Árvore de contagem por níveis (default Cliente → Posto → Colaborador). */
export function montarArvore(linhas, niveis = ['cliente', 'posto', rotuloPessoa]) {
  const raiz = { total: 0, filhos: new Map() };
  for (const l of linhas) {
    raiz.total += 1;
    let node = raiz;
    for (const nivel of niveis) {
      const bruto = typeof nivel === 'function' ? nivel(l) : l[nivel];
      const label = bruto || '—';
      if (!node.filhos.has(label)) node.filhos.set(label, { label, total: 0, filhos: new Map() });
      node = node.filhos.get(label);
      node.total += 1;
    }
  }
  return raiz;
}

/** Achata a árvore nas linhas visíveis (paths expandidos), por total desc. */
export function achatar(raiz, expandido) {
  const out = [];
  const walk = (node, depth, prefixo) => {
    const filhos = [...node.filhos.values()].sort(
      (a, b) => b.total - a.total || String(a.label).localeCompare(String(b.label), 'pt-BR')
    );
    for (const f of filhos) {
      const path = prefixo ? `${prefixo}${f.label}` : f.label;
      const temFilhos = f.filhos.size > 0;
      out.push({ label: f.label, depth, path, temFilhos, total: f.total });
      if (temFilhos && expandido.has(path)) walk(f, depth + 1, path);
    }
  };
  walk(raiz, 0, '');
  return out;
}

/** Contagem por um campo, ordenada desc: [{ label, value }]. */
export function contarPor(linhas, campo) {
  const m = new Map();
  for (const l of linhas) {
    const k = (l[campo] == null || l[campo] === '') ? '—' : l[campo];
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/** Top-N + "Outros" agrupado (para o donut). */
export function topComOutros(itens, n = 9) {
  if (itens.length <= n) return itens;
  const top = itens.slice(0, n);
  const resto = itens.slice(n).reduce((s, i) => s + i.value, 0);
  return resto > 0 ? [...top, { label: 'Outros', value: resto }] : top;
}