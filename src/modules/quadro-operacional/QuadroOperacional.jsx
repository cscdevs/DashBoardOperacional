import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { fetchQuadroOperacional, fetchOcorrencias } from './api';
import {
  montarArvore, achatar, contratoT, operacionalT, pvD, pvN, pvT,
} from './utils/matriz';
import {
  LayoutGrid, AlertTriangle, Loader2, Search, ChevronRight, ChevronDown, ListTree, Minimize2,
} from 'lucide-react';
import { ReservaView } from './ReservaView';
import { OcorrenciasView } from './OcorrenciasView';

const fmtInt = (v) => Number(v ?? 0).toLocaleString('pt-BR');
const N = (v) => (v ? fmtInt(v) : ''); // célula vazia quando zero

const inputStyle = {
  padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--gray-200)',
  backgroundColor: 'var(--white)', color: 'var(--gray-900)', fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem',
};

/* Abas do módulo (PBI "PV - RS - EXC - TN - DB"). As demais entram quando as
   queries forem disponibilizadas. */
const ABAS = [
  { id: 'pv', titulo: 'Posto Vago' },
  { id: 'rs', titulo: 'Reserva' },
  { id: 'exc', titulo: 'Excedente', resultado: 'EXCEDENTE' },
  { id: 'tn', titulo: 'Treinamento', resultado: 'TREINAMENTO' },
  { id: 'db', titulo: 'Dobra', resultado: 'Dobra' },
];
const ABAS_OCORRENCIA = new Set(['exc', 'tn', 'db']);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const KpiCard = ({ titulo, valor, cor = 'var(--blue)', fundo = 'var(--blue-50)' }) => (
  <Card style={{ position: 'relative', overflow: 'hidden' }}>
    <p style={{ color: 'var(--gray-500)', fontSize: '0.8rem', fontWeight: 500, margin: 0 }}>{titulo}</p>
    <h2 className="mono" style={{ fontSize: '1.8rem', color: cor, margin: '0.35rem 0 0 0' }}>{valor}</h2>
    <span style={{ position: 'absolute', right: 0, top: 0, width: '4px', height: '100%', background: fundo }} />
  </Card>
);

