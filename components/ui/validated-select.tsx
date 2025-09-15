"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Info
} from "lucide-react"
import { ValidationError } from "@/hooks/use-form-validation"

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  description?: string
}

export interface ValidatedSelectProps {
  label?: string
  description?: string
  placeholder?: string
  error?: string
  errors?: ValidationError[]
  isValid?: boolean
  isValidating?: boolean
  isDirty?: boolean
  isTouched?: boolean
  hasError?: boolean
  showValidationIcon?: boolean
  showValidationMessage?: boolean
  options: SelectOption[]
  value?: string
  onValueChange?: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  required?: boolean
  multiple?: boolean
  containerClassName?: string
  labelClassName?: string
  errorClassName?: string
  successMessage?: string
  id?: string
}

const ValidatedSelect = React.forwardRef<HTMLButtonElement, ValidatedSelectProps>(
  ({
    label,
    description,
    placeholder = "Select an option...",
    error,
    errors = [],
    isValid = true,
    isValidating = false,
    isDirty = false,
    isTouched = false,
    hasError = false,
    showValidationIcon = true,
    showValidationMessage = true,
    options = [],
    value,
    onValueChange,
    onBlur,
    disabled = false,
    required = false,
    multiple = false,
    containerClassName,
    labelClassName,
    errorClassName,
    successMessage,
    id,
  }, ref) => {
    // Determine validation state
    const validationState = React.useMemo(() => {
      if (isValidating) return 'validating'
      if (hasError || error || errors.length > 0) return 'error'
      if (isValid && (isDirty || isTouched) && value) return 'success'
      return 'default'
    }, [isValidating, hasError, error, errors.length, isValid, isDirty, isTouched, value])

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

    // Get all error messages
    const allErrors = React.useMemo(() => {
      const errorList = [...errors]
      if (error && !errors.some(e => e.message === error)) {
        errorList.push({ field: '', message: error, code: 'custom' })
      }
      return errorList
    }, [error, errors])

    // Get trigger styling based on validation state
    const getTriggerClassName = () => {
      const baseClasses = "w-full"
      
      switch (validationState) {
        case 'error':
          return cn(baseClasses, "border-red-500 focus:ring-red-500")
        case 'success':
          return cn(baseClasses, "border-green-500 focus:ring-green-500")
        case 'validating':
          return cn(baseClasses, "border-blue-500 focus:ring-blue-500")
        default:
          return baseClasses
      }
    }

    return (
      <div className={cn("space-y-2", containerClassName)}>
        {label && (
          <Label 
            htmlFor={id}
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              labelClassName
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        {description && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            {description}
          </p>
        )}

        <div className="relative">
          <Select
            value={value}
            onValueChange={onValueChange}
            disabled={disabled}
          >
            <SelectTrigger 
              ref={ref}
              id={id}
              className={getTriggerClassName()}
              onBlur={onBlur}
            >
              <div className="flex items-center justify-between w-full">
                <SelectValue placeholder={placeholder} />
                {showValidationIcon && ValidationIcon && (
                  <div className="ml-2">
                    {ValidationIcon}
                  </div>
                )}
              </div>
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  disabled={option.disabled}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
              {options.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No options available
                </div>
              )}
            </SelectContent>
          </Select>
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

ValidatedSelect.displayName = "ValidatedSelect"

export { ValidatedSelect }

// Multi-select component with validation
export interface ValidatedMultiSelectProps extends Omit<ValidatedSelectProps, 'value' | 'onValueChange' | 'multiple'> {
  values?: string[]
  onValuesChange?: (values: string[]) => void
  maxSelections?: number
  showSelectionCount?: boolean
}

export const ValidatedMultiSelect = React.forwardRef<HTMLButtonElement, ValidatedMultiSelectProps>(
  ({
    values = [],
    onValuesChange,
    maxSelections,
    showSelectionCount = true,
    options = [],
    placeholder = "Select options...",
    ...props
  }, ref) => {
    const handleValueChange = (value: string) => {
      if (values.includes(value)) {
        // Remove value
        onValuesChange?.(values.filter(v => v !== value))
      } else {
        // Add value (check max selections)
        if (!maxSelections || values.length < maxSelections) {
          onValuesChange?.([...values, value])
        }
      }
    }

    const getDisplayValue = () => {
      if (values.length === 0) return placeholder
      if (values.length === 1) {
        const option = options.find(opt => opt.value === values[0])
        return option?.label || values[0]
      }
      return `${values.length} selected`
    }

    const isMaxReached = maxSelections ? values.length >= maxSelections : false

    return (
      <div className="space-y-2">
        <ValidatedSelect
          {...props}
          ref={ref}
          value=""
          onValueChange={handleValueChange}
          placeholder={getDisplayValue()}
          options={options.map(option => ({
            ...option,
            disabled: option.disabled || (isMaxReached && !values.includes(option.value))
          }))}
        />
        
        {/* Selected items display */}
        {values.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {values.map(value => {
              const option = options.find(opt => opt.value === value)
              return (
                <span
                  key={value}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-md"
                >
                  {option?.label || value}
                  <button
                    type="button"
                    onClick={() => handleValueChange(value)}
                    className="hover:text-primary/70"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </span>
              )
            })}
          </div>
        )}
        
        {/* Selection count and limit */}
        {showSelectionCount && (maxSelections || values.length > 0) && (
          <div className="text-xs text-muted-foreground">
            {values.length} selected
            {maxSelections && ` (max: ${maxSelections})`}
            {isMaxReached && (
              <span className="text-yellow-600 ml-1">
                • Maximum reached
              </span>
            )}
          </div>
        )}
      </div>
    )
  }
)

ValidatedMultiSelect.displayName = "ValidatedMultiSelect"
