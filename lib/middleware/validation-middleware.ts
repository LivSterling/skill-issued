import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  sanitizeInput, 
  checkSqlInjection, 
  checkXssAttempt, 
  checkSuspiciousContent,
  validateSecurityEvent,
  validateRateLimit
} from '@/lib/validations/security-schemas'
import { createApiResponse } from '@/lib/validations/api-schemas'

// Types for validation middleware
export interface ValidationOptions {
  body?: z.ZodSchema
  query?: z.ZodSchema
  params?: z.ZodSchema
  headers?: z.ZodSchema
  skipSanitization?: boolean
  skipSecurityChecks?: boolean
  allowedMethods?: string[]
  requireAuth?: boolean
  requireVerification?: boolean
  rateLimit?: {
    windowMs: number
    maxAttempts: number
    identifier?: (req: NextRequest) => string
  }
}

export interface ValidationContext {
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  requestId: string
}

export interface ValidatedRequest extends NextRequest {
  validatedData: {
    body?: any
    query?: any
    params?: any
    headers?: any
  }
  context: ValidationContext
}

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Security event logging
const logSecurityEvent = async (event: {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  details: any
  context: ValidationContext
}) => {
  // In production, this would log to a security monitoring system
  console.warn('[SECURITY EVENT]', {
    timestamp: new Date().toISOString(),
    ...event
  })
}

// Rate limiting check
const checkRateLimit = (
  identifier: string, 
  windowMs: number, 
  maxAttempts: number
): { allowed: boolean; remaining: number; resetTime: number } => {
  const now = Date.now()
  const key = identifier
  const current = rateLimitStore.get(key)

  if (!current || now > current.resetTime) {
    // Reset window
    const resetTime = now + windowMs
    rateLimitStore.set(key, { count: 1, resetTime })
    return { allowed: true, remaining: maxAttempts - 1, resetTime }
  }

  if (current.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime }
  }

  // Increment count
  current.count++
  rateLimitStore.set(key, current)
  return { allowed: true, remaining: maxAttempts - current.count, resetTime: current.resetTime }
}

// Input sanitization
const sanitizeRequestData = (data: any): any => {
  if (typeof data === 'string') {
    return sanitizeInput(data, { maxLength: 10000, allowHtml: false })
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeRequestData)
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeRequestData(value)
    }
    return sanitized
  }
  
  return data
}

// Security checks
const performSecurityChecks = (data: any, context: ValidationContext): string[] => {
  const issues: string[] = []
  
  const checkValue = (value: any, path: string = '') => {
    if (typeof value === 'string') {
      if (checkSqlInjection(value)) {
        issues.push(`SQL injection attempt detected in ${path || 'input'}`)
        logSecurityEvent({
          type: 'sql_injection_attempt',
          severity: 'high',
          details: { value, path },
          context
        })
      }
      
      if (checkXssAttempt(value)) {
        issues.push(`XSS attempt detected in ${path || 'input'}`)
        logSecurityEvent({
          type: 'xss_attempt',
          severity: 'high',
          details: { value, path },
          context
        })
      }
      
      if (checkSuspiciousContent(value)) {
        issues.push(`Suspicious content detected in ${path || 'input'}`)
        logSecurityEvent({
          type: 'suspicious_content',
          severity: 'medium',
          details: { value, path },
          context
        })
      }
    }
    
    if (Array.isArray(value)) {
      value.forEach((item, index) => checkValue(item, `${path}[${index}]`))
    }
    
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, val]) => 
        checkValue(val, path ? `${path}.${key}` : key)
      )
    }
  }
  
  checkValue(data)
  return issues
}

// Extract request context
const extractContext = (req: NextRequest): ValidationContext => {
  const requestId = crypto.randomUUID()
  const ipAddress = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  
  // Extract user info from headers or session (implement based on your auth system)
  const userId = req.headers.get('x-user-id') || undefined
  const sessionId = req.headers.get('x-session-id') || undefined
  
  return {
    requestId,
    ipAddress,
    userAgent,
    userId,
    sessionId
  }
}

