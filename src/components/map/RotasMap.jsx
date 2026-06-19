import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Card } from '../ui/Card';
import { corDoSupervisor } from '../../utils/cores';

const esc = (s) =>
  (s ?? '').toString().replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const iconePorCor = (cor) =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="
        width:18px;height:18px;border-radius:50%;
        background:${cor};border:2px solid #fff;
        box-shadow:0 0 0 1px rgba(0,0,0,0.25);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  });

const popupHtml = (r, cor) => `
  <div style="min-width:220px">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
      <span style="width:10px;height:10px;border-radius:50%;background:${cor};display:inline-block"></span>
      <strong style="color:#1B0DAE">${esc(r.supervisor || 'Sem supervisor')}</strong>
    </div>
    <div style="font-size:13px;color:#344054;font-weight:600">${esc(r.local || r.cliente || '')}</div>
    <div style="font-size:12px;color:#6B7588;margin-top:4px">${esc(r.enderecoCompleto || '')}</div>
    ${r.telefone ? `<div style="font-size:12px;color:#6B7588;margin-top:4px">📞 ${esc(r.telefone)}</div>` : ''}
    ${r.baseOperacional ? `<div style="font-size:12px;color:#6B7588">Base: ${esc(r.baseOperacional)}</div>` : ''}
    ${!r.coordenadaPrecisa ? `<div style="font-size:11px;color:#B06000;margin-top:6px">* Posição aproximada (centro da cidade) — endereço ainda não geocodificado</div>` : ''}
  </div>`;

/** Componente imperativo que cria o cluster de marcadores. */
function ClusterLayer({ rotas, coresPorSupervisor }) {
  const map = useMap();

  useEffect(() => {
    const group = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
    });

    rotas.forEach((r) => {
      if (!r.coordinates) return;
      const cor = corDoSupervisor(r.supervisor, coresPorSupervisor);
      const marker = L.marker(r.coordinates, { icon: iconePorCor(cor) });
      marker.bindPopup(popupHtml(r, cor));
      group.addLayer(marker);
    });

    map.addLayer(group);

    // Ajusta o zoom aos pontos visíveis
    if (group.getLayers().length > 0) {
      try {
        map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 12 });
      } catch {
        /* ignora se bounds inválido */
      }
    }

    return () => {
      map.removeLayer(group);
    };
  }, [map, rotas, coresPorSupervisor]);

  return null;
}

export const RotasMap = ({ rotas = [], coresPorSupervisor = {} }) => {
  const comCoord = rotas.filter((r) => r.coordinates);

  return (
    <Card style={{ position: 'relative', height: '600px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ color: 'var(--gray-900)' }}>Mapa de Locais por Supervisor</h3>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
          {comCoord.length} locais no mapa — cada cor representa um supervisor
        </p>
      </div>

      <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', zIndex: 1 }}>
        <MapContainer center={[-15.7942, -47.8822]} zoom={4} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClusterLayer rotas={comCoord} coresPorSupervisor={coresPorSupervisor} />
        </MapContainer>
      </div>
    </Card>
  );
};