"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff,
  Info
} from "lucide-react"
import { ValidationError } from "@/hooks/use-form-validation"

export interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
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
  validationDelay?: number
  onValueChange?: (value: string) => void
  containerClassName?: string
  labelClassName?: string
  errorClassName?: string
  successMessage?: string
}

const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({
    className,
    containerClassName,
    labelClassName,
    errorClassName,
    type = "text",
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
    validationDelay = 0,
    onValueChange,
    successMessage,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [localValue, setLocalValue] = React.useState(props.value || "")
    const isPassword = type === "password"

    // Handle value changes with optional delay
    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setLocalValue(newValue)
      
      if (validationDelay > 0) {
        const timeoutId = setTimeout(() => {
          onValueChange?.(newValue)
        }, validationDelay)
        
        return () => clearTimeout(timeoutId)
      } else {
        onValueChange?.(newValue)
      }
      
      props.onChange?.(e)
    }, [onValueChange, validationDelay, props.onChange])

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

    // Get input styling based on validation state
    const inputClassName = cn(
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      {
        "border-red-500 focus-visible:ring-red-500": validationState === 'error',
        "border-green-500 focus-visible:ring-green-500": validationState === 'success',
        "border-blue-500 focus-visible:ring-blue-500": validationState === 'validating',
        "pr-10": showValidationIcon && ValidationIcon,
        "pr-20": isPassword && showValidationIcon && ValidationIcon
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
          <Input
            {...props}
            ref={ref}
            type={isPassword ? (showPassword ? "text" : "password") : type}
            className={inputClassName}
            value={localValue}
            onChange={handleChange}
          />
          
          {/* Validation Icon */}
          {showValidationIcon && ValidationIcon && (
            <div className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2",
              isPassword && "right-12"
            )}>
              {ValidationIcon}
            </div>
          )}
          
          {/* Password Toggle */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

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
    )
  }
)

ValidatedInput.displayName = "ValidatedInput"

export { ValidatedInput }

// Password Input with Strength Indicator
export interface PasswordInputProps extends Omit<ValidatedInputProps, 'type'> {
  showStrengthIndicator?: boolean
  strengthScore?: number
  strengthLevel?: 'weak' | 'medium' | 'strong' | 'very-strong'
  strengthChecks?: Record<string, boolean>
  strengthSuggestions?: string[]
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({
    showStrengthIndicator = true,
    strengthScore = 0,
    strengthLevel = 'weak',
    strengthChecks = {},
    strengthSuggestions = [],
    ...props
  }, ref) => {
    const strengthColors = {
      weak: 'bg-red-500',
      medium: 'bg-yellow-500', 
      strong: 'bg-blue-500',
      'very-strong': 'bg-green-500'
    }

    const strengthLabels = {
      weak: 'Weak',
      medium: 'Medium',
      strong: 'Strong',
      'very-strong': 'Very Strong'
    }

    return (
      <div className="space-y-3">
        <ValidatedInput
          {...props}
          ref={ref}
          type="password"
        />
        
        {showStrengthIndicator && props.value && (
          <div className="space-y-2">
            {/* Strength Bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-300",
                    strengthColors[strengthLevel]
                  )}
                  style={{ width: `${(strengthScore / 7) * 100}%` }}
                />
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  strengthLevel === 'weak' && "border-red-500 text-red-700",
                  strengthLevel === 'medium' && "border-yellow-500 text-yellow-700",
                  strengthLevel === 'strong' && "border-blue-500 text-blue-700",
                  strengthLevel === 'very-strong' && "border-green-500 text-green-700"
                )}
              >
                {strengthLabels[strengthLevel]}
              </Badge>
            </div>

            {/* Strength Checks */}
            <div className="grid grid-cols-2 gap-1 text-xs">
              {Object.entries(strengthChecks).map(([check, passed]) => (
                <div 
                  key={check}
                  className={cn(
                    "flex items-center gap-1",
                    passed ? "text-green-600" : "text-gray-500"
                  )}
                >
                  {passed ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  <span className="capitalize">
                    {check.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                </div>
              ))}
            </div>

            {/* Suggestions */}
            {strengthSuggestions.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Suggestions:</p>
                <ul className="space-y-1">
                  {strengthSuggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
)

PasswordInput.displayName = "PasswordInput"
