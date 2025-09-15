import { NextRequest, NextResponse } from 'next/server'
import { 
  sanitizeInput, 
  sanitizeHtml, 
  sanitizeUrl, 
  sanitizeEmail,
  sanitizeFilename,
  sanitizeObject,
  detectThreats,
  validateAndSanitize,
  createCSPHeader,
  generateCSPNonce,
  SanitizationOptions,
  ThreatDetectionResult
} from '@/lib/security/sanitization'

// XSS Protection configuration
export interface XSSProtectionConfig {
  // Global settings
  enabled: boolean
  blockMode: boolean // true = block, false = sanitize
  reportUri?: string
  
  // Content Security Policy
  csp: {
    enabled: boolean
    reportOnly: boolean
    nonce: boolean
    directives?: Record<string, string[]>
  }
  
  // Input sanitization
  sanitization: {
    enabled: boolean
    strictMode: boolean
    customOptions?: Record<string, SanitizationOptions>
  }
  
  // Threat detection
  detection: {
    enabled: boolean
    logThreats: boolean
    blockOnThreat: boolean
    customPatterns?: RegExp[]
  }
  
  // Response headers
  headers: {
    xssProtection: boolean
    contentTypeOptions: boolean
    frameOptions: boolean
    referrerPolicy: boolean
  }
}

// Default XSS protection configuration
const DEFAULT_CONFIG: XSSProtectionConfig = {
  enabled: true,
  blockMode: false,
  
  csp: {
    enabled: true,
    reportOnly: false,
    nonce: true
  },
  
  sanitization: {
    enabled: true,
    strictMode: false
  },
  
  detection: {
    enabled: true,
    logThreats: true,
    blockOnThreat: true
  },
  
  headers: {
    xssProtection: true,
    contentTypeOptions: true,
    frameOptions: true,
    referrerPolicy: true
  }
}

// XSS attack attempt logging
interface XSSAttempt {
  timestamp: string
  ip: string
  userAgent: string
  url: string
  method: string
  threats: ThreatDetectionResult['threats']
  blocked: boolean
  sanitized: boolean
}

// In-memory store for XSS attempts (use Redis in production)
const xssAttempts: XSSAttempt[] = []
const MAX_STORED_ATTEMPTS = 1000

function logXSSAttempt(attempt: XSSAttempt) {
  xssAttempts.push(attempt)
  
  // Keep only recent attempts
  if (xssAttempts.length > MAX_STORED_ATTEMPTS) {
    xssAttempts.splice(0, xssAttempts.length - MAX_STORED_ATTEMPTS)
  }
  
  // Log to console (in production, use proper logging service)
  console.warn('[XSS PROTECTION]', {
    severity: 'HIGH',
    type: 'XSS_ATTEMPT_DETECTED',
    ...attempt
  })
}

// Sanitize request data recursively
function sanitizeRequestData(
  data: any, 
  config: XSSProtectionConfig,
  path: string = ''
): { sanitized: any; threats: ThreatDetectionResult['threats'] } {
  const allThreats: ThreatDetectionResult['threats'] = []
  
  if (typeof data === 'string') {
    const options = config.sanitization.customOptions?.[path] || {
      allowHtml: false,
      stripScripts: true,
      stripEvents: true,
      encodeHtmlEntities: true
    }
    
    const result = validateAndSanitize(data, options)
    allThreats.push(...result.threats)
    
    return {
      sanitized: result.sanitized,
      threats: allThreats
    }
  }
  
  if (Array.isArray(data)) {
    const sanitizedArray: any[] = []
    
    data.forEach((item, index) => {
      const result = sanitizeRequestData(item, config, `${path}[${index}]`)
      sanitizedArray.push(result.sanitized)
      allThreats.push(...result.threats)
    })
    
    return {
      sanitized: sanitizedArray,
      threats: allThreats
    }
  }
  
  if (data && typeof data === 'object') {
    const sanitizedObject: any = {}
    
    Object.entries(data).forEach(([key, value]) => {
      const fieldPath = path ? `${path}.${key}` : key
      const result = sanitizeRequestData(value, config, fieldPath)
      sanitizedObject[key] = result.sanitized
      allThreats.push(...result.threats)
    })
    
    return {
      sanitized: sanitizedObject,
      threats: allThreats
    }
  }
  
  return {
    sanitized: data,
    threats: allThreats
  }
}

