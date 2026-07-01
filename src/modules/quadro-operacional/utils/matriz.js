/**
 * Agregação da matriz do Quadro Operacional.
 *
 * Cada linha tem { cliente, local, turno: 'Diurno'|'Noturno', contrato, operacional }.
 * A matriz é hierárquica (Cliente → Local) e cada nó acumula 4 medidas:
 *   cD/cN = Contrato Diurno/Noturno      (vagas efetivas)
 *   oD/oN = Operacional Diurno/Noturno   (vagas ocupadas)
 * Derivados:
 *   Contrato Total    = cD + cN
 *   Operacional Total = oD + oN
 *   PV (Posto Vago)   = Contrato − Operacional  (por turno e total)
 */

export function zeros() {
  return { cD: 0, cN: 0, oD: 0, oN: 0 };
}

function acumular(c, linha) {
  if (linha.turno === 'Noturno') {
    c.cN += linha.contrato || 0;
    c.oN += linha.operacional || 0;
  } else {
    c.cD += linha.contrato || 0;
    c.oD += linha.operacional || 0;
  }
}

export const contratoT = (c) => c.cD + c.cN;
export const operacionalT = (c) => c.oD + c.oN;
export const pvD = (c) => c.cD - c.oD;
export const pvN = (c) => c.cN - c.oN;
export const pvT = (c) => contratoT(c) - operacionalT(c);

/** Monta a árvore Cliente → Local. Cada nó: { label, contagens, filhos:Map }. */
export function montarArvore(linhas, niveis = ['cliente', 'local']) {
  const raiz = { contagens: zeros(), filhos: new Map() };
  for (const l of linhas) {
    acumular(raiz.contagens, l);
    let node = raiz;
    for (const nivel of niveis) {
      const label = l[nivel] || '—';
      if (!node.filhos.has(label)) node.filhos.set(label, { label, contagens: zeros(), filhos: new Map() });
      node = node.filhos.get(label);
      acumular(node.contagens, l);
    }
  }
  return raiz;
}

/**
 * Achata a árvore nas linhas visíveis (conforme paths expandidos), ordenando
 * cada nível por PV Total desc (mais postos vagos no topo, como no PBI).
 */
export function achatar(raiz, expandido) {
  const out = [];
  const walk = (node, depth, prefixo) => {
    const filhos = [...node.filhos.values()].sort(
      (a, b) => pvT(b.contagens) - pvT(a.contagens)
        || contratoT(b.contagens) - contratoT(a.contagens)
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