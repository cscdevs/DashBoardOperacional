import express from 'express';
import cors from 'cors';
import compression from 'compression';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import 'dotenv/config';
import { buscarRotas } from './reports/rotas-supervisao/rotas-supervisao.js';
import { buscarRotasDaNuvem } from './reports/rotas-supervisao/rotas-supervisao-nuvem.js';
import { buscarPosicoesVeiculos, buscarTrajetoVeiculo } from './reports/rotas-supervisao/stc.js';
import { carregarPontosSupervisores } from './shared/pontos-supervisores.js';
import { buscarFluxoAtestadosFaltas } from './reports/fluxo-atestados-faltas/fluxo-atestados-faltas.js';
import { buscarGeracaoCartaoPonto } from './reports/geracao-cartao-ponto/geracao-cartao-ponto.js';
import { buscarPostoDescoberto } from './reports/posto-descoberto/posto-descoberto.js';
import { buscarQuadroOperacional } from './reports/quadro-operacional/quadro-operacional.js';
import { buscarReserva } from './reports/quadro-operacional/reserva.js';
import { buscarOcorrencias } from './reports/quadro-operacional/ocorrencias.js';
import { comCache, forcarAtualizacao, aquecer, infoCache } from './cache.js';
import {
  requerAutenticacao,
  requerAdmin,
  autorizarRelatorio,
  lerUsuarios,
  salvarUsuarios,
  gerarHashSenha,
  verificarSenha,
  criarSessao,
  removerSessao
} from './auth.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Fonte dos dados: 'sqlserver' (lê direto do SQL Server interno, p/ dev e p/ o
// motor) ou 'supabase' (lê o snapshot da nuvem — usado no VPS de produção).
const DATA_SOURCE = (process.env.DATA_SOURCE || 'sqlserver').toLowerCase();
const lerRotas = DATA_SOURCE === 'supabase' ? buscarRotasDaNuvem : buscarRotas;
console.log(`[api] Fonte de dados: ${DATA_SOURCE}`);

// Compressão das respostas (ex.: 31 MB -> ~2 MB). Usamos brotli em qualidade
// BAIXA (5) em vez do padrão 11 — o padrão é pesadíssimo de CPU/memória em
// payloads grandes e ajudava a estourar o heap do container.
app.use(compression({
  level: 6, // gzip
  params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 }, // brotli mais leve
}));
app.use(cors());
app.use(express.json());

// Cache resiliente (stale-while-revalidate + stale-if-error + disco): ver cache.js.
// `comCache`, `forcarAtualizacao`, `aquecer` e `infoCache` vêm de lá.

// ---- Healthcheck ----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', servico: 'plataforma-relatorios-api' });
});

