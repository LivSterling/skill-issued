"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Save,
  RotateCcw,
  Eye,
  EyeOff
} from "lucide-react"
import { useFormValidation, FormValidation, ValidationError } from "@/hooks/use-form-validation"
import { z } from "zod"

export interface FormField {
  name: string
  label?: string
  type?: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'radio'
  placeholder?: string
  description?: string
  required?: boolean
  options?: Array<{ value: string; label: string; disabled?: boolean }>
  validation?: z.ZodSchema
  asyncValidator?: (value: any) => Promise<ValidationError[]>
  debounceMs?: number
  validateOnChange?: boolean
  validateOnBlur?: boolean
  disabled?: boolean
  hidden?: boolean
  className?: string
  props?: Record<string, any>
}

export interface ValidatedFormProps {
  title?: string
  description?: string
  fields: FormField[]
  initialValues?: Record<string, any>
  schema?: z.ZodSchema
  onSubmit: (values: Record<string, any>, validation: FormValidation) => Promise<void> | void
  onValidationChange?: (validation: FormValidation) => void
  submitLabel?: string
  resetLabel?: string
  showProgress?: boolean
  showValidationSummary?: boolean
  showFieldValidation?: boolean
  showResetButton?: boolean
  showSubmitButton?: boolean
  disabled?: boolean
  loading?: boolean
  className?: string
  cardClassName?: string
  headerClassName?: string
  contentClassName?: string
  footerClassName?: string
  validateOnMount?: boolean
  validateOnChange?: boolean
  validateOnBlur?: boolean
  debounceMs?: number
}

