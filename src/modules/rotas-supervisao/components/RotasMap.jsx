import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Card } from '../../../components/ui/Card';
import { corDoSupervisor } from '../utils/cores';
import { tituloCase } from '../../../utils/texto';

const esc = (s) =>
  (s ?? '').toString().replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const iconePorCor = (cor) =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="
        width:18px;height:18px;border-radius:50%;
        background:${cor};border:2px solid #000;
        box-shadow:0 0 0 1.5px #fff;"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  });

const popupHtml = (r, cor) => `
  <div style="min-width:220px">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
      <span style="width:10px;height:10px;border-radius:50%;background:${cor};display:inline-block"></span>
      <strong style="color:#1B0DAE">${esc(r.supervisorNome ? tituloCase(r.supervisorNome) : 'Sem supervisor')}</strong>
    </div>
    <div style="font-size:13px;color:#344054;font-weight:600">${esc(tituloCase(r.local || r.cliente || ''))}</div>
    ${(r.clienteResumido || r.cliente) ? `<div style="font-size:12px;color:#6B7588;margin-top:2px">Cliente: ${esc(tituloCase(r.clienteResumido || r.cliente))}</div>` : ''}
    <div style="font-size:12px;color:#6B7588;margin-top:4px">${esc(tituloCase(r.enderecoCompleto || ''))}</div>
    ${r.telefone ? `<div style="font-size:12px;color:#6B7588;margin-top:4px">📞 ${esc(r.telefone)}</div>` : ''}
    ${r.baseOperacional ? `<div style="font-size:12px;color:#6B7588">Base: ${esc(tituloCase(r.baseOperacional))}</div>` : ''}
    ${!r.coordenadaPrecisa ? `<div style="font-size:11px;color:#B06000;margin-top:6px">* Posição aproximada (centro da cidade)</div>` : ''}
    ${r.coordenadaSuspeita ? `<div style="font-size:11px;color:#B42318;margin-top:6px">⚠ Coordenada a ${r.distanciaCidadeKm} km de ${esc(tituloCase(r.localidade || 'cidade informada'))} — verificar cadastro</div>` : ''}
  </div>`;

// Carrinho em SVG dentro de um badge branco circular. Cor = supervisor;
// anel verde = em movimento.
const CARRO_SVG = (cor) =>
  `<svg viewBox="0 0 24 24" width="19" height="19" fill="${cor}"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`;

const iconeVeiculo = (cor, emMovimento) =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="
        width:32px;height:32px;border-radius:50%;
        background:#fff;
        border:2.5px solid ${cor};
        box-shadow:0 1px 5px rgba(0,0,0,.4)${emMovimento ? ',0 0 0 4px rgba(22,163,74,.5)' : ''};
        display:flex;align-items:center;justify-content:center;">${CARRO_SVG(cor)}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

const statusVeiculo = (v) => {
  if (v.emMovimento) return '🟢 Em movimento';
  if (v.ign === 'ON') return '🟡 Ligado, parado';
  return '⚪ Desligado';
};

const popupVeiculo = (v) => {
  // Título = nome do supervisor (quando a viatura está em uso); senão a placa.
  const titulo = v.supervisorNome ? tituloCase(v.supervisorNome) : 'Veículo';
  return `
  <div style="min-width:200px">
    <strong style="color:#1B0DAE;font-size:14px">${esc(titulo)}</strong>
    <div style="font-size:13px;color:#344054;margin-top:4px">
      Placa: <span style="font-family:monospace;font-weight:700">${esc(v.plate || '—')}</span>
    </div>
    <div style="font-size:13px;color:#344054;margin-top:3px;font-weight:600">
      ${statusVeiculo(v)}${v.speed != null ? ` · ${esc(v.speed)} km/h` : ''}
    </div>
    ${v.date ? `<div style="font-size:12px;color:#6B7588;margin-top:3px">Última posição: ${esc(v.date)}</div>` : ''}
    ${v.emUso ? `<div style="font-size:11px;color:#1B0DAE;margin-top:6px">🛣️ Clique no carro para ver/ocultar o rastro</div>` : ''}
  </div>`;
};

