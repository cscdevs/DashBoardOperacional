/**
 * Utilitários de agregação, formatação e exportação do relatório
 * Geração de Cartão de Ponto (Folha de Ponto).
 *
 * Diferente do Fluxo de Atestados (que conta linhas), aqui cada linha é um
 * cartão e medimos 3 quantidades por grupo:
 *   Total      = nº de cartões
 *   Entregue   = STATUS === 'CONCLUÍDO'
 *   Pendências = STATUS === 'PENDENTE'
 * e a derivada % Entregue = Entregue / Total.
 */
import { tituloCase } from '../../../utils/texto';
import { ehLocalEspecial } from '../../../utils/locais';

/** Remove acentos e padroniza (maiúsculas) para casar nomes. */
const normalizar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

/**
 * Regra do relatório: DENTRO do cliente RESERVA TÉCNICA não entram os
 * cartões de buckets que não são postos reais — Abandono / Afastamento /
 * Faltante (via util transversal) e também os Intermitentes
 * (locais "INTERMITENTES - ..."). Fora da Reserva Técnica, nada é descartado.
 */
export const ehDescartavel = (l) => {
  if (normalizar(l.cliente) !== 'RESERVA TECNICA') return false;
  return ehLocalEspecial(l.local) || normalizar(l.local).includes('INTERMITENTE');
};

/** True se o cartão está entregue (status consolidado = CONCLUÍDO). */
export const ehEntregue = (l) => l.status === 'CONCLUÍDO';

/** Aplica Title Case com segurança (mantém vazios). */
export const exibir = (v) => (v == null || v === '' ? '' : tituloCase(String(v)));

/** Formata uma data ISO para dd/mm/aaaa (data crua, sem fuso) ou '' se inválida. */
export function formatarData(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** Calcula as medidas (Total/Entregue/Pendências/%) de um conjunto de cartões. */
export function medidas(linhas) {
  const total = linhas.length;
  let entregue = 0;
  for (const l of linhas) if (ehEntregue(l)) entregue += 1;
  const pendencias = total - entregue;
  const pctEntregue = total ? entregue / total : 0;
  return { total, entregue, pendencias, pctEntregue };
}

/**
 * Agrupa por uma chave e calcula as medidas de cada grupo.
 * Retorna [{ label, total, entregue, pendencias, pct }] + ordenação.
 *
 * @param {Array<object>} linhas
 * @param {(l:object)=>string} getLabel  como montar o rótulo do grupo
 * @param {{ ordenarPor?: 'pendencias'|'total'|'label', formatarLabel?: boolean, ocultarSemGrupo?: boolean }} opcoes
 *        ocultarSemGrupo: omite o grupo "—" (registros sem valor na chave).
 */
export function resumoPor(linhas, getLabel, { ordenarPor = 'pendencias', formatarLabel = true, ocultarSemGrupo = false } = {}) {
  const grupos = new Map();
  for (const l of linhas) {
    const bruto = getLabel(l);
    if (ocultarSemGrupo && (bruto == null || bruto === '')) continue;
    const chave = bruto == null || bruto === '' ? '—' : String(bruto);
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(l);
  }
  const arr = [...grupos.entries()].map(([chave, rows]) => {
    const m = medidas(rows);
    const label = formatarLabel && chave !== '—' ? exibir(chave) : chave;
    return { label, ...m, pct: m.pctEntregue };
  });
  if (ordenarPor === 'label') {
    arr.sort((a, b) => String(a.label).localeCompare(String(b.label), 'pt-BR'));
  } else {
    arr.sort((a, b) => b[ordenarPor] - a[ordenarPor] || b.total - a.total);
  }
  return arr;
}

/** [{ label:'Entregue'|'Pendências', value }] para o donut de status. */
export function distribuicaoStatus(linhas) {
  const m = medidas(linhas);
  return [
    { label: 'Entregue', value: m.entregue },
    { label: 'Pendências', value: m.pendencias },
  ];
}

/**
 * Pendências por competência, em ordem cronológica (pelo ANOMES).
 * Retorna [{ label:'MM/AAAA', value }] para o gráfico de colunas.
 */
export function pendenciasPorCompetencia(linhas) {
  const grupos = new Map(); // anoMes -> { competencia, pendencias }
  for (const l of linhas) {
    if (ehEntregue(l)) continue;
    const k = String(l.anoMes ?? '');
    if (!k) continue;
    const item = grupos.get(k) || { competencia: l.competencia || k, pendencias: 0 };
    item.pendencias += 1;
    grupos.set(k, item);
  }
  return [...grupos.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => ({ label: v.competencia, value: v.pendencias }));
}

/** Lista de competências únicas, ordenadas (mais recente primeiro) p/ o slicer. */
export function competencias(linhas) {
  const mapa = new Map(); // anoMes -> competencia
  for (const l of linhas) {
    if (l.anoMes == null) continue;
    mapa.set(String(l.anoMes), l.competencia || String(l.anoMes));
  }
  return [...mapa.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([anoMes, competencia]) => ({ anoMes, competencia }));
}

/** Valores únicos de uma chave (para selects), em Title Case e ordenados. */
export const valoresUnicos = (linhas, chave) =>
  [...new Set(linhas.map((l) => l[chave]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), 'pt-BR')
  );

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
