"use client"

import { useState, useCallback, useMemo } from 'react'
import { 
  sanitizeInput, 
  sanitizeUrl, 
  sanitizeEmail,
  validateAndSanitize,
  SecurityValidationResult,
  SanitizationOptions
} from '@/lib/security/sanitization'

// Hook options
export interface SecureInputOptions extends SanitizationOptions {
  validateOnChange?: boolean
  onThreatDetected?: (threats: string[]) => void
  onSecurityValidation?: (result: SecurityValidationResult) => void
}

// Default options
const DEFAULT_OPTIONS: SecureInputOptions = {
  maxLength: 1000,
  allowHtml: false,
  stripScripts: true,
  encodeEntities: true,
  validateOnChange: true
}

// Hook for secure input handling
export function useSecureInput(
  initialValue: string = '',
  options: SecureInputOptions = {}
) {
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options])
  
  const [value, setValue] = useState(initialValue)
  const [validationResult, setValidationResult] = useState<SecurityValidationResult | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Perform security validation
  const performValidation = useCallback((inputValue: string): SecurityValidationResult => {
    const result = validateAndSanitize(inputValue, opts)
    
    // Call threat detection callback
    if (opts.onThreatDetected && result.threats.length > 0) {
      opts.onThreatDetected(result.threats)
    }
    
    // Call validation callback
    if (opts.onSecurityValidation) {
      opts.onSecurityValidation(result)
    }
    
    return result
  }, [opts])

  // Handle value changes
  const handleChange = useCallback((newValue: string) => {
    setIsDirty(true)
    setValue(newValue)
    
    // Validate on change if enabled
    if (opts.validateOnChange) {
      const result = performValidation(newValue)
      setValidationResult(result)
    }
  }, [opts.validateOnChange, performValidation])

  // Force validation
  const validate = useCallback(() => {
    const result = performValidation(value)
    setValidationResult(result)
    return result
  }, [performValidation, value])

  // Reset state
  const reset = useCallback((newValue: string = initialValue) => {
    setValue(newValue)
    setValidationResult(null)
    setIsDirty(false)
  }, [initialValue])

  // Get sanitized value immediately (synchronous)
  const getSanitizedValue = useCallback((inputValue?: string) => {
    const valueToSanitize = inputValue ?? value
    return sanitizeInput(valueToSanitize, opts)
  }, [value, opts])

  return {
    // Values
    value,
    sanitizedValue: validationResult?.sanitizedValue ?? getSanitizedValue(),
    
    // State
    isDirty,
    validationResult,
    
    // Computed properties
    isSecure: validationResult?.isSecure ?? true,
    hasThreats: validationResult ? validationResult.threats.length > 0 : false,
    threats: validationResult?.threats ?? [],
    
    // Actions
    setValue: handleChange,
    validate,
    reset,
    getSanitizedValue
  }
}

// Hook for secure URL input
export function useSecureUrlInput(
  initialValue: string = '',
  options: SecureInputOptions = {}
) {
  const secureInput = useSecureInput(initialValue, options)
  
  // Additional URL sanitization
  const sanitizedUrl = useMemo(() => {
    if (!secureInput.value) return ''
    return sanitizeUrl(secureInput.value)
  }, [secureInput.value])
  
  return {
    ...secureInput,
    sanitizedValue: sanitizedUrl
  }
}

// Hook for secure email input
export function useSecureEmailInput(
  initialValue: string = '',
  options: SecureInputOptions = {}
) {
  const emailOptions: SecureInputOptions = {
    ...options,
    maxLength: 254 // RFC 5321 limit
  }
  
  const secureInput = useSecureInput(initialValue, emailOptions)
  
  // Additional email sanitization
  const sanitizedEmail = useMemo(() => {
    if (!secureInput.value) return ''
    return sanitizeEmail(secureInput.value)
  }, [secureInput.value])
  
  return {
    ...secureInput,
    sanitizedValue: sanitizedEmail
  }
}

// Utility function for one-time input sanitization
export function sanitizeUserInput(
  input: string, 
  options: SanitizationOptions = {}
): SecurityValidationResult {
  return validateAndSanitize(input, options)
}
