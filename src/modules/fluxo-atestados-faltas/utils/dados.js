/**
 * Utilitários de agregação, formatação e exportação para o relatório
 * Fluxo de Atestados / Faltas.
 */
import { tituloCase } from '../../../utils/texto';

/**
 * Extrai a DATA CRUA (YYYY-MM-DD) de um valor ISO, sem conversão de fuso.
 * O backend manda as datas do SQL Server como ISO UTC; usar new Date()+getters
 * locais desloca datas de meia-noite em -1 dia (UTC-3). Pegar os 10 primeiros
 * caracteres preserva exatamente a data gravada (igual ao Power BI).
 */
function ymd(valor) {
  if (!valor) return null;
  const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { ano: +m[1], mes: +m[2], dia: +m[3], iso: `${m[1]}-${m[2]}-${m[3]}` } : null;
}

/** Conta valores não vazios distintos de uma chave. */
export const distintos = (linhas, chave) =>
  new Set(linhas.map((l) => l[chave]).filter((v) => v != null && v !== '')).size;

/**
 * Agrupa por uma chave e conta. Retorna [{ label, value }] ordenado desc.
 * Com `topN`, agrega o excedente em "Outros".
 */
export function contarPor(linhas, chave, { topN } = {}) {
  const mapa = new Map();
  for (const l of linhas) {
    const k = l[chave] == null || l[chave] === '' ? '—' : String(l[chave]);
    mapa.set(k, (mapa.get(k) || 0) + 1);
  }
  let arr = [...mapa.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  if (topN && arr.length > topN) {
    const top = arr.slice(0, topN);
    const resto = arr.slice(topN).reduce((s, x) => s + x.value, 0);
    if (resto) top.push({ label: 'Outros', value: resto });
    arr = top;
  }
  return arr;
}

/** Agrupa por mês (data crua) → [{ label: 'MM/AAAA', value }] cronológico. */
export function contarPorMes(linhas, chaveData) {
  const mapa = new Map();
  for (const l of linhas) {
    const y = ymd(l[chaveData]);
    if (!y) continue;
    const chave = `${y.ano}-${String(y.mes).padStart(2, '0')}`;
    mapa.set(chave, (mapa.get(chave) || 0) + 1);
  }
  return [...mapa.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ym, value]) => {
      const [ano, mes] = ym.split('-');
      return { label: `${mes}/${ano}`, value };
    });
}

/** Agrupa por dia (data crua) → [{ label: 'dd/mm', value }] cronológico. */
export function contarPorDia(linhas, chaveData) {
  const mapa = new Map();
  for (const l of linhas) {
    const y = ymd(l[chaveData]);
    if (!y) continue;
    mapa.set(y.iso, (mapa.get(y.iso) || 0) + 1);
  }
  return [...mapa.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([iso, value]) => {
      const [, mes, dia] = iso.split('-');
      return { label: `${dia}/${mes}`, value };
    });
}

/** Conta dias distintos (data crua) de uma chave de data. */
export function distintosDias(linhas, chaveData) {
  const set = new Set();
  for (const l of linhas) {
    const y = ymd(l[chaveData]);
    if (y) set.add(y.iso);
  }
  return set.size;
}

/**
 * Resumo por cliente: Qtd e "Média por Período" (= Qtd ÷ dias distintos com
 * registro). Ordenado por média desc. Inclui linha de total.
 */
export function resumoPorCliente(linhas, chaveData = 'dataPonto') {
  const grupos = new Map();
  for (const l of linhas) {
    const c = exibir(l.cliente) || '—';
    if (!grupos.has(c)) grupos.set(c, []);
    grupos.get(c).push(l);
  }
  const arr = [...grupos.entries()]
    .map(([cliente, rows]) => {
      const qtd = rows.length;
      const dias = distintosDias(rows, chaveData) || 1;
      return { cliente, qtd, media: qtd / dias };
    })
    .sort((a, b) => b.media - a.media || b.qtd - a.qtd);
  const totalQtd = linhas.length;
  const totalDias = distintosDias(linhas, chaveData) || 1;
  return { linhas: arr, total: { qtd: totalQtd, media: totalQtd / totalDias } };
}

/** Resumo por funcionário (RE - Nome): Qtd, ordenado desc. Inclui total. */
export function resumoPorFuncionario(linhas) {
  const grupos = new Map();
  for (const l of linhas) {
    if (l.re == null) continue;
    const label = `${l.re} - ${exibir(l.nome)}`.trim();
    grupos.set(label, (grupos.get(label) || 0) + 1);
  }
  const arr = [...grupos.entries()]
    .map(([funcionario, qtd]) => ({ funcionario, qtd }))
    .sort((a, b) => b.qtd - a.qtd);
  return { linhas: arr, total: { qtd: linhas.length } };
}

