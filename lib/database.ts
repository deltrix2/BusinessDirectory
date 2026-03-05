import { QueryResult, Pool, PoolConfig } from 'pg'

// Нова конфігурація: використовуємо DATABASE_URL, якщо він є, 
// або збираємо окремі параметри (для зворотної сумісності)
const dbConfig: PoolConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      // Налаштування для serverless (залишаємо ваші)
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      maxUses: 7500,
    }
  : {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      maxUses: 7500,
    }

// Connection pool instance
let pool: Pool | null = null

/**
 * Get a PostgreSQL connection pool
 * Creates a new pool if one doesn't exist
 */
export async function getPool(): Promise<Pool> {
  if (!pool) {
    console.log('Creating new database pool...')
    
    // Безпечне логування (без пароля)
    if (process.env.DATABASE_URL) {
        console.log('Database connecting via DATABASE_URL')
    } else {
        console.log('Database config:', {
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          user: dbConfig.user,
          ssl: dbConfig.ssl ? 'enabled' : 'disabled'
        })
    }
    
    pool = new Pool(dbConfig)
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
      pool = null
    })
    
    pool.on('connect', () => {
      console.log('Database pool connected')
    })
    
    pool.on('acquire', () => {
      console.log('Database connection acquired')
    })
    
    pool.on('release', () => {
      console.log('Database connection released')
    })
  }
  
  return pool
}

/**
 * Execute a database query with automatic connection management and timeout
 */
export async function executeQuery(query: string, params: any[] = [], timeout: number = 10000): Promise<QueryResult> {
  console.log('Executing query:', query.substring(0, 100) + '...')
  
  const pool = await getPool()
  
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.error('Database query timeout after', timeout, 'ms')
      reject(new Error('Database query timeout'))
    }, timeout)
    
    pool.query(query, params, (err, result) => {
      clearTimeout(timeoutId)
      
      if (err) {
        console.error('Database query error:', err)
        reject(err)
      } else {
        console.log('Query executed successfully, rows:', result?.rows?.length || 0)
        resolve(result)
      }
    })
  })
}

/**
 * Close the connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    console.log('Closing database pool...')
    await pool.end()
    pool = null
  }
}

/**
 * Database utility with common operations
 */
export const db = {
  async getOne<T = Record<string, any>>(query: string, params: any[] = [], timeout: number = 10000): Promise<T | null> {
    const result = await executeQuery(query, params, timeout)
    return result.rows[0] || null
  },

  async getMany<T = Record<string, any>>(query: string, params: any[] = [], timeout: number = 10000): Promise<T[]> {
    const result = await executeQuery(query, params, timeout)
    return result.rows
  },

  async execute(query: string, params: any[] = [], timeout: number = 10000): Promise<QueryResult> {
    return await executeQuery(query, params, timeout)
  },

  async getCount(query: string, params: any[] = [], timeout: number = 10000): Promise<number> {
    const result = await executeQuery(query, params, timeout)
    return parseInt(result.rows[0]?.count || '0')
  }
}

// For backward compatibility
export const getClient = getPool
export const closeConnection = closePool