// Conteúdo do tooltip de hover (resumo rápido): supervisor, placa e status.
const tooltipVeiculo = (v) => {
  const nome = v.supervisorNome ? tituloCase(v.supervisorNome) : v.plate || 'Veículo';
  return `<div style="font-weight:700">${esc(nome)}</div>
    <div style="font-family:monospace">${esc(v.plate || '—')}</div>
    <div>${statusVeiculo(v)}${v.speed != null ? ` · ${esc(v.speed)} km/h` : ''}</div>`;
};

/** Camada (clusterizada) com a posição ao vivo dos veículos. */
function VehicleLayer({ veiculos, coresPorSupervisor, onSelecionar, ajustarZoom = false }) {
  const map = useMap();
  const groupRef = useRef(null);
  const fitFeito = useRef(false);

  // (Re)constrói a camada quando os DADOS mudam. A seleção NÃO mexe no ícone
  // (de propósito): trocar o ícone fechava o popup recém-aberto no clique.
  useEffect(() => {
    const group = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
    });

    veiculos.forEach((v) => {
      if (!v.coordinates) return;
      const cor = v.supervisorNome ? corDoSupervisor(v.supervisorNome, coresPorSupervisor) : '#6B7588';
      const marker = L.marker(v.coordinates, { icon: iconeVeiculo(cor, v.emMovimento) });
      marker.bindPopup(popupVeiculo(v));
      marker.bindTooltip(tooltipVeiculo(v), { direction: 'top', offset: [0, -14] });
      // Clicar numa viatura em uso carrega/oculta o rastro (sem fechar o popup).
      if (v.emUso && onSelecionar) marker.on('click', () => onSelecionar(v.plate));
      group.addLayer(marker);
    });

    groupRef.current = group;
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map, veiculos, coresPorSupervisor, onSelecionar]);

  // Quando as locais estão ocultas (modo "só carros"), enquadra o mapa nos
  // veículos — uma vez ao entrar no modo (não a cada atualização de 60s).
  useEffect(() => {
    if (!ajustarZoom) {
      fitFeito.current = false;
      return;
    }
    if (fitFeito.current) return;
    const g = groupRef.current;
    if (g && g.getLayers().length > 0) {
      try {
        map.fitBounds(g.getBounds().pad(0.2), { maxZoom: 13 });
        fitFeito.current = true;
      } catch {
        /* ignora bounds inválido */
      }
    }
  }, [ajustarZoom, veiculos, map]);

  return null;
}

/**
 * Rastro (trajeto recente) de uma viatura, desenhado com fade: os trechos mais
 * antigos ficam translúcidos e os recentes opacos — "vai sumindo" no passado.
 */
// Ícone de parada (motor desligado): pino laranja com "P".
const iconeParada = (min) =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:#EA580C;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);
        display:flex;align-items:center;justify-content:center">
        <span style="transform:rotate(45deg);color:#fff;font-size:11px;font-weight:700">P</span></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
    title: `Parada de ${min} min`,
  });

