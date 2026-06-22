/**
 * Formatação de texto para exibição. A query traz tudo em MAIÚSCULAS (UPPER);
 * aqui convertemos para "Title Case" pt-BR (só a 1ª letra de cada palavra),
 * mantendo conectores em minúsculo e algumas siglas em maiúsculo.
 *
 * Usado só na CAMADA DE EXIBIÇÃO — os valores crus continuam para a lógica
 * de filtros/comparações.
 */
const CONECTORES = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'com', 'em', 'a', 'o', 'as', 'os',
  'ao', 'aos', 'na', 'no', 'nas', 'nos', 'para', 'por', 'sem', 'sob', 'à', 'às',
]);

// Siglas que devem permanecer em maiúsculo.
const SIGLAS = new Set(['CEP', 'UF', 'CPF', 'CNPJ']);

export function tituloCase(texto) {
  if (texto == null || texto === '') return texto;
  return String(texto)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((palavra, i) => {
      if (!palavra) return palavra;
      if (SIGLAS.has(palavra.toUpperCase())) return palavra.toUpperCase();
      if (i > 0 && CONECTORES.has(palavra)) return palavra;
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(' ');
}
