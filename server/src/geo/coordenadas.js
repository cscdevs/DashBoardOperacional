/**
 * Tabela de coordenadas (lat/long) para plotagem no mapa.
 *
 * A query de Rotas de Supervisão NÃO traz latitude/longitude, apenas
 * endereço/cidade/UF. Agrupamos os pontos por CIDADE/UF e plotamos no
 * centro da cidade usando a base completa de municípios do IBGE
 * (municipios.json, ~5.571 cidades). Quando a cidade não é encontrada,
 * usamos o centro (centroide) da UF como fallback.
 */

import MUNICIPIOS from './municipios.json' with { type: 'json' };

/** Centroides aproximados de cada Unidade Federativa (fallback). */
export const UF_CENTROIDES = {
  AC: [-9.0238, -70.812],
  AL: [-9.5713, -36.782],
  AP: [0.902, -52.003],
  AM: [-3.4168, -65.8561],
  BA: [-12.5797, -41.7007],
  CE: [-5.4984, -39.3206],
  DF: [-15.7998, -47.8645],
  ES: [-19.1834, -40.3089],
  GO: [-15.827, -49.8362],
  MA: [-4.9609, -45.2744],
  MT: [-12.6819, -56.9211],
  MS: [-20.7722, -54.7852],
  MG: [-18.5122, -44.555],
  PA: [-3.9794, -52.4742],
  PB: [-7.24, -36.782],
  PR: [-24.89, -51.55],
  PE: [-8.8137, -36.9541],
  PI: [-7.7183, -42.7289],
  RJ: [-22.9099, -43.2095],
  RN: [-5.4026, -36.9541],
  RS: [-30.0346, -51.2177],
  RO: [-10.83, -63.34],
  RR: [2.7376, -62.0751],
  SC: [-27.2423, -50.2189],
  SP: [-23.5505, -46.6333],
  SE: [-10.5741, -37.3857],
  TO: [-10.1753, -48.2982],
};

/**
 * Coordenadas de cidades específicas. Chave: "CIDADE-UF" (normalizado).
 * Inclui as capitais e as principais cidades. Pode ser expandida conforme
 * os dados reais que aparecerem na operação.
 */
export const CIDADES = {
  // Capitais
  'RIO BRANCO-AC': [-9.9747, -67.81],
  'MACEIO-AL': [-9.6498, -35.7089],
  'MACAPA-AP': [0.0349, -51.0694],
  'MANAUS-AM': [-3.119, -60.0217],
  'SALVADOR-BA': [-12.9714, -38.5014],
  'FORTALEZA-CE': [-3.7319, -38.5267],
  'BRASILIA-DF': [-15.7942, -47.8822],
  'VITORIA-ES': [-20.3155, -40.3128],
  'GOIANIA-GO': [-16.6869, -49.2648],
  'SAO LUIS-MA': [-2.5391, -44.2829],
  'CUIABA-MT': [-15.601, -56.0974],
  'CAMPO GRANDE-MS': [-20.4697, -54.6201],
  'BELO HORIZONTE-MG': [-19.9167, -43.9345],
  'BELEM-PA': [-1.4558, -48.4902],
  'JOAO PESSOA-PB': [-7.115, -34.8631],
  'CURITIBA-PR': [-25.4284, -49.2733],
  'RECIFE-PE': [-8.0476, -34.877],
  'TERESINA-PI': [-5.0892, -42.8019],
  'RIO DE JANEIRO-RJ': [-22.9068, -43.1729],
  'NATAL-RN': [-5.7945, -35.211],
  'PORTO ALEGRE-RS': [-30.0346, -51.2177],
  'PORTO VELHO-RO': [-8.7619, -63.9039],
  'BOA VISTA-RR': [2.8235, -60.6758],
  'FLORIANOPOLIS-SC': [-27.5954, -48.548],
  'SAO PAULO-SP': [-23.5505, -46.6333],
  'ARACAJU-SE': [-10.9472, -37.0731],
  'PALMAS-TO': [-10.1689, -48.3317],

  // Principais cidades não-capitais
  'GUARULHOS-SP': [-23.4538, -46.5333],
  'CAMPINAS-SP': [-22.9099, -47.0626],
  'SAO BERNARDO DO CAMPO-SP': [-23.6914, -46.565],
  'SANTO ANDRE-SP': [-23.6639, -46.5383],
  'OSASCO-SP': [-23.5329, -46.7918],
  'SANTOS-SP': [-23.9608, -46.3336],
  'RIBEIRAO PRETO-SP': [-21.1775, -47.8103],
  'SOROCABA-SP': [-23.5015, -47.4526],
  'SAO JOSE DOS CAMPOS-SP': [-23.1896, -45.8841],
  'JUNDIAI-SP': [-23.1857, -46.8978],
  'DUQUE DE CAXIAS-RJ': [-22.7858, -43.3114],
  'NOVA IGUACU-RJ': [-22.7592, -43.451],
  'NITEROI-RJ': [-22.8833, -43.1036],
  'SAO GONCALO-RJ': [-22.8268, -43.0634],
  'CAMPOS DOS GOYTACAZES-RJ': [-21.7545, -41.3244],
  'CONTAGEM-MG': [-19.9317, -44.0536],
  'UBERLANDIA-MG': [-18.9186, -48.2772],
  'JUIZ DE FORA-MG': [-21.7642, -43.3503],
  'BETIM-MG': [-19.9678, -44.198],
  'MONTES CLAROS-MG': [-16.735, -43.8617],
  'LONDRINA-PR': [-23.3045, -51.1696],
  'MARINGA-PR': [-23.4253, -51.9386],
  'CASCAVEL-PR': [-24.9555, -53.4552],
  'FOZ DO IGUACU-PR': [-25.5478, -54.5882],
  'JOINVILLE-SC': [-26.3045, -48.8487],
  'BLUMENAU-SC': [-26.9194, -49.0661],
  'CHAPECO-SC': [-27.1004, -52.6152],
  'CAXIAS DO SUL-RS': [-29.1685, -51.1796],
  'PELOTAS-RS': [-31.7654, -52.3376],
  'CANOAS-RS': [-29.92, -51.1834],
  'SANTA MARIA-RS': [-29.6842, -53.8069],
  'FEIRA DE SANTANA-BA': [-12.2664, -38.9663],
  'VITORIA DA CONQUISTA-BA': [-14.866, -40.8394],
  'CAMACARI-BA': [-12.6996, -38.3242],
  'CARUARU-PE': [-8.2841, -35.9719],
  'JABOATAO DOS GUARARAPES-PE': [-8.1129, -35.0148],
  'OLINDA-PE': [-8.0089, -34.8553],
  'PETROLINA-PE': [-9.3891, -40.5031],
  'CAUCAIA-CE': [-3.7361, -38.6531],
  'JUAZEIRO DO NORTE-CE': [-7.213, -39.3151],
  'ANAPOLIS-GO': [-16.3281, -48.9531],
  'APARECIDA DE GOIANIA-GO': [-16.8198, -49.2469],
  'VILA VELHA-ES': [-20.3297, -40.2925],
  'SERRA-ES': [-20.1211, -40.3075],
  'CARIACICA-ES': [-20.2632, -40.4164],
  'ANANINDEUA-PA': [-1.3658, -48.3719],
  'IMPERATRIZ-MA': [-5.5264, -47.4919],
  'ARAPIRACA-AL': [-9.7515, -36.6611],
};