// Add security headers to response
function addSecurityHeaders(response: NextResponse, config: XSSProtectionConfig, nonce?: string): NextResponse {
  if (!config.headers) return response
  
  // X-XSS-Protection header
  if (config.headers.xssProtection) {
    response.headers.set('X-XSS-Protection', config.blockMode ? '1; mode=block' : '1')
  }
  
  // X-Content-Type-Options header
  if (config.headers.contentTypeOptions) {
    response.headers.set('X-Content-Type-Options', 'nosniff')
  }
  
  // X-Frame-Options header
  if (config.headers.frameOptions) {
    response.headers.set('X-Frame-Options', 'DENY')
  }
  
  // Referrer-Policy header
  if (config.headers.referrerPolicy) {
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  }
  
  // Content Security Policy
  if (config.csp.enabled) {
    const cspHeader = createCSPHeader(nonce)
    const headerName = config.csp.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy'
    response.headers.set(headerName, cspHeader)
  }
  
  // Additional security headers
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  
  return response
}

// Create XSS protection middleware
export function withXSSProtection(config: Partial<XSSProtectionConfig> = {}) {
  const fullConfig: XSSProtectionConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    csp: { ...DEFAULT_CONFIG.csp, ...config.csp },
    sanitization: { ...DEFAULT_CONFIG.sanitization, ...config.sanitization },
    detection: { ...DEFAULT_CONFIG.detection, ...config.detection },
    headers: { ...DEFAULT_CONFIG.headers, ...config.headers }
  }
  
  return function xssProtectionMiddleware(
    handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
  ) {
    return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
      // Skip if XSS protection is disabled
      if (!fullConfig.enabled) {
        return handler(req, ...args)
      }
      
      const startTime = Date.now()
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      const userAgent = req.headers.get('user-agent') || 'unknown'
      
      try {
        // Generate CSP nonce if enabled
        const nonce = fullConfig.csp.nonce ? generateCSPNonce() : undefined
        
        // Parse and sanitize request data
        let sanitizedBody: any = null
        let sanitizedQuery: any = {}
        let allThreats: ThreatDetectionResult['threats'] = []
        
        // Handle request body
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
          try {
            const contentType = req.headers.get('content-type') || ''
            
            if (contentType.includes('application/json')) {
              const body = await req.json()
              
              if (fullConfig.sanitization.enabled) {
                const result = sanitizeRequestData(body, fullConfig, 'body')
                sanitizedBody = result.sanitized
                allThreats.push(...result.threats)
              } else {
                sanitizedBody = body
              }
            } else if (contentType.includes('application/x-www-form-urlencoded')) {
              const formData = await req.formData()
              const body = Object.fromEntries(formData.entries())
              
              if (fullConfig.sanitization.enabled) {
                const result = sanitizeRequestData(body, fullConfig, 'body')
                sanitizedBody = result.sanitized
                allThreats.push(...result.threats)
              } else {
                sanitizedBody = body
              }
            }
          } catch (error) {
            // Invalid request body - let the handler deal with it
          }
        }
        
        // Handle query parameters
        const url = new URL(req.url)
        const query = Object.fromEntries(url.searchParams.entries())
        
        if (fullConfig.sanitization.enabled && Object.keys(query).length > 0) {
          const result = sanitizeRequestData(query, fullConfig, 'query')
          sanitizedQuery = result.sanitized
          allThreats.push(...result.threats)
        } else {
          sanitizedQuery = query
        }
        
        // Check for threats
        if (fullConfig.detection.enabled && allThreats.length > 0) {
          const xssAttempt: XSSAttempt = {
            timestamp: new Date().toISOString(),
            ip,
            userAgent,
            url: req.url,
            method: req.method,
            threats: allThreats,
            blocked: fullConfig.detection.blockOnThreat,
            sanitized: fullConfig.sanitization.enabled
          }
          
          if (fullConfig.detection.logThreats) {
            logXSSAttempt(xssAttempt)
          }
          
          // Block request if configured to do so
          if (fullConfig.detection.blockOnThreat && fullConfig.blockMode) {
            const response = NextResponse.json({
              error: 'Request blocked due to security policy violation',
              code: 'XSS_PROTECTION_TRIGGERED',
              timestamp: new Date().toISOString()
            }, { status: 400 })
            
            return addSecurityHeaders(response, fullConfig, nonce)
          }
        }
        
        // Create new request with sanitized data
        let modifiedRequest = req
        
        if (fullConfig.sanitization.enabled) {
          // Create new URL with sanitized query parameters
          const newUrl = new URL(req.url)
          newUrl.search = new URLSearchParams(sanitizedQuery).toString()
          
          // Create new request with sanitized data
          const requestInit: RequestInit = {
            method: req.method,
            headers: req.headers,
          }
          
          if (sanitizedBody !== null) {
            requestInit.body = JSON.stringify(sanitizedBody)
          }
          
          modifiedRequest = new NextRequest(newUrl.toString(), requestInit)
          
          // Add sanitized data as custom properties
          ;(modifiedRequest as any).sanitizedBody = sanitizedBody
          ;(modifiedRequest as any).sanitizedQuery = sanitizedQuery
        }
        
        // Call the original handler
        const response = await handler(modifiedRequest, ...args)
        
        // Add security headers to response
        const secureResponse = addSecurityHeaders(response, fullConfig, nonce)
        
        // Add CSP nonce to response if needed
        if (nonce) {
          secureResponse.headers.set('X-CSP-Nonce', nonce)
        }
        
        // Add processing time header for monitoring
        const processingTime = Date.now() - startTime
        secureResponse.headers.set('X-XSS-Protection-Time', `${processingTime}ms`)
        
        return secureResponse
        
      } catch (error) {
        console.error('[XSS PROTECTION] Middleware error:', error)
        
        // Return original handler result on error
        const response = await handler(req, ...args)
        return addSecurityHeaders(response, fullConfig)
      }
    }
  }
}

