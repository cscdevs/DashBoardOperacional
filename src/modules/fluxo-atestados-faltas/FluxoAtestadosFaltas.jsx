import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ehLocalEspecial } from '../../utils/locais';
import { fetchFluxoAtestadosFaltas } from './api';
import { BarChart, DonutChart, ColumnChart, AreaChart, RankList, TabelaResumo } from './components/Charts';
import {
  distintos, contarPor, contarPorMes, contarPorDia, formatarData, exibir, baixarCSV,
  porFase, recebidosHoje, mediaPorDia, classificarPrazo, agruparFuncionario,
  valoresUnicos, resumoPorCliente, resumoPorFuncionario,
} from './utils/dados';
import {
  FileText, Building2, AlertTriangle, Users, UserX,
  Download, Search, Loader2, Calendar,
  Clock, Hourglass, TrendingUp, CheckCircle2, Filter, Printer,
} from 'lucide-react';
import { Drawer } from '../../components/ui/Drawer';

/* ------------------------------------------------------------------ */
/* Configuração de cada aba: dataset, busca, colunas e agregações.     */
/* ------------------------------------------------------------------ */

const ABAS = [
  {
    id: 'atestados',
    titulo: 'Atestados',
    icone: FileText,
    chave: 'atestados',
    nomeCSV: 'atestados.csv',
    semTabela: true, // aba no estilo do BI: usa listas/ranking no lugar da tabela+CSV
    camposBusca: ['nome', 'cliente', 'local', 'ocorrencia', 'tipoDoc'],
    colunas: [
      { chave: 'empresa', titulo: 'Empresa', fmt: exibir },
      { chave: 're', titulo: 'RE' },
      { chave: 'nome', titulo: 'Funcionário', fmt: exibir },
      { chave: 'cliente', titulo: 'Cliente', fmt: exibir },
      { chave: 'local', titulo: 'Local', fmt: exibir },
      { chave: 'tipoDoc', titulo: 'Tipo' },
      { chave: 'ocorrencia', titulo: 'Ocorrência', fmt: exibir },
      { chave: 'dtLancamento', titulo: 'Lançamento', fmt: formatarData },
      { chave: 'faseAtual', titulo: 'Fase', fmt: exibir },
    ],
    kpis: (l, ctx) => [
      { titulo: 'Recebidos Hoje', valor: recebidosHoje(l), icone: FileText },
      { titulo: 'Pendente de Lançamento', sub: '(Acumulativo)', valor: porFase(l, 'PENDENTE'), icone: Clock, cor: 'var(--warning)', fundo: 'var(--warning-bg)' },
      { titulo: 'Aguardando Aprovação', sub: '(SESMT)', valor: porFase(l, 'APROVAÇÃO'), icone: Hourglass, cor: 'var(--blue)', fundo: 'var(--blue-50)' },
      { titulo: 'Média por Dia', valor: mediaPorDia(l, ctx?.periodo), icone: TrendingUp, cor: 'var(--success)', fundo: 'var(--success-bg)' },
      { titulo: 'Concluídos', valor: porFase(l, 'CONCLUÍDO'), icone: CheckCircle2, cor: 'var(--success)', fundo: 'var(--success-bg)' },
    ],
    graficos: (l) => [
      { titulo: 'Prazo de Envio do Atestado', tipo: 'column', cor: ['#64748B', '#22C55E', '#EF4444', '#CBD5E1'], dados: classificarPrazo(l.filter((x) => x.faseFantasia === 'CONCLUÍDO')) },
      { titulo: 'Tipo de Atestado Recebido', tipo: 'column', dados: contarPor(l, 'tipoDoc', { topN: 8 }) },
      { titulo: 'Recebimentos Diários', tipo: 'area', largura: 'full', cor: 'var(--warning)', dados: contarPorDia(l, 'dtLancamento') },
      { titulo: 'Por Cliente', tipo: 'lista', dados: contarPor(l.map((x) => ({ cliente: exibir(x.cliente) })), 'cliente', {}) },
      { titulo: 'Funcionários', tipo: 'lista', dados: agruparFuncionario(l) },
    ],
  },
  {
    id: 'faltasCliente',
    titulo: 'Faltas por Cliente',
    icone: Building2,
    chave: 'faltasPorCliente',
    nomeCSV: 'faltas-por-cliente.csv',
    layout: 'tabelas', // duas tabelas (Cliente + Funcionário), no estilo do BI
    semTabela: true,
    demitidosPadrao: 'ativos', // abre mostrando só os ativos (seletor permite ver demitidos/todos)
    filtrosExtra: [
      { rotulo: 'Tipo Falta', campo: 'statusFalta' },
      { rotulo: 'Empresa', campo: 'empresa' },
      { rotulo: 'Cliente', campo: 'cliente' },
    ],
    camposBusca: ['nome', 'cliente', 'local', 'statusFalta', 'areaSupervisao'],
    colunas: [
      { chave: 'empresaCliente', titulo: 'Empresa Cliente', fmt: exibir },
      { chave: 'cliente', titulo: 'Cliente', fmt: exibir },
      { chave: 'local', titulo: 'Local', fmt: exibir },
      { chave: 'dataPonto', titulo: 'Data', fmt: formatarData },
      { chave: 're', titulo: 'RE' },
      { chave: 'nome', titulo: 'Funcionário', fmt: exibir },
      { chave: 'areaSupervisao', titulo: 'Área Supervisão', fmt: exibir },
      { chave: 'statusFalta', titulo: 'Status' },
    ],
    kpis: (l) => [
      { titulo: 'Faltas', valor: l.length, icone: AlertTriangle },
      { titulo: 'Funcionários', valor: distintos(l, 're'), icone: Users, cor: 'var(--success)', fundo: 'var(--success-bg)' },
      { titulo: 'Clientes', valor: distintos(l, 'cliente'), icone: Building2, cor: 'var(--warning)', fundo: 'var(--warning-bg)' },
      { titulo: 'Injustificadas', valor: l.filter((x) => x.statusFalta === 'FALTA INJUSTIFICADA').length, icone: UserX, cor: 'var(--danger)', fundo: 'var(--danger-bg)' },
    ],
    graficos: (l) => [
      { titulo: 'Por status da falta', tipo: 'donut', dados: contarPor(l, 'statusFalta', { topN: 8 }) },
      { titulo: 'Top clientes', tipo: 'bar', dados: contarPor(l.map((x) => ({ cliente: exibir(x.cliente) })), 'cliente', { topN: 10 }) },
      { titulo: 'Por mês', tipo: 'bar', cor: 'var(--success)', dados: contarPorMes(l, 'dataPonto') },
    ],
  },
  {
    id: 'faltasDisc',
    titulo: 'Faltas Disciplinares',
    icone: AlertTriangle,
    chave: 'faltasDisciplinares',
    nomeCSV: 'faltas-disciplinares.csv',
    camposBusca: ['nome', 'cliente', 'local', 'tipoDescricao', 'empresa'],
    colunas: [
      { chave: 'tipoDescricao', titulo: 'Tipo' },
      { chave: 'empresa', titulo: 'Empresa', fmt: exibir },
      { chave: 're', titulo: 'RE' },
      { chave: 'nome', titulo: 'Funcionário', fmt: exibir },
      { chave: 'data', titulo: 'Data', fmt: formatarData },
      { chave: 'competencia', titulo: 'Competência' },
      { chave: 'cliente', titulo: 'Cliente', fmt: exibir },
      { chave: 'local', titulo: 'Local', fmt: exibir },
      { chave: 'turno', titulo: 'Turno', fmt: exibir },
    ],
    kpis: (l) => [
      { titulo: 'Faltas', valor: l.length, icone: AlertTriangle },
      { titulo: 'Funcionários', valor: distintos(l, 're'), icone: Users, cor: 'var(--success)', fundo: 'var(--success-bg)' },
      { titulo: 'Clientes', valor: distintos(l, 'cliente'), icone: Building2, cor: 'var(--warning)', fundo: 'var(--warning-bg)' },
      { titulo: 'Demitidos', valor: l.filter((x) => x.ehDemitido).length, icone: UserX, cor: 'var(--danger)', fundo: 'var(--danger-bg)' },
    ],
    graficos: (l) => [
      { titulo: 'Top empresas', tipo: 'bar', dados: contarPor(l.map((x) => ({ empresa: exibir(x.empresa) })), 'empresa', { topN: 10 }) },
      { titulo: 'Top clientes', tipo: 'bar', dados: contarPor(l.map((x) => ({ cliente: exibir(x.cliente) })), 'cliente', { topN: 10 }) },
      { titulo: 'Por mês', tipo: 'bar', cor: 'var(--success)', dados: contarPorMes(l, 'data') },
    ],
  },
];