/**
 * Mapa do NOME COMPLETO da UF -> sigla. A query retorna UF.NOME_UF
 * (ex: "BAHIA", "SAO PAULO"), então convertemos para a sigla usada nas
 * tabelas de coordenadas. Chaves já normalizadas (sem acento, maiúsculas).
 */
export const UF_NOME_PARA_SIGLA = {
  ACRE: 'AC',
  ALAGOAS: 'AL',
  AMAPA: 'AP',
  AMAZONAS: 'AM',
  BAHIA: 'BA',
  CEARA: 'CE',
  'DISTRITO FEDERAL': 'DF',
  'ESPIRITO SANTO': 'ES',
  GOIAS: 'GO',
  MARANHAO: 'MA',
  'MATO GROSSO': 'MT',
  'MATO GROSSO DO SUL': 'MS',
  'MINAS GERAIS': 'MG',
  PARA: 'PA',
  PARAIBA: 'PB',
  PARANA: 'PR',
  PERNAMBUCO: 'PE',
  PIAUI: 'PI',
  'RIO DE JANEIRO': 'RJ',
  'RIO GRANDE DO NORTE': 'RN',
  'RIO GRANDE DO SUL': 'RS',
  RONDONIA: 'RO',
  RORAIMA: 'RR',
  'SANTA CATARINA': 'SC',
  'SAO PAULO': 'SP',
  SERGIPE: 'SE',
  TOCANTINS: 'TO',
};

/** Converte um valor de UF (sigla OU nome completo) para a sigla de 2 letras. */
export function ufParaSigla(uf) {
  const v = normalizar(uf);
  if (!v) return '';
  if (UF_CENTROIDES[v]) return v; // já é sigla válida
  return UF_NOME_PARA_SIGLA[v] || '';
}

/** Remove acentos e padroniza para casar com as chaves da tabela. */
export function normalizar(texto) {
  if (!texto) return '';
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase();
}

/**
 * Resolve a coordenada de um registro a partir da cidade (LOCALIDADE) e UF.
 * Retorna { coordinates: [lat, lng], aproximado: bool } ou null.
 *  - aproximado=false  -> cidade encontrada na tabela
 *  - aproximado=true   -> usou o centroide da UF
 */
export function resolverCoordenada(localidade, uf) {
  const cidade = normalizar(localidade);
  const estado = ufParaSigla(uf);

  if (cidade && estado) {
    const chave = `${cidade}-${estado}`;
    // 1º: tabela manual (overrides); 2º: base completa do IBGE
    if (CIDADES[chave]) {
      return { coordinates: CIDADES[chave], aproximado: false };
    }
    if (MUNICIPIOS[chave]) {
      return { coordinates: MUNICIPIOS[chave], aproximado: false };
    }
  }

  if (estado && UF_CENTROIDES[estado]) {
    return { coordinates: UF_CENTROIDES[estado], aproximado: true };
  }

  return null;
}