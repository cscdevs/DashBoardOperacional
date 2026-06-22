/**
 * De-para curado: rótulo da rota (coluna ENTAREA.NOMECOMPLETO) -> nome do
 * supervisor responsável.
 *
 * A coluna de "área de supervisão" não é um campo limpo de supervisor: é um
 * rótulo livre da rota no formato "(F/P/S) LOCAL - [SUBLOCAL] - [TURNO] - NOME".
 * Como os valores distintos são poucos (~146) e isso alimenta um relatório
 * operacional, mapeamos cada um manualmente para garantir precisão.
 *
 * Valor `null`  -> a rota não tem supervisor nomeado (vira "Sem supervisor").
 *
 * Chaves normalizadas: espaços colapsados + trim + MAIÚSCULAS (a query já
 * devolve em maiúsculas). Rótulos novos que não estejam aqui caem no rótulo
 * original (sinalizando que precisam ser adicionados a esta tabela).
 */

export const SEM_SUPERVISOR = 'Sem supervisor';

/** Normaliza um rótulo para casar com as chaves do de-para. */
function normalizarRotulo(raw) {
  return (raw || '').toString().replace(/\s+/g, ' ').trim().toUpperCase();
}

/** rótulo (normalizado) -> nome do supervisor (ou null = sem supervisor). */
const MAPA_SUPERVISORES = {
  '(F) BRASILIA - LUIZ CLAUDIO': 'LUIZ CLAUDIO',
  '(F) CAMPINAS - MARIO GATTI - MARIANA': 'MARIANA',
  '(F) CAMPINAS - OURO VERDE - IVETE': 'IVETE',
  '(F) GUARAREMA - PM GUARAREMA MAFFUZ': 'MAFFUZ', // revisar: MAFFUZ é pessoa?
  '(F) ITATIBA - ROTA 01 - RAFAEL BATISTA': 'RAFAEL BATISTA',
  '(F) PIRACICABA - ROTA 02 - FELIPE': 'FELIPE',
  '(F) PIRACICABA - ROTA 03 - CAROLINE': 'CAROLINE',
  '(F) PIRACICABA - ROTA 04 - KATIA': 'KATIA',
  '(F) PIRACICABA - ROTA 06 - NELSON': 'NELSON',
  '(F) RESERVA SME - RODNEI': 'RODNEI',
  '(F) RIBEIRÃO PRETO - ROTA 01': null,
  '(F) RIBEIRÃO PRETO - ROTA 01 ALBERTO': 'ALBERTO',
  '(F) RIBEIRÃO PRETO - ROTA 02': null,
  '(F) RIBEIRÃO PRETO - ROTA 02 NETO': 'NETO',
  '(F) RIBEIRÃO PRETO - ROTA 03': null,
  '(F) RIBEIRÃO PRETO - ROTA 03 RENATO': 'RENATO',
  '(F) RIBEIRÃO PRETO - ROTA 04': null,
  '(F) RIBEIRÃO PRETO - ROTA 04 JOSE': 'JOSE',
  '(F) RIBEIRÃO PRETO - ROTA 05': null,
  '(F) RIBEIRÃO PRETO - ROTA 05 ANA LUCIA': 'ANA LUCIA',
  '(F) RIBEIRÃO PRETO - SUPERVISÃO': null,
  '(F) SME - FB 01 - CARLA': 'CARLA',
  '(F) SME - FB 02 - EDGAR': 'EDGAR',
  '(F) SME - FB 03 - RODNEI': 'RODNEI',
  '(F) SME - ZONA SUL - CLEITON': 'CLEITON',
  '(F) SME - ZONA SUL - JENIFER': 'JENIFER',
  '(F) SME - ZONA SUL - SHEILA': 'SHEILA',
  '(F) SME GUAIANASES 01 - VALDIRENE': 'VALDIRENE',
  '(F) SME GUAIANASES 02 - WELLINGTON': 'WELLINGTON',
  '(F) SME GUAIANASES 03 - CAMILA': 'CAMILA',
  '(F) SME IPIRANGA 01 - RODRIGO': 'RODRIGO',
  '(F) SME IPIRANGA 02 - MARIANA': 'MARIANA',
  '(F) SME IPIRANGA 03 - ELISANGELA': 'ELISANGELA',
  '(F) SP - CPTM - MARCOS FILHO': 'MARCOS FILHO',
  '(F) SP - TENIS CLUB': null,
  '(F) TIC TREM DIURNO - GUILHERME': 'GUILHERME',
  '(F) TIC TREM NOTURNO - GUILHERME': 'GUILHERME',
  '(P) SAMU - ROBSON': 'ROBSON',
  '(P) CAMPINAS - SANASA - JESSICA': 'JESSICA',
  '(P) CAMPINAS - SANASA - ROGERIO DE SOUZA': 'ROGERIO DE SOUZA',
  '(P) CPTM - DANIELA': 'DANIELA',
  '(P) CPTM - JOSE EDIVAM': 'JOSE EDIVAM',
  '(P) CPTM - ANTONIO LINHARES': 'ANTONIO LINHARES',
  '(P) CPTM - DEBORA': 'DEBORA',
  '(P) CPTM - EDER': 'EDER',
  '(P) CPTM - JAQUELINE JESUS': 'JAQUELINE JESUS',
  '(P) CPTM - JOSE ANTONIO': 'JOSE ANTONIO',
  '(P) CPTM - JULIO CODOLO': 'JULIO CODOLO',
  '(P) CPTM - LEONCIO': 'LEONCIO',
  '(P) CPTM - LUCAS QUINTINO': 'LUCAS QUINTINO',
  '(P) CPTM - TIAGO BEZERRA': 'TIAGO BEZERRA',
  '(P) DANIEL VIEIRA - CAMPINAS DIURNO': 'DANIEL VIEIRA',
  '(P) DANIEL VIEIRA - CAMPINAS NOTURNO': 'DANIEL VIEIRA',
  '(P) FUNDAÇÃO BUTANTAN - ANDERSON': 'ANDERSON',
  '(P) JONATHON - MANUTENÇÃO DIURNO': 'JONATHON',
  '(P) JONATHON - MANUTENÇÃO NOTURNO': 'JONATHON',
  '(P) NATALIA - DIURNO': 'NATALIA',
  '(P) RENATO - DIURNO': 'RENATO',
  '(P) RJ - VALERIA': 'VALERIA',
  '(P) ROTA TJ - PACHECO': 'PACHECO',
  '(P) ROTA TJ - RAFAEL': 'RAFAEL',
  '(P) SAMU - DIURNO - ADRIANO': 'ADRIANO',
  '(P) SAMU - NATALIA': 'NATALIA',
  '(P) SAMU - NATALIA D': 'NATALIA', // revisar: "NATALIA D" (Natalia diurno?)
  '(P) SAMU - ROBERTO': 'ROBERTO',
  '(P) SAMU - SAMUEL': 'SAMUEL',
  '(P) SEBRAE - LEANDRO BILATTO': 'LEANDRO BILATTO',
  '(P) SEBRAE - ROBERTO': 'ROBERTO',
  '(P) SEBRAE - ROBSON': 'ROBSON',
  '(P) SJC - RONDA CARVALHO': 'CARVALHO',
  '(P) SJC - RONDA CATARINO': 'CATARINO',
  '(P) SJC - RONDA CLAUDIO': 'CLAUDIO',
  '(P) SJC - RONDA LUCAS': 'LUCAS',
  '(P) SJC - RONDA ZANELLA': 'ZANELLA',
  '(P) SME - CARVALHO': 'CARVALHO',
  '(P) SME - ROBSON': 'ROBSON',
  '(P) SME - SAMU - WILLIAN': 'WILLIAN',
  '(P) SP - CCR VIGILANCIA - ADRIANO': 'ADRIANO',
  '(P) SP - CPTM - L12 - NOT -': null,
  '(P) SP - ICESP - FERNANDO': 'FERNANDO',
  '(P) SP - NATALIA': 'NATALIA',
  '(P) TIC TREM': null,
  '(P) TIC TREM - CARLOS': 'CARLOS',
  '(S) SP - METRO - LINHA OURO': null,
  '(S) SP - METRO - LINHA VERMELHA': null,
  '(S) ADMINISTRAÇÃO': null,
  '(S) ANDERSON FUNDAÇÃO BUTANTAN': 'ANDERSON',
  '(S) BRASILIA - LUIZ CLAUDIO': 'LUIZ CLAUDIO',
  '(S) BRASÍLIA - CGU': null,
  '(S) CAMPINAS - ZEL ROTA 01 - DIU - JOEL': 'JOEL',
  '(S) CAMPINAS - ZEL ROTA 02 - DIU - JOAO PAULO': 'JOAO PAULO',
  '(S) CAMPINAS - ZEL ROTA 03 - DIU - ROSANA': 'ROSANA',
  '(S) CAMPINAS - ZEL ROTA 04 - NOT - LUCAS': 'LUCAS',
  '(S) CPTM - RAUL DIURNO': 'RAUL',
  '(S) CPTM - RAUL NOTURNO': 'RAUL',
  '(S) DANIEL - CAMPINAS DIURNO': 'DANIEL',
  '(S) DANIEL - CAMPINAS NOTURNO': 'DANIEL',
  '(S) DANIEL VIEIRA - CAMPINAS DIURNO': 'DANIEL VIEIRA',
  '(S) DANIEL VIEIRA - CAMPINAS NOTURNO': 'DANIEL VIEIRA',
  '(S) FELIPE PIRACICABA': 'FELIPE',
  '(S) MEQUI - ENIO SOARES': 'ENIO SOARES',
  '(S) MÉQUI - CASSIANE': 'CASSIANE',
  '(S) MÉQUI - RENATO': 'RENATO',
  '(S) RECEPÇÃO - DIURNO': null,
  '(S) RECEPÇÃO - NOTURNO': null,
  '(S) RIBEIRAO PRETO - APOIO PEDAGOGICO': null,
  "(S) RIBEIRÃO PRETO - MC DONALD'S": null,
  '(S) ROTA TJ - FERNANDO': 'FERNANDO',
  '(S) ROTA TJ - ROBERTO': 'ROBERTO',
  '(S) SME PORTARIA - ADRIANO': 'ADRIANO',
  '(S) SME PORTARIA - ROBERTO': 'ROBERTO',
  '(S) SME PORTARIA - ROBSON': 'ROBSON',
  '(S) SP - ADM - PM OSASCO': null,
  '(S) SP - CCR - L08 - DIU - MARIA DEBORA': 'MARIA DEBORA',
  '(S) SP - CCR - L08 - NOT - CLAUDEMIR ROSA': 'CLAUDEMIR ROSA',
  '(S) SP - CCR - L09 - DIU - RAFAEL ALVES': 'RAFAEL ALVES',
  '(S) SP - CCR - L09 - NOT - LAUDIVAN': 'LAUDIVAN',
  '(S) SP - CPTM - L07 - DIU - RUBENS FRANCISCO': 'RUBENS FRANCISCO',
  '(S) SP - CPTM - L10 - DIU - SANDRA ALVES': 'SANDRA ALVES',
  '(S) SP - CPTM - L10 - NOT- ERICSON SOARES': 'ERICSON SOARES',
  '(S) SP - CPTM - L11 - DIU - EMILIO': 'EMILIO',
  '(S) SP - CPTM - L11 - NOT - ROGERIO RAFAEL': 'ROGERIO RAFAEL',
  '(S) SP - CPTM - L12 - DIU - LUCAS QUEIROZ': 'LUCAS QUEIROZ',
  '(S) SP - CPTM - L12 - NOT - AFONSO CELSO': 'AFONSO CELSO',
  '(S) SP - CPTM - MARCOS FILHO': 'MARCOS FILHO',
  '(S) SP - METRO - LINHA AZUL': null,
  '(S) SP - METRO - LINHA LARANJA': null,
  '(S) SP - METRO - LINHA PRATA': null,
  '(S) SP - METRO - LINHA VERDE': null,
  '(S) SP - METRÔ HEBERTH': 'HEBERTH',
  '(S) SP - MT CAMPINAS - FABIO WILSON': 'FABIO WILSON',
  '(S) SP - NATALIA': 'NATALIA',
  '(S) SP - PRODESP - LARISSA': 'LARISSA',
  '(S) SP - PRODESP DENTRAN - LARISSA': 'LARISSA',
  '(S) SP - PRODESP DER - LARISSA': 'LARISSA',
  '(S) SP - PRODESP DIPOL - ALAN': 'ALAN',
  '(S) SP - PRODESP DPESP - LARISSA': 'LARISSA',
  '(S) SP - PRODESP IIRGD - KLEBER': 'KLEBER',
  '(S) SP - PRODESP MT BARRA FUNDA - LARISSA': 'LARISSA',
  '(S) SP - PRODESP PALÁCIO - KLEBER': 'KLEBER',
  '(S) SP - TIC TRENS - NASCIMENTO': 'NASCIMENTO',
  '(S) SÃO PAULO TJ - DIURNO - ADRIANO': 'ADRIANO',
  '(S) TIC TREM DIURNO - ELLINGTON': 'ELLINGTON',
  '(S) TJ - ROBSON': 'ROBSON',
  'FALTA FIXA - DIURNO': null,
  'Z SEBRAE - DIURNO - IGOR': 'IGOR',
};

// Indexa por chave normalizada (tolera espaços duplos/variações no banco).
const MAPA_NORMALIZADO = {};
for (const [rotulo, nome] of Object.entries(MAPA_SUPERVISORES)) {
  MAPA_NORMALIZADO[normalizarRotulo(rotulo)] = nome;
}

/**
 * Resolve o nome do supervisor a partir do rótulo bruto da rota.
 *  - rótulo mapeado para um nome -> o nome
 *  - rótulo mapeado para null    -> SEM_SUPERVISOR
 *  - rótulo ausente/desconhecido -> o próprio rótulo (sinaliza que falta mapear)
 */
export function resolverSupervisor(raw) {
  if (!raw) return SEM_SUPERVISOR;
  const chave = normalizarRotulo(raw);
  if (chave in MAPA_NORMALIZADO) {
    return MAPA_NORMALIZADO[chave] || SEM_SUPERVISOR;
  }
  return raw.toString().trim(); // desconhecido: mantém visível p/ ser mapeado
}
