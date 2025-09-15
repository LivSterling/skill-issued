"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  useSecureInput, 
  useSecureUrlInput, 
  useSecureEmailInput,
  sanitizeUserInput
} from "@/hooks/use-secure-input"
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  EyeOff,
  Code,
  Globe,
  Mail,
  FileText
} from "lucide-react"

// XSS test payloads for demonstration
const XSS_TEST_PAYLOADS = [
  '<script>alert("XSS")</script>',
  'javascript:alert("XSS")',
  '<img src="x" onerror="alert(\'XSS\')">',
  '<svg onload="alert(\'XSS\')">',
  '"><script>alert("XSS")</script>',
  '<iframe src="javascript:alert(\'XSS\')"></iframe>',
  '<object data="javascript:alert(\'XSS\')"></object>',
  '<embed src="javascript:alert(\'XSS\')">',
  '<form><input formaction="javascript:alert(\'XSS\')">',
  'data:text/html,<script>alert("XSS")</script>',
  'vbscript:alert("XSS")',
  '<style>@import"javascript:alert(\'XSS\')"</style>'
]

// SQL injection test payloads
const SQL_INJECTION_PAYLOADS = [
  "'; DROP TABLE users; --",
  "' OR '1'='1",
  "admin'--",
  "' UNION SELECT * FROM users--",
  "1; DELETE FROM users WHERE 1=1--",
  "' OR 1=1#",
  "'; EXEC xp_cmdshell('dir'); --"
]

