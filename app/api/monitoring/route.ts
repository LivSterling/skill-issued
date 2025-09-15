import { NextRequest, NextResponse } from 'next/server'
import { 
  apiLogger, 
  getHealthStatus, 
  getPerformanceReport,
  LogLevel 
} from '@/lib/utils/api-logger'

/**
 * GET /api/monitoring - Get API monitoring data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'health'
    const format = searchParams.get('format') || 'json'
    
    // Simple authentication check (you might want to enhance this)
    const authHeader = request.headers.get('authorization')
    const isAuthorized = authHeader === `Bearer ${process.env.MONITORING_TOKEN}` || 
                        process.env.NODE_ENV === 'development'
    
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized access to monitoring endpoint' },
        { status: 401 }
      )
    }

    switch (type) {
      case 'health':
        const healthStatus = getHealthStatus()
        return NextResponse.json(healthStatus, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Content-Type': 'application/json'
          }
        })

      case 'metrics':
        const metrics = apiLogger.getMetrics()
        return NextResponse.json(metrics, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Content-Type': 'application/json'
          }
        })

      case 'performance':
        const performanceReport = getPerformanceReport()
        return NextResponse.json(performanceReport, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Content-Type': 'application/json'
          }
        })

      case 'logs':
        const limit = parseInt(searchParams.get('limit') || '100')
        const logs = apiLogger.getRecentLogs(limit)
        
        if (format === 'csv') {
          const csvData = apiLogger.exportLogs('csv')
          return new NextResponse(csvData, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="api-logs.csv"',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          })
        }
        
        return NextResponse.json({ logs }, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Content-Type': 'application/json'
          }
        })

      case 'errors':
        const errorSummary = apiLogger.getErrorSummary()
        return NextResponse.json(errorSummary, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Content-Type': 'application/json'
          }
        })

      case 'export':
        const exportData = apiLogger.exportLogs(format as 'json' | 'csv')
        const contentType = format === 'csv' ? 'text/csv' : 'application/json'
        const filename = `api-monitoring-${new Date().toISOString().split('T')[0]}.${format}`
        
        return new NextResponse(exportData, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        })

      default:
        return NextResponse.json(
          { 
            error: 'Invalid monitoring type',
            availableTypes: ['health', 'metrics', 'performance', 'logs', 'errors', 'export']
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Monitoring API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/monitoring - Control monitoring settings
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const authHeader = request.headers.get('authorization')
    const isAuthorized = authHeader === `Bearer ${process.env.MONITORING_TOKEN}` || 
                        process.env.NODE_ENV === 'development'
    
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized access to monitoring endpoint' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'reset-metrics':
        apiLogger.resetMetrics()
        return NextResponse.json({ 
          success: true, 
          message: 'Metrics reset successfully' 
        })

      case 'set-log-level':
        const level = params.level as keyof typeof LogLevel
        if (level in LogLevel) {
          // Note: This would require modifying the logger to accept dynamic log level changes
          return NextResponse.json({ 
            success: true, 
            message: `Log level would be set to ${level}`,
            note: 'Dynamic log level changes not implemented yet'
          })
        } else {
          return NextResponse.json(
            { error: 'Invalid log level', availableLevels: Object.keys(LogLevel) },
            { status: 400 }
          )
        }

      default:
        return NextResponse.json(
          { 
            error: 'Invalid action',
            availableActions: ['reset-metrics', 'set-log-level']
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Monitoring control error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
      },
      { status: 500 }
    )
  }
}
