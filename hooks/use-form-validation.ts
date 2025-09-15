"use client"

import { useState, useCallback, useEffect, useMemo } from 'react'
import { z } from 'zod'
import { debounce } from 'lodash'

// Types for form validation
export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface FieldValidation {
  isValid: boolean
  errors: ValidationError[]
  isValidating: boolean
  isDirty: boolean
  isTouched: boolean
}

export interface FormValidation {
  isValid: boolean
  isValidating: boolean
  errors: Record<string, ValidationError[]>
  fields: Record<string, FieldValidation>
  isDirty: boolean
  hasErrors: boolean
  touchedFields: Set<string>
}

export interface ValidationRule {
  schema: z.ZodSchema
  debounceMs?: number
  validateOnChange?: boolean
  validateOnBlur?: boolean
  asyncValidator?: (value: any) => Promise<ValidationError[]>
}

export interface UseFormValidationOptions {
  schema?: z.ZodSchema
  rules?: Record<string, ValidationRule>
  validateOnMount?: boolean
  validateOnChange?: boolean
  validateOnBlur?: boolean
  debounceMs?: number
  onValidationChange?: (validation: FormValidation) => void
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  options: UseFormValidationOptions = {}
) {
  const {
    schema,
    rules = {},
    validateOnMount = false,
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300,
    onValidationChange
  } = options

  // Form state
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<string, ValidationError[]>>({})
  const [validatingFields, setValidatingFields] = useState<Set<string>>(new Set())
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set())

  // Validation state
  const validation = useMemo<FormValidation>(() => {
    const fieldValidations: Record<string, FieldValidation> = {}
    
    Object.keys(values).forEach(field => {
      const fieldErrors = errors[field] || []
      fieldValidations[field] = {
        isValid: fieldErrors.length === 0,
        errors: fieldErrors,
        isValidating: validatingFields.has(field),
        isDirty: dirtyFields.has(field),
        isTouched: touchedFields.has(field)
      }
    })

    const hasErrors = Object.values(errors).some(fieldErrors => fieldErrors.length > 0)
    const isValidating = validatingFields.size > 0

    return {
      isValid: !hasErrors && !isValidating,
      isValidating,
      errors,
      fields: fieldValidations,
      isDirty: dirtyFields.size > 0,
      hasErrors,
      touchedFields
    }
  }, [values, errors, validatingFields, touchedFields, dirtyFields])

  // Notify validation changes
  useEffect(() => {
    onValidationChange?.(validation)
  }, [validation, onValidationChange])

  // Validate a single field
  const validateField = useCallback(async (
    field: string, 
    value: any, 
    options: { 
      showErrors?: boolean
      isAsync?: boolean 
    } = {}
  ): Promise<ValidationError[]> => {
    const { showErrors = true, isAsync = false } = options
    
    if (isAsync) {
      setValidatingFields(prev => new Set(prev).add(field))
    }

    try {
      const fieldErrors: ValidationError[] = []

      // Check field-specific rule
      const rule = rules[field]
      if (rule) {
        try {
          rule.schema.parse(value)
        } catch (error) {
          if (error instanceof z.ZodError) {
            fieldErrors.push(...error.issues.map(issue => ({
              field,
              message: issue.message,
              code: issue.code
            })))
          }
        }

        // Run async validator if present
        if (rule.asyncValidator) {
          try {
            const asyncErrors = await rule.asyncValidator(value)
            fieldErrors.push(...asyncErrors)
          } catch (error) {
            fieldErrors.push({
              field,
              message: 'Validation failed',
              code: 'async_validation_error'
            })
          }
        }
      }

      // Check global schema
      if (schema && !rule) {
        try {
          const fieldSchema = schema.shape?.[field]
          if (fieldSchema) {
            fieldSchema.parse(value)
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            fieldErrors.push(...error.issues.map(issue => ({
              field,
              message: issue.message,
              code: issue.code
            })))
          }
        }
      }

      // Update errors state
      if (showErrors) {
        setErrors(prev => ({
          ...prev,
          [field]: fieldErrors
        }))
      }

      return fieldErrors
    } finally {
      if (isAsync) {
        setValidatingFields(prev => {
          const next = new Set(prev)
          next.delete(field)
          return next
        })
      }
    }
  }, [rules, schema])

  // Debounced field validation
  const debouncedValidateField = useMemo(() => {
    const debouncedFunctions: Record<string, ReturnType<typeof debounce>> = {}
    
    return (field: string, value: any) => {
      const rule = rules[field]
      const delay = rule?.debounceMs ?? debounceMs
      
      if (!debouncedFunctions[field]) {
        debouncedFunctions[field] = debounce(
          (fieldName: string, fieldValue: any) => {
            validateField(fieldName, fieldValue, { isAsync: true })
          },
          delay
        )
      }
      
      debouncedFunctions[field](field, value)
    }
  }, [rules, debounceMs, validateField])

  // Validate entire form
  const validateForm = useCallback(async (): Promise<boolean> => {
    setValidatingFields(new Set(Object.keys(values)))
    
    try {
      const allErrors: Record<string, ValidationError[]> = {}
      
      // Validate all fields
      await Promise.all(
        Object.entries(values).map(async ([field, value]) => {
          const fieldErrors = await validateField(field, value, { showErrors: false })
          if (fieldErrors.length > 0) {
            allErrors[field] = fieldErrors
          }
        })
      )

      // Validate entire form with global schema
      if (schema) {
        try {
          schema.parse(values)
        } catch (error) {
          if (error instanceof z.ZodError) {
            error.issues.forEach(issue => {
              const field = issue.path.join('.')
              if (!allErrors[field]) {
                allErrors[field] = []
              }
              allErrors[field].push({
                field,
                message: issue.message,
                code: issue.code
              })
            })
          }
        }
      }

      setErrors(allErrors)
      return Object.keys(allErrors).length === 0
    } finally {
      setValidatingFields(new Set())
    }
  }, [values, schema, validateField])

  // Update field value
  const setValue = useCallback((field: string, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }))
    setDirtyFields(prev => new Set(prev).add(field))

    // Validate on change if enabled
    const rule = rules[field]
    const shouldValidateOnChange = rule?.validateOnChange ?? validateOnChange
    
    if (shouldValidateOnChange) {
      if (rule?.debounceMs !== undefined || debounceMs > 0) {
        debouncedValidateField(field, value)
      } else {
        validateField(field, value)
      }
    }
  }, [rules, validateOnChange, debounceMs, debouncedValidateField, validateField])

  // Update multiple values
  const setMultipleValues = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }))
    
    Object.keys(newValues).forEach(field => {
      setDirtyFields(prev => new Set(prev).add(field))
    })

    if (validateOnChange) {
      Object.entries(newValues).forEach(([field, value]) => {
        const rule = rules[field]
        if (rule?.validateOnChange ?? validateOnChange) {
          if (rule?.debounceMs !== undefined || debounceMs > 0) {
            debouncedValidateField(field, value)
          } else {
            validateField(field, value)
          }
        }
      })
    }
  }, [rules, validateOnChange, debounceMs, debouncedValidateField, validateField])

  // Mark field as touched
  const setFieldTouched = useCallback((field: string, touched = true) => {
    setTouchedFields(prev => {
      const next = new Set(prev)
      if (touched) {
        next.add(field)
      } else {
        next.delete(field)
      }
      return next
    })

    // Validate on blur if enabled and field is touched
    if (touched) {
      const rule = rules[field]
      const shouldValidateOnBlur = rule?.validateOnBlur ?? validateOnBlur
      
      if (shouldValidateOnBlur) {
        validateField(field, values[field])
      }
    }
  }, [rules, validateOnBlur, validateField, values])

  // Reset form
  const reset = useCallback((newValues?: Partial<T>) => {
    const resetValues = newValues ? { ...initialValues, ...newValues } : initialValues
    setValues(resetValues)
    setErrors({})
    setValidatingFields(new Set())
    setTouchedFields(new Set())
    setDirtyFields(new Set())
  }, [initialValues])

  // Clear errors for specific field
  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  // Get field props for easy integration with form controls
  const getFieldProps = useCallback((field: string) => {
    const fieldValidation = validation.fields[field] || {
      isValid: true,
      errors: [],
      isValidating: false,
      isDirty: false,
      isTouched: false
    }

    return {
      value: values[field],
      onChange: (value: any) => setValue(field, value),
      onBlur: () => setFieldTouched(field, true),
      onFocus: () => {}, // Can be used for additional logic
      error: fieldValidation.errors[0]?.message,
      errors: fieldValidation.errors,
      isValid: fieldValidation.isValid,
      isValidating: fieldValidation.isValidating,
      isDirty: fieldValidation.isDirty,
      isTouched: fieldValidation.isTouched,
      hasError: fieldValidation.errors.length > 0
    }
  }, [values, validation.fields, setValue, setFieldTouched])

  // Validate on mount if enabled
  useEffect(() => {
    if (validateOnMount) {
      validateForm()
    }
  }, [validateOnMount, validateForm])

  return {
    // Values
    values,
    setValue,
    setMultipleValues,
    
    // Validation state
    validation,
    
    // Field operations
    validateField,
    validateForm,
    setFieldTouched,
    clearFieldError,
    clearErrors,
    
    // Utilities
    reset,
    getFieldProps,
    
    // Computed properties
    isValid: validation.isValid,
    isValidating: validation.isValidating,
    hasErrors: validation.hasErrors,
    isDirty: validation.isDirty,
    errors: validation.errors
  }
}

