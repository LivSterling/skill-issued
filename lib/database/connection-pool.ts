import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Connection pool configuration
interface PoolConfig {
  maxConnections: number
  idleTimeout: number
  connectionTimeout: number
  retryAttempts: number
  retryDelay: number
}

const defaultPoolConfig: PoolConfig = {
  maxConnections: 10,
  idleTimeout: 30000, // 30 seconds
  connectionTimeout: 10000, // 10 seconds
  retryAttempts: 3,
  retryDelay: 1000 // 1 second
}

// Connection pool class
class DatabaseConnectionPool {
  private static instance: DatabaseConnectionPool | null = null
  private connections: Map<string, any> = new Map()
  private connectionCount = 0
  private config: PoolConfig

  private constructor(config: Partial<PoolConfig> = {}) {
    this.config = { ...defaultPoolConfig, ...config }
  }

  static getInstance(config?: Partial<PoolConfig>): DatabaseConnectionPool {
    if (!DatabaseConnectionPool.instance) {
      DatabaseConnectionPool.instance = new DatabaseConnectionPool(config)
    }
    return DatabaseConnectionPool.instance
  }

  // Get optimized Supabase client with connection pooling
  getClient(options: {
    userId?: string
    operation?: 'read' | 'write' | 'admin'
    priority?: 'high' | 'normal' | 'low'
  } = {}): ReturnType<typeof createClient<Database>> {
    const { userId, operation = 'read', priority = 'normal' } = options
    
    // Create connection key based on operation type and user
    const connectionKey = `${operation}-${userId || 'anonymous'}-${priority}`
    
    // Check if we have an existing connection
    if (this.connections.has(connectionKey)) {
      const connection = this.connections.get(connectionKey)
      if (this.isConnectionValid(connection)) {
        return connection.client
      } else {
        // Remove invalid connection
        this.connections.delete(connectionKey)
        this.connectionCount--
      }
    }

    // Create new connection if under limit
    if (this.connectionCount < this.config.maxConnections) {
      const client = this.createOptimizedClient(operation)
      const connection = {
        client,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        operation,
        userId,
        priority
      }
      
      this.connections.set(connectionKey, connection)
      this.connectionCount++
      
      // Set cleanup timer
      this.scheduleCleanup(connectionKey)
      
      return client
    }

    // If at connection limit, find least recently used connection to replace
    const lruKey = this.findLeastRecentlyUsed()
    if (lruKey) {
      this.connections.delete(lruKey)
      this.connectionCount--
    }

    // Create new connection
    const client = this.createOptimizedClient(operation)
    const connection = {
      client,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      operation,
      userId,
      priority
    }
    
    this.connections.set(connectionKey, connection)
    this.connectionCount++
    this.scheduleCleanup(connectionKey)
    
    return client
  }

  private createOptimizedClient(operation: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = operation === 'admin' 
      ? process.env.SUPABASE_SERVICE_ROLE_KEY! 
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    return createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: operation !== 'admin',
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'X-Client-Info': `skill-issued-${operation}`
        }
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  }

  private isConnectionValid(connection: any): boolean {
    const now = Date.now()
    const age = now - connection.createdAt
    const idle = now - connection.lastUsed
    
    return age < this.config.connectionTimeout && idle < this.config.idleTimeout
  }

  private findLeastRecentlyUsed(): string | null {
    let lruKey: string | null = null
    let oldestTime = Date.now()
    
    for (const [key, connection] of this.connections) {
      if (connection.lastUsed < oldestTime && connection.priority !== 'high') {
        oldestTime = connection.lastUsed
        lruKey = key
      }
    }
    
    return lruKey
  }

  private scheduleCleanup(connectionKey: string) {
    setTimeout(() => {
      const connection = this.connections.get(connectionKey)
      if (connection && !this.isConnectionValid(connection)) {
        this.connections.delete(connectionKey)
        this.connectionCount--
      }
    }, this.config.idleTimeout)
  }

  // Clean up expired connections
  cleanup() {
    const toRemove: string[] = []
    
    for (const [key, connection] of this.connections) {
      if (!this.isConnectionValid(connection)) {
        toRemove.push(key)
      }
    }
    
    toRemove.forEach(key => {
      this.connections.delete(key)
      this.connectionCount--
    })
    
    return toRemove.length
  }

  // Get pool statistics
  getStats() {
    return {
      totalConnections: this.connectionCount,
      maxConnections: this.config.maxConnections,
      activeConnections: this.connections.size,
      utilization: (this.connectionCount / this.config.maxConnections) * 100,
      connectionsByType: this.getConnectionsByType()
    }
  }

  private getConnectionsByType() {
    const stats = { read: 0, write: 0, admin: 0 }
    
    for (const connection of this.connections.values()) {
      stats[connection.operation as keyof typeof stats]++
    }
    
    return stats
  }

  // Graceful shutdown
  async shutdown() {
    this.connections.clear()
    this.connectionCount = 0
    DatabaseConnectionPool.instance = null
  }
}

// Singleton instance
export const dbPool = DatabaseConnectionPool.getInstance({
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000')
})

// Utility functions for common operations
export function getReadClient(userId?: string) {
  return dbPool.getClient({ userId, operation: 'read', priority: 'normal' })
}

export function getWriteClient(userId?: string) {
  return dbPool.getClient({ userId, operation: 'write', priority: 'high' })
}

export function getAdminClient() {
  return dbPool.getClient({ operation: 'admin', priority: 'high' })
}

// Query optimization helpers
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      // Exponential backoff
      const backoffDelay = delay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, backoffDelay))
    }
  }

  throw lastError!
}

// Batch operation helper
export async function executeBatch<T>(
  operations: (() => Promise<T>)[],
  batchSize = 5
): Promise<T[]> {
  const results: T[] = []
  
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(op => executeWithRetry(op))
    )
    results.push(...batchResults)
  }
  
  return results
}

// Connection health check
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  details: any
}> {
  try {
    const client = getReadClient()
    const start = Date.now()
    
    // Simple query to test connection
    const { data, error } = await client
      .from('profiles')
      .select('id')
      .limit(1)
    
    const responseTime = Date.now() - start
    const poolStats = dbPool.getStats()
    
    if (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          responseTime,
          poolStats
        }
      }
    }
    
    const status = responseTime > 5000 || poolStats.utilization > 90 
      ? 'degraded' 
      : 'healthy'
    
    return {
      status,
      details: {
        responseTime,
        poolStats,
        timestamp: new Date().toISOString()
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

// Cleanup interval - run every 5 minutes
if (typeof window === 'undefined') { // Only run on server
  setInterval(() => {
    const cleaned = dbPool.cleanup()
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired database connections`)
    }
  }, 5 * 60 * 1000)
}
