import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BrazilMap } from '../components/map/BrazilMap';
import { Activity, FolderOpen, AlertTriangle } from 'lucide-react';

export const Dashboard = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ color: 'var(--gray-900)', margin: 0 }}>Visão Geral</h1>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem' }}>Acompanhamento em tempo real das bases e projetos.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button variant="secondary">Filtrar</Button>
          <Button variant="primary">Novo Relatório</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid-1-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>Total de Bases</p>
              <h2 className="mono" style={{ fontSize: '2rem', color: 'var(--blue)', margin: '0.5rem 0 0 0' }}>08</h2>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: 'var(--blue-50)', borderRadius: '8px', color: 'var(--blue)' }}>
              <Activity size={24} />
            </div>
          </div>
        </Card>
        
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>Projetos Ativos</p>
              <h2 className="mono" style={{ fontSize: '2rem', color: 'var(--success)', margin: '0.5rem 0 0 0' }}>52</h2>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: 'var(--success-bg)', borderRadius: '8px', color: 'var(--success)' }}>
              <FolderOpen size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>Alertas Críticos</p>
              <h2 className="mono" style={{ fontSize: '2rem', color: 'var(--danger)', margin: '0.5rem 0 0 0' }}>01</h2>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: 'var(--danger-bg)', borderRadius: '8px', color: 'var(--danger)' }}>
              <AlertTriangle size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Mapa */}
      <div>
        <BrazilMap />
      </div>
    </div>
  );
};
