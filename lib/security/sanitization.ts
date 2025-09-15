import DOMPurify from 'isomorphic-dompurify'

// XSS attack patterns - comprehensive list of dangerous patterns
const XSS_PATTERNS = [
  // Script tags
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<script[^>]*>.*?<\/script>/gi,
  
  // Event handlers
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /on\w+\s*=\s*[^>\s]+/gi,
  
  // JavaScript URLs
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  
  // Dangerous tags
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi,
  /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
  /<input\b[^>]*>/gi,
  /<textarea\b[^<]*(?:(?!<\/textarea>)<[^<]*)*<\/textarea>/gi,
  /<select\b[^<]*(?:(?!<\/select>)<[^<]*)*<\/select>/gi,
  
  // Meta and link tags
  /<meta\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  
  // Expression and import
  /expression\s*\(/gi,
  /@import/gi,
  
  // Data URLs with scripts
  /data\s*:\s*[^,]*script/gi,
  
  // SVG with scripts
  /<svg[^>]*>[\s\S]*?<script[\s\S]*?<\/svg>/gi,
  
  // HTML entities that could be dangerous
  /&\#x?[0-9a-f]+;?/gi
]

// SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  // Common SQL keywords
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
  
  // SQL operators and syntax
  /(--|\/\*|\*\/|;|'|"|`)/g,
  /(\bOR\b|\bAND\b).*?[=<>]/gi,
  
  // SQL functions
  /\b(CONCAT|SUBSTRING|ASCII|CHAR|NCHAR|UNICODE|NVARCHAR|VARCHAR)\s*\(/gi,
  
  // Database-specific patterns
  /\b(xp_|sp_|fn_|sys\.)/gi,
  
  // Union-based injection
  /UNION\s+(ALL\s+)?SELECT/gi,
  
  // Boolean-based injection
  /\b(TRUE|FALSE)\b.*?[=<>]/gi,
  
  // Time-based injection
  /\b(WAITFOR|DELAY|SLEEP|BENCHMARK)\s*\(/gi
]

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.[\/\\]/g,
  /\.\.[%2F%5C]/gi,
  /%2e%2e[%2F%5C]/gi,
  /\.\.[\x2f\x5c]/g,
  /[\/\\]\.\.[\x2f\x5c]/g
]

// Command injection patterns
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$(){}[\]]/g,
  /\b(eval|exec|system|shell_exec|passthru|popen|proc_open)\s*\(/gi,
  /\b(cmd|powershell|bash|sh|zsh)\b/gi
]

// LDAP injection patterns
const LDAP_INJECTION_PATTERNS = [
  /[()&|!*]/g,
  /\x00/g
]

// NoSQL injection patterns
const NOSQL_INJECTION_PATTERNS = [
  /\$where/gi,
  /\$ne/gi,
  /\$gt/gi,
  /\$lt/gi,
  /\$regex/gi,
  /\$or/gi,
  /\$and/gi
]

// Sanitization options interface
export interface SanitizationOptions {
  // Basic options
  maxLength?: number
  allowHtml?: boolean
  allowUrls?: boolean
  allowEmails?: boolean
  
  // HTML options
  allowedTags?: string[]
  allowedAttributes?: string[]
  allowedSchemes?: string[]
  
  // Security options
  stripScripts?: boolean
  stripEvents?: boolean
  stripStyles?: boolean
  stripComments?: boolean
  
  // Encoding options
  encodeHtmlEntities?: boolean
  normalizeWhitespace?: boolean
  trimWhitespace?: boolean
  
  // Custom patterns
  customPatterns?: RegExp[]
  replacementChar?: string
}

// Default sanitization options
const DEFAULT_OPTIONS: SanitizationOptions = {
  maxLength: 10000,
  allowHtml: false,
  allowUrls: true,
  allowEmails: true,
  allowedTags: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
  allowedAttributes: [],
  allowedSchemes: ['http', 'https', 'mailto'],
  stripScripts: true,
  stripEvents: true,
  stripStyles: true,
  stripComments: true,
  encodeHtmlEntities: true,
  normalizeWhitespace: true,
  trimWhitespace: true,
  replacementChar: ''
}

// Security threat detection result
export interface ThreatDetectionResult {
  isSafe: boolean
  threats: Array<{
    type: 'xss' | 'sql_injection' | 'path_traversal' | 'command_injection' | 'ldap_injection' | 'nosql_injection' | 'custom'
    pattern: string
    matches: string[]
    severity: 'low' | 'medium' | 'high' | 'critical'
  }>
  sanitizedContent?: string
}

// Detect security threats in input
export function detectThreats(input: string, customPatterns: RegExp[] = []): ThreatDetectionResult {
  const threats: ThreatDetectionResult['threats'] = []
  
  // Check for XSS
  XSS_PATTERNS.forEach(pattern => {
    const matches = input.match(pattern)
    if (matches) {
      threats.push({
        type: 'xss',
        pattern: pattern.source,
        matches: matches.slice(0, 5), // Limit to first 5 matches
        severity: 'critical'
      })
    }
  })
  
  // Check for SQL injection
  SQL_INJECTION_PATTERNS.forEach(pattern => {
    const matches = input.match(pattern)
    if (matches) {
      threats.push({
        type: 'sql_injection',
        pattern: pattern.source,
        matches: matches.slice(0, 5),
        severity: 'critical'
      })
    }
  })
  
  // Check for path traversal
  PATH_TRAVERSAL_PATTERNS.forEach(pattern => {
    const matches = input.match(pattern)
    if (matches) {
      threats.push({
        type: 'path_traversal',
        pattern: pattern.source,
        matches: matches.slice(0, 5),
        severity: 'high'
      })
    }
  })
  
  // Check for command injection
  COMMAND_INJECTION_PATTERNS.forEach(pattern => {
    const matches = input.match(pattern)
    if (matches) {
      threats.push({
        type: 'command_injection',
        pattern: pattern.source,
        matches: matches.slice(0, 5),
        severity: 'critical'
      })
    }
  })
  
  // Check for LDAP injection
  LDAP_INJECTION_PATTERNS.forEach(pattern => {
    const matches = input.match(pattern)
    if (matches) {
      threats.push({
        type: 'ldap_injection',
        pattern: pattern.source,
        matches: matches.slice(0, 5),
        severity: 'high'
      })
    }
  })
  
  // Check for NoSQL injection
  NOSQL_INJECTION_PATTERNS.forEach(pattern => {
    const matches = input.match(pattern)
    if (matches) {
      threats.push({
        type: 'nosql_injection',
        pattern: pattern.source,
        matches: matches.slice(0, 5),
        severity: 'high'
      })
    }
  })
  
  // Check custom patterns
  customPatterns.forEach(pattern => {
    const matches = input.match(pattern)
    if (matches) {
      threats.push({
        type: 'custom',
        pattern: pattern.source,
        matches: matches.slice(0, 5),
        severity: 'medium'
      })
    }
  })
  
  return {
    isSafe: threats.length === 0,
    threats
  }
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

// Decode HTML entities
export function decodeHtmlEntities(input: string): string {
  const entityMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '='
  }
  
  return input.replace(/&(?:amp|lt|gt|quot|#x27|#x2F|#x60|#x3D);/g, (entity) => entityMap[entity] || entity)
}

// Remove dangerous patterns
export function removeDangerousPatterns(input: string, options: SanitizationOptions = {}): string {
  let sanitized = input
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  // Remove XSS patterns
  if (opts.stripScripts) {
    XSS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, opts.replacementChar || '')
    })
  }
  
  // Remove SQL injection patterns
  SQL_INJECTION_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, opts.replacementChar || '')
  })
  
  // Remove path traversal patterns
  PATH_TRAVERSAL_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, opts.replacementChar || '')
  })
  
  // Remove command injection patterns
  COMMAND_INJECTION_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, opts.replacementChar || '')
  })
  
  // Remove custom patterns
  if (opts.customPatterns) {
    opts.customPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, opts.replacementChar || '')
    })
  }
  
  return sanitized
}

