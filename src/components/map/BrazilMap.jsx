import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '../ui/Card';

// Mock data: Bases da empresa
const bases = [
  { id: 1, name: "Base São Paulo (Matriz)", coordinates: [-23.5505, -46.6333], status: 'success', activeProjects: 12 },
  { id: 2, name: "Base Rio de Janeiro", coordinates: [-22.9035, -43.2096], status: 'success', activeProjects: 8 },
  { id: 3, name: "Base Belo Horizonte", coordinates: [-19.9167, -43.9333], status: 'warning', activeProjects: 5 },
  { id: 4, name: "Base Brasília", coordinates: [-15.7942, -47.8822], status: 'success', activeProjects: 15 },
  { id: 5, name: "Base Salvador", coordinates: [-12.9714, -38.5124], status: 'danger', activeProjects: 2 },
  { id: 6, name: "Base Manaus", coordinates: [-3.1190, -60.0250], status: 'warning', activeProjects: 4 },
  { id: 7, name: "Base Curitiba", coordinates: [-25.4284, -49.2646], status: 'success', activeProjects: 7 },
  { id: 8, name: "Base Recife", coordinates: [-8.0578, -34.8811], status: 'success', activeProjects: 9 },
];

const getStatusColor = (status) => {
  switch (status) {
    case 'success': return 'var(--success)';
    case 'warning': return 'var(--warning)';
    case 'danger': return 'var(--danger)';
    default: return 'var(--blue)';
  }
};

// Custom Marker Icon based on Design System
const createCustomIcon = (status) => {
  const color = getStatusColor(status);
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background-color: ${color};
        opacity: 0.2;
        border-radius: 50%;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 12px;
          height: 12px;
          background-color: ${color};
          border: 2px solid var(--white);
          border-radius: 50%;
          opacity: 1;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

export const BrazilMap = () => {
  return (
    <Card style={{ position: 'relative', height: '600px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ color: 'var(--gray-900)' }}>Distribuição de Bases Nacionais</h3>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Visualização geográfica das operações do Portal CSC</p>
      </div>
      
      <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', zIndex: 1 }}>
        <MapContainer 
          center={[-15.7942, -47.8822]} // Center on Brasília
          zoom={4} 
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          {/* TileLayer do OpenStreetMap (Estilo Google Maps) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {bases.map((base) => (
            <Marker 
              key={base.id} 
              position={base.coordinates} 
              icon={createCustomIcon(base.status)}
            >
              <Popup>
                <div style={{ padding: '0.5rem', minWidth: '150px' }}>
                  <h4 style={{ color: 'var(--blue)', marginBottom: '0.5rem', fontWeight: 700 }}>{base.name}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStatusColor(base.status) }}></div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--gray-700)' }}>Status: {base.status.toUpperCase()}</span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--gray-700)', margin: 0 }}>
                    Projetos Ativos: <strong>{base.activeProjects}</strong>
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--gray-700)' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></div>
          Operação Normal
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--gray-700)' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--warning)' }}></div>
          Atenção Requerida
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--gray-700)' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--danger)' }}></div>
          Alerta Crítico
        </div>
      </div>
    </Card>
  );
};
