"use client"

import { useState } from 'react'
import { useProfileCacheMetrics, useProfileCacheOperations, useProfileCacheDebug } from '@/hooks/use-profile-cache'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Activity, 
  Database, 
  Zap, 
  Trash2, 
  RefreshCw, 
  Download, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react'

interface CacheMonitorProps {
  className?: string
  compact?: boolean
}

export function CacheMonitor({ className = "", compact = false }: CacheMonitorProps) {
  const { metrics, events, hitRate, clearEvents } = useProfileCacheMetrics()
  const { 
    clearCache, 
    optimizeCache, 
    exportCacheState, 
    isOptimizing 
  } = useProfileCacheOperations()
  const {
    debugMode,
    setDebugMode,
    performanceLog,
    clearPerformanceLog,
    getCacheReport
  } = useProfileCacheDebug()

  const [showReport, setShowReport] = useState(false)
  const [report, setReport] = useState<any>(null)

  const handleExportReport = () => {
    const cacheReport = getCacheReport()
    setReport(cacheReport)
    setShowReport(true)
  }

  const handleDownloadReport = () => {
    if (!report) return
    
    const dataStr = JSON.stringify(report, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `profile-cache-report-${new Date().toISOString()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Cache Status
              </h4>
              <Badge variant={hitRate > 70 ? "default" : hitRate > 40 ? "secondary" : "destructive"}>
                {hitRate.toFixed(1)}% hit rate
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium">{metrics.cacheSize}</div>
                <div className="text-muted-foreground">Cached</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{metrics.hits}</div>
                <div className="text-muted-foreground">Hits</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{metrics.misses}</div>
                <div className="text-muted-foreground">Misses</div>
              </div>
            </div>
            
            <Progress value={hitRate} className="h-2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Profile Cache Monitor
            </CardTitle>
            <CardDescription>
              Monitor and manage profile cache performance
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="debug-mode" className="text-sm">Debug Mode</Label>
            <Switch
              id="debug-mode"
              checked={debugMode}
              onCheckedChange={setDebugMode}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="metrics" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{hitRate.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Hit Rate</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{metrics.cacheSize}</div>
                    <div className="text-sm text-muted-foreground">Cache Size</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{formatBytes(metrics.memoryUsage)}</div>
                    <div className="text-sm text-muted-foreground">Memory Usage</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{formatDuration(metrics.averageResponseTime)}</div>
                    <div className="text-sm text-muted-foreground">Avg Response</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Cache Hit Rate</span>
                  <span>{hitRate.toFixed(1)}%</span>
                </div>
                <Progress value={hitRate} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Cache Statistics</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total Requests:</span>
                      <span>{metrics.totalRequests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cache Hits:</span>
                      <span className="text-green-600">{metrics.hits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cache Misses:</span>
                      <span className="text-red-600">{metrics.misses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Evictions:</span>
                      <span>{metrics.evictions}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Performance</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Avg Response Time:</span>
                      <span>{formatDuration(metrics.averageResponseTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory Usage:</span>
                      <span>{formatBytes(metrics.memoryUsage)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cache Size:</span>
                      <span>{metrics.cacheSize} profiles</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Recent Cache Events</h4>
              <Button variant="outline" size="sm" onClick={clearEvents}>
                Clear Events
              </Button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {events.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No events recorded yet
                </div>
              ) : (
                events.slice(-20).reverse().map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                    <div className="flex items-center gap-2">
                      {event.type === 'hit' && <CheckCircle className="h-3 w-3 text-green-600" />}
                      {event.type === 'miss' && <AlertTriangle className="h-3 w-3 text-red-600" />}
                      {event.type === 'set' && <Database className="h-3 w-3 text-blue-600" />}
                      {event.type === 'evict' && <Trash2 className="h-3 w-3 text-orange-600" />}
                      {event.type === 'clear' && <RefreshCw className="h-3 w-3 text-purple-600" />}
                      
                      <span className="font-medium capitalize">{event.type}</span>
                      {'profileId' in event && (
                        <span className="text-muted-foreground">
                          {event.profileId.slice(0, 8)}...
                        </span>
                      )}
                      {'reason' in event && (
                        <Badge variant="outline" className="text-xs">
                          {event.reason}
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            {debugMode ? (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Performance Log</h4>
                  <Button variant="outline" size="sm" onClick={clearPerformanceLog}>
                    Clear Log
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {performanceLog.length === 0 ? (
                    <div className="text-center text-muted-foreground py-4">
                      No performance data recorded yet
                    </div>
                  ) : (
                    performanceLog.slice(-20).reverse().map((log, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>{log.operation}</span>
                          <Badge variant={log.cacheHit ? "default" : "secondary"} className="text-xs">
                            {log.cacheHit ? 'Cache Hit' : 'Cache Miss'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{formatDuration(log.duration)}</span>
                          <span className="text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertDescription>
                  Enable debug mode to see detailed performance logging.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-2">Cache Management</h4>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={optimizeCache}
                      disabled={isOptimizing}
                    >
                      {isOptimizing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Optimizing...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Optimize Cache
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={clearCache}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Cache
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-2">Reporting</h4>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleExportReport}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                    
                    {report && (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={handleDownloadReport}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Report
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {showReport && report && (
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-2">Cache Report</h4>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <strong>Hit Rate:</strong> {report.hitRate.toFixed(1)}%
                    </div>
                    <div className="text-sm">
                      <strong>Cache Size:</strong> {report.size} profiles
                    </div>
                    <div className="text-sm">
                      <strong>Memory Usage:</strong> {formatBytes(report.metrics.memoryUsage)}
                    </div>
                    
                    {report.recommendations && report.recommendations.length > 0 && (
                      <div className="mt-4">
                        <h5 className="font-medium mb-2">Recommendations:</h5>
                        <ul className="space-y-1">
                          {report.recommendations.map((rec: string, index: number) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                              <AlertTriangle className="h-3 w-3" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