// Comprehensive input sanitization
export function sanitizeInput(input: string, options: SanitizationOptions = {}): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let sanitized = input
  
  // Trim whitespace
  if (opts.trimWhitespace) {
    sanitized = sanitized.trim()
  }
  
  // Enforce max length
  if (opts.maxLength && sanitized.length > opts.maxLength) {
    sanitized = sanitized.substring(0, opts.maxLength)
  }
  
  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  
  // Handle HTML content
  if (opts.allowHtml) {
    // Use DOMPurify for safe HTML sanitization
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: opts.allowedTags,
      ALLOWED_ATTR: opts.allowedAttributes,
      ALLOWED_URI_REGEXP: new RegExp(`^(?:(?:${opts.allowedSchemes?.join('|')}):)`, 'i')
    })
  } else {
    // Remove all HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '')
  }
  
  // Remove dangerous patterns
  sanitized = removeDangerousPatterns(sanitized, opts)
  
  // Encode HTML entities
  if (opts.encodeHtmlEntities && !opts.allowHtml) {
    sanitized = encodeHtmlEntities(sanitized)
  }
  
  // Normalize whitespace
  if (opts.normalizeWhitespace) {
    sanitized = sanitized.replace(/\s+/g, ' ')
  }
  
  // Final trim
  if (opts.trimWhitespace) {
    sanitized = sanitized.trim()
  }
  
  return sanitized
}

