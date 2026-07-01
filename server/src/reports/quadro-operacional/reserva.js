/**
 * Quadro Operacional — aba "Reserva" (RS).
 *
 * Lista por pessoa alocada no cliente RESERVA TÉCNICA, classificada em
 * TipoReserva. A tela mostra Empresa → Base Operacional × (Abandono /
 * Afastamento / Falta Fixa / Reserva) — Intermitente NÃO entra nesta visão
 * (filtrado no frontend). Foto do dia; o range de datas da tela filtra por
 * data de implantação.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { query } from '../../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_PATH = join(__dirname, 'reserva.sql');

function dataISO(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function normalizar(row) {
  return {
    empresa: row.EMPRESA || null,
    baseOperacional: row.BASEOPERACIONAL || null,
    cliente: row.CLIENTE || null,
    local: row.LOCALSERVICO || null,
    tipoReserva: row.TipoReserva || null, // Reserva | Afastamento | Intermitente | Abandono | Falta Fixa
    re: row.RE ?? null,
    funcionario: row.FUNCIONARIO || null,
    turno: row.TURNO || null, // DIURNO | NOTURNO
    cargo: row.CARGO || null,
    escala: row.ESCALA || null,
    jornada: row.JORNADA || null,
    dtAdmissao: dataISO(row.DTADMISSAO),
    dtImplantacao: dataISO(row.DTIMPLANTACAO),
    areaSupervisao: row.AREASUPERVISAO || null,
    situacao: row.SITMOBRAHOJE || null,
    motivo: row.MOTIVO || null,
  };
}

/** Executa a query da Reserva (foto do dia) e devolve os registros normalizados. */
export async function buscarReserva() {
  const sql = readFileSync(SQL_PATH, 'utf-8');
  const rows = await query(sql);
  return rows.map(normalizar);
}