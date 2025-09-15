"use client"

import * as React from "react"
import { ValidatedForm, FormField } from "./validated-form"
import { usePasswordStrength, useUsernameAvailability } from "@/hooks/use-form-validation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  emailSchema, 
  passwordSchema, 
  usernameSchema,
  signUpSchema 
} from "@/lib/validations/auth-schemas"
import { 
  bioSchema, 
  gamingPreferencesSchema 
} from "@/lib/validations/profile-schemas"
import { z } from "zod"

// Demo form schemas
const registrationSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, "You must accept the terms")
}).refine(
  data => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }
)

const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters").max(50),
  bio: bioSchema,
  favoriteGenres: z.array(z.string()).min(1, "Select at least one genre").max(5, "Maximum 5 genres"),
  platforms: z.array(z.string()).min(1, "Select at least one platform"),
  playStyle: z.enum(['casual', 'competitive', 'hardcore', 'mixed']),
  availableHours: z.number().min(0).max(168), // hours per week
  timeZone: z.string().min(1, "Time zone is required")
})

export function FormValidationDemo() {
  const [activeDemo, setActiveDemo] = React.useState("registration")

  // Registration form fields
  const registrationFields: FormField[] = [
    {
      name: "username",
      label: "Username",
      type: "text",
      placeholder: "Enter your username",
      description: "Choose a unique username (3-30 characters, letters, numbers, _ and - only)",
      required: true,
      validation: usernameSchema,
      asyncValidator: async (value: string) => {
        // Simulate username availability check
        if (value === "admin" || value === "user") {
          return [{ field: "username", message: "Username is already taken", code: "not_unique" }]
        }
        return []
      },
      debounceMs: 500
    },
    {
      name: "email",
      label: "Email Address",
      type: "email",
      placeholder: "Enter your email",
      description: "We'll use this to send you important updates",
      required: true,
      validation: emailSchema,
      debounceMs: 300
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      placeholder: "Create a strong password",
      description: "Must be at least 8 characters with uppercase, lowercase, number, and special character",
      required: true,
      validation: passwordSchema,
      debounceMs: 200
    },
    {
      name: "confirmPassword",
      label: "Confirm Password",
      type: "password",
      placeholder: "Confirm your password",
      required: true,
      validation: z.string().min(1, "Please confirm your password")
    },
    {
      name: "acceptTerms",
      label: "Accept Terms and Conditions",
      type: "checkbox",
      required: true,
      validation: z.boolean().refine(val => val === true, "You must accept the terms")
    }
  ]

  // Profile form fields
  const profileFields: FormField[] = [
    {
      name: "displayName",
      label: "Display Name",
      type: "text",
      placeholder: "How should others see you?",
      description: "This is how your name will appear to other users",
      required: true,
      validation: z.string().min(2).max(50)
    },
    {
      name: "bio",
      label: "Bio",
      type: "textarea",
      placeholder: "Tell us about yourself...",
      description: "Share your gaming interests, favorite games, or anything else",
      validation: bioSchema,
      props: {
        maxLength: 500,
        showCharacterCount: true,
        autoResize: true
      }
    },
    {
      name: "favoriteGenres",
      label: "Favorite Game Genres",
      type: "multiselect",
      description: "Select up to 5 genres you enjoy most",
      required: true,
      validation: z.array(z.string()).min(1).max(5),
      options: [
        { value: "action", label: "Action" },
        { value: "adventure", label: "Adventure" },
        { value: "rpg", label: "RPG" },
        { value: "strategy", label: "Strategy" },
        { value: "simulation", label: "Simulation" },
        { value: "sports", label: "Sports" },
        { value: "racing", label: "Racing" },
        { value: "puzzle", label: "Puzzle" },
        { value: "horror", label: "Horror" },
        { value: "indie", label: "Indie" }
      ],
      props: {
        maxSelections: 5
      }
    },
    {
      name: "platforms",
      label: "Gaming Platforms",
      type: "multiselect",
      description: "What platforms do you game on?",
      required: true,
      validation: z.array(z.string()).min(1),
      options: [
        { value: "pc", label: "PC" },
        { value: "playstation", label: "PlayStation" },
        { value: "xbox", label: "Xbox" },
        { value: "nintendo", label: "Nintendo Switch" },
        { value: "mobile", label: "Mobile" },
        { value: "vr", label: "VR" }
      ]
    },
    {
      name: "playStyle",
      label: "Play Style",
      type: "select",
      description: "How would you describe your gaming approach?",
      required: true,
      validation: z.enum(['casual', 'competitive', 'hardcore', 'mixed']),
      options: [
        { value: "casual", label: "Casual", description: "I play for fun and relaxation" },
        { value: "competitive", label: "Competitive", description: "I love competing and improving" },
        { value: "hardcore", label: "Hardcore", description: "I'm dedicated and play intensively" },
        { value: "mixed", label: "Mixed", description: "It depends on the game and mood" }
      ]
    },
    {
      name: "availableHours",
      label: "Gaming Hours per Week",
      type: "text",
      placeholder: "e.g., 10",
      description: "Approximately how many hours do you game per week?",
      validation: z.coerce.number().min(0, "Cannot be negative").max(168, "There are only 168 hours in a week!"),
      props: {
        inputMode: "numeric"
      }
    },
    {
      name: "timeZone",
      label: "Time Zone",
      type: "select",
      description: "This helps us match you with players in similar time zones",
      required: true,
      validation: z.string().min(1),
      options: [
        { value: "UTC-8", label: "Pacific Time (UTC-8)" },
        { value: "UTC-7", label: "Mountain Time (UTC-7)" },
        { value: "UTC-6", label: "Central Time (UTC-6)" },
        { value: "UTC-5", label: "Eastern Time (UTC-5)" },
        { value: "UTC+0", label: "GMT (UTC+0)" },
        { value: "UTC+1", label: "Central European Time (UTC+1)" },
        { value: "UTC+8", label: "China Standard Time (UTC+8)" },
        { value: "UTC+9", label: "Japan Standard Time (UTC+9)" }
      ]
    }
  ]

  // Handle form submissions
  const handleRegistrationSubmit = async (values: any) => {
    console.log("Registration submitted:", values)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  const handleProfileSubmit = async (values: any) => {
    console.log("Profile submitted:", values)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Real-time Form Validation Demo</CardTitle>
          <CardDescription>
            Experience our comprehensive form validation system with live feedback, 
            async validation, and security features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeDemo} onValueChange={setActiveDemo}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="registration">User Registration</TabsTrigger>
              <TabsTrigger value="profile">Profile Setup</TabsTrigger>
            </TabsList>

            <TabsContent value="registration" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Real-time Validation</Badge>
                  <Badge variant="outline">Async Username Check</Badge>
                  <Badge variant="outline">Password Strength</Badge>
                  <Badge variant="outline">Security Patterns</Badge>
                </div>
                
                <ValidatedForm
                  title="Create Your Account"
                  description="Join our gaming community with secure registration"
                  fields={registrationFields}
                  schema={registrationSchema}
                  onSubmit={handleRegistrationSubmit}
                  initialValues={{
                    username: "",
                    email: "",
                    password: "",
                    confirmPassword: "",
                    acceptTerms: false
                  }}
                  showProgress={true}
                  showValidationSummary={true}
                  validateOnMount={false}
                  validateOnChange={true}
                  validateOnBlur={true}
                  debounceMs={300}
                />
              </div>
            </TabsContent>

            <TabsContent value="profile" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Multi-select Validation</Badge>
                  <Badge variant="outline">Character Counting</Badge>
                  <Badge variant="outline">Auto-resize Textarea</Badge>
                  <Badge variant="outline">Complex Schemas</Badge>
                </div>
                
                <ValidatedForm
                  title="Complete Your Gaming Profile"
                  description="Help us personalize your experience and connect you with like-minded gamers"
                  fields={profileFields}
                  schema={profileSchema}
                  onSubmit={handleProfileSubmit}
                  initialValues={{
                    displayName: "",
                    bio: "",
                    favoriteGenres: [],
                    platforms: [],
                    playStyle: "",
                    availableHours: "",
                    timeZone: ""
                  }}
                  showProgress={true}
                  showValidationSummary={true}
                  validateOnMount={false}
                  validateOnChange={true}
                  validateOnBlur={true}
                  debounceMs={400}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Feature Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Features</CardTitle>
          <CardDescription>
            Our form validation system includes these powerful features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Real-time Validation</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Live validation as you type</li>
                <li>• Debounced validation to prevent spam</li>
                <li>• Visual feedback with icons and colors</li>
                <li>• Progress tracking and completion status</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Advanced Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Async validation (username availability)</li>
                <li>• Password strength indicators</li>
                <li>• Multi-select with limits</li>
                <li>• Character counting and limits</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Security & UX</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• XSS and injection protection</li>
                <li>• Input sanitization</li>
                <li>• Accessible form controls</li>
                <li>• Mobile-friendly design</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Developer Experience</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• TypeScript support</li>
                <li>• Zod schema integration</li>
                <li>• Customizable validation rules</li>
                <li>• Easy form field configuration</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