// Sanitize HTML content with DOMPurify
export function sanitizeHtml(html: string, options: SanitizationOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  const config: any = {
    ALLOWED_TAGS: opts.allowedTags || ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: opts.allowedAttributes || ['href', 'title', 'alt'],
    ALLOWED_URI_REGEXP: new RegExp(`^(?:(?:${opts.allowedSchemes?.join('|') || 'http|https|mailto'}):)`, 'i'),
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'meta', 'link'],
    FORBID_ATTR: ['style', 'on*'],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    SANITIZE_DOM: true,
    WHOLE_DOCUMENT: false,
    IN_PLACE: false
  }
  
  if (opts.stripStyles) {
    config.FORBID_ATTR.push('style')
    config.FORBID_TAGS.push('style')
  }
  
  return DOMPurify.sanitize(html, config)
}

// Sanitize URL
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return ''
  }
  
  // Remove dangerous protocols
  const dangerousProtocols = ['javascript:', 'vbscript:', 'data:', 'file:', 'ftp:']
  const lowerUrl = url.toLowerCase().trim()
  
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return ''
    }
  }
  
  // Encode dangerous characters
  return encodeURI(decodeURI(url)).replace(/[<>"']/g, (char) => {
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
  
  // Basic email sanitization
  return email.toLowerCase().trim().replace(/[<>"']/g, '')
}

// Sanitize filename
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return ''
  }
  
  // Remove dangerous characters from filename
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .substring(0, 255)
}

// Batch sanitization for objects
export function sanitizeObject<T extends Record<string, any>>(
  obj: T, 
  fieldOptions: Record<keyof T, SanitizationOptions> = {}
): T {
  const sanitized = { ...obj }
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      const options = fieldOptions[key as keyof T] || {}
      sanitized[key as keyof T] = sanitizeInput(value, options) as T[keyof T]
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = value.map(item => 
        typeof item === 'string' 
          ? sanitizeInput(item, fieldOptions[key as keyof T] || {})
          : item
      ) as T[keyof T]
    } else if (value && typeof value === 'object') {
      sanitized[key as keyof T] = sanitizeObject(value, {}) as T[keyof T]
    }
  }
  
  return sanitized
}

// Content Security Policy helpers
export function generateCSPNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64')
}

export function createCSPHeader(nonce?: string): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'" + (nonce ? ` 'nonce-${nonce}'` : ''),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "child-src 'none'",
    "worker-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "manifest-src 'self'"
  ]
  
  return directives.join('; ')
}

// Validation helpers
export function isValidInput(input: string, options: SanitizationOptions = {}): boolean {
  const threats = detectThreats(input, options.customPatterns)
  return threats.isSafe
}

export function validateAndSanitize(input: string, options: SanitizationOptions = {}): {
  isValid: boolean
  sanitized: string
  threats: ThreatDetectionResult['threats']
} {
  const threats = detectThreats(input, options.customPatterns)
  const sanitized = sanitizeInput(input, options)
  
  return {
    isValid: threats.isSafe,
    sanitized,
    threats: threats.threats
  }
}

// Export all patterns for external use
export const SECURITY_PATTERNS = {
  XSS_PATTERNS,
  SQL_INJECTION_PATTERNS,
  PATH_TRAVERSAL_PATTERNS,
  COMMAND_INJECTION_PATTERNS,
  LDAP_INJECTION_PATTERNS,
  NOSQL_INJECTION_PATTERNS
}