// ---- Relatório: Rotas de Supervisão ----
app.get('/api/rotas-supervisao', requerAutenticacao, autorizarRelatorio('rotas-supervisao'), async (req, res) => {
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
app.get('/api/rotas-supervisao/posicoes', requerAutenticacao, autorizarRelatorio('rotas-supervisao'), async (req, res) => {
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

// ---- Rotas de Supervisão: pontos de apoio dos supervisores (dado interno) ----
// Expõe apenas nome/placa/coordenada (sem endereço/CPF). Ver shared/pontos-supervisores.js.
app.get('/api/rotas-supervisao/pontos-apoio', requerAutenticacao, autorizarRelatorio('rotas-supervisao'), (req, res) => {
  try {
    res.json({ pontos: carregarPontosSupervisores() });
  } catch (err) {
    res.status(500).json({ erro: 'Falha ao carregar pontos de apoio.', detalhe: err.message });
  }
});

// ---- Rotas de Supervisão: rastro (trajeto recente) de uma viatura ----
// ?placa=ABC1234&horas=24  (horas opcional, 1..72)
app.get('/api/rotas-supervisao/trajeto', requerAutenticacao, autorizarRelatorio('rotas-supervisao'), async (req, res) => {
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
app.get('/api/fluxo-atestados-faltas', requerAutenticacao, autorizarRelatorio('fluxo-atestados-faltas'), async (req, res) => {
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
app.get('/api/geracao-cartao-ponto', requerAutenticacao, autorizarRelatorio('geracao-cartao-ponto'), async (req, res) => {
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

// ---- Relatório: Posto Descoberto (Produtividade) ----
// Período via ?dataInicial=YYYY-MM-DD&dataFinal=YYYY-MM-DD (padrão: últimos 7 dias).
app.get('/api/posto-descoberto', requerAutenticacao, autorizarRelatorio('posto-descoberto'), async (req, res) => {
  const { dataInicial, dataFinal } = req.query;
  const chave = `posto-descoberto:${dataInicial || 'ini'}:${dataFinal || 'fim'}`;
  try {
    const dados = await comCache(chave, () => buscarPostoDescoberto({ dataInicial, dataFinal }));
    res.json({
      periodo: dados.periodo,
      total: dados.registros.length,
      registros: dados.registros,
    });
  } catch (err) {
    console.error('[api] Erro ao buscar Posto Descoberto:', err.message);
    res.status(500).json({
      erro: 'Falha ao consultar o relatório de Posto Descoberto.',
      detalhe: err.message,
    });
  }
});

// ---- Relatório: Quadro Operacional (Contrato x Operacional x PV) ----
// Foto do dia (sem parâmetros). 1ª tela do PBI "PV - RS - EXC - TN - DB".
app.get('/api/quadro-operacional', requerAutenticacao, autorizarRelatorio('quadro-operacional'), async (req, res) => {
  try {
    const registros = await comCache('quadro-operacional', buscarQuadroOperacional);
    res.json({ total: registros.length, registros });
  } catch (err) {
    console.error('[api] Erro ao buscar Quadro Operacional:', err.message);
    res.status(500).json({
      erro: 'Falha ao consultar o relatório de Quadro Operacional.',
      detalhe: err.message,
    });
  }
});

// ---- Quadro Operacional: aba Reserva (RS) ----
app.get('/api/quadro-operacional/reserva', requerAutenticacao, autorizarRelatorio('quadro-operacional'), async (req, res) => {
  try {
    const registros = await comCache('quadro-operacional:reserva', buscarReserva);
    res.json({ total: registros.length, registros });
  } catch (err) {
    console.error('[api] Erro ao buscar Reserva:', err.message);
    res.status(500).json({
      erro: 'Falha ao consultar a Reserva.',
      detalhe: err.message,
    });
  }
});

// ---- Quadro Operacional: Ocorrências (Excedente / Treinamento / Dobra) ----
// Período via ?dataInicial=YYYY-MM-DD&dataFinal=YYYY-MM-DD (padrão: últimos 7 dias).
app.get('/api/quadro-operacional/ocorrencias', requerAutenticacao, autorizarRelatorio('quadro-operacional'), async (req, res) => {
  const { dataInicial, dataFinal } = req.query;
  const chave = `quadro-operacional:ocorrencias:${dataInicial || 'ini'}:${dataFinal || 'fim'}`;
  try {
    const dados = await comCache(chave, () => buscarOcorrencias({ dataInicial, dataFinal }));
    res.json({ periodo: dados.periodo, total: dados.registros.length, registros: dados.registros });
  } catch (err) {
    console.error('[api] Erro ao buscar Ocorrências:', err.message);
    res.status(500).json({
      erro: 'Falha ao consultar as Ocorrências (Excedente/Treinamento/Dobra).',
      detalhe: err.message,
    });
  }
});

// ---- Forçar atualização agora (botão "Atualizar") ----
// Refaz a busca de tudo que está em cache; se o banco estiver fora, mantém o
// último dado bom (não derruba a tela).
app.post('/api/cache/limpar', requerAutenticacao, async (req, res) => {
  try {
    const info = await forcarAtualizacao();
    res.json({ ok: true, mensagem: 'Dados atualizados.', cache: info });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// ---- Status do cache (idade dos dados de cada relatório) ----
app.get('/api/status', requerAutenticacao, (req, res) => {
  res.json({ status: 'ok', cache: infoCache() });
});

// ---- AUTENTICAÇÃO ----
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const usuarios = lerUsuarios();
    const user = usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user || !verificarSenha(password, user.password)) {
      return res.status(400).json({ erro: 'Credenciais inválidas.' });
    }

    const token = criarSessao(user);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        allowedReports: user.allowedReports,
      },
    });
  } catch (err) {
    console.error('[auth] Erro no login:', err.message);
    res.status(500).json({ erro: 'Erro interno ao realizar login.' });
  }
});

app.post('/api/auth/logout', requerAutenticacao, (req, res) => {
  removerSessao(req.token);
  res.json({ ok: true, mensagem: 'Logout realizado com sucesso.' });
});

app.get('/api/auth/me', requerAutenticacao, (req, res) => {
  res.json({ user: req.user });
});

// ---- GESTÃO DE USUÁRIOS (ADMIN ONLY) ----
app.get('/api/users', requerAutenticacao, requerAdmin, (req, res) => {
  try {
    const usuarios = lerUsuarios();
    const safeUsers = usuarios.map(({ password, ...user }) => user);
    res.json(safeUsers);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar usuários.' });
  }
});

app.post('/api/users', requerAutenticacao, requerAdmin, (req, res) => {
  const { name, email, password, role, allowedReports } = req.body;

  if (!name || !email || !password || !role || !Array.isArray(allowedReports)) {
    return res.status(400).json({ erro: 'Todos os campos (nome, email, senha, perfil, relatórios) são obrigatórios.' });
  }

  try {
    const usuarios = lerUsuarios();
    const existe = usuarios.some((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existe) {
      return res.status(400).json({ erro: 'Este e-mail já está cadastrado.' });
    }

    const novoUsuario = {
      id: crypto.randomUUID(),
      name,
      email,
      password: gerarHashSenha(password),
      role,
      allowedReports,
    };

    usuarios.push(novoUsuario);
    salvarUsuarios(usuarios);

    const { password: _, ...safeUser } = novoUsuario;
    res.status(201).json(safeUser);
  } catch (err) {
    console.error('[users] Erro ao criar usuário:', err.message);
    res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
  }
});

app.put('/api/users/:id', requerAutenticacao, requerAdmin, (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, allowedReports } = req.body;

  if (!name || !email || !role || !Array.isArray(allowedReports)) {
    return res.status(400).json({ erro: 'Nome, e-mail, perfil e relatórios são obrigatórios.' });
  }

  try {
    const usuarios = lerUsuarios();
    const index = usuarios.findIndex((u) => u.id === id);

    if (index === -1) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    const emailEmUso = usuarios.some((u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== id);
    if (emailEmUso) {
      return res.status(400).json({ erro: 'Este e-mail já está em uso por outro usuário.' });
    }

    const usuarioExistente = usuarios[index];
    
    usuarioExistente.name = name;
    usuarioExistente.email = email;
    usuarioExistente.role = role;
    usuarioExistente.allowedReports = allowedReports;

    if (password && password.trim() !== '') {
      usuarioExistente.password = gerarHashSenha(password);
    }

    salvarUsuarios(usuarios);

    const { password: _, ...safeUser } = usuarioExistente;
    res.json(safeUser);
  } catch (err) {
    console.error('[users] Erro ao atualizar usuário:', err.message);
    res.status(500).json({ erro: 'Erro ao atualizar usuário.' });
  }
});

app.delete('/api/users/:id', requerAutenticacao, requerAdmin, (req, res) => {
  const { id } = req.params;

  if (req.user.id === id) {
    return res.status(400).json({ erro: 'Você não pode excluir seu próprio usuário.' });
  }

  try {
    let usuarios = lerUsuarios();
    const usuario = usuarios.find((u) => u.id === id);

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    const admins = usuarios.filter((u) => u.role === 'admin');
    if (usuario.role === 'admin' && admins.length <= 1) {
      return res.status(400).json({ erro: 'Não é possível excluir o último administrador do sistema.' });
    }

    usuarios = usuarios.filter((u) => u.id !== id);
    salvarUsuarios(usuarios);

    res.json({ ok: true, mensagem: 'Usuário excluído com sucesso.' });
  } catch (err) {
    console.error('[users] Erro ao excluir usuário:', err.message);
    res.status(500).json({ erro: 'Erro ao excluir usuário.' });
  }
});

app.listen(PORT, () => {
  console.log(`[api] Plataforma de Relatórios rodando em http://localhost:${PORT}`);
  // Pré-carrega os relatórios sem parâmetro para já subir com dados em cache.
  aquecer([
    { chave: 'rotas-supervisao', produtor: lerRotas },
    { chave: 'geracao-cartao-ponto', produtor: buscarGeracaoCartaoPonto },
    { chave: 'quadro-operacional', produtor: buscarQuadroOperacional },
    { chave: 'quadro-operacional:reserva', produtor: buscarReserva },
    // Ocorrências (default 7 dias) — query pesada; aquece para a 1ª abertura ser rápida.
    { chave: 'quadro-operacional:ocorrencias:ini:fim', produtor: () => buscarOcorrencias({}) },
  ]);
});