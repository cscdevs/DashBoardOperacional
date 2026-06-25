import React from 'react';

/** Paleta de cores dos gráficos (reutilizada por donut, barras e colunas). */
export const PALETA = [
  '#1B0DAE', '#0EA5E9', '#22C55E', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#64748B',
];

const corPorIndice = (i) => PALETA[i % PALETA.length];
const fmt = (n) => Number(n ?? 0).toLocaleString('pt-BR');
const SemDados = () => <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', margin: 0 }}>Sem dados no período.</p>;

/**
 * Barras horizontais. `data` = [{ label, value }]. Bom para rankings.
 */
export function BarChart({ data = [], cor = 'var(--blue)', maxBarras = 10 }) {
  const linhas = data.slice(0, maxBarras);
  const max = Math.max(...linhas.map((d) => d.value), 1);
  if (linhas.length === 0) return <SemDados />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {linhas.map((d) => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span title={d.label} style={{ width: '38%', flexShrink: 0, fontSize: '0.8rem', color: 'var(--gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
            {d.label}
          </span>
          <div style={{ flex: 1, background: 'var(--gray-100)', borderRadius: '4px', height: '18px' }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: '100%', background: cor, borderRadius: '4px', minWidth: '2px', transition: 'width 0.3s ease' }} />
          </div>
          <span className="mono" style={{ width: '48px', flexShrink: 0, fontSize: '0.8rem', color: 'var(--gray-900)', fontWeight: 600, textAlign: 'right' }}>
            {fmt(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Rosca (donut) com legenda. `data` = [{ label, value }]. Bom para distribuições.
 */
export function DonutChart({ data = [], tamanho = 188, espessura = 24 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <SemDados />;
  const r = (tamanho - espessura) / 2;
  const circ = 2 * Math.PI * r;
  const gap = 0; // anel contínuo, sem respiro entre as fatias
  let acumulado = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} className="neon-shadow" style={{ flexShrink: 0 }}>
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
 * `cor` pode ser uma string ou um array (uma cor por coluna).
 */
export function ColumnChart({ data = [], cor = 'var(--blue)', altura = 220 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0) return <SemDados />;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', height: `${altura}px`, borderBottom: '2px solid var(--gray-200)', paddingBottom: '1px' }}>
        {data.map((d, i) => (
          <div key={d.label} title={`${d.label}: ${fmt(d.value)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '4px' }}>{fmt(d.value)}</span>
            <div style={{ width: '100%', maxWidth: '56px', height: `${(d.value / max) * 100}%`, minHeight: '3px', background: Array.isArray(cor) ? cor[i % cor.length] : cor, borderRadius: '6px 6px 0 0', transition: 'height 0.35s ease' }} />
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

/** Gera um path com segmentos RETOS (linha quebrada) a partir de pontos {x,y}. */
function pathReto(pts) {
  if (!pts.length) return '';
  return 'M ' + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ');
}

/**
 * Área com linha SUAVE para séries temporais. `data` = [{ label, value }]
 * em ordem cronológica. Ocupa 100% da largura (sem barra de rolagem).
 */
export function AreaChart({ data = [], cor = 'var(--blue)', altura = 240 }) {
  if (data.length === 0) return <SemDados />;
  const n = data.length;
  const W = 760, H = altura;
  const padX = 42, padTop = 28, padBottom = 30;
  const max = Math.max(...data.map((d) => d.value), 1);
  const x = (i) => padX + (i * (W - 2 * padX)) / Math.max(n - 1, 1);
  const y = (v) => H - padBottom - (v / max) * (H - padTop - padBottom);
  const pts = data.map((d, i) => ({ x: x(i), y: y(d.value) }));
  const linha = pathReto(pts);
  const area = `${linha} L ${x(n - 1).toFixed(1)} ${H - padBottom} L ${x(0).toFixed(1)} ${H - padBottom} Z`;
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const passoRotulo = Math.max(1, Math.ceil(n / 12)); // evita rótulos sobrepostos
  const mostrarValores = n <= 62; // mostra a quantidade nos pontos (até ~2 meses)
  const gradId = 'fa-area-grad';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', height: 'auto', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.32" />
          <stop offset="100%" stopColor={cor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => {
        const gy = y(t);
        return (
          <g key={i}>
            <line x1={padX} y1={gy} x2={W - padX / 2} y2={gy} stroke="var(--gray-200)" strokeWidth="1" strokeDasharray="3 4" />
            <text x={padX - 8} y={gy + 4} textAnchor="end" style={{ fontSize: '13px', fill: 'var(--gray-400)' }}>{fmt(t)}</text>
          </g>
        );
      })}
      <path d={area} fill={`url(#${gradId})`} />
      <path d={linha} fill="none" stroke={cor} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" className="neon-shadow" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r="4.5" fill="var(--white)" stroke={cor} strokeWidth="2.5" />
          {mostrarValores && (
            <text x={x(i)} y={y(d.value) - 11} textAnchor="middle" className="mono" style={{ fontSize: '11px', fontWeight: 700, fill: 'var(--gray-900)' }}>{fmt(d.value)}</text>
          )}
          {i % passoRotulo === 0 && (
            <text x={x(i)} y={H - 9} textAnchor="middle" style={{ fontSize: '13px', fill: 'var(--gray-500)' }}>{d.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

/**
 * Tabela-resumo rolável com cabeçalho fixo e linha de Total (estilo matriz do BI).
 * `colunas` = [{ chave, titulo, alinhar, mono, formato }]; `total` = objeto opcional.
 */
export function TabelaResumo({ colunas = [], linhas = [], total, altura = 460 }) {
  if (!linhas || linhas.length === 0) return <SemDados />;
  return (
    <div className="sem-scrollbar" style={{ maxHeight: `${altura}px`, overflowY: 'auto' }}>
      <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <colgroup>
          {colunas.map((c) => <col key={c.chave} style={c.largura ? { width: c.largura } : undefined} />)}
        </colgroup>
        <thead>
          <tr className="glass-table-header">
            {colunas.map((c) => (
              <th key={c.chave} style={{ position: 'sticky', top: 0, textAlign: c.alinhar || 'left', padding: '0.6rem 0.6rem', borderBottom: '2px solid var(--gray-200)', color: 'var(--gray-700)', fontWeight: 600, lineHeight: 1.2 }}>
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
                  {c.formato ? c.formato(l[c.chave]) : l[c.chave]}
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
                  {idx === 0 ? 'Total' : c.formato ? c.formato(total[c.chave]) : total[c.chave]}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/**
 * Lista limpa e rolável: nome à esquerda, valor à direita, separador leve.
 * Sem barras. `data` = [{ label, value }] ordenado desc.
 */
export function RankList({ data = [], maxItens = 200, altura = 320 }) {
  if (data.length === 0) return <SemDados />;
  const itens = data.slice(0, maxItens);
  return (
    <div className="sem-scrollbar" style={{ maxHeight: `${altura}px`, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {itens.map((d) => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.4rem 0.25rem', borderBottom: '1px solid var(--gray-100)' }}>
          <span title={d.label} style={{ flex: 1, fontSize: '0.83rem', color: 'var(--gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.label}
          </span>
          <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-900)', flexShrink: 0 }}>
            {fmt(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