export const QuadroOperacional = () => {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [abaId, setAbaId] = useState('pv');
  const [empresaSel, setEmpresaSel] = useState('');
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState(new Set());

  const carregar = () => {
    setCarregando(true);
    fetchQuadroOperacional()
      .then((d) => { setDados(d); setErro(null); })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  };
  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 60000); // 1 min
    return () => clearInterval(id);
  }, []);

  /* Ocorrências (Excedente/Treinamento/Dobra): fetch único compartilhado pelas 3
     abas, refeito só quando as datas mudam (query pesada). */
  const hoje = ymd(new Date());
  const seteAtras = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return ymd(d); })();
  const [ocDe, setOcDe] = useState(seteAtras);
  const [ocAte, setOcAte] = useState(hoje);
  const [ocData, setOcData] = useState(null);
  const [ocLoading, setOcLoading] = useState(false);
  const [ocErro, setOcErro] = useState(null);
  const ocFetchedRef = useRef(null);
  const ocKey = `${ocDe}|${ocAte}`;
  useEffect(() => {
    if (!ABAS_OCORRENCIA.has(abaId)) return;
    if (ocFetchedRef.current === ocKey) return;
    ocFetchedRef.current = ocKey;
    setOcLoading(true);
    fetchOcorrencias({ dataInicial: ocDe, dataFinal: ocAte })
      .then((d) => { setOcData(d); setOcErro(null); })
      .catch((e) => setOcErro(e.message))
      .finally(() => setOcLoading(false));
  }, [abaId, ocKey, ocDe, ocAte]);

  const registros = dados?.registros || [];

  const empresas = useMemo(
    () => [...new Set(registros.map((r) => r.empresa).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [registros]
  );

  const linhasFiltradas = useMemo(() => {
    let l = registros;
    if (empresaSel) l = l.filter((x) => x.empresa === empresaSel);
    const termo = busca.trim().toLowerCase();
    if (termo) l = l.filter((x) => [x.cliente, x.local].some((v) => String(v || '').toLowerCase().includes(termo)));
    return l;
  }, [registros, empresaSel, busca]);

  const arvore = useMemo(() => montarArvore(linhasFiltradas), [linhasFiltradas]);
  const linhas = useMemo(() => achatar(arvore, expandido), [arvore, expandido]);
  const totais = arvore.contagens;

  const toggleExpand = (path) => setExpandido((s) => {
    const n = new Set(s);
    if (n.has(path)) n.delete(path); else n.add(path);
    return n;
  });
  const expandirClientes = () => setExpandido(new Set([...arvore.filhos.keys()]));
  const recolherTudo = () => setExpandido(new Set());

  const abaAtual = ABAS.find((a) => a.id === abaId) || ABAS[0];

  return (
    <div className="full-width-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <LayoutGrid size={28} style={{ color: 'var(--blue)' }} />
        <div>
          <h1 style={{ color: 'var(--gray-900)', margin: 0 }}>Quadro Operacional</h1>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem' }}>
            Contrato × Operacional × PV (posto vago) por cliente e turno — foto do dia.
          </p>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--gray-200)' }}>
        {ABAS.map((a) => {
          const ativo = a.id === abaId;
          return (
            <button
              key={a.id}
              onClick={() => !a.emBreve && setAbaId(a.id)}
              disabled={a.emBreve}
              title={a.emBreve ? 'Em breve' : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 0.9rem',
                background: 'none', border: 'none', cursor: a.emBreve ? 'not-allowed' : 'pointer',
                color: a.emBreve ? 'var(--gray-400)' : (ativo ? 'var(--blue)' : 'var(--gray-600)'),
                fontWeight: ativo ? 700 : 500, fontSize: '0.9rem',
                borderBottom: ativo ? '2px solid var(--blue)' : '2px solid transparent', marginBottom: '-1px',
              }}
            >
              {a.titulo}{a.emBreve && <span style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.8 }}>em breve</span>}
            </button>
          );
        })}
      </div>

      {abaId === 'rs' ? (
        <ReservaView />
      ) : ABAS_OCORRENCIA.has(abaId) ? (
        <OcorrenciasView
          registros={ocData?.registros || []}
          resultado={abaAtual.resultado}
          carregando={ocLoading && !ocData}
          erro={ocErro}
          de={ocDe}
          ate={ocAte}
          setDe={setOcDe}
          setAte={setOcAte}
          periodo={ocData?.periodo}
          hoje={hoje}
        />
      ) : erro ? (
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
          <p style={{ color: 'var(--gray-500)' }}>Carregando quadro operacional...</p>
        </div>
      ) : abaAtual.emBreve ? (
        <Card><p style={{ color: 'var(--gray-500)', margin: 0 }}>Esta visão será disponibilizada em breve.</p></Card>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <KpiCard titulo="Contrato (vagas)" valor={fmtInt(contratoT(totais))} cor="var(--gray-900)" fundo="var(--gray-200)" />
            <KpiCard titulo="Operacional (ocupadas)" valor={fmtInt(operacionalT(totais))} cor="var(--success)" fundo="var(--success-bg)" />
            <KpiCard titulo="PV (posto vago)" valor={fmtInt(pvT(totais))} cor="var(--danger)" fundo="var(--danger-bg)" />
            <KpiCard titulo="% Ocupação" valor={`${Math.round((operacionalT(totais) / (contratoT(totais) || 1)) * 100)}%`} cor="var(--blue)" />
          </div>

          {/* Matriz */}
          <Card>
            <style>{`
              .qo-tbl { width:100%; border-collapse:collapse; font-size:0.82rem; }
              .qo-tbl th { background:var(--white); color:var(--gray-600); font-weight:700; white-space:nowrap; }
              .qo-tbl thead th { position:sticky; z-index:2; }
              .qo-tbl thead tr.grupo th.grp { top:0; height:32px; text-align:center; font-size:0.75rem; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; border-bottom:1px solid var(--gray-200); }
              .qo-tbl thead tr.sub th { top:32px; font-size:0.72rem; font-weight:700; padding:0.35rem 0.5rem; color:var(--gray-500); background:var(--white); border-bottom:2px solid var(--gray-200); }
              .qo-tbl th.num, .qo-tbl td.num { text-align:right; }
              .qo-tbl td.num { font-variant-numeric:tabular-nums; color:var(--gray-800); padding:0.34rem 0.5rem; }
              .qo-tbl .qo-label { position:sticky; left:0; text-align:left; }
              .qo-tbl thead .qo-label { z-index:3; min-width:260px; }
              .qo-tbl tbody td { border-bottom:1px solid var(--gray-100); background:var(--white); white-space:nowrap; }
              .qo-tbl td.qo-label { z-index:1; max-width:420px; overflow:hidden; text-overflow:ellipsis; color:var(--gray-700); padding:0.34rem 0.6rem; }
              .qo-tbl tr.tem-filhos td.qo-label { cursor:pointer; }
              .qo-tbl tr.d0 td { border-top:1px solid var(--gray-200); }
              .qo-tbl tr.d0 td.qo-label { font-weight:700; color:var(--gray-900); box-shadow:inset 3px 0 0 var(--blue); }
              .qo-tbl tr.d1 td.qo-label { color:var(--gray-500); }
              .qo-tbl tbody tr:hover td { background:var(--blue-50); }
              .qo-tbl .g-contrato { background:var(--gray-100); color:var(--gray-900); }
              .qo-tbl .g-oper { background:var(--success-bg); color:var(--success); }
              .qo-tbl .g-pv { background:var(--danger-bg); color:var(--danger); }
              .qo-tbl .col-tot { font-weight:700; }
              .qo-tbl .sep { border-left:1px solid var(--gray-200); }
              .qo-tbl tfoot td { position:sticky; bottom:0; z-index:2; background:var(--gray-100); border-top:2px solid var(--gray-200); font-weight:800; padding:0.5rem; }
              .qo-tbl tfoot td.num { text-align:right; font-variant-numeric:tabular-nums; }
              .qo-tbl tfoot .qo-label { z-index:3; color:var(--gray-900); }
            `}</style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ color: 'var(--gray-900)', margin: 0, fontSize: '1rem' }}>Postos por Cliente</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={empresaSel} onChange={(e) => setEmpresaSel(e.target.value)} style={inputStyle}>
                  <option value="">Todas as empresas</option>
                  {empresas.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '0.6rem', top: '0.6rem', color: 'var(--gray-400)' }} />
                  <input type="text" placeholder="Cliente ou local..." value={busca}
                    onChange={(e) => setBusca(e.target.value)} style={{ ...inputStyle, paddingLeft: '2rem' }} />
                </div>
                <button onClick={expandirClientes} style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', padding: '0.45rem 0.6rem' }}>
                  <ListTree size={14} /> Expandir
                </button>
                <button onClick={recolherTudo} style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', padding: '0.45rem 0.6rem' }}>
                  <Minimize2 size={14} /> Recolher
                </button>
              </div>
            </div>

            <div className="sem-scrollbar" style={{ maxHeight: '620px', overflow: 'auto', border: '1px solid var(--gray-200)', borderRadius: '8px' }}>
              <table className="qo-tbl">
                <thead>
                  <tr className="grupo">
                    <th className="qo-label" rowSpan={2}>Cliente / Local</th>
                    <th className="grp g-contrato sep" colSpan={3}>Contrato</th>
                    <th className="grp g-oper sep" colSpan={3}>Operacional</th>
                    <th className="grp g-pv sep" colSpan={3}>PV</th>
                  </tr>
                  <tr className="sub">
                    <th className="num sep">Diurno</th>
                    <th className="num">Noturno</th>
                    <th className="num col-tot">Total</th>
                    <th className="num sep">Diurno</th>
                    <th className="num">Noturno</th>
                    <th className="num col-tot">Total</th>
                    <th className="num sep">Diurno</th>
                    <th className="num">Noturno</th>
                    <th className="num col-tot">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--gray-400)' }}>Sem dados para os filtros atuais.</td></tr>
                  ) : linhas.map((linha) => {
                    const aberto = expandido.has(linha.path);
                    const c = linha.contagens;
                    return (
                      <tr key={linha.path} className={`d${linha.depth}${linha.temFilhos ? ' tem-filhos' : ''}`}>
                        <td className="qo-label" onClick={() => linha.temFilhos && toggleExpand(linha.path)}
                          style={{ paddingLeft: `${0.55 + linha.depth * 1.15}rem` }} title={linha.label}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            {linha.temFilhos
                              ? (aberto ? <ChevronDown size={14} style={{ flexShrink: 0, color: 'var(--gray-400)' }} /> : <ChevronRight size={14} style={{ flexShrink: 0, color: 'var(--gray-400)' }} />)
                              : <span style={{ width: 14, flexShrink: 0 }} />}
                            {linha.label}
                          </span>
                        </td>
                        <td className="num sep">{N(c.cD)}</td>
                        <td className="num">{N(c.cN)}</td>
                        <td className="num col-tot">{N(contratoT(c))}</td>
                        <td className="num sep">{N(c.oD)}</td>
                        <td className="num">{N(c.oN)}</td>
                        <td className="num col-tot">{N(operacionalT(c))}</td>
                        <td className="num sep">{N(pvD(c))}</td>
                        <td className="num">{N(pvN(c))}</td>
                        <td className="num col-tot" style={pvT(c) > 0 ? { color: 'var(--danger)', fontWeight: 700 } : undefined}>{N(pvT(c))}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="qo-label">Total</td>
                    <td className="num sep">{fmtInt(totais.cD)}</td>
                    <td className="num">{fmtInt(totais.cN)}</td>
                    <td className="num col-tot">{fmtInt(contratoT(totais))}</td>
                    <td className="num sep">{fmtInt(totais.oD)}</td>
                    <td className="num">{fmtInt(totais.oN)}</td>
                    <td className="num col-tot">{fmtInt(operacionalT(totais))}</td>
                    <td className="num sep">{fmtInt(pvD(totais))}</td>
                    <td className="num">{fmtInt(pvN(totais))}</td>
                    <td className="num col-tot">{fmtInt(pvT(totais))}</td>
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