// Hook for password strength validation with real-time feedback
export function usePasswordStrength(password: string) {
  const [strength, setStrength] = useState({
    score: 0,
    level: 'weak' as 'weak' | 'medium' | 'strong' | 'very-strong',
    checks: {
      length: false,
      lowercase: false,
      uppercase: false,
      number: false,
      special: false,
      noRepeating: false,
      notCommon: false
    },
    suggestions: [] as string[]
  })

  useEffect(() => {
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password),
      noRepeating: !/(.)\1{2,}/.test(password),
      notCommon: !/^(?:password|123456|qwerty|abc123|admin|user|guest)$/i.test(password)
    }

    const score = Object.values(checks).filter(Boolean).length
    let level: 'weak' | 'medium' | 'strong' | 'very-strong' = 'weak'
    
    if (score >= 7) level = 'very-strong'
    else if (score >= 5) level = 'strong'
    else if (score >= 3) level = 'medium'

    const suggestions = [
      !checks.length && 'Use at least 8 characters',
      !checks.lowercase && 'Include lowercase letters',
      !checks.uppercase && 'Include uppercase letters',
      !checks.number && 'Include numbers',
      !checks.special && 'Include special characters (@$!%*?&)',
      !checks.noRepeating && 'Avoid repeating characters',
      !checks.notCommon && 'Avoid common passwords'
    ].filter(Boolean) as string[]

    setStrength({
      score,
      level,
      checks,
      suggestions
    })
  }, [password])

  return strength
}

