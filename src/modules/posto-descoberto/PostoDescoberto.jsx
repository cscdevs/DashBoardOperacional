import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { fetchPostoDescoberto } from './api';
import {
  COLS_SUBTOTAL, COLS_EXTRA, TODAS_COLS,
  montarArvore, achatar, subtotal, totalGeral,
} from './utils/matriz';
import {
  ShieldAlert, AlertTriangle, Loader2, Search, ChevronRight, ChevronDown, Sun, Moon, ListTree, Minimize2,
} from 'lucide-react';

const fmtInt = (v) => Number(v ?? 0).toLocaleString('pt-BR');
const N = (v) => (v ? fmtInt(v) : ''); // célula vazia quando zero (igual ao PBI)

const inputStyle = {
  padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--gray-200)',
  backgroundColor: 'var(--white)', color: 'var(--gray-900)', fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem',
};

/** Data local no formato YYYY-MM-DD (sem deslocar fuso). */
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const TURNOS = ['DIURNO', 'NOTURNO'];
const SITUACOES = ['DESCOBERTA', 'JUSTIFICADA'];

/* Botão-chip de filtro (liga/desliga). */
const Chip = ({ ativo, onClick, icone: Icone, children }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.8rem',
      borderRadius: '999px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
      border: `1px solid ${ativo ? 'var(--blue)' : 'var(--gray-200)'}`,
      background: ativo ? 'var(--blue)' : 'var(--white)',
      color: ativo ? 'var(--white)' : 'var(--gray-500)',
      transition: 'all 0.15s ease',
    }}
  >
    {Icone && <Icone size={14} />} {children}
  </button>
);

const KpiCard = ({ titulo, valor, cor = 'var(--blue)', fundo = 'var(--blue-50)' }) => (
  <Card style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    <p style={{ color: 'var(--gray-500)', fontSize: '0.8rem', fontWeight: 500, margin: 0 }}>{titulo}</p>
    <h2 className="mono" style={{ fontSize: '1.8rem', color: cor, margin: '0.35rem 0 0 0' }}>{valor}</h2>
    <span style={{ position: 'absolute', right: 0, top: 0, width: '4px', height: '100%', background: fundo }} />
  </Card>
);

