import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { fetchReserva } from './api';
import {
  TIPOS, COR_TIPO, totalLinha, montarArvore, achatar, distribuicao,
} from './utils/reserva';
import {
  AlertTriangle, Loader2, Search, ChevronRight, ChevronDown, Sun, Moon, ListTree, Minimize2,
} from 'lucide-react';

const fmtInt = (v) => Number(v ?? 0).toLocaleString('pt-BR');
const N = (v) => (v ? fmtInt(v) : '');

const inputStyle = {
  padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--gray-200)',
  backgroundColor: 'var(--white)', color: 'var(--gray-900)', fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem',
};

const TURNOS = ['DIURNO', 'NOTURNO'];

const Chip = ({ ativo, onClick, icone: Icone, children }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.8rem', borderRadius: '999px',
    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
    border: `1px solid ${ativo ? 'var(--blue)' : 'var(--gray-200)'}`,
    background: ativo ? 'var(--blue)' : 'var(--white)', color: ativo ? 'var(--white)' : 'var(--gray-500)',
  }}>
    {Icone && <Icone size={14} />} {children}
  </button>
);

/** Donut simples (SVG). data = [{ label, value, cor }]. */
const Donut = ({ data, tamanho = 200, espessura = 26 }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>Sem dados.</p>;
  const r = (tamanho - espessura) / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} style={{ flexShrink: 0 }}>
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="var(--gray-100)" strokeWidth={espessura} />
        <g transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}>
          {data.map((d) => {
            const seg = (d.value / total) * circ;
            const el = (
              <circle key={d.label} cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke={d.cor}
                strokeWidth={espessura} strokeDasharray={`${seg} ${circ - seg}`} strokeDashoffset={-acc} />
            );
            acc += seg;
            return el;
          })}
        </g>
        <text x="50%" y="48%" textAnchor="middle" className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, fill: 'var(--gray-900)' }}>{fmtInt(total)}</text>
        <text x="50%" y="59%" textAnchor="middle" style={{ fontSize: '0.62rem', fill: 'var(--gray-400)', letterSpacing: '0.1em' }}>TOTAL</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '160px' }}>
        {data.map((d) => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: d.cor, flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--gray-700)' }}>{d.label}</span>
            <span className="mono" style={{ color: 'var(--gray-900)', fontWeight: 700 }}>{fmtInt(d.value)}</span>
            <span style={{ color: 'var(--gray-400)', width: 38, textAlign: 'right' }}>{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const KpiCard = ({ titulo, valor, cor }) => (
  <Card style={{ position: 'relative', overflow: 'hidden' }}>
    <p style={{ color: 'var(--gray-500)', fontSize: '0.8rem', fontWeight: 500, margin: 0 }}>{titulo}</p>
    <h2 className="mono" style={{ fontSize: '1.7rem', color: cor || 'var(--gray-900)', margin: '0.35rem 0 0 0' }}>{valor}</h2>
    <span style={{ position: 'absolute', right: 0, top: 0, width: '4px', height: '100%', background: cor || 'var(--gray-200)' }} />
  </Card>
);

export const ReservaView = () => {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [baseSel, setBaseSel] = useState('');
  const [turnoSel, setTurnoSel] = useState(new Set(TURNOS));
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState(new Set());

  const carregar = () => {
    setCarregando(true);
    fetchReserva()
      .then((d) => { setDados(d); setErro(null); })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  };
  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 60000);
    return () => clearInterval(id);
  }, []);

  const registros = dados?.registros || [];

  const bases = useMemo(
    () => [...new Set(registros.map((r) => r.baseOperacional).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [registros]
  );

  const linhasFiltradas = useMemo(() => {
    let l = registros;
    if (baseSel) l = l.filter((x) => x.baseOperacional === baseSel);
    l = l.filter((x) => turnoSel.has(x.turno));
    if (de) l = l.filter((x) => (x.dtImplantacao || '') >= de);
    if (ate) l = l.filter((x) => (x.dtImplantacao || '') <= ate);
    const termo = busca.trim().toLowerCase();
    if (termo) l = l.filter((x) => [x.empresa, x.baseOperacional, x.funcionario, x.re, x.local].some((v) => String(v || '').toLowerCase().includes(termo)));
    return l;
  }, [registros, baseSel, turnoSel, de, ate, busca]);

  const arvore = useMemo(() => montarArvore(linhasFiltradas), [linhasFiltradas]);
  const linhas = useMemo(() => achatar(arvore, expandido), [arvore, expandido]);
  const totais = arvore.contagens;

  const toggleTurno = (v) => setTurnoSel((s) => {
    const n = new Set(s);
    if (n.has(v)) n.delete(v); else n.add(v);
    return n;
  });
  const toggleExpand = (path) => setExpandido((s) => {
    const n = new Set(s);
    if (n.has(path)) n.delete(path); else n.add(path);
    return n;
  });

  if (erro) {
    return (
      <Card style={{ borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-bg)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <AlertTriangle size={24} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <div>
            <h3 style={{ color: 'var(--danger)', margin: 0 }}>Não foi possível carregar a Reserva</h3>
            <p style={{ color: 'var(--gray-700)', margin: '0.5rem 0 0' }}>{erro}</p>
          </div>
        </div>
      </Card>
    );
  }
  if (carregando && !dados) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem' }}>
        <Loader2 size={40} className="spin" style={{ color: 'var(--blue)' }} />
        <p style={{ color: 'var(--gray-500)' }}>Carregando reserva...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <style>{`
        .rs-tbl { width:100%; border-collapse:collapse; font-size:0.82rem; }
        .rs-tbl thead th { position:sticky; top:0; z-index:2; background:var(--white); color:var(--gray-500);
          font-weight:700; font-size:0.72rem; padding:0.45rem 0.55rem; white-space:nowrap; border-bottom:2px solid var(--gray-200); }
        .rs-tbl th.num, .rs-tbl td.num { text-align:right; }
        .rs-tbl td.num { font-variant-numeric:tabular-nums; color:var(--gray-800); padding:0.34rem 0.55rem; }
        .rs-tbl .rs-label { position:sticky; left:0; text-align:left; }
        .rs-tbl thead .rs-label { z-index:3; min-width:240px; }
        .rs-tbl tbody td { border-bottom:1px solid var(--gray-100); background:var(--white); white-space:nowrap; }
        .rs-tbl td.rs-label { z-index:1; max-width:420px; overflow:hidden; text-overflow:ellipsis; color:var(--gray-700); padding:0.34rem 0.6rem; }
        .rs-tbl tr.tem-filhos td.rs-label { cursor:pointer; }
        .rs-tbl tr.d0 td { border-top:1px solid var(--gray-200); }
        .rs-tbl tr.d0 td.rs-label { font-weight:700; color:var(--gray-900); box-shadow:inset 3px 0 0 var(--blue); }
        .rs-tbl tbody tr:hover td { background:var(--blue-50); }
        .rs-tbl .col-tot { font-weight:700; background:var(--gray-100); border-left:1px solid var(--gray-200); }
        .rs-tbl tfoot td { position:sticky; bottom:0; z-index:2; background:var(--gray-100); border-top:2px solid var(--gray-200); font-weight:800; padding:0.5rem 0.55rem; }
        .rs-tbl tfoot td.num { text-align:right; font-variant-numeric:tabular-nums; }
        .rs-tbl tfoot .rs-label { z-index:3; }
      `}</style>

      {/* Filtros */}
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Base Operacional</label>
            <select value={baseSel} onChange={(e) => setBaseSel(e.target.value)} style={inputStyle}>
              <option value="">Todas</option>
              {bases.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Implantação de</label>
            <input type="date" value={de} max={ate || undefined} onChange={(e) => setDe(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>até</label>
            <input type="date" value={ate} min={de || undefined} onChange={(e) => setAte(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-end' }}>
            <Chip ativo={turnoSel.has('DIURNO')} onClick={() => toggleTurno('DIURNO')} icone={Sun}>Diurno</Chip>
            <Chip ativo={turnoSel.has('NOTURNO')} onClick={() => toggleTurno('NOTURNO')} icone={Moon}>Noturno</Chip>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Buscar</label>
            <Search size={15} style={{ position: 'absolute', left: '0.6rem', top: '2.05rem', color: 'var(--gray-400)' }} />
            <input type="text" placeholder="Funcionário, RE, empresa, local..." value={busca}
              onChange={(e) => setBusca(e.target.value)} style={{ ...inputStyle, width: '100%', paddingLeft: '2rem' }} />
          </div>
        </div>
      </Card>

      {/* KPIs por tipo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
        {TIPOS.map(([k, rotulo]) => <KpiCard key={k} titulo={rotulo} valor={fmtInt(totais[k])} cor={COR_TIPO[k]} />)}
        <KpiCard titulo="Total" valor={fmtInt(totalLinha(totais))} cor="var(--gray-900)" />
      </div>

      <div className="grid-2-cols" style={{ alignItems: 'stretch' }}>
        {/* Matriz */}
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ color: 'var(--gray-900)', margin: 0, fontSize: '1rem' }}>Por Empresa / Base Operacional</h3>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button onClick={() => setExpandido(new Set([...arvore.filhos.keys()]))} style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', padding: '0.35rem 0.6rem' }}>
                <ListTree size={14} /> Expandir
              </button>
              <button onClick={() => setExpandido(new Set())} style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', padding: '0.35rem 0.6rem' }}>
                <Minimize2 size={14} /> Recolher
              </button>
            </div>
          </div>
          <div className="sem-scrollbar" style={{ maxHeight: '520px', overflow: 'auto', border: '1px solid var(--gray-200)', borderRadius: '8px' }}>
            <table className="rs-tbl">
              <thead>
                <tr>
                  <th className="rs-label">Empresa / Base / Colaborador</th>
                  {TIPOS.map(([k, rotulo]) => <th key={k} className="num">{rotulo}</th>)}
                  <th className="num col-tot">Total</th>
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 ? (
                  <tr><td colSpan={TIPOS.length + 2} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--gray-400)' }}>Sem dados para os filtros atuais.</td></tr>
                ) : linhas.map((linha) => {
                  const aberto = expandido.has(linha.path);
                  const c = linha.contagens;
                  return (
                    <tr key={linha.path} className={`d${linha.depth}${linha.temFilhos ? ' tem-filhos' : ''}`}>
                      <td className="rs-label" onClick={() => linha.temFilhos && toggleExpand(linha.path)}
                        style={{ paddingLeft: `${0.55 + linha.depth * 1.15}rem` }} title={linha.label}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          {linha.temFilhos
                            ? (aberto ? <ChevronDown size={14} style={{ flexShrink: 0, color: 'var(--gray-400)' }} /> : <ChevronRight size={14} style={{ flexShrink: 0, color: 'var(--gray-400)' }} />)
                            : <span style={{ width: 14, flexShrink: 0 }} />}
                          {linha.label}
                        </span>
                      </td>
                      {TIPOS.map(([k]) => <td key={k} className="num">{N(c[k])}</td>)}
                      <td className="num col-tot">{N(totalLinha(c))}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="rs-label">Total</td>
                  {TIPOS.map(([k]) => <td key={k} className="num">{fmtInt(totais[k])}</td>)}
                  <td className="num col-tot">{fmtInt(totalLinha(totais))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Donut */}
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: 'var(--gray-900)', marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Alocações Reserva Técnica</h3>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Donut data={distribuicao(totais)} />
          </div>
        </Card>
      </div>
    </div>
  );
};