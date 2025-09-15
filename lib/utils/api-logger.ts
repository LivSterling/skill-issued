import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// LOGGING CONFIGURATION
// ============================================================================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogContext {
  requestId?: string
  userId?: string
  endpoint?: string
  method?: string
  userAgent?: string
  ip?: string
  timestamp?: string
  duration?: number
  statusCode?: number
  cacheStatus?: 'HIT' | 'MISS' | 'STALE'
  rateLimitStatus?: 'OK' | 'LIMITED' | 'EXCEEDED'
  rawgApiCalls?: number
  errors?: string[]
  warnings?: string[]
  metadata?: Record<string, any>
}

export interface ApiMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  rawgApiCalls: number
  cacheHitRate: number
  rateLimitViolations: number
  errorsByType: Record<string, number>
  endpointStats: Record<string, {
    requests: number
    averageTime: number
    errors: number
  }>
}

// ============================================================================
// LOGGER CLASS
// ============================================================================

class APILogger {
  private logLevel: LogLevel
  private metrics: ApiMetrics
  private requestLogs: LogContext[] = []
  private maxLogRetention = 1000 // Keep last 1000 requests

  constructor() {
    this.logLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG
    this.metrics = this.initializeMetrics()
  }

  private initializeMetrics(): ApiMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      rawgApiCalls: 0,
      cacheHitRate: 0,
      rateLimitViolations: 0,
      errorsByType: {},
      endpointStats: {}
    }
  }

  /**
   * Generate unique request ID
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Extract request context
   */
  extractRequestContext(request: NextRequest): Partial<LogContext> {
    const url = new URL(request.url)
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 
               request.headers.get('x-real-ip') || 
               request.ip || 
               'unknown'

    return {
      endpoint: url.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent') || 'unknown',
      ip,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Log API request start
   */
  logRequestStart(request: NextRequest, context: Partial<LogContext> = {}): LogContext {
    const requestContext: LogContext = {
      requestId: this.generateRequestId(),
      ...this.extractRequestContext(request),
      ...context
    }

    if (this.logLevel <= LogLevel.DEBUG) {
      console.log(`🚀 [${requestContext.requestId}] ${requestContext.method} ${requestContext.endpoint}`, {
        userAgent: requestContext.userAgent,
        ip: requestContext.ip,
        userId: requestContext.userId
      })
    }

    return requestContext
  }

  /**
   * Log API request completion
   */
  logRequestComplete(
    context: LogContext, 
    response: NextResponse | Response, 
    startTime: number,
    additionalContext: Partial<LogContext> = {}
  ): void {
    const duration = Date.now() - startTime
    const statusCode = response.status
    const isSuccess = statusCode >= 200 && statusCode < 400

    const completeContext: LogContext = {
      ...context,
      duration,
      statusCode,
      ...additionalContext
    }

    // Update metrics
    this.updateMetrics(completeContext, isSuccess)

    // Store log entry
    this.storeLogEntry(completeContext)

    // Console logging based on status
    if (statusCode >= 500) {
      this.logError('API Request Failed', completeContext)
    } else if (statusCode >= 400) {
      this.logWarn('API Request Warning', completeContext)
    } else if (this.logLevel <= LogLevel.INFO) {
      console.log(`✅ [${context.requestId}] ${statusCode} ${context.method} ${context.endpoint} (${duration}ms)`, {
        cacheStatus: completeContext.cacheStatus,
        rateLimitStatus: completeContext.rateLimitStatus,
        rawgApiCalls: completeContext.rawgApiCalls
      })
    }
  }

  /**
   * Log RAWG API calls
   */
  logRAWGApiCall(
    context: LogContext,
    endpoint: string,
    duration: number,
    success: boolean,
    error?: any
  ): void {
    const logData = {
      requestId: context.requestId,
      rawgEndpoint: endpoint,
      duration,
      success,
      error: error?.message || error
    }

    if (success) {
      if (this.logLevel <= LogLevel.DEBUG) {
        console.log(`🎮 [${context.requestId}] RAWG API Success: ${endpoint} (${duration}ms)`)
      }
    } else {
      this.logError('RAWG API Error', { ...context, metadata: logData })
    }

    // Update RAWG API call count
    this.metrics.rawgApiCalls++
  }

  /**
   * Log cache operations
   */
  logCacheOperation(
    context: LogContext,
    operation: 'HIT' | 'MISS' | 'SET' | 'INVALIDATE',
    key: string,
    details?: any
  ): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.log(`💾 [${context.requestId}] Cache ${operation}: ${key}`, details)
    }

    // Update cache metrics
    if (operation === 'HIT' || operation === 'MISS') {
      const totalCacheRequests = this.metrics.totalRequests
      const currentHits = this.metrics.cacheHitRate * totalCacheRequests
      const newHits = operation === 'HIT' ? currentHits + 1 : currentHits
      this.metrics.cacheHitRate = newHits / (totalCacheRequests + 1)
    }
  }

  /**
   * Log rate limiting events
   */
  logRateLimit(
    context: LogContext,
    status: 'OK' | 'LIMITED' | 'EXCEEDED',
    details: {
      limit: number
      remaining: number
      resetTime: number
      key: string
    }
  ): void {
    const logData = {
      requestId: context.requestId,
      rateLimitStatus: status,
      ...details
    }

    if (status === 'EXCEEDED') {
      this.logWarn('Rate Limit Exceeded', { ...context, metadata: logData })
      this.metrics.rateLimitViolations++
    } else if (status === 'LIMITED' && this.logLevel <= LogLevel.DEBUG) {
      console.log(`🚦 [${context.requestId}] Rate Limit: ${details.remaining}/${details.limit} remaining`)
    }
  }

  /**
   * Log validation errors
   */
  logValidationError(
    context: LogContext,
    errors: string[],
    input?: any
  ): void {
    this.logWarn('Validation Error', {
      ...context,
      errors,
      metadata: { input }
    })
  }

  /**
   * Log database operations
   */
  logDatabaseOperation(
    context: LogContext,
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT',
    table: string,
    duration: number,
    success: boolean,
    error?: any
  ): void {
    const logData = {
      operation,
      table,
      duration,
      success,
      error: error?.message || error
    }

    if (success) {
      if (this.logLevel <= LogLevel.DEBUG) {
        console.log(`🗃️ [${context.requestId}] DB ${operation} ${table} (${duration}ms)`)
      }
    } else {
      this.logError('Database Error', { ...context, metadata: logData })
    }
  }

  /**
   * Generic logging methods
   */
  logDebug(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.log(`🔍 ${message}`, context)
    }
  }

  logInfo(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log(`ℹ️ ${message}`, context)
    }
  }

  logWarn(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(`⚠️ ${message}`, context)
    }
  }

  logError(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(`❌ ${message}`, context)
    }

    // Track error types
    if (context?.errors) {
      context.errors.forEach(error => {
        this.metrics.errorsByType[error] = (this.metrics.errorsByType[error] || 0) + 1
      })
    }
  }

  logFatal(message: string, context?: LogContext): void {
    console.error(`💀 FATAL: ${message}`, context)
  }

  /**
   * Update internal metrics
   */
  private updateMetrics(context: LogContext, isSuccess: boolean): void {
    this.metrics.totalRequests++
    
    if (isSuccess) {
      this.metrics.successfulRequests++
    } else {
      this.metrics.failedRequests++
    }

    // Update average response time
    if (context.duration) {
      const totalTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1)
      this.metrics.averageResponseTime = (totalTime + context.duration) / this.metrics.totalRequests
    }

    // Update endpoint stats
    if (context.endpoint) {
      const endpointKey = `${context.method} ${context.endpoint}`
      const stats = this.metrics.endpointStats[endpointKey] || { requests: 0, averageTime: 0, errors: 0 }
      
      stats.requests++
      if (context.duration) {
        stats.averageTime = ((stats.averageTime * (stats.requests - 1)) + context.duration) / stats.requests
      }
      if (!isSuccess) {
        stats.errors++
      }
      
      this.metrics.endpointStats[endpointKey] = stats
    }
  }

  /**
   * Store log entry (with rotation)
   */
  private storeLogEntry(context: LogContext): void {
    this.requestLogs.push(context)
    
    // Rotate logs if needed
    if (this.requestLogs.length > this.maxLogRetention) {
      this.requestLogs = this.requestLogs.slice(-this.maxLogRetention)
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): ApiMetrics {
    return { ...this.metrics }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 100): LogContext[] {
    return this.requestLogs.slice(-limit)
  }

  /**
   * Get logs for specific request ID
   */
  getRequestLogs(requestId: string): LogContext[] {
    return this.requestLogs.filter(log => log.requestId === requestId)
  }

  /**
   * Get error summary
   */
  getErrorSummary(): {
    totalErrors: number
    errorsByType: Record<string, number>
    recentErrors: LogContext[]
  } {
    const recentErrors = this.requestLogs
      .filter(log => log.statusCode && log.statusCode >= 400)
      .slice(-50)

    return {
      totalErrors: this.metrics.failedRequests,
      errorsByType: this.metrics.errorsByType,
      recentErrors
    }
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics()
    this.requestLogs = []
  }

  /**
   * Export logs for external monitoring
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify({
        metrics: this.metrics,
        recentLogs: this.requestLogs.slice(-100)
      }, null, 2)
    }
    
    // CSV format
    const headers = ['timestamp', 'requestId', 'method', 'endpoint', 'statusCode', 'duration', 'cacheStatus', 'rateLimitStatus']
    const csvRows = [
      headers.join(','),
      ...this.requestLogs.slice(-100).map(log => 
        headers.map(header => log[header as keyof LogContext] || '').join(',')
      )
    ]
    
    return csvRows.join('\n')
  }
}

// ============================================================================
// MIDDLEWARE FUNCTION
// ============================================================================

/**
 * API logging middleware
 */
export function createLoggingMiddleware(logger: APILogger = apiLogger) {
  return (request: NextRequest) => {
    const startTime = Date.now()
    const context = logger.logRequestStart(request)

    return {
      context,
      complete: (response: NextResponse | Response, additionalContext?: Partial<LogContext>) => {
        logger.logRequestComplete(context, response, startTime, additionalContext)
      }
    }
  }
}

// ============================================================================
// MONITORING UTILITIES
// ============================================================================

/**
 * Health check for API monitoring
 */
export function getHealthStatus(): {
  status: 'healthy' | 'degraded' | 'unhealthy'
  metrics: ApiMetrics
  checks: Record<string, boolean>
} {
  const metrics = apiLogger.getMetrics()
  const errorRate = metrics.totalRequests > 0 ? metrics.failedRequests / metrics.totalRequests : 0
  const recentErrors = apiLogger.getRecentLogs(100).filter(log => 
    log.statusCode && log.statusCode >= 500 && 
    Date.now() - new Date(log.timestamp!).getTime() < 5 * 60 * 1000 // Last 5 minutes
  )

  const checks = {
    errorRateOk: errorRate < 0.1, // Less than 10% error rate
    responseTimeOk: metrics.averageResponseTime < 5000, // Less than 5 seconds
    noRecentFatalErrors: recentErrors.length === 0,
    rateLimitHealthy: metrics.rateLimitViolations < 10 // Less than 10 violations
  }

  const healthyChecks = Object.values(checks).filter(Boolean).length
  const totalChecks = Object.values(checks).length

  let status: 'healthy' | 'degraded' | 'unhealthy'
  if (healthyChecks === totalChecks) {
    status = 'healthy'
  } else if (healthyChecks >= totalChecks * 0.7) {
    status = 'degraded'
  } else {
    status = 'unhealthy'
  }

  return { status, metrics, checks }
}

/**
 * Performance monitoring
 */
export function getPerformanceReport(): {
  slowestEndpoints: Array<{endpoint: string, averageTime: number, requests: number}>
  errorProneEndpoints: Array<{endpoint: string, errorRate: number, requests: number}>
  cacheEfficiency: number
  rawgApiUsage: number
} {
  const metrics = apiLogger.getMetrics()
  
  const endpointEntries = Object.entries(metrics.endpointStats)
  
  const slowestEndpoints = endpointEntries
    .map(([endpoint, stats]) => ({
      endpoint,
      averageTime: stats.averageTime,
      requests: stats.requests
    }))
    .sort((a, b) => b.averageTime - a.averageTime)
    .slice(0, 10)

  const errorProneEndpoints = endpointEntries
    .map(([endpoint, stats]) => ({
      endpoint,
      errorRate: stats.requests > 0 ? stats.errors / stats.requests : 0,
      requests: stats.requests
    }))
    .filter(item => item.errorRate > 0)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 10)

  return {
    slowestEndpoints,
    errorProneEndpoints,
    cacheEfficiency: metrics.cacheHitRate,
    rawgApiUsage: metrics.rawgApiCalls
  }
}

// ============================================================================
// GLOBAL LOGGER INSTANCE
// ============================================================================

export const apiLogger = new APILogger()

// ============================================================================
// EXPORTS
// ============================================================================

export const logging = {
  // Core logger
  logger: apiLogger,
  
  // Middleware
  createLoggingMiddleware,
  
  // Monitoring
  getHealthStatus,
  getPerformanceReport,
  
  // Log levels
  LogLevel
} as const

// Export types separately
export type { LogContext, ApiMetrics }
