import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Route as RouteIcon, FileText, CalendarClock, ArrowRight } from 'lucide-react';

/** Catálogo de relatórios disponíveis na plataforma. */
const RELATORIOS = [
  {
    titulo: 'Rotas de Supervisão',
    descricao:
      'Locais de serviço ativos por empresa, base operacional e supervisor, com mapa, filtros e exportação.',
    icone: RouteIcon,
    rota: '/relatorios/rotas-supervisao',
    disponivel: true,
  },
  {
    titulo: 'Fluxo de Atestados / Faltas',
    descricao:
      'Atestados, faltas por cliente e faltas disciplinares por período, com KPIs, gráficos, flag de demitidos e exportação.',
    icone: FileText,
    rota: '/relatorios/fluxo-atestados-faltas',
    disponivel: true,
  },
  {
    titulo: 'Geração de Cartão de Ponto',
    descricao:
      'Geração e retorno dos cartões de ponto por competência — entregues × pendências, com visão geral, detalhamento e por supervisão.',
    icone: CalendarClock,
    rota: '/relatorios/geracao-cartao-ponto',
    disponivel: true,
  },
];

export const Dashboard = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ color: 'var(--gray-900)', margin: 0 }}>Plataforma de Relatórios</h1>
        <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem' }}>
          Selecione um relatório para visualizar os dados operacionais.
        </p>
      </div>

      <div className="kanban-grid">
        {RELATORIOS.map((r, index) => {
          const Icone = r.icone;
          const conteudo = (
            <Card className="stagger-item" style={{ '--delay': `${index * 0.15}s`, height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', cursor: r.disponivel ? 'pointer' : 'default', opacity: r.disponivel ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.6rem', backgroundColor: 'var(--blue-50)', borderRadius: '8px', color: 'var(--blue)' }}>
                  <Icone size={24} />
                </div>
                <h3 style={{ margin: 0, color: 'var(--gray-900)' }}>{r.titulo}</h3>
              </div>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', margin: 0, flex: 1 }}>{r.descricao}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: r.disponivel ? 'var(--blue)' : 'var(--gray-400)', fontWeight: 600, fontSize: '0.875rem' }}>
                {r.disponivel ? 'Abrir relatório' : 'Em breve'}
                {r.disponivel && <ArrowRight size={16} />}
              </div>
            </Card>
          );
          return r.disponivel ? (
            <Link key={r.titulo} to={r.rota} style={{ textDecoration: 'none', height: '100%', display: 'block' }}>{conteudo}</Link>
          ) : (
            <div key={r.titulo} style={{ height: '100%' }}>{conteudo}</div>
          );
        })}
      </div>
    </div>
  );
};