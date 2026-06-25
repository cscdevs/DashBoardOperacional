import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { fetchGeracaoCartaoPonto } from './api';
import { BarChart, DonutChart, ColumnChart, Gauge, TabelaResumo } from './components/Charts';
import {
  medidas, resumoPor, distribuicaoStatus, pendenciasPorCompetencia, competencias,
  valoresUnicos, exibir, formatarData, baixarCSV, ehDescartavel,
} from './utils/dados';
import {
  CalendarClock, CheckCircle2, Clock, Percent, Search, Loader2, Download,
  AlertTriangle, LayoutGrid, ListChecks, UserCog, Info,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Helpers de exibição                                                 */
/* ------------------------------------------------------------------ */
const fmtInt = (v) => Number(v ?? 0).toLocaleString('pt-BR');
const fmtPct = (v) => `${Math.round((Number(v) || 0) * 100)}%`;

const inputStyle = {
  padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--gray-200)',
  backgroundColor: 'var(--white)', color: 'var(--gray-900)', fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem',
};

const ABAS = [
  { id: 'geral', titulo: 'Visão Geral', icone: LayoutGrid },
  { id: 'detalhado', titulo: 'Detalhado', icone: ListChecks },
  { id: 'gerente', titulo: 'Gerente', icone: UserCog },
];

/* Filtros extra da aba Detalhado (selects). */
const FILTROS_DETALHE = [
  { rotulo: 'Cliente', campo: 'cliente', formatar: true },
  { rotulo: 'Supervisor', campo: 'areaSupervisao', formatar: true },
  { rotulo: 'Posto', campo: 'local', formatar: true },
  { rotulo: 'Turno', campo: 'turno', formatar: true },
  { rotulo: 'Status', campo: 'status', formatar: false },
];

/* Colunas do detalhamento (linha = um cartão). */
const COLS_DETALHE = [
  { chave: 'competencia', titulo: 'Competência' },
  { chave: 'empresa', titulo: 'Empresa', fmt: exibir },
  { chave: 're', titulo: 'RE' },
  { chave: 'nome', titulo: 'Funcionário', fmt: exibir },
  { chave: 'cliente', titulo: 'Cliente', fmt: exibir },
  { chave: 'local', titulo: 'Local', fmt: exibir },
  { chave: 'areaSupervisao', titulo: 'Supervisor', fmt: exibir },
  { chave: 'turno', titulo: 'Turno', fmt: exibir },
  { chave: 'situacao', titulo: 'Situação' },
  { chave: 'status', titulo: 'Status' },
  { chave: 'dtGeracao', titulo: 'Geração', fmt: formatarData },
];

const LIMITE_LINHAS = 300;

/* Colunas das matrizes (Total/Entregue/Pendências/%). */
const colsResumo = (rotuloPrimeiro) => [
  { chave: 'label', titulo: rotuloPrimeiro, alinhar: 'left' },
  { chave: 'total', titulo: 'Total', alinhar: 'right', mono: true, formato: fmtInt, largura: '72px' },
  { chave: 'entregue', titulo: 'Entregue', alinhar: 'right', mono: true, formato: fmtInt, largura: '82px' },
  { chave: 'pendencias', titulo: 'Pend.', alinhar: 'right', mono: true, formato: fmtInt, largura: '70px' },
  { chave: 'pct', titulo: '% Entr.', alinhar: 'right', mono: true, formato: fmtPct, largura: '74px' },
];

/* ------------------------------------------------------------------ */

