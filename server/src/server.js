import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { buscarRotas } from './reports/rotas-supervisao.js';
import { buscarRotasDaNuvem } from './reports/rotas-supervisao-nuvem.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const CACHE_TTL = (Number(process.env.CACHE_TTL_SECONDS) || 300) * 1000;

// Fonte dos dados: 'sqlserver' (lê direto do SQL Server interno, p/ dev e p/ o
// motor) ou 'supabase' (lê o snapshot da nuvem — usado no VPS de produção).
const DATA_SOURCE = (process.env.DATA_SOURCE || 'sqlserver').toLowerCase();
const lerRotas = DATA_SOURCE === 'supabase' ? buscarRotasDaNuvem : buscarRotas;
console.log(`[api] Fonte de dados: ${DATA_SOURCE}`);

app.use(cors());
app.use(express.json());

// ---- Cache simples em memória ----
const cache = new Map(); // chave -> { data, expiraEm }

async function comCache(chave, produtor) {
  const agora = Date.now();
  const item = cache.get(chave);
  if (item && item.expiraEm > agora) {
    return item.data;
  }
  const data = await produtor();
  cache.set(chave, { data, expiraEm: agora + CACHE_TTL });
  return data;
}

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

// ---- Invalidar cache manualmente ----
app.post('/api/cache/limpar', (req, res) => {
  cache.clear();
  res.json({ ok: true, mensagem: 'Cache limpo.' });
});

app.listen(PORT, () => {
  console.log(`[api] Plataforma de Relatórios rodando em http://localhost:${PORT}`);
});