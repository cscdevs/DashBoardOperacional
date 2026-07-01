/**
 * Camada de acesso à API da Plataforma de Relatórios.
 * Em desenvolvimento as chamadas /api são encaminhadas pelo proxy do Vite
 * para o backend Express (ver vite.config.js).
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Retorna os cabeçalhos padrão incluindo o token de autenticação se ele existir
 */
function obterHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  const storedUser = localStorage.getItem('dashboard_user');
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      if (parsed && parsed.token) {
        headers['Authorization'] = `Bearer ${parsed.token}`;
      }
    } catch (e) {
      // Ignora erro de parsing
    }
  }

  return headers;
}

/**
 * Trata a resposta HTTP e lança erro caso não seja bem sucedida
 */
async function tratarResposta(resp, path) {
  if (!resp.ok) {
    let detalhe = '';
    try {
      const corpo = await resp.json();
      detalhe = corpo.detalhe || corpo.erro || '';
    } catch {
      /* ignora corpo não-JSON */
    }
    throw new Error(detalhe || `Erro ${resp.status} ao acessar ${path}`);
  }
  return resp.json();
}

/**
 * GET Request
 */
export async function getJSON(path) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: obterHeaders(),
  });
  return tratarResposta(resp, path);
}

/**
 * POST Request
 */
export async function postJSON(path, body) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: obterHeaders(),
    body: JSON.stringify(body),
  });
  return tratarResposta(resp, path);
}

/**
 * PUT Request
 */
export async function putJSON(path, body) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: obterHeaders(),
    body: JSON.stringify(body),
  });
  return tratarResposta(resp, path);
}

/**
 * DELETE Request
 */
export async function deleteJSON(path) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: obterHeaders(),
  });
  return tratarResposta(resp, path);
}

export function fetchHealth() {
  return getJSON('/api/health');
}

/**
 * Invalida o cache em memória do backend (TTL ~30s). Use após uma alteração no
 * banco para que a próxima leitura traga os dados frescos imediatamente.
 */
export async function limparCache() {
  return postJSON('/api/cache/limpar');
}

/* ==========================================================================
   APIs de Autenticação e Gestão de Usuários
   ========================================================================== */

/**
 * Realiza o login no backend
 */
export function loginAPI(email, password) {
  return postJSON('/api/auth/login', { email, password });
}

/**
 * Realiza o logout no backend
 */
export function logoutAPI() {
  return postJSON('/api/auth/logout');
}

/**
 * Obtém os dados do usuário logado no backend
 */
export function fetchMeAPI() {
  return getJSON('/api/auth/me');
}

/**
 * Troca a senha do próprio usuário logado.
 * Na troca obrigatória (1º acesso) o backend dispensa a senha atual.
 */
export function trocarSenhaAPI(senhaAtual, novaSenha) {
  return postJSON('/api/auth/trocar-senha', { senhaAtual, novaSenha });
}

/**
 * Lista todos os usuários cadastrados (Admin only)
 */
export function fetchUsersAPI() {
  return getJSON('/api/users');
}

/**
 * Admin redefine a senha de um usuário para a padrão (csc123) (Admin only)
 */
export function redefinirSenhaAPI(id) {
  return postJSON(`/api/users/${id}/redefinir-senha`);
}

/* ==========================================================================
   Perfis de Acesso (modelos de relatórios) — Admin only
   ========================================================================== */

export function fetchPerfisAPI() {
  return getJSON('/api/perfis');
}

export function createPerfilAPI(data) {
  return postJSON('/api/perfis', data);
}

export function updatePerfilAPI(id, data) {
  return putJSON(`/api/perfis/${id}`, data);
}

export function deletePerfilAPI(id) {
  return deleteJSON(`/api/perfis/${id}`);
}

/**
 * Cria um novo usuário (Admin only)
 */
export function createUserAPI(userData) {
  return postJSON('/api/users', userData);
}

/**
 * Atualiza um usuário existente (Admin only)
 */
export function updateUserAPI(id, userData) {
  return putJSON(`/api/users/${id}`, userData);
}

/**
 * Exclui um usuário (Admin only)
 */
export function deleteUserAPI(id) {
  return deleteJSON(`/api/users/${id}`);
}