/* ------------------------------------------------------------------ */

const KpiCard = ({ titulo, sub, valor, icone: Icone, cor = 'var(--blue)', fundo = 'var(--blue-50)' }) => (
  <Card className="card-3d-tilt stagger-item" style={{ position: 'relative', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    {/* Decorative Sparkline */}
    <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50%', opacity: 0.15, pointerEvents: 'none' }} preserveAspectRatio="none" viewBox="0 0 100 40">
      <path d="M0,40 Q10,20 20,25 T40,15 T60,20 T80,5 T100,10 L100,40 Z" fill={cor} />
      <path d="M0,40 Q10,20 20,25 T40,15 T60,20 T80,5 T100,10" fill="none" stroke={cor} strokeWidth="2" />
    </svg>
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.8rem', fontWeight: 500, margin: 0 }}>{titulo}</p>
        {sub && <p style={{ color: 'var(--gray-400)', fontSize: '0.7rem', margin: '0.1rem 0 0' }}>{sub}</p>}
        <h2 className="mono" style={{ fontSize: '1.9rem', color: cor, margin: '0.4rem 0 0 0' }}>{valor}</h2>
      </div>
      <div style={{ padding: '0.5rem', backgroundColor: fundo, borderRadius: '8px', color: cor, flexShrink: 0 }}>
        <Icone size={22} />
      </div>
    </div>
  </Card>
);

const SkeletonDashboard = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', padding: '1rem 0' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
      {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton-box" style={{ height: '110px' }} />)}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.5rem' }}>
      <div className="skeleton-box" style={{ height: '320px' }} />
      <div className="skeleton-box" style={{ height: '320px' }} />
    </div>
    <div className="skeleton-box" style={{ height: '400px' }} />
  </div>
);

const inputStyle = {
  padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--gray-200)',
  backgroundColor: 'var(--white)', color: 'var(--gray-900)', fontFamily: 'Montserrat, sans-serif', fontSize: '0.875rem',
};

const hoje = new Date();
// Formata como YYYY-MM-DD usando a data LOCAL (evita o "pulo" de dia do toISOString em UTC).
const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

const LIMITE_LINHAS = 300; // linhas renderizadas na tabela (CSV exporta tudo)

const fmtInt = (v) => Number(v ?? 0).toLocaleString('pt-BR');
const fmt2 = (v) => Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const COLS_CLIENTE = [
  { chave: 'cliente', titulo: 'Cliente', alinhar: 'left' },
  { chave: 'qtd', titulo: 'Qtd', alinhar: 'right', mono: true, formato: fmtInt, largura: '62px' },
  { chave: 'media', titulo: 'Média/Período', alinhar: 'right', mono: true, formato: fmt2, largura: '108px' },
];
const COLS_FUNC = [
  { chave: 'funcionario', titulo: 'Funcionário', alinhar: 'left' },
  { chave: 'qtd', titulo: 'Qtd', alinhar: 'right', mono: true, formato: fmtInt, largura: '70px' },
];

export const FluxoAtestadosFaltas = () => {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [dados, setDados] = useState(null);

  const [dataInicial, setDataInicial] = useState(isoLocal(primeiroDiaMes));
  const [dataFinal, setDataFinal] = useState(isoLocal(hoje));
  const [abaId, setAbaId] = useState('atestados');
  const [demitidosFiltro, setDemitidosFiltro] = useState('todos'); // todos | ativos | demitidos
  const [filtrosExtra, setFiltrosExtra] = useState({}); // { campo: valor } por aba (Tipo Falta, Empresa, Cliente)
  const [busca, setBusca] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [linhaSelecionada, setLinhaSelecionada] = useState(null);

  const carregar = () => {
    setCarregando(true);
    fetchFluxoAtestadosFaltas({ dataInicial, dataFinal })
      .then((d) => { setDados(d); setErro(null); })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, []);

  const aba = ABAS.find((a) => a.id === abaId);

  const linhasFiltradas = useMemo(() => {
    if (!dados) return [];
    let l = dados[aba.chave] || [];
    if (demitidosFiltro === 'ativos') l = l.filter((x) => !x.ehDemitido);
    if (demitidosFiltro === 'demitidos') l = l.filter((x) => x.ehDemitido);
    // Locais de Abandono/Afastamento/Faltante são sempre excluídos.
    l = l.filter((x) => !ehLocalEspecial(x.local));
    // Filtros extra por aba (dropdowns: Tipo Falta, Empresa, Cliente).
    for (const f of aba.filtrosExtra || []) {
      const val = filtrosExtra[f.campo];
      if (val) l = l.filter((x) => String(x[f.campo] ?? '') === val);
    }
    const termo = busca.trim().toLowerCase();
    if (termo) {
      l = l.filter((x) =>
        aba.camposBusca.some((c) => String(x[c] ?? '').toLowerCase().includes(termo))
      );
    }
    return l;
  }, [dados, aba, demitidosFiltro, filtrosExtra, busca]);

  // Base para as opções dos dropdowns (sem os filtros extra/busca, mas sem os locais excluídos).
  const linhasParaOpcoes = useMemo(
    () => (dados?.[aba.chave] || []).filter((x) => !ehLocalEspecial(x.local)),
    [dados, aba]
  );

  const kpis = useMemo(() => aba.kpis(linhasFiltradas, { periodo: dados?.periodo }), [aba, linhasFiltradas, dados]);
  const graficos = useMemo(() => aba.graficos(linhasFiltradas), [aba, linhasFiltradas]);
  const resumoCliente = useMemo(() => resumoPorCliente(linhasFiltradas), [linhasFiltradas]);
  const resumoFuncionario = useMemo(() => resumoPorFuncionario(linhasFiltradas), [linhasFiltradas]);

  const renderGrafico = (g) => {
    switch (g.tipo) {
      case 'donut': return <DonutChart data={g.dados} />;
      case 'column': return <ColumnChart data={g.dados} cor={g.cor || 'var(--blue)'} />;
      case 'area': return <AreaChart data={g.dados} cor={g.cor || 'var(--blue)'} />;
      case 'lista': return <RankList data={g.dados} />;
      default: return <BarChart data={g.dados} cor={g.cor || 'var(--blue)'} />;
    }
  };

  const exportar = () => {
    const colunas = [
      ...aba.colunas.map((c) => ({ titulo: c.titulo, valor: (l) => (c.fmt ? c.fmt(l[c.chave]) : l[c.chave]) })),
      { titulo: 'É Demitido?', valor: (l) => (l.ehDemitido ? 'Sim' : 'Não') },
    ];
    baixarCSV(aba.nomeCSV, colunas, linhasFiltradas);
  };

  return (
    <div className="full-width-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--gray-900)', margin: 0 }}>Fluxo de Atestados / Faltas</h1>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem' }}>
            Atestados, faltas por cliente e faltas disciplinares — com filtro de período e flag de demitidos.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={16} /> Gerar PDF
          </Button>
          {!aba.semTabela && (
            <Button variant="primary" onClick={exportar} disabled={!dados || linhasFiltradas.length === 0}>
              <Download size={16} /> Exportar CSV
            </Button>
          )}
        </div>
      </div>

      {/* Filtros: período + demitidos + busca */}
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>De</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={15} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} style={{ ...inputStyle, paddingLeft: '2rem' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Até</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={15} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} style={{ ...inputStyle, paddingLeft: '2rem' }} />
            </div>
          </div>
          <Button variant="primary" onClick={carregar} disabled={carregando}>
            {carregando ? <Loader2 size={16} className="spin" /> : 'Aplicar'}
          </Button>

          <Button variant="secondary" onClick={() => setFiltrosAbertos(!filtrosAbertos)}>
            <Filter size={16} /> Filtros Avançados
          </Button>

          <div style={{ flex: 1 }} />

          <div style={{ position: 'relative', minWidth: '220px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Buscar na tabela</label>
            <Search size={15} style={{ position: 'absolute', left: '0.6rem', top: '2.05rem', color: 'var(--gray-400)' }} />
            <input
              type="text" placeholder="Funcionário, cliente, local..." value={busca}
              onChange={(e) => setBusca(e.target.value)} style={{ ...inputStyle, width: '100%', paddingLeft: '2rem' }}
            />
          </div>
        </div>

        {/* Filtros Colapsáveis */}
        <div className="collapsible-content" style={{ maxHeight: filtrosAbertos ? '200px' : '0', opacity: filtrosAbertos ? 1 : 0, marginTop: filtrosAbertos ? '1rem' : '0' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1rem', background: 'var(--gray-50)', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
            {(aba.filtrosExtra || []).map((f) => (
              <div key={f.campo}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>{f.rotulo}</label>
                <select
                  value={filtrosExtra[f.campo] || ''}
                  onChange={(e) => setFiltrosExtra((s) => ({ ...s, [f.campo]: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">Todos</option>
                  {valoresUnicos(linhasParaOpcoes, f.campo).map((v) => (
                    <option key={v} value={v}>{f.campo === 'statusFalta' ? v : exibir(v)}</option>
                  ))}
                </select>
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Status do Funcionário</label>
              <select value={demitidosFiltro} onChange={(e) => setDemitidosFiltro(e.target.value)} style={inputStyle}>
                <option value="todos">Todos</option>
                <option value="ativos">Apenas ativos</option>
                <option value="demitidos">Apenas demitidos</option>
              </select>
            </div>
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
              onClick={() => { setAbaId(a.id); setBusca(''); setFiltrosExtra({}); setDemitidosFiltro(a.demitidosPadrao || 'todos'); }}
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
      ) : carregando && !dados ? (
        <SkeletonDashboard />
      ) : aba.layout === 'tabelas' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Gráficos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            <Card>
              <h3 style={{ color: 'var(--gray-900)', marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Por Tipo de Falta</h3>
              <DonutChart data={contarPor(linhasFiltradas, 'statusFalta', { topN: 8 })} />
            </Card>
            <Card>
              <h3 style={{ color: 'var(--gray-900)', marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Faltas por Período</h3>
              <AreaChart data={contarPorDia(linhasFiltradas, 'dataPonto')} cor="var(--warning)" />
            </Card>
          </div>
          {/* Tabelas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            <Card>
              <h3 style={{ color: 'var(--gray-900)', marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem' }}>Ranking por Cliente</h3>
              <TabelaResumo colunas={COLS_CLIENTE} linhas={resumoCliente.linhas} total={resumoCliente.total} />
            </Card>
            <Card>
              <h3 style={{ color: 'var(--gray-900)', marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem' }}>Ranking por Funcionário</h3>
              <TabelaResumo colunas={COLS_FUNC} linhas={resumoFuncionario.linhas} total={resumoFuncionario.total} />
            </Card>
          </div>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
            {kpis.map((k) => <KpiCard key={k.titulo} {...k} />)}
          </div>

          {/* Gráficos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.5rem' }}>
            {graficos.map((g) => (
              <Card key={g.titulo} style={g.largura === 'full' ? { gridColumn: '1 / -1' } : undefined}>
                <h3 style={{ color: 'var(--gray-900)', marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>{g.titulo}</h3>
                {renderGrafico(g)}
              </Card>
            ))}
          </div>

          {/* Tabela de detalhamento (oculta nas abas estilo BI, ex.: Atestados) */}
          {!aba.semTabela && (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ color: 'var(--gray-900)', margin: 0, fontSize: '1rem' }}>{aba.titulo} — detalhamento</h3>
              <span style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }}>
                {linhasFiltradas.length} registros
                {linhasFiltradas.length > LIMITE_LINHAS ? ` (mostrando ${LIMITE_LINHAS} — exporte o CSV para ver todos)` : ''}
              </span>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '520px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr className="glass-table-header">
                    {aba.colunas.map((c) => (
                      <th key={c.titulo} style={{ position: 'sticky', top: 0, textAlign: 'left', padding: '0.6rem 0.6rem', borderBottom: '2px solid var(--gray-200)', color: 'var(--gray-700)', whiteSpace: 'nowrap', fontWeight: 600, zIndex: 10 }}>
                        {c.titulo}
                      </th>
                    ))}
                    <th style={{ position: 'sticky', top: 0, textAlign: 'center', padding: '0.6rem 0.6rem', borderBottom: '2px solid var(--gray-200)', color: 'var(--gray-700)', whiteSpace: 'nowrap', fontWeight: 600, zIndex: 10 }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linhasFiltradas.slice(0, LIMITE_LINHAS).map((l, i) => (
                    <tr 
                      key={i} 
                      onClick={() => setLinhaSelecionada(l)}
                      style={{ borderBottom: '1px solid var(--gray-100)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-50)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {aba.colunas.map((c) => (
                        <td key={c.titulo} style={{ padding: '0.45rem 0.6rem', color: 'var(--gray-700)', whiteSpace: 'nowrap', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={String((c.fmt ? c.fmt(l[c.chave]) : l[c.chave]) ?? '')}>
                          {c.fmt ? c.fmt(l[c.chave]) : (l[c.chave] ?? '')}
                        </td>
                      ))}
                      <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}>
                        {l.ehDemitido
                          ? <span className="status-badge danger"><span className="dot-indicator" /> Demitido</span>
                          : <span className="status-badge success"><span className="dot-indicator" /> Ativo</span>}
                      </td>
                    </tr>
                  ))}
                  {linhasFiltradas.length === 0 && (
                    <tr><td colSpan={aba.colunas.length + 1} style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Nenhum registro para os filtros atuais.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          )}
        </>
      )}

      {/* Drawer de Detalhamento da Linha (Tabela) */}
      <Drawer
        isOpen={!!linhaSelecionada}
        onClose={() => setLinhaSelecionada(null)}
        title="Dossiê do Colaborador"
      >
        {linhaSelecionada && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '1.25rem', background: 'var(--blue-50)', borderRadius: '12px', border: '1px solid var(--blue-100)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--blue-dark)', fontSize: '1.2rem' }}>{linhaSelecionada.nome || linhaSelecionada.cliente}</h3>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--blue)', fontWeight: 600 }} className="mono">RE: {linhaSelecionada.re || '-'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {linhaSelecionada.ehDemitido
                    ? <span className="status-badge danger"><span className="dot-indicator" /> Demitido</span>
                    : <span className="status-badge success"><span className="dot-indicator" /> Ativo</span>}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '0.95rem', borderBottom: '2px solid var(--gray-100)', paddingBottom: '0.5rem' }}>Informações Registradas</h4>
              {aba.colunas.map(c => {
                const valor = c.fmt ? c.fmt(linhaSelecionada[c.chave]) : linhaSelecionada[c.chave];
                return (
                  <div key={c.chave} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-500)', fontWeight: 500 }}>{c.titulo}</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-900)', fontWeight: 600, wordBreak: 'break-word' }}>
                      {valor || '-'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