// 'YYYY-MM-DD HH:MM:SS' -> 'HH:MM'
const hhmm = (s) => (s ? s.slice(11, 16) : '');
const duracaoTexto = (min) => (min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${min} min`);

function TrailLayer({ pontos, cor, paradas = [] }) {
  const map = useMap();

  useEffect(() => {
    if (!pontos || pontos.length < 2) return;
    const camada = L.layerGroup();
    const n = pontos.length;

    // Contorno branco por baixo de todo o trajeto, p/ a linha colorida "saltar"
    // do mapa (fica bem mais visível sobre ruas/áreas claras).
    L.polyline(
      pontos.map((p) => p.coordinates),
      { color: '#fff', weight: 8, opacity: 0.7, lineCap: 'round', lineJoin: 'round' }
    ).addTo(camada);

    // Fade em FAIXAS: divide o trajeto em ~14 trechos, cada um um polyline com
    // opacidade crescente (antigo -> recente). Opacidade mínima alta p/ a parte
    // antiga não sumir. Mais leve que um polyline por par de pontos.
    const NB = Math.min(14, n - 1);
    for (let b = 0; b < NB; b += 1) {
      const ini = Math.floor((b / NB) * (n - 1));
      const fim = Math.floor(((b + 1) / NB) * (n - 1));
      if (fim <= ini) continue;
      const trecho = pontos.slice(ini, fim + 1).map((p) => p.coordinates); // +1 conecta as faixas
      const opacidade = 0.45 + 0.55 * ((b + 1) / NB);
      L.polyline(trecho, { color: cor, weight: 5, opacity: opacidade, lineCap: 'round', lineJoin: 'round' }).addTo(camada);
    }

    // Início do trajeto (ponto mais antigo): círculo VAZADO (borda colorida,
    // miolo branco) p/ diferenciar do ponto atual.
    const primeiro = pontos[0];
    L.circleMarker(primeiro.coordinates, {
      radius: 6,
      color: cor,
      weight: 3,
      fillColor: '#fff',
      fillOpacity: 1,
    })
      .bindTooltip(`Início${primeiro.date ? ` · ${primeiro.date}` : ''}`, { direction: 'top' })
      .addTo(camada);

    // Ponto mais recente (posição atual): círculo CHEIO na cor do supervisor.
    const ultimo = pontos[n - 1];
    L.circleMarker(ultimo.coordinates, {
      radius: 5,
      color: '#fff',
      weight: 2,
      fillColor: cor,
      fillOpacity: 1,
    })
      .bindTooltip(`Agora${ultimo.date ? ` · ${ultimo.date}` : ''}`, { direction: 'top' })
      .addTo(camada);

    // Paradas (motor desligado): pino "P" onde parou, com horário e duração.
    paradas.forEach((p) => {
      if (!p.coordinates) return;
      L.marker(p.coordinates, { icon: iconeParada(p.duracaoMin), zIndexOffset: 500 })
        .bindPopup(
          `<strong style="color:#EA580C">⏸ Parada · ${esc(duracaoTexto(p.duracaoMin))}</strong>
           <div style="font-size:12px;color:#344054;margin-top:3px">Parou ${esc(hhmm(p.inicio))} → saiu ${esc(hhmm(p.fim))}</div>`
        )
        .bindTooltip(`Parada · ${duracaoTexto(p.duracaoMin)}`, { direction: 'top' })
        .addTo(camada);
    });

    camada.addTo(map);
    return () => {
      map.removeLayer(camada);
    };
  }, [map, pontos, cor, paradas]);

  return null;
}

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
      const cor = corDoSupervisor(r.supervisorNome, coresPorSupervisor);
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

// Base operacional — marcada SEMPRE no mapa, independente de filtros/camadas.
export const BASE = {
  nome: 'Base',
  endereco: 'Rua Conselheiro Ribas, 297 — Vila Anastácio, São Paulo/SP',
  coordinates: [-23.5157274, -46.7190399],
};

const iconeBase = L.divIcon({
  className: 'custom-leaflet-marker',
  html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      background:#1B0DAE;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5);
      display:flex;align-items:center;justify-content:center">
      <span style="transform:rotate(45deg);font-size:16px">🏢</span></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34],
});

/** Marcador fixo da base (sempre presente). */
function BaseLayer() {
  const map = useMap();
  useEffect(() => {
    const m = L.marker(BASE.coordinates, { icon: iconeBase, zIndexOffset: 1000 });
    m.bindPopup(
      `<strong style="color:#1B0DAE;font-size:14px">${esc(BASE.nome)}</strong>
       <div style="font-size:12px;color:#6B7588;margin-top:3px">${esc(BASE.endereco)}</div>`
    );
    m.bindTooltip(BASE.nome, { direction: 'top', offset: [0, -30] });
    m.addTo(map);
    return () => {
      map.removeLayer(m);
    };
  }, [map]);
  return null;
}

// Ponto de apoio do supervisor: triângulo vermelho (forma/cor diferentes dos
// locais/carros, sem revelar que é endereço residencial).
const iconePontoApoio = () =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="width:0;height:0;
        border-left:9px solid transparent;border-right:9px solid transparent;
        border-bottom:16px solid #EF4444;
        filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.6))"></div>`,
    iconSize: [18, 16],
    iconAnchor: [9, 8],
    popupAnchor: [0, -10],
  });