function SecurityTestCard({ 
  title, 
  description, 
  testPayloads, 
  useSecureHook 
}: {
  title: string
  description: string
  testPayloads: string[]
  useSecureHook: any
}) {
  const [selectedPayload, setSelectedPayload] = useState('')
  const [showPayloads, setShowPayloads] = useState(false)
  
  const secureInput = useSecureHook(selectedPayload, {
    validateOnChange: true,
    onThreatDetected: (threats: string[]) => {
      console.log('Threats detected:', threats)
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Payloads */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Test Payloads</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPayloads(!showPayloads)}
            >
              {showPayloads ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPayloads ? 'Hide' : 'Show'} Payloads
            </Button>
          </div>
          
          {showPayloads && (
            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
              {testPayloads.map((payload, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="justify-start text-left font-mono text-xs"
                  onClick={() => {
                    setSelectedPayload(payload)
                    secureInput.setValue(payload)
                  }}
                >
                  {payload}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Input Field */}
        <div>
          <Label>Test Input</Label>
          <Textarea
            value={secureInput.value}
            onChange={(e) => secureInput.setValue(e.target.value)}
            placeholder="Enter text to test security validation..."
            className="font-mono"
          />
        </div>

        {/* Security Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Security Status:</Label>
            <Badge className={secureInput.isSecure ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {secureInput.isSecure ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : (
                <XCircle className="h-3 w-3 mr-1" />
              )}
              {secureInput.isSecure ? 'SECURE' : 'THREATS DETECTED'}
            </Badge>
          </div>

          {/* Threat Details */}
          {secureInput.hasThreats && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-semibold">Security threats detected:</p>
                  {secureInput.threats.map((threat: string, index: number) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium">{threat}</span>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Sanitized Output */}
        <div>
          <Label>Sanitized Output</Label>
          <div className="p-3 bg-gray-50 rounded-md border">
            <pre className="text-sm font-mono whitespace-pre-wrap">
              {secureInput.sanitizedValue || '(empty)'}
            </pre>
          </div>
        </div>

        {/* Comparison */}
        {secureInput.value !== secureInput.sanitizedValue && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-red-600">Original (Dangerous)</Label>
              <div className="p-3 bg-red-50 rounded-md border border-red-200">
                <pre className="text-sm font-mono whitespace-pre-wrap text-red-800">
                  {secureInput.value}
                </pre>
              </div>
            </div>
            <div>
              <Label className="text-green-600">Sanitized (Safe)</Label>
              <div className="p-3 bg-green-50 rounded-md border border-green-200">
                <pre className="text-sm font-mono whitespace-pre-wrap text-green-800">
                  {secureInput.sanitizedValue}
                </pre>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function SecurityDemoPage() {
  const [customInput, setCustomInput] = useState('')
  const [customResult, setCustomResult] = useState<any>(null)

  const testCustomInput = () => {
    const result = sanitizeUserInput(customInput, {
      allowHtml: false,
      stripScripts: true,
      encodeEntities: true
    })
    setCustomResult(result)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Security & XSS Protection Demo</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Experience our comprehensive input sanitization and XSS protection system. 
              Test various attack vectors and see how our security measures protect your application.
            </p>
            
            <div className="flex items-center justify-center gap-4">
              <Badge variant="outline" className="text-green-600 border-green-200">
                <Shield className="h-3 w-3 mr-1" />
                Real-time Protection
              </Badge>
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                <Code className="h-3 w-3 mr-1" />
                Input Sanitization
              </Badge>
              <Badge variant="outline" className="text-purple-600 border-purple-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Threat Detection
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="xss" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="xss">XSS Protection</TabsTrigger>
              <TabsTrigger value="sql">SQL Injection</TabsTrigger>
              <TabsTrigger value="url">URL & Email</TabsTrigger>
              <TabsTrigger value="custom">Custom Testing</TabsTrigger>
            </TabsList>

            <TabsContent value="xss">
              <SecurityTestCard
                title="XSS (Cross-Site Scripting) Protection"
                description="Test various XSS attack vectors and see how our protection system neutralizes them."
                testPayloads={XSS_TEST_PAYLOADS}
                useSecureHook={useSecureInput}
              />
            </TabsContent>

            <TabsContent value="sql">
              <SecurityTestCard
                title="SQL Injection Protection"
                description="Test SQL injection attempts and see how our system detects and prevents them."
                testPayloads={SQL_INJECTION_PAYLOADS}
                useSecureHook={useSecureInput}
              />
            </TabsContent>

            <TabsContent value="url">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    URL & Email Validation
                  </CardTitle>
                  <CardDescription>
                    Test URL and email sanitization to prevent dangerous protocols and malformed addresses.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* URL Testing */}
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        URL Sanitization
                      </h3>
                      
                      <SecurityTestCard
                        title=""
                        description=""
                        testPayloads={[
                          'https://example.com',
                          'javascript:alert("XSS")',
                          'data:text/html,<script>alert("XSS")</script>',
                          'vbscript:alert("XSS")',
                          'file:///etc/passwd'
                        ]}
                        useSecureHook={useSecureUrlInput}
                      />
                    </div>

                    {/* Email Testing */}
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Sanitization
                      </h3>
                      
                      <SecurityTestCard
                        title=""
                        description=""
                        testPayloads={[
                          'user@example.com',
                          'user+tag@example.com',
                          'user@example.com<script>alert("XSS")</script>',
                          'javascript:alert("XSS")@example.com',
                          '"<script>alert(\'XSS\')</script>"@example.com'
                        ]}
                        useSecureHook={useSecureEmailInput}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="custom">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Custom Security Testing
                  </CardTitle>
                  <CardDescription>
                    Test your own input with our security validation system.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Custom Input</Label>
                    <Textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Enter any text to test security validation..."
                      className="font-mono"
                      rows={4}
                    />
                  </div>

                  <Button onClick={testCustomInput} className="w-full">
                    <Shield className="h-4 w-4 mr-2" />
                    Test Security
                  </Button>

                  {customResult && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Label>Security Status:</Label>
                        <Badge className={
                          customResult.isSecure 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }>
                          {customResult.isSecure ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {customResult.isSecure ? 'SECURE' : 'THREATS DETECTED'}
                        </Badge>
                      </div>

                      {customResult.threats.length > 0 && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              <p className="font-semibold">Security threats detected:</p>
                              {customResult.threats.map((threat: string, index: number) => (
                                <div key={index} className="text-sm">
                                  <span className="font-medium">{threat}</span>
                                </div>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Original Input</Label>
                          <div className="p-3 bg-gray-50 rounded-md border">
                            <pre className="text-sm font-mono whitespace-pre-wrap">
                              {customResult.originalValue}
                            </pre>
                          </div>
                        </div>
                        <div>
                          <Label>Sanitized Output</Label>
                          <div className="p-3 bg-green-50 rounded-md border border-green-200">
                            <pre className="text-sm font-mono whitespace-pre-wrap">
                              {customResult.sanitizedValue}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Security Features Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Security Features</CardTitle>
              <CardDescription>
                Our comprehensive security system includes these protection mechanisms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Input Sanitization
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• XSS attack prevention</li>
                    <li>• SQL injection detection</li>
                    <li>• HTML tag filtering</li>
                    <li>• Script removal</li>
                    <li>• Event handler stripping</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Real-time Validation
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Instant threat detection</li>
                    <li>• Live input sanitization</li>
                    <li>• Pattern matching</li>
                    <li>• Threat categorization</li>
                    <li>• Security feedback</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Developer Tools
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• React hooks for security</li>
                    <li>• Customizable sanitization</li>
                    <li>• Threat logging</li>
                    <li>• Security callbacks</li>
                    <li>• Testing utilities</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
