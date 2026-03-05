import { QueryResult, Pool, PoolConfig } from 'pg'

// Database configuration
const dbConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },

  // оптимально для serverless
  max: 3,
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

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined')
    }

    console.log('Database connecting via DATABASE_URL')

    pool = new Pool(dbConfig)

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
      pool = null
    })

    pool.on('connect', () => {
      console.log('Database pool connected')
    })
  }

  return pool
}

/**
 * Execute a database query
 */
export async function executeQuery(
  query: string,
  params: any[] = [],
  timeout: number = 10000
): Promise<QueryResult> {

  const pool = await getPool()

  return new Promise((resolve, reject) => {

    const timeoutId = setTimeout(() => {
      console.error('Database query timeout after', timeout, 'ms')
      reject(new Error('Database query timeout'))
    }, timeout)

    pool.query(query, params)
      .then(result => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch(err => {
        clearTimeout(timeoutId)
        console.error('Database query error:', err)
        reject(err)
      })
  })
}

/**
 * Close pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    console.log('Closing database pool...')
    await pool.end()
    pool = null
  }
}

/**
 * Database helper functions
 */
export const db = {

  async getOne<T = Record<string, any>>(
    query: string,
    params: any[] = [],
    timeout: number = 10000
  ): Promise<T | null> {

    const result = await executeQuery(query, params, timeout)
    return result.rows[0] || null
  },

  async getMany<T = Record<string, any>>(
    query: string,
    params: any[] = [],
    timeout: number = 10000
  ): Promise<T[]> {

    const result = await executeQuery(query, params, timeout)
    return result.rows
  },

  async execute(
    query: string,
    params: any[] = [],
    timeout: number = 10000
  ): Promise<QueryResult> {

    return executeQuery(query, params, timeout)
  },

  async getCount(
    query: string,
    params: any[] = [],
    timeout: number = 10000
  ): Promise<number> {

    const result = await executeQuery(query, params, timeout)
    return parseInt(result.rows[0]?.count || '0')
  }
}

// backward compatibility
export const getClient = getPool
export const closeConnection = closePool
