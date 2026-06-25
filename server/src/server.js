import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { buscarRotas } from './reports/rotas-supervisao/rotas-supervisao.js';
import { buscarRotasDaNuvem } from './reports/rotas-supervisao/rotas-supervisao-nuvem.js';
import { buscarPosicoesVeiculos, buscarTrajetoVeiculo } from './reports/rotas-supervisao/stc.js';
import { buscarFluxoAtestadosFaltas } from './reports/fluxo-atestados-faltas/fluxo-atestados-faltas.js';
import { buscarGeracaoCartaoPonto } from './reports/geracao-cartao-ponto/geracao-cartao-ponto.js';
import { comCache, forcarAtualizacao, aquecer, infoCache } from './cache.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Fonte dos dados: 'sqlserver' (lê direto do SQL Server interno, p/ dev e p/ o
// motor) ou 'supabase' (lê o snapshot da nuvem — usado no VPS de produção).
const DATA_SOURCE = (process.env.DATA_SOURCE || 'sqlserver').toLowerCase();
const lerRotas = DATA_SOURCE === 'supabase' ? buscarRotasDaNuvem : buscarRotas;
console.log(`[api] Fonte de dados: ${DATA_SOURCE}`);

app.use(cors());
app.use(express.json());

// Cache resiliente (stale-while-revalidate + stale-if-error + disco): ver cache.js.
// `comCache`, `forcarAtualizacao`, `aquecer` e `infoCache` vêm de lá.

// ---- Healthcheck ----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', servico: 'plataforma-relatorios-api' });
});

// ---- Relatório: Rotas de Supervisão ----
app.get('/api/rotas-supervisao', async (req, res) => {
  try {
    const dados = await comCache('rotas-supervisao', lerRotas);
    res.json({
      total: dados.length,
      rotas: dados,
    });
  } catch (err) {
    console.error('[api] Erro ao buscar rotas de supervisão:', err.message);
    res.status(500).json({
      erro: 'Falha ao consultar o relatório de Rotas de Supervisão.',
      detalhe: err.message,
    });
  }
});

// ---- Rotas de Supervisão: posição ao vivo dos veículos (rastreamento STC) ----
// O cache curto fica dentro de stc.js (TTL próprio), por isso aqui não usamos
// o `comCache` de 5 min — senão a posição "ao vivo" ficaria velha.
app.get('/api/rotas-supervisao/posicoes', async (req, res) => {
  try {
    const dados = await buscarPosicoesVeiculos();
    res.json(dados);
  } catch (err) {
    console.error('[api] Erro ao buscar posições dos veículos (STC):', err.message);
    res.status(502).json({
      erro: 'Falha ao consultar o rastreamento de veículos.',
      detalhe: err.message,
    });
  }
});

// ---- Rotas de Supervisão: rastro (trajeto recente) de uma viatura ----
// ?placa=ABC1234&horas=24  (horas opcional, 1..72)
app.get('/api/rotas-supervisao/trajeto', async (req, res) => {
  const { placa, horas } = req.query;
  if (!placa) {
    res.status(400).json({ erro: 'Informe a placa (?placa=ABC1234).' });
    return;
  }
  try {
    const dados = await buscarTrajetoVeiculo(placa, horas);
    res.json(dados);
  } catch (err) {
    console.error('[api] Erro ao buscar trajeto do veículo (STC):', err.message);
    res.status(502).json({ erro: 'Falha ao consultar o trajeto do veículo.', detalhe: err.message });
  }
});

// ---- Relatório: Fluxo de Atestados - Faltas por Cliente ----
// Período opcional via querystring: ?dataInicial=YYYY-MM-DD&dataFinal=YYYY-MM-DD
app.get('/api/fluxo-atestados-faltas', async (req, res) => {
  const { dataInicial, dataFinal } = req.query;
  const chave = `fluxo-atestados-faltas:${dataInicial || 'ini'}:${dataFinal || 'fim'}`;
  try {
    const dados = await comCache(chave, () =>
      buscarFluxoAtestadosFaltas({ dataInicial, dataFinal })
    );
    res.json({
      periodo: dados.periodo,
      totais: {
        atestados: dados.atestados.length,
        faltasPorCliente: dados.faltasPorCliente.length,
        faltasDisciplinares: dados.faltasDisciplinares.length,
      },
      atestados: dados.atestados,
      faltasPorCliente: dados.faltasPorCliente,
      faltasDisciplinares: dados.faltasDisciplinares,
    });
  } catch (err) {
    console.error('[api] Erro ao buscar Fluxo de Atestados/Faltas:', err.message);
    res.status(500).json({
      erro: 'Falha ao consultar o relatório de Fluxo de Atestados / Faltas.',
      detalhe: err.message,
    });
  }
});

// ---- Relatório: Geração de Cartão de Ponto (Folha de Ponto) ----
// Retorna todos os cartões; a tela filtra por competência/empresa/etc.
app.get('/api/geracao-cartao-ponto', async (req, res) => {
  try {
    const dados = await comCache('geracao-cartao-ponto', buscarGeracaoCartaoPonto);
    res.json({
      total: dados.length,
      registros: dados,
    });
  } catch (err) {
    console.error('[api] Erro ao buscar Geração de Cartão de Ponto:', err.message);
    res.status(500).json({
      erro: 'Falha ao consultar o relatório de Geração de Cartão de Ponto.',
      detalhe: err.message,
    });
  }
});

// ---- Forçar atualização agora (botão "Atualizar") ----
// Refaz a busca de tudo que está em cache; se o banco estiver fora, mantém o
// último dado bom (não derruba a tela).
app.post('/api/cache/limpar', async (req, res) => {
  try {
    const info = await forcarAtualizacao();
    res.json({ ok: true, mensagem: 'Dados atualizados.', cache: info });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// ---- Status do cache (idade dos dados de cada relatório) ----
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', cache: infoCache() });
});

app.listen(PORT, () => {
  console.log(`[api] Plataforma de Relatórios rodando em http://localhost:${PORT}`);
  // Pré-carrega os relatórios sem parâmetro para já subir com dados em cache.
  aquecer([
    { chave: 'rotas-supervisao', produtor: lerRotas },
    { chave: 'geracao-cartao-ponto', produtor: buscarGeracaoCartaoPonto },
  ]);
});