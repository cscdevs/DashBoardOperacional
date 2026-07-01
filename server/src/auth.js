import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Define o caminho do arquivo JSON que armazenará os usuários
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Garante que o diretório 'data' existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Armazenamento de sessões ativas na memória (token -> dados_usuario)
const sessoesAtivas = new Map();

/**
 * Criptografa a senha usando PBKDF2
 */
export function gerarHashSenha(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifica se a senha corresponde ao hash armazenado
 */
export function verificarSenha(password, storedPassword) {
  try {
    const [salt, hash] = storedPassword.split(':');
    const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === testHash;
  } catch (err) {
    return false;
  }
}

/**
 * Lê os usuários do arquivo users.json
 */
export function lerUsuarios() {
  if (!fs.existsSync(USERS_FILE)) {
    inicializarUsuariosPadrao();
  }
  try {
    const content = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('[auth] Erro ao ler banco de dados de usuários:', err.message);
    return [];
  }
}

/**
 * Grava a lista de usuários no arquivo users.json
 */
export function salvarUsuarios(usuarios) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[auth] Erro ao salvar banco de dados de usuários:', err.message);
    return false;
  }
}

/**
 * Popula o arquivo users.json com os três usuários padrão simulados originalmente
 */
function inicializarUsuariosPadrao() {
  console.log('[auth] Inicializando usuários padrão no banco de dados local...');
  const usuariosPadrao = [
    {
      id: '1',
      name: 'Administrador',
      email: 'csc.devapoio@gmail.com',
      password: gerarHashSenha('SPTK.0509.EVE'),
      role: 'admin',
      allowedReports: [
        'rotas-supervisao',
        'fluxo-atestados-faltas',
        'geracao-cartao-ponto',
        'posto-descoberto',
        'quadro-operacional'
      ]
    },
    {
      id: '2',
      name: 'Diretoria',
      email: 'diretoria@csc.com.br',
      password: gerarHashSenha('Diretoria@2026'),
      role: 'user',
      allowedReports: [
        'rotas-supervisao',
        'fluxo-atestados-faltas',
        'geracao-cartao-ponto',
        'posto-descoberto',
        'quadro-operacional'
      ]
    },
    {
      id: '3',
      name: 'Gerência',
      email: 'gerencia@csc.com.br',
      password: gerarHashSenha('Gerencia@2026'),
      role: 'user',
      allowedReports: [
        'rotas-supervisao',
        'fluxo-atestados-faltas',
        'geracao-cartao-ponto',
        'posto-descoberto',
        'quadro-operacional'
      ]
    }
  ];
  salvarUsuarios(usuariosPadrao);
}

// Cria sessão ativa para o usuário e retorna o token
export function criarSessao(user) {
  const token = crypto.randomUUID();
  // Não guardar a senha na sessão ativa
  const { password, ...safeUser } = user;
  sessoesAtivas.set(token, safeUser);
  return token;
}

// Remove uma sessão ativa
export function removerSessao(token) {
  return sessoesAtivas.delete(token);
}

// Busca os dados da sessão pelo token
export function obterSessao(token) {
  return sessoesAtivas.get(token) || null;
}

/**
 * Middleware: Exige que a requisição venha com um token de sessão válido
 */
export function requerAutenticacao(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Autenticação necessária. Faça login novamente.' });
  }

  const token = authHeader.split(' ')[1];
  const user = obterSessao(token);

  if (!user) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada. Faça login novamente.' });
  }

  req.user = user;
  req.token = token;
  next();
}

/**
 * Middleware: Exige que o usuário autenticado possua a role 'admin'
 */
export function requerAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ erro: 'Usuário não autenticado.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem acessar esta função.' });
  }

  next();
}

/**
 * Middleware: Verifica se o usuário tem permissão para visualizar o relatório solicitado
 */
export function autorizarRelatorio(reportKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }

    // Administrador tem acesso automático a tudo
    if (req.user.role === 'admin') {
      return next();
    }

    if (Array.isArray(req.user.allowedReports) && req.user.allowedReports.includes(reportKey)) {
      return next();
    }

    return res.status(403).json({ erro: `Você não tem permissão para visualizar o relatório: ${reportKey}.` });
  };
}