/** Conta linhas cuja faseFantasia é a informada (CONCLUÍDO | APROVAÇÃO | PENDENTE). */
export const porFase = (linhas, fase) => linhas.filter((l) => l.faseFantasia === fase).length;

/** Conta atestados lançados HOJE (pela data de lançamento, data crua). */
export function recebidosHoje(linhas) {
  const h = new Date();
  const hojeIso = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
  return linhas.filter((l) => ymd(l.dtLancamento)?.iso === hojeIso).length;
}

/** Média de lançamentos por dia no período (total ÷ nº de dias do intervalo). */
export function mediaPorDia(linhas, periodo) {
  const a = ymd(periodo?.dataInicial), b = ymd(periodo?.dataFinal);
  if (!a || !b) return linhas.length;
  const ms = Date.UTC(b.ano, b.mes - 1, b.dia) - Date.UTC(a.ano, a.mes - 1, a.dia);
  const dias = Math.max(1, Math.round(ms / 86400000) + 1);
  return Math.round(linhas.length / dias);
}

/** Diferença em dias-calendário entre duas datas cruas (a − b), ou null se inválidas. */
function diffDias(a, b) {
  const ya = ymd(a), yb = ymd(b);
  if (!ya || !yb) return null;
  const ua = Date.UTC(ya.ano, ya.mes - 1, ya.dia);
  const ub = Date.UTC(yb.ano, yb.mes - 1, yb.dia);
  return Math.round((ua - ub) / 86400000);
}

/**
 * Classifica o prazo de envio do atestado (regra do BI "Status Lançamento"):
 * diferença em dias (lançamento − início da ocorrência):
 *   < 0 → Adiantado | 0..2 → No Prazo | >= 3 → Atrasado | sem data → Não Identificado
 */
export function classificarPrazo(linhas) {
  let adiantado = 0, noPrazo = 0, atrasado = 0, naoIdent = 0;
  for (const l of linhas) {
    const dif = l.dtLancamento && l.dtInicioOcorrencia ? diffDias(l.dtLancamento, l.dtInicioOcorrencia) : null;
    if (dif === null) naoIdent += 1;
    else if (dif < 0) adiantado += 1;
    else if (dif <= 2) noPrazo += 1;
    else atrasado += 1;
  }
  const bins = [
    { label: 'Adiantado', value: adiantado },
    { label: 'No Prazo', value: noPrazo },
    { label: 'Atrasado', value: atrasado },
  ];
  if (naoIdent > 0) bins.push({ label: 'Não Identificado', value: naoIdent });
  return bins;
}

/** Agrupa por funcionário (RE + nome) → [{ label: 'RE Nome', value }] desc. */
export function agruparFuncionario(linhas) {
  const mapa = new Map();
  for (const l of linhas) {
    if (l.re == null) continue;
    const chave = `${l.re} ${exibir(l.nome)}`.trim();
    mapa.set(chave, (mapa.get(chave) || 0) + 1);
  }
  return [...mapa.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/** Valores únicos (para selects de filtro), em Title Case e ordenados. */
export const valoresUnicos = (linhas, chave) =>
  [...new Set(linhas.map((l) => l[chave]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), 'pt-BR')
  );

/** Formata uma data ISO para dd/mm/aaaa (data crua, sem fuso) ou '' se inválida. */
export function formatarData(iso) {
  const y = ymd(iso);
  return y ? `${String(y.dia).padStart(2, '0')}/${String(y.mes).padStart(2, '0')}/${y.ano}` : '';
}

/** Aplica Title Case com segurança (mantém vazios). */
export const exibir = (v) => (v == null || v === '' ? '' : tituloCase(String(v)));

/** Gera e baixa um CSV (compatível com Excel) a partir de colunas + linhas. */
export function baixarCSV(nomeArquivo, colunas, linhas) {
  const cab = colunas.map((c) => c.titulo).join(';');
  const corpo = linhas.map((l) =>
    colunas
      .map((c) => {
        const bruto = c.valor ? c.valor(l) : l[c.chave];
        const txt = bruto == null ? '' : String(bruto);
        return `"${txt.replace(/"/g, '""')}"`;
      })
      .join(';')
  );
  const csv = '﻿' + [cab, ...corpo].join('\r\n'); // BOM p/ acentuação no Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
