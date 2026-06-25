/**
 * Camada de acesso à API da Plataforma de Relatórios.
 * Em desenvolvimento as chamadas /api são encaminhadas pelo proxy do Vite
 * para o backend Express (ver vite.config.js).
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function getJSON(path) {
  const resp = await fetch(`${BASE_URL}${path}`);
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

export function fetchHealth() {
  return getJSON('/api/health');
}

/**
 * Invalida o cache em memória do backend (TTL ~30s). Use após uma alteração no
 * banco para que a próxima leitura traga os dados frescos imediatamente.
 */
export async function limparCache() {
  const resp = await fetch(`${BASE_URL}/api/cache/limpar`, { method: 'POST' });
  if (!resp.ok) throw new Error(`Erro ${resp.status} ao limpar o cache`);
  return resp.json();
}