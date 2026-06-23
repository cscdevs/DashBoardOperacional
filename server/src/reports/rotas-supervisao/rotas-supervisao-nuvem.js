/**
 * Leitura do relatório de Rotas de Supervisão a partir do Supabase (nuvem).
 *
 * Usado pelo backend no VPS (DATA_SOURCE=supabase). Devolve exatamente o mesmo
 * formato de `buscarRotas` (do SQL Server), então o frontend não muda.
 */
import { query } from '../../sync/supabase-db.js';
import { validarCoordenada } from '../../geo/coordenadas.js';

export async function buscarRotasDaNuvem() {
  const { rows } = await query(
    `SELECT empresa, base_operacional, cod_cliente, cliente, cliente_resumido,
            cod_local, local, local_resumido, uf, localidade, bairro, logradouro,
            numero, complemento, ponto_referencia, zona, cep, endereco_completo,
            telefone, email, contato_operacional, area_supervisao, supervisor,
            supervisor_nome, lat, lng, coordenada_precisa, coordenada_aproximada
       FROM rotas_supervisao
       ORDER BY id`
  );

  return rows.map((row, idx) => {
    const coordinates =
      row.lat != null && row.lng != null ? [Number(row.lat), Number(row.lng)] : null;
    const { suspeita, distanciaKm } =
      coordinates && row.coordenada_precisa
        ? validarCoordenada(coordinates, row.localidade, row.uf)
        : { suspeita: false, distanciaKm: null };
    return {
    id: idx + 1,
    empresa: row.empresa,
    baseOperacional: row.base_operacional,
    codCliente: row.cod_cliente,
    cliente: row.cliente,
    clienteResumido: row.cliente_resumido,
    codLocal: row.cod_local,
    local: row.local,
    localResumido: row.local_resumido,
    uf: row.uf,
    localidade: row.localidade,
    bairro: row.bairro,
    logradouro: row.logradouro,
    numero: row.numero,
    complemento: row.complemento,
    pontoReferencia: row.ponto_referencia,
    zona: row.zona,
    cep: row.cep,
    enderecoCompleto: row.endereco_completo,
    telefone: row.telefone,
    email: row.email,
    contatoOperacional: row.contato_operacional,
    areaSupervisao: row.area_supervisao,
    supervisor: row.supervisor,
    supervisorNome: row.supervisor_nome,
    coordinates,
    coordenadaPrecisa: row.coordenada_precisa,
    coordenadaAproximada: row.coordenada_aproximada,
    coordenadaSuspeita: suspeita,
    distanciaCidadeKm: distanciaKm,
    };
  });
}
