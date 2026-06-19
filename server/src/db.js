import sql from 'mssql';
import 'dotenv/config';

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // A query de relatório é pesada; damos folga p/ conexão e execução.
  connectionTimeout: 30000,
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
 */
export async function query(sqlText) {
  const pool = await getPool();
  const result = await pool.request().query(sqlText);
  return result.recordset;
}

export { sql };