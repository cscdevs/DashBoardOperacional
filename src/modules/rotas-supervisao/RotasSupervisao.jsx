import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { RotasMap } from './components/RotasMap';
import { fetchRotasSupervisao, fetchPosicoesVeiculos, fetchTrajetoVeiculo } from './api';
import { mapaDeCores, corDoSupervisor } from './utils/cores';
import { tituloCase } from '../../utils/texto';
import { ehLocalEspecial } from '../../utils/locais';
import {
  Building2,
  MapPin,
  Users,
  UserCheck,
  Download,
  Search,
  AlertTriangle,
  Loader2,
  Palette,
  Check,
  Car,
} from 'lucide-react';

const KpiCard = ({ titulo, valor, subtitulo, icone: Icone, cor = 'var(--blue)', fundo = 'var(--blue-50)' }) => (
  <Card className="card-3d-tilt stagger-item" style={{ position: 'relative', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>{titulo}</p>
        <h2 className="mono" style={{ fontSize: '2rem', color: cor, margin: '0.5rem 0 0 0' }}>{valor}</h2>
      </div>
      <div style={{ padding: '0.5rem', backgroundColor: fundo, borderRadius: '8px', color: cor }}>
        <Icone size={24} />
      </div>
    </div>
  </Card>
);

const selectStyle = {
  padding: '0.5rem 0.75rem',
  borderRadius: '6px',
  border: '1px solid var(--gray-200)',
  backgroundColor: 'var(--white)',
  color: 'var(--gray-900)',
  fontFamily: 'Montserrat, sans-serif',
  fontSize: '0.875rem',
  minWidth: '180px',
};

/** Rótulo dos locais cuja rota não tem um supervisor nomeado. */
const SEM_SUPERVISOR = 'Sem supervisor';

/** Colunas exportadas no CSV. */
const COLUNAS = [
  { chave: 'empresa', titulo: 'Empresa' },
  { chave: 'baseOperacional', titulo: 'Base Operacional' },
  { chave: 'cliente', titulo: 'Cliente' },
  { chave: 'local', titulo: 'Local' },
  { chave: 'enderecoCompleto', titulo: 'Endereço' },
  { chave: 'telefone', titulo: 'Telefone' },
  { chave: 'contatoOperacional', titulo: 'Contato' },
  { chave: 'supervisorNome', titulo: 'Supervisor' },
];

function gerarCSV(linhas) {
  const cabecalho = COLUNAS.map((c) => c.titulo).join(';');
  const corpo = linhas.map((l) =>
    COLUNAS.map((c) => `"${String(tituloCase(l[c.chave] ?? '')).replace(/"/g, '""')}"`).join(';')
  );
  return [cabecalho, ...corpo].join('\r\n');
}

function baixarCSV(linhas) {
  const csv = '﻿' + gerarCSV(linhas); // BOM p/ acentuação no Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rotas-supervisao.csv';
  a.click();
  URL.revokeObjectURL(url);
}

const valoresUnicos = (rotas, chave) =>
  [...new Set(rotas.map((r) => r[chave]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

export const RotasSupervisao = () => {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [rotas, setRotas] = useState([]);

  // Filtros
  const [busca, setBusca] = useState('');
  const [fEmpresa, setFEmpresa] = useState('');
  const [fBase, setFBase] = useState('');
  const [fCliente, setFCliente] = useState('');
  const [fSupervisor, setFSupervisor] = useState('');
  const [ocultarSemSupervisor, setOcultarSemSupervisor] = useState(false);

  // Veículos ao vivo (rastreamento STC)
  const [mostrarVeiculos, setMostrarVeiculos] = useState(false);
  const [apenasCarros, setApenasCarros] = useState(false); // oculta as locais
  const [soSupervisao, setSoSupervisao] = useState(true);
  const [veiculos, setVeiculos] = useState([]);
  const [veiculosAtualizadoEm, setVeiculosAtualizadoEm] = useState(null);
  const [erroVeiculos, setErroVeiculos] = useState(null);
  const [placaSelecionada, setPlacaSelecionada] = useState(null);
  const [trajeto, setTrajeto] = useState(null);
  const [trajetoHoras, setTrajetoHoras] = useState(24); // período do rastro

  const [mostrarLegenda, setMostrarLegenda] = useState(false);
  const [legendaPos, setLegendaPos] = useState(null);
  const legendaRef = useRef(null); // wrapper do botão
  const popoverRef = useRef(null); // painel flutuante (renderizado via portal)

  // Abre/fecha a legenda; ao abrir, calcula a posição a partir do botão.
  const alternarLegenda = () => {
    setMostrarLegenda((aberto) => {
      if (!aberto && legendaRef.current) {
        const r = legendaRef.current.getBoundingClientRect();
        setLegendaPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
      }
      return !aberto;
    });
  };

  // Fecha o popover ao clicar fora (botão + painel) ou apertar Esc.
  useEffect(() => {
    if (!mostrarLegenda) return;
    const aoClicarFora = (e) => {
      const noBotao = legendaRef.current?.contains(e.target);
      const noPainel = popoverRef.current?.contains(e.target);
      if (!noBotao && !noPainel) setMostrarLegenda(false);
    };
    const aoTeclar = (e) => e.key === 'Escape' && setMostrarLegenda(false);
    // Fecha ao rolar a página (o popover é fixo e descolaria do botão),
    // exceto quando a rolagem é dentro da própria lista da legenda.
    const aoRolar = (e) => {
      if (popoverRef.current?.contains(e.target)) return;
      setMostrarLegenda(false);
    };
    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    window.addEventListener('scroll', aoRolar, true);
    window.addEventListener('resize', aoRolar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
      window.removeEventListener('scroll', aoRolar, true);
      window.removeEventListener('resize', aoRolar);
    };
  }, [mostrarLegenda]);

  useEffect(() => {
    let ativo = true;
    const carregar = () => {
      fetchRotasSupervisao()
        .then((data) => {
          if (!ativo) return;
          setRotas(data.rotas || []);
          setErro(null);
        })
        .catch((e) => ativo && setErro(e.message))
        .finally(() => ativo && setCarregando(false));
    };
    setCarregando(true);
    carregar();
    const id = setInterval(carregar, 120000); // 2 minutos
    return () => {
      ativo = false;
      clearInterval(id);
    };
  }, []);

  // A camada de carros fica ativa se ligada explicitamente OU no modo "só carros".
  const carrosAtivos = mostrarVeiculos || apenasCarros;

  // Posição ao vivo dos veículos: busca quando a camada está ativa e re-busca a
  // cada 60s. O backend tem cache curto próprio (~45s).
  useEffect(() => {
    if (!carrosAtivos) return;
    let ativo = true;
    const carregar = () => {
      fetchPosicoesVeiculos()
        .then((data) => {
          if (!ativo) return;
          setVeiculos(data.veiculos || []);
          setVeiculosAtualizadoEm(data.atualizadoEm || null);
          setErroVeiculos(null);
        })
        .catch((e) => ativo && setErroVeiculos(e.message));
    };
    carregar();
    const id = setInterval(carregar, 60000);
    return () => {
      ativo = false;
      clearInterval(id);
    };
  }, [carrosAtivos]);

  // Carrega o rastro (trajeto 24h) sempre que houver uma viatura selecionada.
  // A limpeza do rastro é feita nos handlers (não no effect), p/ evitar
  // setState dentro do corpo do efeito.
  useEffect(() => {
    if (!placaSelecionada) return;
    let ativo = true;
    const carregar = () =>
      fetchTrajetoVeiculo(placaSelecionada, trajetoHoras)
        .then((d) => ativo && setTrajeto(d))
        .catch(() => ativo && setTrajeto(null));
    carregar();
    // Auto-atualiza o rastro (incremental no backend, então é rápido).
    const id = setInterval(carregar, 60000);
    return () => {
      ativo = false;
      clearInterval(id);
    };
  }, [placaSelecionada, trajetoHoras]);

  // Liga/desliga a camada de veículos; ao alternar, limpa seleção e rastro.
  const alternarVeiculos = useCallback(() => {
    setMostrarVeiculos((on) => !on);
    setPlacaSelecionada(null);
    setTrajeto(null);
  }, []);

  // Seleciona/deseleciona uma viatura. Estável p/ não recriar os marcadores a
  // cada render. Limpa o rastro anterior; o effect recarrega se houver seleção.
  const aoSelecionarVeiculo = useCallback((placa) => {
    setPlacaSelecionada((atual) => (atual === placa ? null : placa));
    setTrajeto(null);
  }, []);

  // Cores e listas usam o NOME do supervisor (não o rótulo da rota), e o
  // "Sem supervisor" não recebe cor própria (fica cinza no mapa).
  const coresPorSupervisor = useMemo(
    () => mapaDeCores(rotas.map((r) => r.supervisorNome).filter((n) => n && n !== SEM_SUPERVISOR)),
    [rotas]
  );

  const opcoes = useMemo(
    () => ({
      empresas: valoresUnicos(rotas, 'empresa'),
      bases: valoresUnicos(rotas, 'baseOperacional'),
      clientes: valoresUnicos(rotas, 'clienteResumido'),
    }),
    [rotas]
  );

  // Filtros gerais (tudo menos o de supervisor). A legenda clicável é quem
  // aplica o filtro de supervisor, então ela se baseia neste conjunto — assim
  // a lista não some ao selecionar um supervisor e dá para alternar entre eles.
  const rotasFiltradasBase = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return rotas.filter((r) => {
      // Locais de Abandono/Afastamento/Faltante são sempre excluídos.
      if (ehLocalEspecial(r.localResumido) || ehLocalEspecial(r.local)) return false;
      if (fEmpresa && r.empresa !== fEmpresa) return false;
      if (fBase && r.baseOperacional !== fBase) return false;
      if (fCliente && r.clienteResumido !== fCliente) return false;
      if (ocultarSemSupervisor && (!r.supervisorNome || r.supervisorNome === SEM_SUPERVISOR)) return false;
      if (termo) {
        const alvo = [r.cliente, r.local, r.enderecoCompleto, r.contatoOperacional, r.supervisorNome]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [rotas, busca, fEmpresa, fBase, fCliente, ocultarSemSupervisor]);

  const rotasFiltradas = useMemo(
    () => (fSupervisor ? rotasFiltradasBase.filter((r) => r.supervisorNome === fSupervisor) : rotasFiltradasBase),
    [rotasFiltradasBase, fSupervisor]
  );

  const kpis = useMemo(
    () => ({
      locais: new Set(rotasFiltradas.map((r) => r.codLocal).filter(Boolean)).size,
      clientes: new Set(rotasFiltradas.map((r) => r.cliente).filter(Boolean)).size,
      supervisores: new Set(
        rotasFiltradas.map((r) => r.supervisorNome).filter((n) => n && n !== SEM_SUPERVISOR)
      ).size,
      cidades: new Set(rotasFiltradas.map((r) => `${r.localidade}-${r.uf}`)).size,
    }),
    [rotasFiltradas]
  );

  // Supervisores disponíveis para a legenda clicável (independe do supervisor
  // selecionado, para permitir alternar).
  const supervisoresVisiveis = useMemo(
    () => valoresUnicos(rotasFiltradasBase, 'supervisorNome').filter((n) => n !== SEM_SUPERVISOR),
    [rotasFiltradasBase]
  );

  // Veículos a exibir no mapa: nada se a camada está desligada; senão todos ou
  // só os que estão em uso por um supervisor (BDV aberto).
  const veiculosNoMapa = useMemo(() => {
    if (!carrosAtivos) return [];
    return soSupervisao ? veiculos.filter((v) => v.emUso) : veiculos;
  }, [carrosAtivos, soSupervisao, veiculos]);

  const limparFiltros = () => {
    setBusca('');
    setFEmpresa('');
    setFBase('');
    setFCliente('');
    setFSupervisor('');
    setOcultarSemSupervisor(false);
  };

  if (carregando) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem' }}>
        <Loader2 size={40} className="spin" style={{ color: 'var(--blue)' }} />
        <p style={{ color: 'var(--gray-500)' }}>Carregando relatório de Rotas de Supervisão...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <Card style={{ borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-bg)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <AlertTriangle size={24} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <div>
            <h3 style={{ color: 'var(--danger)', margin: 0 }}>Não foi possível carregar o relatório</h3>
            <p style={{ color: 'var(--gray-700)', margin: '0.5rem 0 0' }}>{erro}</p>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              Verifique se o backend está rodando (porta 3001) e se as credenciais do SQL Server em
              <code className="mono"> server/.env </code> estão corretas.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--gray-900)', margin: 0 }}>Rotas de Supervisão</h1>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem' }}>
            Locais de serviço ativos, coloridos por supervisor no mapa.
          </p>
        </div>
        <Button variant="primary" onClick={() => baixarCSV(rotasFiltradas)}>
          <Download size={16} /> Exportar CSV
        </Button>
      </div>

      {/* Filtros (no topo) */}
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input
              type="text"
              placeholder="Buscar cliente, local, endereço, contato..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ ...selectStyle, width: '100%', minWidth: 0, paddingLeft: '2.25rem' }}
            />
          </div>
          <select style={selectStyle} value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)}>
            <option value="">Todas as empresas</option>
            {opcoes.empresas.map((v) => <option key={v} value={v}>{tituloCase(v)}</option>)}
          </select>
          <select style={selectStyle} value={fBase} onChange={(e) => setFBase(e.target.value)}>
            <option value="">Todas as bases</option>
            {opcoes.bases.map((v) => <option key={v} value={v}>{tituloCase(v)}</option>)}
          </select>
          <select style={selectStyle} value={fCliente} onChange={(e) => setFCliente(e.target.value)}>
            <option value="">Todos os clientes</option>
            {opcoes.clientes.map((v) => <option key={v} value={v}>{tituloCase(v)}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--gray-700)', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={ocultarSemSupervisor}
              onChange={(e) => setOcultarSemSupervisor(e.target.checked)}
            />
            Ocultar sem supervisor
          </label>
          <div ref={legendaRef} style={{ display: 'inline-flex' }}>
            <Button
              variant="secondary"
              onClick={alternarLegenda}
              disabled={supervisoresVisiveis.length === 0}
            >
              <Palette size={16} />
              <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fSupervisor ? tituloCase(fSupervisor) : `Legenda${supervisoresVisiveis.length > 0 ? ` (${supervisoresVisiveis.length})` : ''}`}
              </span>
            </Button>
          </div>
          <Button
            variant={mostrarVeiculos ? 'primary' : 'secondary'}
            onClick={alternarVeiculos}
            title="Mostra a posição atual dos veículos no mapa (rastreamento), atualizada a cada 60s"
          >
            <Car size={16} /> {mostrarVeiculos ? 'Veículos: ligado' : 'Veículos ao vivo'}
          </Button>
          <Button
            variant={apenasCarros ? 'primary' : 'secondary'}
            onClick={() => setApenasCarros((v) => !v)}
            title="Alterna entre ver os endereços (locais) e ver apenas os carros no mapa"
          >
            {apenasCarros ? <MapPin size={16} /> : <Car size={16} />}
            {apenasCarros ? 'Ver endereços' : 'Só os carros'}
          </Button>
          <Button variant="secondary" onClick={limparFiltros}>Limpar</Button>
        </div>
        {carrosAtivos && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.25rem', alignItems: 'center', fontSize: '0.8rem', color: erroVeiculos ? 'var(--danger)' : 'var(--gray-500)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', userSelect: 'none', color: 'var(--gray-700)' }}>
              <input type="checkbox" checked={soSupervisao} onChange={(e) => setSoSupervisao(e.target.checked)} />
              Só viaturas de supervisão
            </label>
            <span>
              {erroVeiculos
                ? `Falha ao carregar veículos: ${erroVeiculos}`
                : `🚗 ${veiculosNoMapa.length} no mapa${veiculosAtualizadoEm ? ` · atualizado ${new Date(veiculosAtualizadoEm).toLocaleTimeString('pt-BR')}` : ' · carregando...'}`}
            </span>
            {placaSelecionada && (
              <span style={{ color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                🛣️ Rastro: {placaSelecionada}
                <select
                  value={trajetoHoras}
                  onChange={(e) => setTrajetoHoras(Number(e.target.value))}
                  style={{ ...selectStyle, minWidth: 0, padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
                >
                  <option value={6}>últimas 6h</option>
                  <option value={12}>últimas 12h</option>
                  <option value={24}>últimas 24h</option>
                  <option value={48}>últimos 2 dias</option>
                  <option value={72}>últimos 3 dias</option>
                  <option value={168}>últimos 7 dias</option>
                </select>
                {trajeto?.pontos
                  ? `(${trajeto.pontos.length} pontos · ${trajeto.kmPercorrido ?? 0} km)`
                  : 'carregando...'}
                {' · '}
                <a href="#" onClick={(e) => { e.preventDefault(); setPlacaSelecionada(null); }} style={{ color: 'var(--blue)' }}>limpar</a>
              </span>
            )}
          </div>
        )}
      </Card>

      {/* KPIs */}
      <div className="grid-1-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiCard titulo="Locais de Serviço" valor={kpis.locais} icone={MapPin} />
        <KpiCard titulo="Clientes" valor={kpis.clientes} icone={Building2} cor="var(--success)" fundo="var(--success-bg)" />
        <KpiCard titulo="Supervisores" valor={kpis.supervisores} icone={UserCheck} cor="var(--warning)" fundo="var(--warning-bg)" />
        <KpiCard titulo="Cidades" valor={kpis.cidades} icone={Users} />
      </div>

      {/* Mapa */}
      <RotasMap
        rotas={rotasFiltradas}
        coresPorSupervisor={coresPorSupervisor}
        veiculos={veiculosNoMapa}
        placaSelecionada={placaSelecionada}
        trajeto={trajeto}
        onSelecionarVeiculo={aoSelecionarVeiculo}
        mostrarLocais={!apenasCarros}
      />

      {/* Legenda clicável — popover via portal (sempre acima do mapa) */}
      {mostrarLegenda && legendaPos && supervisoresVisiveis.length > 0 &&
        createPortal(
          <div
            ref={popoverRef}
            className="pop-in"
            style={{
              position: 'fixed',
              top: legendaPos.top,
              right: legendaPos.right,
              zIndex: 4000,
              width: '300px',
              maxHeight: '320px',
              overflowY: 'auto',
              backgroundColor: 'var(--white)',
              border: '1px solid var(--gray-200)',
              borderRadius: '10px',
              boxShadow: '0 12px 32px rgba(16, 24, 40, 0.16)',
              padding: '0.875rem 1rem',
            }}
          >
            <p style={{ margin: '0 0 0.625rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--gray-400)' }}>
              Supervisores ({supervisoresVisiveis.length}) — clique para filtrar
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {supervisoresVisiveis.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`legenda-item${fSupervisor === s ? ' ativo' : ''}`}
                  onClick={() => setFSupervisor((atual) => (atual === s ? '' : s))}
                  title={fSupervisor === s ? 'Clique para remover o filtro' : `Filtrar por ${s}`}
                >
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: corDoSupervisor(s, coresPorSupervisor), flexShrink: 0, border: '1.5px solid #000' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tituloCase(s)}</span>
                  {fSupervisor === s && <Check size={14} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};