import { createClient } from '@/lib/supabase/server'

// ============================================================================
// SEARCH CACHE INTERFACES
// ============================================================================

export interface SearchCacheEntry {
  id: string
  query: string
  filters: Record<string, any>
  results: any[]
  total_results: number
  response_time: number
  popularity_score: number
  created_at: string
  updated_at: string
  expires_at: string
  hit_count: number
  last_accessed: string
}

export interface SearchAnalyticsData {
  query: string
  filters: Record<string, any>
  results_count: number
  response_time: number
  user_id?: string
  timestamp: string
  cache_hit: boolean
  source: 'cache' | 'api' | 'database'
}

export interface PopularSearchQuery {
  query: string
  search_count: number
  avg_response_time: number
  last_searched: string
  popularity_trend: 'rising' | 'stable' | 'declining'
}

// ============================================================================
// SEARCH CACHE CONFIGURATION
// ============================================================================

const CACHE_CONFIG = {
  // Cache TTL for different types of searches
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  POPULAR_SEARCH_TTL: 30 * 60 * 1000, // 30 minutes
  TRENDING_SEARCH_TTL: 15 * 60 * 1000, // 15 minutes
  
  // Cache size limits
  MAX_CACHE_ENTRIES: 1000,
  MAX_POPULAR_SEARCHES: 100,
  
  // Analytics configuration
  ANALYTICS_RETENTION_DAYS: 30,
  POPULARITY_CALCULATION_WINDOW: 7, // days
  
  // Performance thresholds
  SLOW_QUERY_THRESHOLD: 2000, // ms
  CACHE_PRIORITY_THRESHOLD: 5, // minimum hit count for priority caching
  
  // Background task intervals
  CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour
  ANALYTICS_BATCH_SIZE: 100
} as const

// ============================================================================
// SEARCH CACHE SERVICE CLASS
// ============================================================================

export class SearchCacheService {
  private static instance: SearchCacheService
  private cleanupTimer?: NodeJS.Timeout
  private analyticsBuffer: SearchAnalyticsData[] = []
  
  private constructor() {
    this.initializeCleanupTimer()
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): SearchCacheService {
    if (!SearchCacheService.instance) {
      SearchCacheService.instance = new SearchCacheService()
    }
    return SearchCacheService.instance
  }
  
  // ============================================================================
  // CACHE OPERATIONS
  // ============================================================================
  
