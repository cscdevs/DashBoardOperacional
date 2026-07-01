import React, { useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { montarArvore, achatar, contarPor, topComOutros } from './utils/ocorrencias';
import {
  AlertTriangle, Loader2, ChevronRight, ChevronDown, ListTree, Minimize2,
} from 'lucide-react';

const fmtInt = (v) => Number(v ?? 0).toLocaleString('pt-BR');
const inputStyle = {
  padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--gray-200)',
  backgroundColor: 'var(--white)', color: 'var(--gray-900)', fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem',
};
const PALETA = ['#2563EB', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#0EA5E9', '#A855F7', '#64748B'];

/** Donut SVG. data = [{ label, value }]. */
const Donut = ({ data, tamanho = 190, espessura = 24 }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>Sem dados.</p>;
  const r = (tamanho - espessura) / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} style={{ flexShrink: 0 }}>
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="var(--gray-100)" strokeWidth={espessura} />
        <g transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}>
          {data.map((d, i) => {
            const seg = (d.value / total) * circ;
            const el = (
              <circle key={d.label} cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke={PALETA[i % PALETA.length]}
                strokeWidth={espessura} strokeDasharray={`${seg} ${circ - seg}`} strokeDashoffset={-acc} />
            );
            acc += seg;
            return el;
          })}
        </g>
        <text x="50%" y="48%" textAnchor="middle" className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, fill: 'var(--gray-900)' }}>{fmtInt(total)}</text>
        <text x="50%" y="59%" textAnchor="middle" style={{ fontSize: '0.6rem', fill: 'var(--gray-400)', letterSpacing: '0.1em' }}>TOTAL</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: '150px', flex: 1, maxHeight: '210px', overflowY: 'auto' }}>
        {data.map((d, i) => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem' }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: PALETA[i % PALETA.length], flexShrink: 0 }} />
            <span title={d.label} style={{ flex: 1, color: 'var(--gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
            <span className="mono" style={{ color: 'var(--gray-900)', fontWeight: 700 }}>{fmtInt(d.value)}</span>
            <span style={{ color: 'var(--gray-400)', width: 36, textAlign: 'right' }}>{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Barras horizontais. data = [{ label, value }]. */
const HBar = ({ data, cor = 'var(--blue)', max = 14 }) => {
  const linhas = data.slice(0, max);
  const top = Math.max(...linhas.map((d) => d.value), 1);
  if (!linhas.length) return <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>Sem dados.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {linhas.map((d) => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span title={d.label} style={{ width: '42%', flexShrink: 0, fontSize: '0.78rem', color: 'var(--gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{d.label}</span>
          <div style={{ flex: 1, background: 'var(--gray-100)', borderRadius: 4, height: 16 }}>
            <div style={{ width: `${(d.value / top) * 100}%`, height: '100%', background: cor, borderRadius: 4, minWidth: 2 }} />
          </div>
          <span className="mono" style={{ width: 48, flexShrink: 0, fontSize: '0.78rem', color: 'var(--gray-900)', fontWeight: 600, textAlign: 'right' }}>{fmtInt(d.value)}</span>
        </div>
      ))}
    </div>
  );
};

export const OcorrenciasView = ({ registros, resultado, carregando, erro, de, ate, setDe, setAte, periodo, hoje }) => {
  const [expandido, setExpandido] = useState(new Set());

  const linhas = useMemo(() => registros.filter((r) => r.resultado === resultado), [registros, resultado]);
  const arvore = useMemo(() => montarArvore(linhas), [linhas]);
  const flat = useMemo(() => achatar(arvore, expandido), [arvore, expandido]);
  const porCliente = useMemo(() => topComOutros(contarPor(linhas, 'cliente')), [linhas]);
  const porGerente = useMemo(() => contarPor(linhas, 'gerente'), [linhas]);
  const porEmpresa = useMemo(() => contarPor(linhas, 'empresa'), [linhas]);

  const toggle = (path) => setExpandido((s) => {
    const n = new Set(s);
    if (n.has(path)) n.delete(path); else n.add(path);
    return n;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <style>{`
        .oc-tbl { width:100%; border-collapse:collapse; font-size:0.82rem; }
        .oc-tbl thead th { position:sticky; top:0; z-index:2; background:var(--white); color:var(--gray-500); font-weight:700;
          font-size:0.72rem; padding:0.45rem 0.55rem; white-space:nowrap; border-bottom:2px solid var(--gray-200); }
        .oc-tbl th.num, .oc-tbl td.num { text-align:right; }
        .oc-tbl td.num { font-variant-numeric:tabular-nums; color:var(--gray-800); padding:0.34rem 0.55rem; font-weight:700; }
        .oc-tbl td.oc-label { max-width:520px; overflow:hidden; text-overflow:ellipsis; color:var(--gray-700); padding:0.34rem 0.6rem; white-space:nowrap; }
        .oc-tbl tbody td { border-bottom:1px solid var(--gray-100); background:var(--white); }
        .oc-tbl tr.tem-filhos td.oc-label { cursor:pointer; }
        .oc-tbl tr.d0 td { border-top:1px solid var(--gray-200); }
        .oc-tbl tr.d0 td.oc-label { font-weight:700; color:var(--gray-900); box-shadow:inset 3px 0 0 var(--blue); }
        .oc-tbl tr.d2 td.oc-label { color:var(--gray-500); }
        .oc-tbl tbody tr:hover td { background:var(--blue-50); }
        .oc-gtbl { width:100%; border-collapse:collapse; font-size:0.82rem; }
        .oc-gtbl td { padding:0.34rem 0.55rem; border-bottom:1px solid var(--gray-100); white-space:nowrap; }
        .oc-gtbl td.num { text-align:right; font-variant-numeric:tabular-nums; font-weight:700; color:var(--gray-900); }
      `}</style>

      {/* Filtro de datas */}
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>De</label>
            <input type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Até</label>
            <input type="date" value={ate} min={de} max={hoje} onChange={(e) => setAte(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-500)' }}>Ocorrências no período</p>
            <p className="mono" style={{ margin: '0.15rem 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--blue)' }}>{fmtInt(linhas.length)}</p>
          </div>
        </div>
      </Card>

      {erro ? (
        <Card style={{ borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-bg)' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle size={24} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <div>
              <h3 style={{ color: 'var(--danger)', margin: 0 }}>Não foi possível carregar as ocorrências</h3>
              <p style={{ color: 'var(--gray-700)', margin: '0.5rem 0 0' }}>{erro}</p>
            </div>
          </div>
        </Card>
      ) : carregando ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem' }}>
          <Loader2 size={40} className="spin" style={{ color: 'var(--blue)' }} />
          <p style={{ color: 'var(--gray-500)' }}>Carregando ocorrências... (consulta pesada, pode levar ~1 min na 1ª vez)</p>
        </div>
      ) : (
        <>
          <div className="grid-2-cols" style={{ alignItems: 'stretch' }}>
            {/* Tabela Cliente -> Posto -> Colaborador */}
            <Card style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ color: 'var(--gray-900)', margin: 0, fontSize: '1rem' }}>Cliente / Posto / Colaborador</h3>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button onClick={() => setExpandido(new Set([...arvore.filhos.keys()]))} style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', padding: '0.35rem 0.6rem' }}><ListTree size={14} /> Expandir</button>
                  <button onClick={() => setExpandido(new Set())} style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', padding: '0.35rem 0.6rem' }}><Minimize2 size={14} /> Recolher</button>
                </div>
              </div>
              <div className="sem-scrollbar" style={{ maxHeight: '460px', overflow: 'auto', border: '1px solid var(--gray-200)', borderRadius: '8px' }}>
                <table className="oc-tbl">
                  <thead><tr><th style={{ textAlign: 'left' }}>Cliente / Posto / Colaborador</th><th className="num">Qtd.</th></tr></thead>
                  <tbody>
                    {flat.length === 0 ? (
                      <tr><td colSpan={2} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--gray-400)' }}>Sem ocorrências no período.</td></tr>
                    ) : flat.map((l) => {
                      const aberto = expandido.has(l.path);
                      return (
                        <tr key={l.path} className={`d${l.depth}${l.temFilhos ? ' tem-filhos' : ''}`}>
                          <td className="oc-label" onClick={() => l.temFilhos && toggle(l.path)} style={{ paddingLeft: `${0.55 + l.depth * 1.15}rem` }} title={l.label}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              {l.temFilhos ? (aberto ? <ChevronDown size={14} style={{ flexShrink: 0, color: 'var(--gray-400)' }} /> : <ChevronRight size={14} style={{ flexShrink: 0, color: 'var(--gray-400)' }} />) : <span style={{ width: 14, flexShrink: 0 }} />}
                              {l.label}
                            </span>
                          </td>
                          <td className="num">{fmtInt(l.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Donut por cliente */}
            <Card style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ color: 'var(--gray-900)', marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Percentual por Cliente</h3>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}><Donut data={porCliente} /></div>
            </Card>
          </div>

          <div className="grid-2-cols" style={{ alignItems: 'stretch' }}>
            {/* Tabela Gerente */}
            <Card style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ color: 'var(--gray-900)', marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem' }}>Por Gerente</h3>
              <div className="sem-scrollbar" style={{ maxHeight: '320px', overflow: 'auto', border: '1px solid var(--gray-200)', borderRadius: '8px' }}>
                <table className="oc-gtbl">
                  <tbody>
                    {porGerente.map((g) => (
                      <tr key={g.label}><td title={g.label} style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '320px' }}>{g.label}</td><td className="num">{fmtInt(g.value)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Barra por empresa */}
            <Card style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ color: 'var(--gray-900)', marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Qtd × Empresa</h3>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}><HBar data={porEmpresa} cor="var(--blue)" /></div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};