export function ValidatedForm({
  title,
  description,
  fields,
  initialValues = {},
  schema,
  onSubmit,
  onValidationChange,
  submitLabel = "Submit",
  resetLabel = "Reset",
  showProgress = true,
  showValidationSummary = true,
  showFieldValidation = true,
  showResetButton = true,
  showSubmitButton = true,
  disabled = false,
  loading = false,
  className,
  cardClassName,
  headerClassName,
  contentClassName,
  footerClassName,
  validateOnMount = false,
  validateOnChange = true,
  validateOnBlur = true,
  debounceMs = 300
}: ValidatedFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = React.useState<string | null>(null)
  const [showValidationDetails, setShowValidationDetails] = React.useState(false)

  // Create validation rules from fields
  const validationRules = React.useMemo(() => {
    const rules: Record<string, any> = {}
    
    fields.forEach(field => {
      if (field.validation) {
        rules[field.name] = {
          schema: field.validation,
          debounceMs: field.debounceMs,
          validateOnChange: field.validateOnChange,
          validateOnBlur: field.validateOnBlur,
          asyncValidator: field.asyncValidator
        }
      }
    })
    
    return rules
  }, [fields])

  // Initialize form validation
  const form = useFormValidation(initialValues, {
    schema,
    rules: validationRules,
    validateOnMount,
    validateOnChange,
    validateOnBlur,
    debounceMs,
    onValidationChange
  })

  // Calculate form completion progress
  const completionProgress = React.useMemo(() => {
    const requiredFields = fields.filter(field => field.required && !field.hidden)
    const completedFields = requiredFields.filter(field => {
      const value = form.values[field.name]
      return value !== undefined && value !== null && value !== ''
    })
    
    return requiredFields.length > 0 
      ? (completedFields.length / requiredFields.length) * 100 
      : 100
  }, [fields, form.values])

  // Get validation summary
  const validationSummary = React.useMemo(() => {
    const totalFields = fields.filter(field => !field.hidden).length
    const validFields = Object.keys(form.validation.fields).filter(
      fieldName => form.validation.fields[fieldName]?.isValid
    ).length
    const errorCount = Object.values(form.validation.errors).reduce(
      (count, errors) => count + errors.length, 0
    )
    
    return {
      totalFields,
      validFields,
      errorCount,
      completionRate: totalFields > 0 ? (validFields / totalFields) * 100 : 100
    }
  }, [fields, form.validation])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (disabled || loading || isSubmitting) return
    
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)
    
    try {
      // Validate form before submission
      const isValid = await form.validateForm()
      
      if (!isValid) {
        setSubmitError('Please fix the validation errors before submitting.')
        return
      }
      
      // Submit form
      await onSubmit(form.values, form.validation)
      setSubmitSuccess('Form submitted successfully!')
      
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An error occurred while submitting the form.'
      setSubmitError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle form reset
  const handleReset = () => {
    form.reset()
    setSubmitError(null)
    setSubmitSuccess(null)
  }

  // Render field based on type
  const renderField = (field: FormField) => {
    if (field.hidden) return null
    
    const fieldProps = form.getFieldProps(field.name)
    const commonProps = {
      ...fieldProps,
      ...field.props,
      id: field.name,
      label: field.label,
      placeholder: field.placeholder,
      description: field.description,
      required: field.required,
      disabled: field.disabled || disabled || loading,
      showValidationMessage: showFieldValidation,
      className: field.className
    }

    switch (field.type) {
      case 'textarea':
        return (
          <ValidatedTextarea
            key={field.name}
            {...commonProps}
            onValueChange={(value) => form.setValue(field.name, value)}
          />
        )
      
      case 'select':
        return (
          <ValidatedSelect
            key={field.name}
            {...commonProps}
            options={field.options || []}
            onValueChange={(value) => form.setValue(field.name, value)}
          />
        )
      
      case 'multiselect':
        return (
          <ValidatedMultiSelect
            key={field.name}
            {...commonProps}
            options={field.options || []}
            values={fieldProps.value || []}
            onValuesChange={(values) => form.setValue(field.name, values)}
          />
        )
      
      default:
        return (
          <ValidatedInput
            key={field.name}
            {...commonProps}
            type={field.type || 'text'}
            onValueChange={(value) => form.setValue(field.name, value)}
          />
        )
    }
  }

  return (
    <Card className={cn("w-full", cardClassName, className)}>
      {(title || description) && (
        <CardHeader className={headerClassName}>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
          
          {/* Progress indicator */}
          {showProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Form Completion</span>
                <span>{Math.round(completionProgress)}%</span>
              </div>
              <Progress value={completionProgress} className="h-2" />
            </div>
          )}
        </CardHeader>
      )}

      <CardContent className={contentClassName}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Validation Summary */}
          {showValidationSummary && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Validation Status</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowValidationDetails(!showValidationDetails)}
                >
                  {showValidationDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={form.validation.isValid ? "default" : "destructive"}>
                  {form.validation.isValid ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  {form.validation.isValid ? 'Valid' : 'Invalid'}
                </Badge>
                
                <span className="text-muted-foreground">
                  {validationSummary.validFields}/{validationSummary.totalFields} fields valid
                </span>
                
                {validationSummary.errorCount > 0 && (
                  <Badge variant="outline" className="text-red-600 border-red-200">
                    {validationSummary.errorCount} errors
                  </Badge>
                )}
                
                {form.validation.isValidating && (
                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Validating
                  </Badge>
                )}
              </div>

              {/* Detailed validation info */}
              {showValidationDetails && Object.keys(form.validation.errors).length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Validation Errors:</p>
                      {Object.entries(form.validation.errors).map(([field, errors]) => (
                        <div key={field} className="text-sm">
                          <span className="font-medium">{field}:</span>
                          <ul className="ml-4 list-disc">
                            {errors.map((error, index) => (
                              <li key={index}>{error.message}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {fields.map(renderField)}
          </div>

          {/* Submit/Reset Messages */}
          {submitError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {submitSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{submitSuccess}</AlertDescription>
            </Alert>
          )}

          {/* Form Actions */}
          <div className={cn("flex items-center gap-2", footerClassName)}>
            {showSubmitButton && (
              <Button
                type="submit"
                disabled={disabled || loading || isSubmitting || !form.validation.isValid}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSubmitting ? 'Submitting...' : submitLabel}
              </Button>
            )}

            {showResetButton && (
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={disabled || loading || isSubmitting}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {resetLabel}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// Re-export validation components for convenience
export { ValidatedInput, PasswordInput } from "../ui/validated-input"
export { ValidatedTextarea } from "../ui/validated-textarea"
export { ValidatedSelect, ValidatedMultiSelect } from "../ui/validated-select"
