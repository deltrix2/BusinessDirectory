import { QueryResult, Pool, PoolConfig } from 'pg'

// Database configuration with robust support for both connection strings and individual params
const dbConfig: PoolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      maxUses: 7500
    }
  : {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      maxUses: 7500
    }

// Connection pool instance
let pool: Pool | null = null

/**
 * Get a PostgreSQL connection pool
 */
export async function getPool(): Promise<Pool> {
  if (!pool) {
    console.log('Creating new database pool...')
    pool = new Pool(dbConfig)

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
      pool = null // Reset pool on error to force recreation
    })
  }
  return pool
}

/**
 * Execute a database query with timeout protection
 */
export async function executeQuery(
  query: string,
  params: any[] = [],
  timeout: number = 10000
): Promise<QueryResult> {
  const p = await getPool()
  
  // Use a race condition to enforce query timeout
  return Promise.race([
    p.query(query, params),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout')), timeout)
    )
  ])
}

/**
 * Database helper functions
 */
export const db = {
  async getOne<T = Record<string, any>>(query: string, params: any[] = []): Promise<T | null> {
    const result = await executeQuery(query, params)
    return result.rows[0] || null
  },

  async getMany<T = Record<string, any>>(query: string, params: any[] = []): Promise<T[]> {
    const result = await executeQuery(query, params)
    return result.rows
  },

  async execute(query: string, params: any[] = []): Promise<QueryResult> {
    return executeQuery(query, params)
  },

  async getCount(query: string, params: any[] = []): Promise<number> {
    const result = await executeQuery(query, params)
    return parseInt(result.rows[0]?.count || '0', 10)
  }
}
