"use client"

import { FormValidationDemo } from "@/components/forms/form-validation-demo"
import { Navigation } from "@/components/navigation"

export default function FormValidationDemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto py-8">
        <FormValidationDemo />
      </div>
    </div>
  )
}