// Hook for async username availability checking
export function useUsernameAvailability(username: string, debounceMs = 500) {
  const [availability, setAvailability] = useState({
    isChecking: false,
    isAvailable: null as boolean | null,
    message: '',
    suggestions: [] as string[]
  })

  const checkAvailability = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length < 3) {
      setAvailability({
        isChecking: false,
        isAvailable: null,
        message: '',
        suggestions: []
      })
      return
    }

    setAvailability(prev => ({ ...prev, isChecking: true }))

    try {
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Mock availability check
      const unavailableUsernames = ['admin', 'user', 'test', 'demo', 'john', 'jane']
      const isAvailable = !unavailableUsernames.includes(usernameToCheck.toLowerCase())
      
      const suggestions = isAvailable ? [] : [
        `${usernameToCheck}123`,
        `${usernameToCheck}_gamer`,
        `${usernameToCheck}2024`,
        `the_${usernameToCheck}`
      ]

      setAvailability({
        isChecking: false,
        isAvailable,
        message: isAvailable 
          ? 'Username is available!' 
          : 'Username is already taken',
        suggestions
      })
    } catch (error) {
      setAvailability({
        isChecking: false,
        isAvailable: null,
        message: 'Failed to check availability',
        suggestions: []
      })
    }
  }, [])

  const debouncedCheck = useMemo(
    () => debounce(checkAvailability, debounceMs),
    [checkAvailability, debounceMs]
  )

  useEffect(() => {
    debouncedCheck(username)
    return () => debouncedCheck.cancel()
  }, [username, debouncedCheck])

  return availability
}
