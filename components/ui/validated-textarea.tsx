"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Info
} from "lucide-react"
import { ValidationError } from "@/hooks/use-form-validation"

export interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  description?: string
  error?: string
  errors?: ValidationError[]
  isValid?: boolean
  isValidating?: boolean
  isDirty?: boolean
  isTouched?: boolean
  hasError?: boolean
  showValidationIcon?: boolean
  showValidationMessage?: boolean
  showCharacterCount?: boolean
  maxLength?: number
  minLength?: number
  validationDelay?: number
  onValueChange?: (value: string) => void
  containerClassName?: string
  labelClassName?: string
  errorClassName?: string
  successMessage?: string
  autoResize?: boolean
}

const ValidatedTextarea = React.forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(
  ({
    className,
    containerClassName,
    labelClassName,
    errorClassName,
    label,
    description,
    error,
    errors = [],
    isValid = true,
    isValidating = false,
    isDirty = false,
    isTouched = false,
    hasError = false,
    showValidationIcon = true,
    showValidationMessage = true,
    showCharacterCount = true,
    maxLength,
    minLength,
    validationDelay = 0,
    onValueChange,
    successMessage,
    autoResize = false,
    ...props
  }, ref) => {
    const [localValue, setLocalValue] = React.useState(props.value || "")
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    
    // Merge refs
    React.useImperativeHandle(ref, () => textareaRef.current!, [])

    // Auto-resize functionality
    const adjustHeight = React.useCallback(() => {
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      }
    }, [autoResize])

    // Handle value changes with optional delay
    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setLocalValue(newValue)
      
      // Auto-resize if enabled
      if (autoResize) {
        adjustHeight()
      }
      
      if (validationDelay > 0) {
        const timeoutId = setTimeout(() => {
          onValueChange?.(newValue)
        }, validationDelay)
        
        return () => clearTimeout(timeoutId)
      } else {
        onValueChange?.(newValue)
      }
      
      props.onChange?.(e)
    }, [onValueChange, validationDelay, props.onChange, autoResize, adjustHeight])

    // Adjust height on mount and value changes
    React.useEffect(() => {
      if (autoResize) {
        adjustHeight()
      }
    }, [localValue, autoResize, adjustHeight])

    // Determine validation state
    const validationState = React.useMemo(() => {
      if (isValidating) return 'validating'
      if (hasError || error || errors.length > 0) return 'error'
      if (isValid && (isDirty || isTouched) && localValue) return 'success'
      return 'default'
    }, [isValidating, hasError, error, errors.length, isValid, isDirty, isTouched, localValue])

    // Get validation icon
    const ValidationIcon = React.useMemo(() => {
      switch (validationState) {
        case 'validating':
          return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        case 'error':
          return <XCircle className="h-4 w-4 text-red-500" />
        case 'success':
          return <CheckCircle className="h-4 w-4 text-green-500" />
        default:
          return null
      }
    }, [validationState])

    // Get textarea styling based on validation state
    const textareaClassName = cn(
      "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      {
        "border-red-500 focus-visible:ring-red-500": validationState === 'error',
        "border-green-500 focus-visible:ring-green-500": validationState === 'success',
        "border-blue-500 focus-visible:ring-blue-500": validationState === 'validating',
        "resize-none": autoResize
      },
      className
    )

    // Get all error messages
    const allErrors = React.useMemo(() => {
      const errorList = [...errors]
      if (error && !errors.some(e => e.message === error)) {
        errorList.push({ field: '', message: error, code: 'custom' })
      }
      return errorList
    }, [error, errors])

    // Character count calculations
    const characterCount = localValue.toString().length
    const isOverLimit = maxLength ? characterCount > maxLength : false
    const isUnderLimit = minLength ? characterCount < minLength : false
    const characterCountColor = isOverLimit ? 'text-red-500' : 
                               isUnderLimit ? 'text-yellow-500' : 
                               'text-muted-foreground'

    return (
      <div className={cn("space-y-2", containerClassName)}>
        {label && (
          <Label 
            htmlFor={props.id} 
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              labelClassName
            )}
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        {description && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            {description}
          </p>
        )}

        <div className="relative">
          <Textarea
            {...props}
            ref={textareaRef}
            className={textareaClassName}
            value={localValue}
            onChange={handleChange}
            maxLength={maxLength}
          />
          
          {/* Validation Icon */}
          {showValidationIcon && ValidationIcon && (
            <div className="absolute right-3 top-3">
              {ValidationIcon}
            </div>
          )}
        </div>

        {/* Character Count and Validation Messages */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {/* Validation Messages */}
            {showValidationMessage && (
              <div className="min-h-[1.25rem]">
                {validationState === 'error' && allErrors.length > 0 && (
                  <div className="space-y-1">
                    {allErrors.map((err, index) => (
                      <p 
                        key={index}
                        className={cn(
                          "text-sm text-red-600 flex items-center gap-1",
                          errorClassName
                        )}
                      >
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        {err.message}
                      </p>
                    ))}
                  </div>
                )}
                
                {validationState === 'success' && successMessage && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {successMessage}
                  </p>
                )}
                
                {validationState === 'validating' && (
                  <p className="text-sm text-blue-600 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Validating...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Character Count */}
          {showCharacterCount && (maxLength || minLength) && (
            <div className="flex-shrink-0">
              <p className={cn("text-xs", characterCountColor)}>
                {characterCount}
                {maxLength && `/${maxLength}`}
                {minLength && !maxLength && ` (min: ${minLength})`}
              </p>
              
              {/* Progress bar for character limit */}
              {maxLength && (
                <div className="w-16 h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-200",
                      isOverLimit ? "bg-red-500" : 
                      characterCount > maxLength * 0.8 ? "bg-yellow-500" : 
                      "bg-green-500"
                    )}
                    style={{ 
                      width: `${Math.min((characterCount / maxLength) * 100, 100)}%` 
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Length validation warnings */}
        {(isOverLimit || isUnderLimit) && showValidationMessage && (
          <div className="text-xs">
            {isOverLimit && (
              <p className="text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Text exceeds maximum length of {maxLength} characters
              </p>
            )}
            {isUnderLimit && isTouched && (
              <p className="text-yellow-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Text must be at least {minLength} characters
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)

ValidatedTextarea.displayName = "ValidatedTextarea"

export { ValidatedTextarea }
