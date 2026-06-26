import React from 'react';

/** Paleta dos gráficos. Status fixo: Entregue (verde) / Pendências (vermelho). */
export const PALETA = [
  '#22C55E', '#EF4444', '#0EA5E9', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#1B0DAE', '#64748B',
];

/**
 * Paleta CATEGÓRICA (1 cor por entidade, ex.: gerente). Evita o verde/vermelho
 * de status para não sugerir "bom/ruim" e tem cores suficientes p/ ~16 grupos.
 */
export const PALETA_CAT = [
  '#2563EB', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6',
  '#F97316', '#0EA5E9', '#A855F7', '#84CC16', '#DB2777',
  '#0D9488', '#EAB308', '#6366F1', '#FB7185', '#06B6D4',
  '#9333EA', '#65A30D', '#E11D48', '#64748B', '#7C3AED',
];

const corPorIndice = (i) => PALETA[i % PALETA.length];

/**
 * Cor categórica ESTÁVEL a partir de um rótulo: o mesmo nome (ex.: gerente)
 * recebe sempre a mesma cor, independente da ordem/filtro do gráfico.
 */
export function corDeRotulo(rotulo) {
  const s = String(rotulo ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETA_CAT[h % PALETA_CAT.length];
}

/**
 * Cor por SEVERIDADE de pendências: quanto maior o valor (mais pendências),
 * pior — vai do verde (0) ao vermelho (máximo), passando pelo amarelo.
 * `max` é o maior valor da série (referência para o gradiente).
 */
export function corPorPendencia(valor, max = 1) {
  const r = Math.max(0, Math.min(1, (valor || 0) / (max || 1)));
  const hue = 120 * (1 - r); // 120 = verde, 60 = amarelo, 0 = vermelho
  return `hsl(${Math.round(hue)}, 75%, 45%)`;
}
const fmt = (n) => Number(n ?? 0).toLocaleString('pt-BR');
const pct = (f) => `${Math.round((f ?? 0) * 100)}%`;
const SemDados = () => <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', margin: 0 }}>Sem dados para os filtros atuais.</p>;

/**
 * Barras horizontais. `data` = [{ label, value }]. Bom para rankings.
 * `cor` pode ser uma string (cor única), um array (cor por índice) ou uma
 * função `(d, i) => cor` — útil para 1 cor por categoria (ex.: por gerente).
 */
export function BarChart({ data = [], cor = 'var(--blue)', maxBarras = 12 }) {
  const linhas = data.slice(0, maxBarras);
  const max = Math.max(...linhas.map((d) => d.value), 1);
  if (linhas.length === 0) return <SemDados />;
  const corDa = (d, i) =>
    typeof cor === 'function' ? cor(d, i, max) : Array.isArray(cor) ? cor[i % cor.length] : cor;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {linhas.map((d, i) => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span title={d.label} style={{ width: '40%', flexShrink: 0, fontSize: '0.8rem', color: 'var(--gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
            {d.label}
          </span>
          <div style={{ flex: 1, background: 'var(--gray-100)', borderRadius: '4px', height: '18px' }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: '100%', background: corDa(d, i), borderRadius: '4px', minWidth: '2px', transition: 'width 0.3s ease' }} />
          </div>
          <span className="mono" style={{ width: '52px', flexShrink: 0, fontSize: '0.8rem', color: 'var(--gray-900)', fontWeight: 600, textAlign: 'right' }}>
            {fmt(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Rosca (donut) com legenda. `data` = [{ label, value }]. */
export function DonutChart({ data = [], tamanho = 188, espessura = 24 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <SemDados />;
  const r = (tamanho - espessura) / 2;
  const circ = 2 * Math.PI * r;
  const gap = 0; // anel contínuo, sem respiro entre as fatias
  let acumulado = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} style={{ flexShrink: 0, filter: 'drop-shadow(0 4px 10px rgba(16,24,40,0.10))' }}>
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="var(--gray-100)" strokeWidth={espessura} />
        <g transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}>
          {data.map((d, i) => {
            const seg = (d.value / total) * circ;
            const len = Math.max(seg - gap, 0.5);
            const circle = (
              <circle key={d.label} cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none"
                stroke={corPorIndice(i)} strokeWidth={espessura}
                strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-acumulado}
                style={{ transition: 'stroke-dasharray 0.45s ease, stroke-dashoffset 0.45s ease' }} />
            );
            acumulado += seg;
            return circle;
          })}
        </g>
        <text x="50%" y="47%" textAnchor="middle" style={{ fontSize: '1.7rem', fontWeight: 800, fill: 'var(--gray-900)' }} className="mono">{fmt(total)}</text>
        <text x="50%" y="59%" textAnchor="middle" style={{ fontSize: '0.7rem', fill: 'var(--gray-400)', letterSpacing: '0.1em' }}>TOTAL</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '150px', flex: 1 }}>
        {data.map((d, i) => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: corPorIndice(i), flexShrink: 0 }} />
            <span title={d.label} style={{ flex: 1, color: 'var(--gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
            <span className="mono" style={{ color: 'var(--gray-900)', fontWeight: 700 }}>{fmt(d.value)}</span>
            <span style={{ color: 'var(--gray-400)', width: '40px', textAlign: 'right' }}>{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Colunas verticais (estilo Power BI). `data` = [{ label, value }].
 * `cor` pode ser string (cor única), array (cor por índice) ou função
 * `(d, i) => cor` — útil para 1 cor por categoria (ex.: por competência).
 */
export function ColumnChart({ data = [], cor = 'var(--blue)', altura = 220 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0) return <SemDados />;
  const corDa = (d, i) =>
    typeof cor === 'function' ? cor(d, i, max) : Array.isArray(cor) ? cor[i % cor.length] : cor;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', height: `${altura}px`, borderBottom: '2px solid var(--gray-200)', paddingBottom: '1px' }}>
        {data.map((d, i) => (
          <div key={d.label} title={`${d.label}: ${fmt(d.value)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '4px' }}>{fmt(d.value)}</span>
            <div style={{ width: '100%', maxWidth: '56px', height: `${(d.value / max) * 100}%`, minHeight: '3px', background: corDa(d, i), borderRadius: '6px 6px 0 0', transition: 'height 0.35s ease' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        {data.map((d) => (
          <span key={d.label} title={d.label} style={{ flex: 1, textAlign: 'center', fontSize: '0.74rem', color: 'var(--gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * Medidor semicircular (gauge) de percentual, no estilo do BI.
 * `valor` é uma fração 0..1 (ex.: 0.87 → 87%).
 */
export function Gauge({ valor = 0, cor = 'var(--success)', tamanho = 220, espessura = 22 }) {
  const f = Math.max(0, Math.min(1, valor || 0));
  const W = tamanho, H = tamanho / 2 + espessura;
  const cx = W / 2, cy = tamanho / 2 + espessura / 2;
  const r = (tamanho - espessura) / 2;
  // Semicírculo da esquerda (180°) até a direita (0°).
  const ponto = (frac) => {
    const ang = Math.PI * (1 - frac); // 1 → 180°(esq), 0 → 0°(dir)
    return { x: cx + r * Math.cos(ang), y: cy - r * Math.sin(ang) };
  };
  const arco = (de, ate) => {
    const a = ponto(de), b = ponto(ate);
    const grande = ate - de > 0.5 ? 1 : 0;
    return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} A ${r} ${r} 0 ${grande} 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <path d={arco(0, 1)} fill="none" stroke="var(--gray-100)" strokeWidth={espessura} strokeLinecap="round" />
        {f > 0 && <path d={arco(0, f)} fill="none" stroke={cor} strokeWidth={espessura} strokeLinecap="round" style={{ transition: 'all 0.5s ease' }} />}
        <text x={cx} y={cy - 6} textAnchor="middle" className="mono" style={{ fontSize: '2rem', fontWeight: 800, fill: 'var(--gray-900)' }}>{pct(f)}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: '0.7rem', fill: 'var(--gray-400)', letterSpacing: '0.1em' }}>ENTREGUE</text>
      </svg>
    </div>
  );
}

/**
 * Tabela-resumo rolável com cabeçalho fixo e linha de Total (estilo matriz do BI).
 * `colunas` = [{ chave, titulo, alinhar, mono, formato, largura }]; `total` opcional.
 */
export function TabelaResumo({ colunas = [], linhas = [], total, altura = 460, alturaFixa = false }) {
  if (!linhas || linhas.length === 0) return <SemDados />;
  // alturaFixa: ocupa sempre `altura` px (em vez de só até o conteúdo), com a
  // linha de Total grudada embaixo — útil para alinhar tabelas lado a lado.
  const estiloAltura = alturaFixa ? { height: `${altura}px` } : { maxHeight: `${altura}px` };
  return (
    <div className="sem-scrollbar" style={{ ...estiloAltura, overflowY: 'auto', overflowX: 'auto' }}>
      <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <colgroup>
          {colunas.map((c) => <col key={c.chave} style={c.largura ? { width: c.largura } : undefined} />)}
        </colgroup>
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c.chave} style={{ position: 'sticky', top: 0, background: 'var(--white)', textAlign: c.alinhar || 'left', padding: '0.45rem 0.6rem', borderBottom: '2px solid var(--gray-200)', color: 'var(--gray-500)', fontWeight: 600, lineHeight: 1.2 }}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}>
              {colunas.map((c) => (
                <td key={c.chave} className={c.mono ? 'mono' : undefined} title={String(l[c.chave] ?? '')} style={{ padding: '0.4rem 0.6rem', textAlign: c.alinhar || 'left', color: 'var(--gray-700)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.formato ? c.formato(l[c.chave], l) : l[c.chave]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {total && (
          <tfoot>
            <tr>
              {colunas.map((c, idx) => (
                <td key={c.chave} className={c.mono ? 'mono' : undefined} style={{ position: 'sticky', bottom: 0, background: 'var(--gray-100)', borderTop: '2px solid var(--gray-200)', padding: '0.5rem 0.6rem', textAlign: c.alinhar || 'left', fontWeight: 700, color: 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {idx === 0 ? 'Total' : c.formato ? c.formato(total[c.chave], total) : total[c.chave]}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
