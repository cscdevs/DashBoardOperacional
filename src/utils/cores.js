/**
 * Cores distinguíveis para colorir marcadores por supervisor.
 *
 * Como pode haver mais de uma centena de supervisores, geramos cores
 * espalhando o matiz (hue) pelo "ângulo áureo" (~137.5°). Isso produz
 * cores bem diferentes entre vizinhos, de forma determinística: o mesmo
 * supervisor (na mesma ordem alfabética) sempre recebe a mesma cor.
 */
const ANGULO_AUREO = 137.508;

export const COR_SEM_SUPERVISOR = '#98A1B3'; // cinza p/ locais sem supervisor

function corPorIndice(i) {
  const hue = (i * ANGULO_AUREO) % 360;
  // Alterna saturação/luminosidade levemente p/ separar ainda mais tons próximos.
  const sat = 65 + (i % 3) * 8; // 65, 73, 81
  const lig = 42 + (i % 2) * 8; // 42, 50
  return `hsl(${hue.toFixed(1)}, ${sat}%, ${lig}%)`;
}

/**
 * Constrói um mapa { supervisor -> cor } a partir da lista de supervisores.
 */
export function mapaDeCores(supervisores) {
  const ordenados = [...new Set(supervisores.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );
  const mapa = {};
  ordenados.forEach((s, i) => {
    mapa[s] = corPorIndice(i);
  });
  return mapa;
}

export function corDoSupervisor(supervisor, mapa) {
  if (!supervisor) return COR_SEM_SUPERVISOR;
  return mapa[supervisor] || COR_SEM_SUPERVISOR;
}