export const PostoDescoberto = () => {
  const hoje = new Date();
  const ini7 = new Date();
  ini7.setDate(hoje.getDate() - 7);

  const [dataInicial, setDataInicial] = useState(ymd(ini7));
  const [dataFinal, setDataFinal] = useState(ymd(hoje));
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [empresaSel, setEmpresaSel] = useState('');
  const [clienteSel, setClienteSel] = useState('');
  const [turnoSel, setTurnoSel] = useState(new Set(TURNOS));
  const [situacaoSel, setSituacaoSel] = useState(new Set(SITUACOES));
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState(new Set());

  useEffect(() => {
    setCarregando(true);
    fetchPostoDescoberto({ dataInicial, dataFinal })
      .then((d) => { setDados(d); setErro(null); })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [dataInicial, dataFinal]);

  const registros = dados?.registros || [];

  const empresas = useMemo(
    () => [...new Set(registros.map((r) => r.empresa).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [registros]
  );
  const clientes = useMemo(
    () => [...new Set(registros.filter((r) => !empresaSel || r.empresa === empresaSel).map((r) => r.cliente).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [registros, empresaSel]
  );

  const linhasFiltradas = useMemo(() => {
    let l = registros;
    if (empresaSel) l = l.filter((x) => x.empresa === empresaSel);
    if (clienteSel) l = l.filter((x) => x.cliente === clienteSel);
    l = l.filter((x) => turnoSel.has(x.turno));
    l = l.filter((x) => situacaoSel.has(x.situacaoCoberta));
    const termo = busca.trim().toLowerCase();
    if (termo) {
      l = l.filter((x) => [x.cliente, x.local, x.posto, x.areaSupervisao, x.gestorOp]
        .some((v) => String(v || '').toLowerCase().includes(termo)));
    }
    return l;
  }, [registros, empresaSel, clienteSel, turnoSel, situacaoSel, busca]);

  const arvore = useMemo(() => montarArvore(linhasFiltradas), [linhasFiltradas]);
  const linhas = useMemo(() => achatar(arvore, expandido), [arvore, expandido]);
  const totais = arvore.contagens;

  const toggleSet = (setter) => (valor) => setter((s) => {
    const n = new Set(s);
    if (n.has(valor)) n.delete(valor); else n.add(valor);
    return n;
  });
  const toggleTurno = toggleSet(setTurnoSel);
  const toggleSituacao = toggleSet(setSituacaoSel);
  const toggleExpand = (path) => setExpandido((s) => {
    const n = new Set(s);
    if (n.has(path)) n.delete(path); else n.add(path);
    return n;
  });
  const expandirClientes = () => setExpandido(new Set([...arvore.filhos.keys()]));
  const recolherTudo = () => setExpandido(new Set());

  return (
    <div className="full-width-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <ShieldAlert size={28} style={{ color: 'var(--danger)' }} />
          <div>
            <h1 style={{ color: 'var(--gray-900)', margin: 0 }}>Posto Descoberto — Produtividade</h1>
            <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem' }}>
              Postos não cobertos por dia, classificados por motivo (Cliente → Local → Posto).
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>De</label>
            <input type="date" value={dataInicial} max={dataFinal} onChange={(e) => setDataInicial(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Até</label>
            <input type="date" value={dataFinal} min={dataInicial} max={ymd(hoje)} onChange={(e) => setDataFinal(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Empresa</label>
            <select value={empresaSel} onChange={(e) => { setEmpresaSel(e.target.value); setClienteSel(''); }} style={inputStyle}>
              <option value="">Todas</option>
              {empresas.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Cliente</label>
            <select value={clienteSel} onChange={(e) => setClienteSel(e.target.value)} style={inputStyle}>
              <option value="">Todos</option>
              {clientes.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-end' }}>
            <Chip ativo={turnoSel.has('DIURNO')} onClick={() => toggleTurno('DIURNO')} icone={Sun}>Diurno</Chip>
            <Chip ativo={turnoSel.has('NOTURNO')} onClick={() => toggleTurno('NOTURNO')} icone={Moon}>Noturno</Chip>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-end' }}>
            <Chip ativo={situacaoSel.has('DESCOBERTA')} onClick={() => toggleSituacao('DESCOBERTA')}>Descoberta</Chip>
            <Chip ativo={situacaoSel.has('JUSTIFICADA')} onClick={() => toggleSituacao('JUSTIFICADA')}>Justificada</Chip>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ position: 'relative', minWidth: '220px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Buscar</label>
            <Search size={15} style={{ position: 'absolute', left: '0.6rem', top: '2.05rem', color: 'var(--gray-400)' }} />
            <input type="text" placeholder="Cliente, local, posto, supervisor..." value={busca}
              onChange={(e) => setBusca(e.target.value)} style={{ ...inputStyle, width: '100%', paddingLeft: '2rem' }} />
          </div>
        </div>
      </Card>

      {erro ? (
        <Card style={{ borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-bg)' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle size={24} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <div>
              <h3 style={{ color: 'var(--danger)', margin: 0 }}>Não foi possível carregar o relatório</h3>
              <p style={{ color: 'var(--gray-700)', margin: '0.5rem 0 0' }}>{erro}</p>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                Verifique se o backend está rodando (porta 3001) e conectado ao SQL Server.
              </p>
            </div>
          </div>
        </Card>
      ) : carregando && !dados ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem' }}>
          <Loader2 size={40} className="spin" style={{ color: 'var(--blue)' }} />
          <p style={{ color: 'var(--gray-500)' }}>Carregando postos descobertos...</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <KpiCard titulo="Subtotal (Descobertos)" valor={fmtInt(subtotal(totais))} cor="var(--danger)" fundo="var(--danger-bg)" />
            <KpiCard titulo="Posto Vago (PV)" valor={fmtInt(totais.PV)} cor="var(--danger)" fundo="var(--danger-bg)" />
            <KpiCard titulo="Saída Antecipada (SA)" valor={fmtInt(totais.SA)} cor="var(--blue)" />
            <KpiCard titulo="Total Geral" valor={fmtInt(totalGeral(totais))} cor="var(--gray-900)" fundo="var(--gray-200)" />
          </div>

          {/* Matriz */}
          <Card>
            <style>{`
              .pd-tbl { width:100%; border-collapse:collapse; font-size:0.82rem; }
              .pd-tbl thead th { position:sticky; top:0; z-index:2; background:var(--white);
                border-bottom:2px solid var(--gray-200); color:var(--gray-500); font-weight:700;
                padding:0.45rem 0.55rem; white-space:nowrap; font-size:0.72rem; letter-spacing:0.03em; }
              .pd-tbl th.num, .pd-tbl td.num { text-align:right; }
              .pd-tbl td.num { font-variant-numeric:tabular-nums; color:var(--gray-800); }
              .pd-tbl .pd-label { position:sticky; left:0; text-align:left; }
              .pd-tbl thead .pd-label { z-index:3; min-width:300px; }
              .pd-tbl tbody td { padding:0.32rem 0.55rem; border-bottom:1px solid var(--gray-100);
                background:var(--white); white-space:nowrap; }
              .pd-tbl td.pd-label { z-index:1; max-width:460px; overflow:hidden; text-overflow:ellipsis;
                color:var(--gray-700); cursor:default; }
              .pd-tbl tr.tem-filhos td.pd-label { cursor:pointer; }
              .pd-tbl tr.d0 td { border-top:1px solid var(--gray-200); }
              .pd-tbl tr.d0 td.pd-label { font-weight:700; color:var(--gray-900); box-shadow:inset 3px 0 0 var(--blue); }
              .pd-tbl tr.d1 td.pd-label { font-weight:500; color:var(--gray-800); }
              .pd-tbl tr.d2 td.pd-label { color:var(--gray-500); }
              .pd-tbl tbody tr:hover td { background:var(--blue-50); }
              .pd-tbl .col-sub { background:var(--gray-100); font-weight:700; border-left:1px solid var(--gray-200); }
              .pd-tbl .col-tot { background:var(--gray-100); font-weight:800; color:var(--gray-900); border-left:1px solid var(--gray-200); }
              .pd-tbl .col-extra1 { border-left:1px solid var(--gray-200); }
              .pd-tbl thead th.col-pv { color:var(--danger); background:var(--danger-bg); }
              .pd-tbl td.col-pv.has { background:var(--danger-bg); color:var(--danger); font-weight:700; }
              .pd-tbl tfoot td { position:sticky; bottom:0; z-index:2; background:var(--gray-100);
                border-top:2px solid var(--gray-200); font-weight:800; padding:0.5rem 0.55rem; }
              .pd-tbl tfoot td.num { text-align:right; font-variant-numeric:tabular-nums; }
              .pd-tbl tfoot .col-sub, .pd-tbl tfoot .col-tot { background:var(--gray-200); }
              .pd-tbl tfoot .pd-label { z-index:3; color:var(--gray-900); }
              .pd-badge { display:inline-flex; align-items:center; gap:0.35rem; font-size:0.72rem; color:var(--gray-600); }
              .pd-badge b { display:inline-grid; place-items:center; min-width:22px; height:18px; padding:0 0.2rem;
                border-radius:4px; font-size:0.66rem; background:var(--gray-100); color:var(--gray-700); }
              .pd-badge.pv b { background:var(--danger-bg); color:var(--danger); }
            `}</style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ color: 'var(--gray-900)', margin: 0, fontSize: '1rem' }}>Postos Descobertos</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--gray-500)', fontSize: '0.78rem', marginRight: '0.25rem' }}>
                  {fmtInt(linhasFiltradas.length)} ocorrências · {dados?.periodo?.dataInicial} a {dados?.periodo?.dataFinal}
                </span>
                <button onClick={expandirClientes} style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', padding: '0.35rem 0.6rem' }}>
                  <ListTree size={14} /> Expandir clientes
                </button>
                <button onClick={recolherTudo} style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', padding: '0.35rem 0.6rem' }}>
                  <Minimize2 size={14} /> Recolher
                </button>
              </div>
            </div>

            {/* Legenda (topo) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem 1rem', padding: '0.6rem 0.75rem', marginBottom: '0.75rem', background: 'var(--gray-100)', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Descobertos</span>
              {COLS_SUBTOTAL.map(([k, nome]) => (
                <span key={k} className={`pd-badge${k === 'PV' ? ' pv' : ''}`}><b>{k}</b> {nome}</span>
              ))}
              <span style={{ width: '1px', height: '18px', background: 'var(--gray-200)' }} />
              <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Cobertura parcial</span>
              {COLS_EXTRA.map(([k, nome]) => (
                <span key={k} className="pd-badge"><b>{k}</b> {nome}</span>
              ))}
            </div>

            <div className="sem-scrollbar" style={{ maxHeight: '620px', overflow: 'auto', border: '1px solid var(--gray-200)', borderRadius: '8px' }}>
              <table className="pd-tbl">
                <thead>
                  <tr>
                    <th className="pd-label">Cliente / Local / Posto</th>
                    {COLS_SUBTOTAL.map(([k, nome]) => (
                      <th key={k} title={nome} className={`num${k === 'PV' ? ' col-pv' : ''}`}>{k}</th>
                    ))}
                    <th className="num col-sub" title="Subtotal de descobertos">Subtotal</th>
                    {COLS_EXTRA.map(([k, nome], i) => (
                      <th key={k} title={nome} className={`num${i === 0 ? ' col-extra1' : ''}`}>{k}</th>
                    ))}
                    <th className="num col-tot" title="Total Geral">Total Geral</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.length === 0 ? (
                    <tr><td colSpan={TODAS_COLS.length + 3} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--gray-400)' }}>Sem ocorrências para os filtros atuais.</td></tr>
                  ) : linhas.map((linha) => {
                    const aberto = expandido.has(linha.path);
                    const c = linha.contagens;
                    return (
                      <tr key={linha.path} className={`d${linha.depth}${linha.temFilhos ? ' tem-filhos' : ''}`}>
                        <td
                          className="pd-label"
                          onClick={() => linha.temFilhos && toggleExpand(linha.path)}
                          style={{ paddingLeft: `${0.55 + linha.depth * 1.15}rem` }}
                          title={linha.label}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            {linha.temFilhos
                              ? (aberto ? <ChevronDown size={14} style={{ flexShrink: 0, color: 'var(--gray-400)' }} /> : <ChevronRight size={14} style={{ flexShrink: 0, color: 'var(--gray-400)' }} />)
                              : <span style={{ width: 14, flexShrink: 0 }} />}
                            {linha.label}
                          </span>
                        </td>
                        {COLS_SUBTOTAL.map(([k]) => (
                          <td key={k} className={`num${k === 'PV' ? ` col-pv${c.PV ? ' has' : ''}` : ''}`}>{N(c[k])}</td>
                        ))}
                        <td className="num col-sub">{N(subtotal(c))}</td>
                        {COLS_EXTRA.map(([k], i) => <td key={k} className={`num${i === 0 ? ' col-extra1' : ''}`}>{N(c[k])}</td>)}
                        <td className="num col-tot">{N(totalGeral(c))}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="pd-label">Total</td>
                    {COLS_SUBTOTAL.map(([k]) => <td key={k} className="num">{N(totais[k])}</td>)}
                    <td className="num col-sub">{fmtInt(subtotal(totais))}</td>
                    {COLS_EXTRA.map(([k], i) => <td key={k} className={`num${i === 0 ? ' col-extra1' : ''}`}>{N(totais[k])}</td>)}
                    <td className="num col-tot">{fmtInt(totalGeral(totais))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};