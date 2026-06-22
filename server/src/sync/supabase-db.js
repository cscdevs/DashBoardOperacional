/**
 * Pool de conexão com o Postgres do Supabase (nuvem).
 *
 * Usado tanto pelo MOTOR (que GRAVA o snapshot) quanto pelo BACKEND no VPS
 * (que LÊ o relatório). A string de conexão vem de SUPABASE_DB_URL no .env
 * (Settings → Database → Connection string, no painel do Supabase).
 */
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!pool) {
    // Supabase exige TLS. rejectUnauthorized:false evita erro de cadeia de
    // certificado no pooler; o tráfego continua criptografado.
    const ssl = { rejectUnauthorized: false };
    const max = Number(process.env.SUPABASE_POOL_MAX) || 5;
    const idleTimeoutMillis = 30000;

    if (process.env.SUPABASE_DB_URL) {
      pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL, ssl, max, idleTimeoutMillis });
    } else if (process.env.SUPABASE_DB_HOST) {
      // Campos separados — robusto p/ senhas com caracteres especiais.
      pool = new Pool({
        host: process.env.SUPABASE_DB_HOST,
        port: Number(process.env.SUPABASE_DB_PORT) || 5432,
        user: process.env.SUPABASE_DB_USER,
        password: process.env.SUPABASE_DB_PASSWORD,
        database: process.env.SUPABASE_DB_NAME || 'postgres',
        ssl,
        max,
        idleTimeoutMillis,
      });
    } else {
      throw new Error('Defina SUPABASE_DB_URL ou SUPABASE_DB_HOST/USER/PASSWORD no .env');
    }
  }
  return pool;
}

export async function query(text, params) {
  return getPool().query(text, params);
}
