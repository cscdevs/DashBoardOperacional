import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Perfis de acesso: modelos ("templates") de relatórios que o admin pode
// aplicar a um usuário na criação/edição. É apenas um atalho — os relatórios
// são COPIADOS para o usuário no momento em que o perfil é aplicado; alterar o
// perfil depois NÃO altera usuários já criados (modelo de cópia + avulso).
const DATA_DIR = path.join(process.cwd(), 'data');
const PERFIS_FILE = path.join(DATA_DIR, 'perfis.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function lerPerfis() {
  if (!fs.existsSync(PERFIS_FILE)) {
    salvarPerfis([]);
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(PERFIS_FILE, 'utf-8'));
  } catch (err) {
    console.error('[perfis] Erro ao ler perfis:', err.message);
    return [];
  }
}

export function salvarPerfis(perfis) {
  try {
    fs.writeFileSync(PERFIS_FILE, JSON.stringify(perfis, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[perfis] Erro ao salvar perfis:', err.message);
    return false;
  }
}

export function criarId() {
  return crypto.randomUUID();
}