// Convenience functions for common XSS protection scenarios
export const withStrictXSSProtection = () => withXSSProtection({
  blockMode: true,
  sanitization: { enabled: true, strictMode: true },
  detection: { enabled: true, blockOnThreat: true },
  csp: { enabled: true, reportOnly: false }
})

export const withLenientXSSProtection = () => withXSSProtection({
  blockMode: false,
  sanitization: { enabled: true, strictMode: false },
  detection: { enabled: true, blockOnThreat: false },
  csp: { enabled: true, reportOnly: true }
})

export const withCSPOnly = () => withXSSProtection({
  sanitization: { enabled: false },
  detection: { enabled: false },
  csp: { enabled: true, reportOnly: false }
})

// Utility functions for manual sanitization
export function sanitizeUserInput(input: string, options?: SanitizationOptions): string {
  return sanitizeInput(input, {
    allowHtml: false,
    stripScripts: true,
    stripEvents: true,
    encodeHtmlEntities: true,
    ...options
  })
}

export function sanitizeUserHtml(html: string, options?: SanitizationOptions): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'b', 'i'],
    allowedAttributes: [],
    stripScripts: true,
    stripEvents: true,
    ...options
  })
}

export function sanitizeUserUrl(url: string): string {
  return sanitizeUrl(url)
}

export function sanitizeUserEmail(email: string): string {
  return sanitizeEmail(email)
}

export function sanitizeUserFilename(filename: string): string {
  return sanitizeFilename(filename)
}

// Get XSS protection statistics
export function getXSSProtectionStats(): {
  totalAttempts: number
  recentAttempts: XSSAttempt[]
  threatsByType: Record<string, number>
  blockedAttempts: number
  sanitizedAttempts: number
} {
  const now = Date.now()
  const oneHourAgo = now - (60 * 60 * 1000)
  
  const recentAttempts = xssAttempts.filter(
    attempt => new Date(attempt.timestamp).getTime() > oneHourAgo
  )
  
  const threatsByType: Record<string, number> = {}
  let blockedAttempts = 0
  let sanitizedAttempts = 0
  
  xssAttempts.forEach(attempt => {
    attempt.threats.forEach(threat => {
      threatsByType[threat.type] = (threatsByType[threat.type] || 0) + 1
    })
    
    if (attempt.blocked) blockedAttempts++
    if (attempt.sanitized) sanitizedAttempts++
  })
  
  return {
    totalAttempts: xssAttempts.length,
    recentAttempts,
    threatsByType,
    blockedAttempts,
    sanitizedAttempts
  }
}

// Export types and utilities
export type { XSSProtectionConfig, XSSAttempt }
export { 
  sanitizeInput, 
  sanitizeHtml, 
  sanitizeUrl, 
  sanitizeEmail, 
  sanitizeFilename,
  sanitizeObject,
  detectThreats,
  validateAndSanitize
}
