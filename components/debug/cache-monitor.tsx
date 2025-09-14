"use client"

import { useState, useEffect } from 'react'
import { useCacheManager, useRealtimeUpdates } from '@/hooks/use-social-cache'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Activity, 
  Database, 
  Zap, 
  BarChart3, 
  RefreshCw, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Users,
  Eye,
  Wifi,
  WifiOff
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface CacheMonitorProps {
  className?: string
  showRealtime?: boolean
}

export function CacheMonitor({ className = '', showRealtime = true }: CacheMonitorProps) {
  const { user } = useAuth()
  const {
    cacheStats,
    getStats,
    clearCache,
    invalidateUserData,
    warmUserCache,
    logPerformance,
    resetStats
  } = useCacheManager()

  const { isConnected, lastUpdate } = useRealtimeUpdates(user?.id)
  
  const [isVisible, setIsVisible] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Auto-refresh stats
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      getStats()
    }, 2000)

    return () => clearInterval(interval)
  }, [autoRefresh, getStats])

  // Initial stats load
  useEffect(() => {
    getStats()
  }, [getStats])

  // Toggle visibility
  if (!isVisible) {
    return (
      <div className={`fixed bottom-4 left-4 z-50 ${className}`}>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsVisible(true)}
          className="bg-background/80 backdrop-blur-sm"
        >
          <Database className="h-4 w-4 mr-2" />
          Cache Monitor
        </Button>
      </div>
    )
  }

  const hitRate = cacheStats?.hitRate || 0
  const missRate = cacheStats?.missRate || 0
  const totalRequests = (cacheStats?.hits || 0) + (cacheStats?.misses || 0)

  return (
    <div className={`fixed bottom-4 left-4 z-50 w-80 ${className}`}>
      <Card className="bg-background/95 backdrop-blur-sm border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5" />
              Cache Monitor
            </CardTitle>
            <div className="flex items-center gap-2">
              {showRealtime && (
                <div className="flex items-center gap-1">
                  {isConnected ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </div>
          <CardDescription>
            Real-time social data cache performance
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Cache Performance */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Hit Rate</span>
              <Badge variant={hitRate > 0.7 ? "default" : hitRate > 0.4 ? "secondary" : "destructive"}>
                {(hitRate * 100).toFixed(1)}%
              </Badge>
            </div>
            <Progress value={hitRate * 100} className="h-2" />
          </div>

          {/* Cache Statistics */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Hits</span>
                <span className="font-mono">{cacheStats?.hits || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Misses</span>
                <span className="font-mono">{cacheStats?.misses || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Size</span>
                <span className="font-mono">{cacheStats?.size || 0}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sets</span>
                <span className="font-mono">{cacheStats?.sets || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Evictions</span>
                <span className="font-mono">{cacheStats?.evictions || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono">{totalRequests}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Real-time Status */}
          {showRealtime && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">Real-time Updates</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>
              {lastUpdate && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Last Update</span>
                  <span>{formatDistanceToNow(lastUpdate, { addSuffix: true })}</span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Cache Actions */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => getStats()}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                {autoRefresh ? 'Pause' : 'Resume'}
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => warmUserCache()}
                className="text-xs"
              >
                <Zap className="h-3 w-3 mr-1" />
                Warm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => invalidateUserData()}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Invalidate
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={logPerformance}
                className="text-xs"
              >
                <BarChart3 className="h-3 w-3 mr-1" />
                Log Stats
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={resetStats}
                className="text-xs"
              >
                <TrendingDown className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>

            <Button
              size="sm"
              variant="destructive"
              onClick={clearCache}
              className="w-full text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear Cache
            </Button>
          </div>

          {/* Performance Indicators */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                {hitRate > 0.7 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : hitRate > 0.4 ? (
                  <Activity className="h-3 w-3 text-yellow-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span>
                  {hitRate > 0.7 ? 'Excellent' : hitRate > 0.4 ? 'Good' : 'Poor'} Performance
                </span>
              </div>
              <span>
                {totalRequests > 0 ? `${totalRequests} requests` : 'No requests'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Lightweight cache status indicator
export function CacheStatusIndicator({ className = '' }: { className?: string }) {
  const { cacheStats } = useCacheManager()
  const { isConnected } = useRealtimeUpdates()
  
  const hitRate = cacheStats?.hitRate || 0
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Cache Performance Indicator */}
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${
          hitRate > 0.7 ? 'bg-green-500' : 
          hitRate > 0.4 ? 'bg-yellow-500' : 
          'bg-red-500'
        }`} />
        <span className="text-xs text-muted-foreground">
          Cache {(hitRate * 100).toFixed(0)}%
        </span>
      </div>

      {/* Real-time Connection Indicator */}
      <div className="flex items-center gap-1">
        {isConnected ? (
          <Wifi className="h-3 w-3 text-green-500" />
        ) : (
          <WifiOff className="h-3 w-3 text-red-500" />
        )}
        <span className="text-xs text-muted-foreground">
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>
    </div>
  )
}
