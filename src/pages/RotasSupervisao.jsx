import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RotasMap } from '../components/map/RotasMap';
import { fetchRotasSupervisao } from '../services/api';
import { mapaDeCores, corDoSupervisor } from '../utils/cores';
import {
  Building2,
  MapPin,
  Users,
  UserCheck,
  Download,
  Search,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

const KpiCard = ({ titulo, valor, icone: Icone, cor = 'var(--blue)', fundo = 'var(--blue-50)' }) => (
  <Card>
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

/** Colunas exportadas no CSV. */
const COLUNAS = [
  { chave: 'empresa', titulo: 'Empresa' },
  { chave: 'baseOperacional', titulo: 'Base Operacional' },
  { chave: 'cliente', titulo: 'Cliente' },
  { chave: 'local', titulo: 'Local' },
  { chave: 'enderecoCompleto', titulo: 'Endereço' },
  { chave: 'telefone', titulo: 'Telefone' },
  { chave: 'contatoOperacional', titulo: 'Contato' },
  { chave: 'supervisor', titulo: 'Supervisor' },
];

function gerarCSV(linhas) {
  const cabecalho = COLUNAS.map((c) => c.titulo).join(';');
  const corpo = linhas.map((l) =>
    COLUNAS.map((c) => `"${String(l[c.chave] ?? '').replace(/"/g, '""')}"`).join(';')
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
  const [fUf, setFUf] = useState('');
  const [fSupervisor, setFSupervisor] = useState('');

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    fetchRotasSupervisao()
      .then((data) => {
        if (!ativo) return;
        setRotas(data.rotas || []);
        setErro(null);
      })
      .catch((e) => ativo && setErro(e.message))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  const coresPorSupervisor = useMemo(() => mapaDeCores(rotas.map((r) => r.supervisor)), [rotas]);

  const opcoes = useMemo(
    () => ({
      empresas: valoresUnicos(rotas, 'empresa'),
      bases: valoresUnicos(rotas, 'baseOperacional'),
      ufs: valoresUnicos(rotas, 'uf'),
      supervisores: valoresUnicos(rotas, 'supervisor'),
    }),
    [rotas]
  );

  const rotasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return rotas.filter((r) => {
      if (fEmpresa && r.empresa !== fEmpresa) return false;
      if (fBase && r.baseOperacional !== fBase) return false;
      if (fUf && r.uf !== fUf) return false;
      if (fSupervisor && r.supervisor !== fSupervisor) return false;
      if (termo) {
        const alvo = [r.cliente, r.local, r.enderecoCompleto, r.contatoOperacional]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [rotas, busca, fEmpresa, fBase, fUf, fSupervisor]);

  const kpis = useMemo(
    () => ({
      locais: rotasFiltradas.length,
      clientes: new Set(rotasFiltradas.map((r) => r.cliente).filter(Boolean)).size,
      supervisores: new Set(rotasFiltradas.map((r) => r.supervisor).filter(Boolean)).size,
      cidades: new Set(rotasFiltradas.map((r) => `${r.localidade}-${r.uf}`)).size,
    }),
    [rotasFiltradas]
  );

  // Supervisores presentes no resultado filtrado (para a legenda)
  const supervisoresVisiveis = useMemo(
    () => valoresUnicos(rotasFiltradas, 'supervisor'),
    [rotasFiltradas]
  );

  const limparFiltros = () => {
    setBusca('');
    setFEmpresa('');
    setFBase('');
    setFUf('');
    setFSupervisor('');
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
            {opcoes.empresas.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select style={selectStyle} value={fBase} onChange={(e) => setFBase(e.target.value)}>
            <option value="">Todas as bases</option>
            {opcoes.bases.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select style={selectStyle} value={fUf} onChange={(e) => setFUf(e.target.value)}>
            <option value="">Todas as UFs</option>
            {opcoes.ufs.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select style={selectStyle} value={fSupervisor} onChange={(e) => setFSupervisor(e.target.value)}>
            <option value="">Todos os supervisores</option>
            {opcoes.supervisores.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <Button variant="secondary" onClick={limparFiltros}>Limpar</Button>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid-1-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiCard titulo="Locais de Serviço" valor={kpis.locais} icone={MapPin} />
        <KpiCard titulo="Clientes" valor={kpis.clientes} icone={Building2} cor="var(--success)" fundo="var(--success-bg)" />
        <KpiCard titulo="Supervisores" valor={kpis.supervisores} icone={UserCheck} cor="var(--warning)" fundo="var(--warning-bg)" />
        <KpiCard titulo="Cidades" valor={kpis.cidades} icone={Users} />
      </div>

      {/* Mapa */}
      <RotasMap rotas={rotasFiltradas} coresPorSupervisor={coresPorSupervisor} />

      {/* Legenda de supervisores */}
      {supervisoresVisiveis.length > 0 && (
        <Card>
          <h3 style={{ color: 'var(--gray-900)', marginBottom: '0.75rem', fontSize: '1rem' }}>Supervisores</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', maxHeight: '180px', overflowY: 'auto' }}>
            {supervisoresVisiveis.map((s) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--gray-700)' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: corDoSupervisor(s, coresPorSupervisor), flexShrink: 0 }} />
                {s}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};