/** Camada dos pontos de apoio dos supervisores (rótulo neutro). */
function PontosApoioLayer({ pontos }) {
  const map = useMap();
  useEffect(() => {
    const group = L.layerGroup();
    pontos.forEach((p) => {
      if (!p.coordinates) return;
      const m = L.marker(p.coordinates, { icon: iconePontoApoio(), zIndexOffset: 600 });
      m.bindTooltip(`Ponto de apoio — ${esc(tituloCase(p.nome))}`, { direction: 'top', offset: [0, -8] });
      m.bindPopup(
        `<strong style="color:#1B0DAE">${esc(tituloCase(p.nome))}</strong>
         <div style="font-size:12px;color:#6B7588;margin-top:3px">Ponto de apoio${p.placa ? ` · ${esc(p.placa)}` : ''}</div>`
      );
      group.addLayer(m);
    });
    map.addLayer(group);
    return () => map.removeLayer(group);
  }, [map, pontos]);
  return null;
}

export const RotasMap = ({
  rotas = [],
  coresPorSupervisor = {},
  veiculos = [],
  placaSelecionada = null,
  trajeto = null,
  onSelecionarVeiculo = null,
  mostrarLocais = true,
  pontosApoio = [],
}) => {
  const comCoord = rotas.filter((r) => r.coordinates);
  const veiculosComCoord = veiculos.filter((v) => v.coordinates);

  // Cor do rastro = cor do supervisor da viatura selecionada (ou azul padrão).
  const vSel = veiculosComCoord.find((v) => v.plate === placaSelecionada);
  const corTrajeto = vSel?.supervisorNome
    ? corDoSupervisor(vSel.supervisorNome, coresPorSupervisor)
    : '#1B0DAE';

  return (
    <Card style={{ position: 'relative', height: '600px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ color: 'var(--gray-900)' }}>
          {mostrarLocais ? 'Mapa de Locais por Supervisor' : 'Viaturas em tempo real'}
        </h3>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
          {mostrarLocais
            ? `${comCoord.length} locais no mapa — cada cor representa um supervisor`
            : 'Mostrando apenas os veículos (locais ocultos)'}
          {veiculosComCoord.length > 0 && ` · 🚗 ${veiculosComCoord.length} veículos`}
        </p>
      </div>

      <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', zIndex: 1 }}>
        <MapContainer center={[-15.7942, -47.8822]} zoom={4} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <BaseLayer />
          {pontosApoio.length > 0 && <PontosApoioLayer pontos={pontosApoio} />}
          {mostrarLocais && <ClusterLayer rotas={comCoord} coresPorSupervisor={coresPorSupervisor} />}
          {trajeto?.pontos?.length > 1 && (
            <TrailLayer pontos={trajeto.pontos} cor={corTrajeto} paradas={trajeto.paradas || []} />
          )}
          {veiculosComCoord.length > 0 && (
            <VehicleLayer
              veiculos={veiculosComCoord}
              coresPorSupervisor={coresPorSupervisor}
              onSelecionar={onSelecionarVeiculo}
              ajustarZoom={!mostrarLocais}
            />
          )}
        </MapContainer>
      </div>
    </Card>
  );
};