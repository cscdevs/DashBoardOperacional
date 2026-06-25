import sql from 'mssql';
import 'dotenv/config';

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Conexão: timeout curto para, durante uma oscilação de rede, falhar rápido
  // e o cache resiliente servir o último dado bom (em vez de travar a tela).
  connectionTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 15000,
  // A query de relatório é pesada; damos folga só para a execução.
  requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT_MS) || 120000,
  options: {
    encrypt: String(process.env.DB_ENCRYPT).toLowerCase() === 'true',
    trustServerCertificate:
      String(process.env.DB_TRUST_SERVER_CERTIFICATE).toLowerCase() === 'true',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise = null;

/**
 * Retorna um pool de conexões reutilizável (singleton).
 * A primeira chamada abre a conexão; as demais reusam.
 */
export function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then((pool) => {
        console.log(`[db] Conectado ao SQL Server em ${config.server}:${config.port}/${config.database}`);
        return pool;
      })
      .catch((err) => {
        // Permite tentar de novo na próxima chamada
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

/**
 * Executa uma query e retorna os recordsets.
 *
 * `params` (opcional) é um objeto { nome: valor } que vira parâmetros do
 * comando (ex.: { DATAINICIAL: new Date(...) } liga o @DATAINICIAL do SQL).
 * O mssql infere o tipo a partir do valor JS.
 */
export async function query(sqlText, params = {}) {
  const pool = await getPool();
  const request = pool.request();
  for (const [nome, valor] of Object.entries(params)) {
    request.input(nome, valor);
  }
  const result = await request.query(sqlText);
  return result.recordset;
}

export { sql };