const KpiCard = ({ titulo, valor, subtitulo, icone: Icone, cor = 'var(--blue)', fundo = 'var(--blue-50)' }) => (
  <Card className="card-3d-tilt stagger-item" style={{ position: 'relative', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.8rem', fontWeight: 500, margin: 0 }}>{titulo}</p>
        <h2 className="mono" style={{ fontSize: '1.9rem', color: cor, margin: '0.4rem 0 0 0' }}>{valor}</h2>
      </div>
      <div style={{ padding: '0.5rem', backgroundColor: fundo, borderRadius: '8px', color: cor, flexShrink: 0 }}>
        <Icone size={22} />
      </div>
    </div>
  </Card>
);

const tot = (linhas) => {
  const m = medidas(linhas);
  return { total: m.total, entregue: m.entregue, pendencias: m.pendencias, pct: m.pctEntregue };
};

export const GeracaoCartaoPonto = () => {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [registros, setRegistros] = useState(null);

  const [abaId, setAbaId] = useState('geral');
  const [competencia, setCompetencia] = useState(''); // '' = todas; senão anoMes
  const [empresa, setEmpresa] = useState('');
  const [demitidosFiltro, setDemitidosFiltro] = useState('ativos');
  const [filtrosExtra, setFiltrosExtra] = useState({});
  const [busca, setBusca] = useState('');

  const carregar = useCallback(() => {
    fetchGeracaoCartaoPonto()
      .then((d) => {
        setRegistros(d.registros || []);
        setErro(null);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => { 
    setCarregando(true);
    carregar(); 
    const id = setInterval(carregar, 120000); // 2 minutos
    return () => clearInterval(id);
  }, [carregar]);

  const listaCompetencias = useMemo(() => (registros ? competencias(registros) : []), [registros]);

  /* Base SEM o filtro de competência (para tendência e opções dos selects). */
  const baseSemCompetencia = useMemo(() => {
    if (!registros) return [];
    let l = registros.filter((x) => !ehDescartavel(x));
    if (demitidosFiltro === 'ativos') l = l.filter((x) => !x.ehDemitido);
    if (demitidosFiltro === 'demitidos') l = l.filter((x) => x.ehDemitido);
    if (empresa) l = l.filter((x) => String(x.empresa ?? '') === empresa);
    return l;
  }, [registros, demitidosFiltro, empresa]);

  /* Base COM competência + filtros extra (Detalhado) + busca. */
  const linhas = useMemo(() => {
    let l = baseSemCompetencia;
    if (competencia) l = l.filter((x) => String(x.anoMes ?? '') === competencia);
    if (abaId === 'detalhado') {
      for (const f of FILTROS_DETALHE) {
        const val = filtrosExtra[f.campo];
        if (val) l = l.filter((x) => String(x[f.campo] ?? '') === val);
      }
    }
    const termo = busca.trim().toLowerCase();
    if (termo) {
      const campos = ['nome', 're', 'cliente', 'local', 'areaSupervisao', 'empresa', 'turno'];
      l = l.filter((x) => campos.some((c) => String(x[c] ?? '').toLowerCase().includes(termo)));
    }
    return l;
  }, [baseSemCompetencia, competencia, abaId, filtrosExtra, busca]);

  const m = useMemo(() => medidas(linhas), [linhas]);
  const tendencia = useMemo(() => pendenciasPorCompetencia(baseSemCompetencia), [baseSemCompetencia]);

  const exportar = () => {
    const colunas = [
      ...COLS_DETALHE.map((c) => ({ titulo: c.titulo, valor: (l) => (c.fmt ? c.fmt(l[c.chave]) : l[c.chave]) })),
      { titulo: 'É Demitido?', valor: (l) => (l.ehDemitido ? 'Sim' : 'Não') },
    ];
    baixarCSV('geracao-cartao-ponto.csv', colunas, linhas);
  };

  return (
    <div className="full-width-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--gray-900)', margin: 0 }}>Geração de Cartão de Ponto</h1>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem' }}>
            Geração e retorno dos cartões de ponto por competência — entregues × pendências, com flag de demitidos.
          </p>
        </div>
        {abaId === 'detalhado' && (
          <Button variant="primary" onClick={exportar} disabled={!registros || linhas.length === 0}>
            <Download size={16} /> Exportar CSV
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Competência</label>
            <select value={competencia} onChange={(e) => setCompetencia(e.target.value)} style={inputStyle}>
              <option value="">Todas</option>
              {listaCompetencias.map((c) => (
                <option key={c.anoMes} value={c.anoMes}>{c.competencia}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Empresa</label>
            <select value={empresa} onChange={(e) => setEmpresa(e.target.value)} style={inputStyle}>
              <option value="">Todas</option>
              {valoresUnicos(registros || [], 'empresa').map((v) => (
                <option key={v} value={v}>{exibir(v)}</option>
              ))}
            </select>
          </div>

          {abaId === 'detalhado' && FILTROS_DETALHE.map((f) => (
            <div key={f.campo}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>{f.rotulo}</label>
              <select
                value={filtrosExtra[f.campo] || ''}
                onChange={(e) => setFiltrosExtra((s) => ({ ...s, [f.campo]: e.target.value }))}
                style={inputStyle}
              >
                <option value="">Todos</option>
                {valoresUnicos(baseSemCompetencia, f.campo).map((v) => (
                  <option key={v} value={v}>{f.formatar ? exibir(v) : v}</option>
                ))}
              </select>
            </div>
          ))}

          <div style={{ flex: 1 }} />

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Demitidos</label>
            <select value={demitidosFiltro} onChange={(e) => setDemitidosFiltro(e.target.value)} style={inputStyle}>
              <option value="ativos">Apenas ativos</option>
              <option value="todos">Todos</option>
              <option value="demitidos">Apenas demitidos</option>
            </select>
          </div>
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Buscar</label>
            <Search size={15} style={{ position: 'absolute', left: '0.6rem', top: '2.05rem', color: 'var(--gray-400)' }} />
            <input
              type="text" placeholder="Funcionário, RE, cliente, local..." value={busca}
              onChange={(e) => setBusca(e.target.value)} style={{ ...inputStyle, width: '100%', paddingLeft: '2rem' }}
            />
          </div>
        </div>
      </Card>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--gray-200)' }}>
        {ABAS.map((a) => {
          const Icone = a.icone;
          const ativo = a.id === abaId;
          return (
            <button
              key={a.id}
              onClick={() => { setAbaId(a.id); setBusca(''); setFiltrosExtra({}); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem',
                border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600,
                fontSize: '0.9rem', fontFamily: 'Montserrat, sans-serif',
                color: ativo ? 'var(--blue)' : 'var(--gray-500)',
                borderBottom: ativo ? '2px solid var(--blue)' : '2px solid transparent', marginBottom: '-1px',
              }}
            >
              <Icone size={16} /> {a.titulo}
            </button>
          );
        })}
      </div>

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
      ) : carregando && !registros ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem' }}>
          <Loader2 size={40} className="spin" style={{ color: 'var(--blue)' }} />
          <p style={{ color: 'var(--gray-500)' }}>Carregando cartões de ponto...</p>
        </div>
      ) : abaId === 'geral' ? (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <KpiCard titulo="Total de Cartões" valor={fmtInt(m.total)} icone={CalendarClock} />
            <KpiCard titulo="Entregues" valor={fmtInt(m.entregue)} icone={CheckCircle2} cor="var(--success)" fundo="var(--success-bg)" />
            <KpiCard titulo="Pendências" valor={fmtInt(m.pendencias)} icone={Clock} cor="var(--danger)" fundo="var(--danger-bg)" />
            <KpiCard titulo="% Entregue" valor={fmtPct(m.pctEntregue)} icone={Percent} cor="var(--blue)" fundo="var(--blue-50)" />
          </div>

          {/* Donut + Gauge */}
          <div className="grid-2-cols" style={{ alignItems: 'start' }}>
            <Card>
              <h3 style={{ color: 'var(--gray-900)', marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Qtd × Status</h3>
              <DonutChart data={distribuicaoStatus(linhas)} />
            </Card>
            <Card>
              <h3 style={{ color: 'var(--gray-900)', marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>% Entregue</h3>
              <Gauge valor={m.pctEntregue} />
            </Card>
          </div>

          {/* Tendência de pendências por competência (ignora o filtro de competência) */}
          <Card>
            <h3 style={{ color: 'var(--gray-900)', marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Pendências por Competência</h3>
            <ColumnChart data={tendencia} cor="var(--danger)" />
          </Card>

          {/* Matriz por Empresa → Cliente */}
          <div className="grid-2-cols" style={{ alignItems: 'start' }}>
            <Card>
              <h3 style={{ color: 'var(--gray-900)', marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem' }}>Por Empresa</h3>
              <TabelaResumo colunas={colsResumo('Empresa')} linhas={resumoPor(linhas, (l) => l.empresa)} total={tot(linhas)} />
            </Card>
            <Card>
              <h3 style={{ color: 'var(--gray-900)', marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem' }}>Por Cliente</h3>
              <TabelaResumo colunas={colsResumo('Cliente')} linhas={resumoPor(linhas, (l) => l.cliente)} total={tot(linhas)} />
            </Card>
          </div>
        </>
      ) : abaId === 'gerente' ? (
        <>
          <Card style={{ borderColor: 'var(--blue-50)', backgroundColor: 'var(--blue-50)' }}>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
              <Info size={18} style={{ color: 'var(--blue)', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-700)' }}>
                Agrupado por <strong>Área de Supervisão</strong>. O de-para Área → Gerente (tabela
                <em> Supervisão</em> do BI) ainda não está integrado — assim que a fonte for disponibilizada, troco o agrupamento para Gerente.
              </p>
            </div>
          </Card>

          <div className="grid-2-cols" style={{ alignItems: 'start' }}>
            <Card>
              <h3 style={{ color: 'var(--gray-900)', marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Pendências por Supervisão</h3>
              <BarChart
                data={resumoPor(linhas, (l) => l.areaSupervisao, { ordenarPor: 'pendencias' })
                  .filter((g) => g.pendencias > 0)
                  .map((g) => ({ label: g.label, value: g.pendencias }))}
                cor="var(--danger)"
              />
            </Card>
            <Card>
              <h3 style={{ color: 'var(--gray-900)', marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Pendências por Competência</h3>
              <ColumnChart data={tendencia} cor="var(--danger)" />
            </Card>
          </div>

          <Card>
            <h3 style={{ color: 'var(--gray-900)', marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem' }}>Pendências por Supervisão — detalhe</h3>
            <TabelaResumo colunas={colsResumo('Supervisão')} linhas={resumoPor(linhas, (l) => l.areaSupervisao)} total={tot(linhas)} altura={520} />
          </Card>
        </>
      ) : (
        /* Detalhado */
        <>
          {/* Valor total dos cartões filtrados */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <KpiCard titulo="Total de Cartões" valor={fmtInt(m.total)} icone={CalendarClock} />
            <KpiCard titulo="Entregues" valor={fmtInt(m.entregue)} icone={CheckCircle2} cor="var(--success)" fundo="var(--success-bg)" />
            <KpiCard titulo="Pendências" valor={fmtInt(m.pendencias)} icone={Clock} cor="var(--danger)" fundo="var(--danger-bg)" />
            <KpiCard titulo="% Entregue" valor={fmtPct(m.pctEntregue)} icone={Percent} cor="var(--blue)" fundo="var(--blue-50)" />
          </div>

          <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ color: 'var(--gray-900)', margin: 0, fontSize: '1rem' }}>Cartões — detalhamento</h3>
            <span style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }}>
              {fmtInt(linhas.length)} registros
              {linhas.length > LIMITE_LINHAS ? ` (mostrando ${LIMITE_LINHAS} — exporte o CSV para ver todos)` : ''}
            </span>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: '560px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  {COLS_DETALHE.map((c) => (
                    <th key={c.titulo} style={{ position: 'sticky', top: 0, background: 'var(--white)', textAlign: 'left', padding: '0.5rem 0.6rem', borderBottom: '2px solid var(--gray-200)', color: 'var(--gray-500)', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {c.titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.slice(0, LIMITE_LINHAS).map((l, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    {COLS_DETALHE.map((c) => {
                      const valor = c.fmt ? c.fmt(l[c.chave]) : (l[c.chave] ?? '');
                      const ehStatus = c.chave === 'status';
                      return (
                        <td key={c.titulo} style={{ padding: '0.45rem 0.6rem', color: ehStatus && l.status === 'PENDENTE' ? 'var(--danger)' : 'var(--gray-700)', fontWeight: ehStatus ? 600 : 400, whiteSpace: 'nowrap', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={String(valor ?? '')}>
                          {valor}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {linhas.length === 0 && (
                  <tr><td colSpan={COLS_DETALHE.length} style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Nenhum cartão para os filtros atuais.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          </Card>
        </>
      )}
    </div>
  );
};