  /**
   * Generate cache key for search query
   */
  private generateCacheKey(query: string, filters: Record<string, any>): string {
    const normalizedQuery = query.toLowerCase().trim()
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((result, key) => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          result[key] = filters[key]
        }
        return result
      }, {} as any)
    
    const filterString = JSON.stringify(sortedFilters)
    return `search:${normalizedQuery}:${Buffer.from(filterString).toString('base64').substring(0, 16)}`
  }
  
  /**
   * Get cached search results
   */
  async getCachedSearch(
    query: string,
    filters: Record<string, any> = {}
  ): Promise<SearchCacheEntry | null> {
    try {
      const supabase = createClient()
      const cacheKey = this.generateCacheKey(query, filters)
      
      const { data, error } = await supabase
        .from('search_cache')
        .select('*')
        .eq('id', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single()
      
      if (error || !data) {
        return null
      }
      
      // Update hit count and last accessed time
      await this.updateCacheHit(cacheKey)
      
      return data
    } catch (error) {
      console.warn('Failed to retrieve cached search:', error)
      return null
    }
  }
  
  /**
   * Cache search results
   */
  async cacheSearchResults(
    query: string,
    filters: Record<string, any>,
    results: any[],
    totalResults: number,
    responseTime: number,
    userId?: string
  ): Promise<void> {
    try {
      const supabase = createClient()
      const cacheKey = this.generateCacheKey(query, filters)
      const now = new Date()
      const expiresAt = new Date(now.getTime() + this.getCacheTTL(query, filters))
      
      // Calculate popularity score based on various factors
      const popularityScore = await this.calculatePopularityScore(query, totalResults, responseTime)
      
      const cacheEntry: Partial<SearchCacheEntry> = {
        id: cacheKey,
        query: query.toLowerCase().trim(),
        filters,
        results: results.slice(0, 20), // Cache first 20 results
        total_results: totalResults,
        response_time: responseTime,
        popularity_score: popularityScore,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        hit_count: 0,
        last_accessed: now.toISOString()
      }
      
      await supabase
        .from('search_cache')
        .upsert(cacheEntry, { onConflict: 'id' })
      
      // Track analytics
      this.trackSearchAnalytics({
        query,
        filters,
        results_count: totalResults,
        response_time: responseTime,
        user_id: userId,
        timestamp: now.toISOString(),
        cache_hit: false,
        source: 'api'
      })
      
      console.log(`Cached search results for "${query}" (${totalResults} results)`)
      
    } catch (error) {
      console.warn('Failed to cache search results:', error)
    }
  }
  
  /**
   * Update cache hit statistics
   */
  private async updateCacheHit(cacheKey: string): Promise<void> {
    try {
      const supabase = createClient()
      
      await supabase
        .from('search_cache')
        .update({
          hit_count: supabase.rpc('increment_hit_count'),
          last_accessed: new Date().toISOString()
        })
        .eq('id', cacheKey)
        
    } catch (error) {
      console.warn('Failed to update cache hit:', error)
    }
  }
  
  /**
   * Get cache TTL based on search characteristics
   */
  private getCacheTTL(query: string, filters: Record<string, any>): number {
    // Longer TTL for popular searches
    if (this.isPopularSearch(query)) {
      return CACHE_CONFIG.POPULAR_SEARCH_TTL
    }
    
    // Longer TTL for trending searches (date-based filters)
    if (filters.dates || filters.year) {
      return CACHE_CONFIG.TRENDING_SEARCH_TTL
    }
    
    return CACHE_CONFIG.DEFAULT_TTL
  }
  
  /**
   * Check if search is popular
   */
  private isPopularSearch(query: string): boolean {
    // This would typically check against a popular searches table
    // For now, use simple heuristics
    const popularTerms = [
      'action', 'rpg', 'adventure', 'strategy', 'shooter', 'puzzle',
      'indie', 'multiplayer', 'singleplayer', 'open world', 'horror'
    ]
    
    return popularTerms.some(term => 
      query.toLowerCase().includes(term.toLowerCase())
    )
  }
  
  /**
   * Calculate popularity score for caching priority
   */
  private async calculatePopularityScore(
    query: string,
    totalResults: number,
    responseTime: number
  ): Promise<number> {
    let score = 0
    
    // Base score from result count
    score += Math.min(totalResults / 100, 10)
    
    // Bonus for fast response times
    if (responseTime < 1000) score += 5
    else if (responseTime < 2000) score += 3
    else if (responseTime > CACHE_CONFIG.SLOW_QUERY_THRESHOLD) score -= 2
    
    // Bonus for popular search terms
    if (this.isPopularSearch(query)) score += 10
    
    // Bonus for short, common queries
    if (query.length <= 10) score += 3
    
    return Math.max(0, Math.min(100, score))
  }
  
  // ============================================================================
  // ANALYTICS AND POPULAR SEARCHES
  // ============================================================================
  
  /**
   * Track search analytics
   */
  private trackSearchAnalytics(data: SearchAnalyticsData): void {
    this.analyticsBuffer.push(data)
    
    // Batch process analytics
    if (this.analyticsBuffer.length >= CACHE_CONFIG.ANALYTICS_BATCH_SIZE) {
      this.flushAnalytics()
    }
  }
  
  /**
   * Flush analytics buffer to database
   */
  private async flushAnalytics(): Promise<void> {
    if (this.analyticsBuffer.length === 0) return
    
    try {
      const supabase = createClient()
      const batch = this.analyticsBuffer.splice(0, CACHE_CONFIG.ANALYTICS_BATCH_SIZE)
      
      await supabase
        .from('search_analytics')
        .insert(batch)
      
      console.log(`Flushed ${batch.length} search analytics entries`)
      
    } catch (error) {
      console.warn('Failed to flush search analytics:', error)
      // Re-add failed entries to buffer
      this.analyticsBuffer.unshift(...this.analyticsBuffer)
    }
  }
  
  /**
   * Get popular search queries
   */
  async getPopularSearches(limit: number = 10): Promise<PopularSearchQuery[]> {
    try {
      const supabase = createClient()
      
      // Get popular searches from analytics
      const { data, error } = await supabase
        .from('search_analytics')
        .select('query')
        .gte('timestamp', new Date(Date.now() - CACHE_CONFIG.POPULARITY_CALCULATION_WINDOW * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(1000)
      
      if (error || !data) {
        return []
      }
      
      // Aggregate and rank queries
      const queryStats = new Map<string, {
        count: number
        totalResponseTime: number
        lastSearched: string
      }>()
      
      data.forEach((entry: any) => {
        const query = entry.query?.toLowerCase().trim()
        if (!query) return
        
        const existing = queryStats.get(query) || { 
          count: 0, 
          totalResponseTime: 0, 
          lastSearched: entry.timestamp 
        }
        
        existing.count++
        existing.totalResponseTime += entry.response_time || 0
        if (entry.timestamp > existing.lastSearched) {
          existing.lastSearched = entry.timestamp
        }
        
        queryStats.set(query, existing)
      })
      
      // Convert to sorted array
      const popularSearches: PopularSearchQuery[] = Array.from(queryStats.entries())
        .map(([query, stats]) => ({
          query,
          search_count: stats.count,
          avg_response_time: Math.round(stats.totalResponseTime / stats.count),
          last_searched: stats.lastSearched,
          popularity_trend: this.calculateTrend(stats) // Simplified trend calculation
        }))
        .sort((a, b) => b.search_count - a.search_count)
        .slice(0, limit)
      
      return popularSearches
      
    } catch (error) {
      console.warn('Failed to get popular searches:', error)
      return []
    }
  }
  
  /**
   * Calculate popularity trend (simplified)
   */
  private calculateTrend(stats: { count: number; lastSearched: string }): 'rising' | 'stable' | 'declining' {
    const daysSinceLastSearch = (Date.now() - new Date(stats.lastSearched).getTime()) / (24 * 60 * 60 * 1000)
    
    if (daysSinceLastSearch < 1 && stats.count > 5) return 'rising'
    if (daysSinceLastSearch > 3) return 'declining'
    return 'stable'
  }
  
  /**
   * Get search suggestions based on popular queries
   */
  async getSearchSuggestions(partialQuery: string, limit: number = 8): Promise<string[]> {
    try {
      const popular = await this.getPopularSearches(50)
      const normalizedQuery = partialQuery.toLowerCase().trim()
      
      const suggestions = popular
        .filter(p => p.query.includes(normalizedQuery) && p.query !== normalizedQuery)
        .slice(0, limit)
        .map(p => p.query)
      
      return suggestions
      
    } catch (error) {
      console.warn('Failed to get search suggestions:', error)
      return []
    }
  }
  
  // ============================================================================
  // CACHE MAINTENANCE
  // ============================================================================
  
  /**
   * Initialize cleanup timer
   */
  private initializeCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performMaintenance()
    }, CACHE_CONFIG.CLEANUP_INTERVAL)
  }
  
  /**
   * Perform cache maintenance
   */
  private async performMaintenance(): Promise<void> {
    try {
      await Promise.all([
        this.cleanupExpiredEntries(),
        this.cleanupLowPriorityEntries(),
        this.flushAnalytics(),
        this.updatePopularityScores()
      ])
      
      console.log('Search cache maintenance completed')
      
    } catch (error) {
      console.warn('Search cache maintenance failed:', error)
    }
  }
  
  /**
   * Clean up expired cache entries
   */
  private async cleanupExpiredEntries(): Promise<void> {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('search_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
      
      if (error) {
        console.warn('Failed to cleanup expired cache entries:', error)
      }
      
    } catch (error) {
      console.warn('Error during expired entries cleanup:', error)
    }
  }
  
  /**
   * Clean up low priority cache entries when approaching limits
   */
  private async cleanupLowPriorityEntries(): Promise<void> {
    try {
      const supabase = createClient()
      
      // Count current entries
      const { count } = await supabase
        .from('search_cache')
        .select('*', { count: 'exact', head: true })
      
      if (!count || count < CACHE_CONFIG.MAX_CACHE_ENTRIES) {
        return
      }
      
      // Remove lowest priority entries
      const entriesToRemove = count - CACHE_CONFIG.MAX_CACHE_ENTRIES + 100 // Remove extra for buffer
      
      const { data: lowPriorityEntries } = await supabase
        .from('search_cache')
        .select('id')
        .order('popularity_score', { ascending: true })
        .order('hit_count', { ascending: true })
        .limit(entriesToRemove)
      
      if (lowPriorityEntries && lowPriorityEntries.length > 0) {
        const idsToDelete = lowPriorityEntries.map(entry => entry.id)
        
        await supabase
          .from('search_cache')
          .delete()
          .in('id', idsToDelete)
        
        console.log(`Cleaned up ${idsToDelete.length} low-priority cache entries`)
      }
      
    } catch (error) {
      console.warn('Error during low-priority entries cleanup:', error)
    }
  }
  
  /**
   * Update popularity scores based on recent activity
   */
  private async updatePopularityScores(): Promise<void> {
    try {
      const supabase = createClient()
      
      // Get entries that need popularity score updates
      const { data: entries } = await supabase
        .from('search_cache')
        .select('id, query, hit_count, response_time, total_results')
        .gt('hit_count', CACHE_CONFIG.CACHE_PRIORITY_THRESHOLD)
      
      if (!entries || entries.length === 0) return
      
      // Update popularity scores
      const updates = entries.map(async (entry) => {
        const newScore = await this.calculatePopularityScore(
          entry.query,
          entry.total_results,
          entry.response_time
        )
        
        // Add bonus for high hit count
        const hitBonus = Math.min(entry.hit_count / 10, 20)
        const finalScore = Math.min(100, newScore + hitBonus)
        
        return supabase
          .from('search_cache')
          .update({ popularity_score: finalScore })
          .eq('id', entry.id)
      })
      
      await Promise.all(updates)
      console.log(`Updated popularity scores for ${entries.length} cache entries`)
      
    } catch (error) {
      console.warn('Error updating popularity scores:', error)
    }
  }
  
  /**
   * Clean up old analytics data
   */
  async cleanupOldAnalytics(): Promise<void> {
    try {
      const supabase = createClient()
      const cutoffDate = new Date(Date.now() - CACHE_CONFIG.ANALYTICS_RETENTION_DAYS * 24 * 60 * 60 * 1000)
      
      const { error } = await supabase
        .from('search_analytics')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
      
      if (error) {
        console.warn('Failed to cleanup old analytics:', error)
      } else {
        console.log('Cleaned up old search analytics data')
      }
      
    } catch (error) {
      console.warn('Error during analytics cleanup:', error)
    }
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number
    hitRate: number
    avgResponseTime: number
    popularSearches: number
    cacheSize: string
  }> {
    try {
      const supabase = createClient()
      
      const [
        { count: totalEntries },
        { data: hitData },
        { data: responseData },
        { count: popularCount }
      ] = await Promise.all([
        supabase.from('search_cache').select('*', { count: 'exact', head: true }),
        supabase.from('search_cache').select('hit_count'),
        supabase.from('search_cache').select('response_time'),
        supabase.from('search_cache').select('*', { count: 'exact', head: true }).gt('hit_count', 5)
      ])
      
      const totalHits = hitData?.reduce((sum, entry) => sum + (entry.hit_count || 0), 0) || 0
      const hitRate = totalEntries ? (totalHits / totalEntries) : 0
      
      const avgResponseTime = responseData?.length 
        ? responseData.reduce((sum, entry) => sum + (entry.response_time || 0), 0) / responseData.length
        : 0
      
      return {
        totalEntries: totalEntries || 0,
        hitRate: Math.round(hitRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime),
        popularSearches: popularCount || 0,
        cacheSize: `${Math.round((totalEntries || 0) * 0.1)}KB` // Rough estimate
      }
      
    } catch (error) {
      console.warn('Failed to get cache stats:', error)
      return {
        totalEntries: 0,
        hitRate: 0,
        avgResponseTime: 0,
        popularSearches: 0,
        cacheSize: '0KB'
      }
    }
  }
  
  /**
   * Clear all cache (admin function)
   */
  async clearAllCache(): Promise<void> {
    try {
      const supabase = createClient()
      
      await supabase.from('search_cache').delete().neq('id', '')
      console.log('All search cache cleared')
      
    } catch (error) {
      console.warn('Failed to clear cache:', error)
      throw error
    }
  }
  
  /**
   * Destroy service and cleanup timers
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
    
    // Flush any remaining analytics
    this.flushAnalytics()
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const searchCacheService = SearchCacheService.getInstance()