// Main validation middleware
export function withValidation(options: ValidationOptions = {}) {
  return function validationMiddleware(
    handler: (req: ValidatedRequest, context: ValidationContext) => Promise<NextResponse>
  ) {
    return async (req: NextRequest, routeParams?: { params: any }): Promise<NextResponse> => {
      const context = extractContext(req)
      
      try {
        // Method validation
        if (options.allowedMethods && !options.allowedMethods.includes(req.method)) {
          return NextResponse.json(
            createApiResponse(false, null, {
              code: 'METHOD_NOT_ALLOWED',
              message: `Method ${req.method} not allowed`
            }),
            { status: 405 }
          )
        }

        // Rate limiting
        if (options.rateLimit) {
          const identifier = options.rateLimit.identifier 
            ? options.rateLimit.identifier(req)
            : context.ipAddress
          
          const rateCheck = checkRateLimit(
            identifier,
            options.rateLimit.windowMs,
            options.rateLimit.maxAttempts
          )
          
          if (!rateCheck.allowed) {
            logSecurityEvent({
              type: 'rate_limit_exceeded',
              severity: 'medium',
              details: { identifier, limit: options.rateLimit.maxAttempts },
              context
            })
            
            return NextResponse.json(
              createApiResponse(false, null, {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests'
              }),
              { 
                status: 429,
                headers: {
                  'X-RateLimit-Limit': options.rateLimit.maxAttempts.toString(),
                  'X-RateLimit-Remaining': rateCheck.remaining.toString(),
                  'X-RateLimit-Reset': new Date(rateCheck.resetTime).toISOString()
                }
              }
            )
          }
        }

        // Parse request data
        let body: any = null
        let query: any = {}
        let params: any = routeParams?.params || {}
        let headers: any = {}

        // Parse body for POST/PUT/PATCH requests
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
          try {
            const contentType = req.headers.get('content-type') || ''
            
            if (contentType.includes('application/json')) {
              body = await req.json()
            } else if (contentType.includes('application/x-www-form-urlencoded')) {
              const formData = await req.formData()
              body = Object.fromEntries(formData.entries())
            }
          } catch (error) {
            return NextResponse.json(
              createApiResponse(false, null, {
                code: 'INVALID_REQUEST_BODY',
                message: 'Invalid request body format'
              }),
              { status: 400 }
            )
          }
        }

        // Parse query parameters
        const url = new URL(req.url)
        query = Object.fromEntries(url.searchParams.entries())

        // Parse headers
        req.headers.forEach((value, key) => {
          headers[key] = value
        })

        // Security checks (before sanitization to detect attacks)
        if (!options.skipSecurityChecks) {
          const securityIssues = performSecurityChecks({ body, query, params }, context)
          
          if (securityIssues.length > 0) {
            return NextResponse.json(
              createApiResponse(false, null, {
                code: 'SECURITY_VIOLATION',
                message: 'Request blocked due to security concerns',
                details: securityIssues
              }),
              { status: 400 }
            )
          }
        }

        // Sanitize input data
        if (!options.skipSanitization) {
          body = body ? sanitizeRequestData(body) : body
          query = sanitizeRequestData(query)
          params = sanitizeRequestData(params)
        }

        // Validate request data against schemas
        const validatedData: any = {}
        const validationErrors: any[] = []

        // Validate body
        if (options.body && body !== null) {
          try {
            validatedData.body = options.body.parse(body)
          } catch (error) {
            if (error instanceof z.ZodError) {
              validationErrors.push({
                field: 'body',
                issues: error.issues.map(issue => ({
                  path: issue.path.join('.'),
                  message: issue.message,
                  code: issue.code
                }))
              })
            }
          }
        }

        // Validate query parameters
        if (options.query) {
          try {
            validatedData.query = options.query.parse(query)
          } catch (error) {
            if (error instanceof z.ZodError) {
              validationErrors.push({
                field: 'query',
                issues: error.issues.map(issue => ({
                  path: issue.path.join('.'),
                  message: issue.message,
                  code: issue.code
                }))
              })
            }
          }
        }

        // Validate route parameters
        if (options.params) {
          try {
            validatedData.params = options.params.parse(params)
          } catch (error) {
            if (error instanceof z.ZodError) {
              validationErrors.push({
                field: 'params',
                issues: error.issues.map(issue => ({
                  path: issue.path.join('.'),
                  message: issue.message,
                  code: issue.code
                }))
              })
            }
          }
        }

        // Validate headers
        if (options.headers) {
          try {
            validatedData.headers = options.headers.parse(headers)
          } catch (error) {
            if (error instanceof z.ZodError) {
              validationErrors.push({
                field: 'headers',
                issues: error.issues.map(issue => ({
                  path: issue.path.join('.'),
                  message: issue.message,
                  code: issue.code
                }))
              })
            }
          }
        }

        // Return validation errors if any
        if (validationErrors.length > 0) {
          return NextResponse.json(
            createApiResponse(false, null, {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: validationErrors
            }),
            { status: 400 }
          )
        }

        // Add fallback data for non-validated fields
        if (!options.body) validatedData.body = body
        if (!options.query) validatedData.query = query
        if (!options.params) validatedData.params = params
        if (!options.headers) validatedData.headers = headers

        // Create validated request object
        const validatedReq = req as ValidatedRequest
        validatedReq.validatedData = validatedData
        validatedReq.context = context

        // Call the actual handler
        return await handler(validatedReq, context)

      } catch (error) {
        // Log unexpected errors
        logSecurityEvent({
          type: 'validation_middleware_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          context
        })

        return NextResponse.json(
          createApiResponse(false, null, {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An internal error occurred'
          }),
          { status: 500 }
        )
      }
    }
  }
}

// Convenience wrapper for common validation patterns
export const withAuthValidation = (options: Omit<ValidationOptions, 'requireAuth'> = {}) => 
  withValidation({ ...options, requireAuth: true })

export const withRateLimit = (windowMs: number, maxAttempts: number, options: ValidationOptions = {}) =>
  withValidation({ 
    ...options, 
    rateLimit: { windowMs, maxAttempts, identifier: options.rateLimit?.identifier }
  })

// Error response helpers
export const validationError = (message: string, details?: any) =>
  NextResponse.json(
    createApiResponse(false, null, {
      code: 'VALIDATION_ERROR',
      message,
      details
    }),
    { status: 400 }
  )

export const unauthorizedError = (message: string = 'Unauthorized') =>
  NextResponse.json(
    createApiResponse(false, null, {
      code: 'UNAUTHORIZED',
      message
    }),
    { status: 401 }
  )

export const forbiddenError = (message: string = 'Forbidden') =>
  NextResponse.json(
    createApiResponse(false, null, {
      code: 'FORBIDDEN',
      message
    }),
    { status: 403 }
  )

export const notFoundError = (message: string = 'Not found') =>
  NextResponse.json(
    createApiResponse(false, null, {
      code: 'NOT_FOUND',
      message
    }),
    { status: 404 }
  )

export const serverError = (message: string = 'Internal server error') =>
  NextResponse.json(
    createApiResponse(false, null, {
      code: 'INTERNAL_SERVER_ERROR',
      message
    }),
    { status: 500 }
  )
