// Basic input sanitization utility
// This provides XSS protection and input cleaning without complex dependencies

// Common XSS patterns to detect and remove
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi,
  /<meta\b[^>]*>/gi,
  /<link\b[^>]*>/gi
]

// SQL injection patterns
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
  /(--|\/\*|\*\/|;)/g,
  /(\bOR\b|\bAND\b).*?[=<>]/gi
]

// Basic sanitization options
export interface SanitizationOptions {
  maxLength?: number
  allowHtml?: boolean
  stripScripts?: boolean
  encodeEntities?: boolean
}

// Default options
const DEFAULT_OPTIONS: SanitizationOptions = {
  maxLength: 1000,
  allowHtml: false,
  stripScripts: true,
  encodeEntities: true
}

// HTML entity encoding
export function encodeHtmlEntities(input: string): string {
  const entityMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  }
  
  return input.replace(/[&<>"'`=\/]/g, (char) => entityMap[char] || char)
}

// Detect XSS threats
export function detectXSSThreats(input: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(input))
}

// Detect SQL injection threats
export function detectSQLThreats(input: string): boolean {
  return SQL_PATTERNS.some(pattern => pattern.test(input))
}

// Main sanitization function
export function sanitizeInput(input: string, options: SanitizationOptions = {}): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let sanitized = input.trim()
  
  // Enforce max length
  if (opts.maxLength && sanitized.length > opts.maxLength) {
    sanitized = sanitized.substring(0, opts.maxLength)
  }
  
  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  
  // Remove XSS patterns if script stripping is enabled
  if (opts.stripScripts) {
    XSS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '')
    })
  }
  
  // Remove HTML tags if HTML is not allowed
  if (!opts.allowHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '')
  }
  
  // Encode HTML entities
  if (opts.encodeEntities) {
    sanitized = encodeHtmlEntities(sanitized)
  }
  
  return sanitized
}

// Sanitize URL
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return ''
  }
  
  // Remove dangerous protocols
  const dangerousProtocols = ['javascript:', 'vbscript:', 'data:', 'file:']
  const lowerUrl = url.toLowerCase().trim()
  
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return ''
    }
  }
  
  // Basic URL encoding of dangerous characters
  return url.replace(/[<>"']/g, (char) => {
    const entityMap: Record<string, string> = {
      '<': '%3C',
      '>': '%3E',
      '"': '%22',
      "'": '%27'
    }
    return entityMap[char] || char
  })
}

// Sanitize email
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return ''
  }
  
  return email.toLowerCase().trim().replace(/[<>"']/g, '')
}

// Security validation result
export interface SecurityValidationResult {
  isSecure: boolean
  sanitizedValue: string
  originalValue: string
  hasXSSThreats: boolean
  hasSQLThreats: boolean
  threats: string[]
}

// Comprehensive validation and sanitization
export function validateAndSanitize(input: string, options: SanitizationOptions = {}): SecurityValidationResult {
  const originalValue = input
  const hasXSSThreats = detectXSSThreats(input)
  const hasSQLThreats = detectSQLThreats(input)
  const threats: string[] = []
  
  if (hasXSSThreats) threats.push('XSS')
  if (hasSQLThreats) threats.push('SQL Injection')
  
  const sanitizedValue = sanitizeInput(input, options)
  
  return {
    isSecure: threats.length === 0,
    sanitizedValue,
    originalValue,
    hasXSSThreats,
    hasSQLThreats,
    threats
  }
}

// Utility functions for common use cases
export const SecurityUtils = {
  sanitizeInput,
  sanitizeUrl,
  sanitizeEmail,
  encodeHtmlEntities,
  detectXSSThreats,
  detectSQLThreats,
  validateAndSanitize
}