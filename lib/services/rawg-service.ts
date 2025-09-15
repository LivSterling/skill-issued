import { rateLimitedRAWGCaller } from '@/lib/middleware/rate-limit'

interface RAWGGame {
    id: number
    slug: string
    name: string
    description: string
    released: string
    background_image: string
    rating: number
    rating_top: number
    ratings_count: number
    metacritic: number
    playtime: number
    genres: Array<{id: number, name: string}>
    platforms: Array<{platform: {id: number, name: string}}>
    developers: Array<{id: number, name: string}>
    publishers: Array<{id: number, name: string}>
    esrb_rating: {id: number, name: string} | null
    tags: Array<{id: number, name: string}>
  }

  interface RAWGError {
    error?: string
    detail?: string
    status?: number
  }

  interface RAWGResponse<T> {
    count?: number
    next?: string | null
    previous?: string | null
    results?: T[]
  }
  
  export class RAWGService {
    private apiKey: string
    private baseURL = 'https://api.rawg.io/api'
    private requestCount = 0
    private lastResetTime = Date.now()
  
    constructor(apiKey: string) {
      this.apiKey = apiKey
    }

    /**
     * Get current rate limit status
     */
    getRateLimitStatus(): { requestCount: number, resetTime: number, remaining: number } {
      const now = Date.now()
      const windowMs = 60 * 1000 // 1 minute window
      
      // Reset counter if window has passed
      if (now - this.lastResetTime >= windowMs) {
        this.requestCount = 0
        this.lastResetTime = now
      }

      const maxRequests = 30 // Conservative limit
      const remaining = Math.max(0, maxRequests - this.requestCount)

      return {
        requestCount: this.requestCount,
        resetTime: this.lastResetTime + windowMs,
        remaining
      }
    }

    /**
     * Make rate-limited API request
     */
    private async makeRequest<T>(url: string): Promise<T & RAWGError> {
      return rateLimitedRAWGCaller.callWithRateLimit(async () => {
        this.requestCount++
        
        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'GameApp/1.0 (Rate-Limited Client)',
            }
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw {
              status: response.status,
              error: response.statusText,
              detail: errorData.detail || errorData.error || 'API request failed',
              ...errorData
            }
          }

          const data = await response.json()
          return data
        } catch (error: any) {
          // Enhanced error handling for rate limiting
          if (error.status === 429) {
            console.warn('RAWG API rate limit exceeded:', error)
            throw {
              status: 429,
              error: 'Rate limit exceeded',
              detail: 'Too many requests to RAWG API'
            }
          }

          if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            console.warn('RAWG API connection issue:', error)
            throw {
              status: 503,
              error: 'Service unavailable',
              detail: 'RAWG API connection failed'
            }
          }

          throw error
        }
      })
    }
  
    /**
     * Get games with rate limiting and enhanced error handling
     */
    async getGames(params: {
      page?: number
      page_size?: number
      search?: string
      genres?: string
      platforms?: string
      dates?: string
      ordering?: string
      developers?: string
      publishers?: string
    } = {}): Promise<RAWGResponse<RAWGGame> & RAWGError> {
      // Clean up parameters - remove undefined/null values
      const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = String(value)
        }
        return acc
      }, {} as Record<string, string>)

      const searchParams = new URLSearchParams({
        key: this.apiKey,
        ...cleanParams
      })
      
      const url = `${this.baseURL}/games?${searchParams}`
      console.log(`RAWG API: Fetching games - ${url}`)
      
      return this.makeRequest<RAWGResponse<RAWGGame>>(url)
    }
  
    /**
     * Get individual game with rate limiting
     */
    async getGame(id: number): Promise<RAWGGame & RAWGError> {
      const url = `${this.baseURL}/games/${id}?key=${this.apiKey}`
      console.log(`RAWG API: Fetching game ${id} - ${url}`)
      
      return this.makeRequest<RAWGGame>(url)
    }
  
    /**
     * Search games with rate limiting
     */
    async searchGames(query: string, additionalParams: {
      page?: number
      page_size?: number
      ordering?: string
    } = {}): Promise<RAWGResponse<RAWGGame> & RAWGError> {
      return this.getGames({ 
        search: query.trim(),
        ...additionalParams
      })
    }

    /**
     * Get genres (cached/rate-limited)
     */
    async getGenres(): Promise<RAWGResponse<{id: number, name: string}> & RAWGError> {
      const url = `${this.baseURL}/genres?key=${this.apiKey}`
      console.log(`RAWG API: Fetching genres - ${url}`)
      
      return this.makeRequest<RAWGResponse<{id: number, name: string}>>(url)
    }

    /**
     * Get platforms (cached/rate-limited)  
     */
    async getPlatforms(): Promise<RAWGResponse<{id: number, name: string}> & RAWGError> {
      const url = `${this.baseURL}/platforms?key=${this.apiKey}`
      console.log(`RAWG API: Fetching platforms - ${url}`)
      
      return this.makeRequest<RAWGResponse<{id: number, name: string}>>(url)
    }

    /**
     * Get trending games (popular in date range)
     */
    async getTrendingGames(dateRange: string = '2024-01-01,2024-12-31', pageSize: number = 10): Promise<RAWGResponse<RAWGGame> & RAWGError> {
      return this.getGames({
        dates: dateRange,
        ordering: '-added',
        page_size: pageSize
      })
    }

    /**
     * Get popular games (high rated)
     */
    async getPopularGames(pageSize: number = 10): Promise<RAWGResponse<RAWGGame> & RAWGError> {
      return this.getGames({
        ordering: '-rating',
        page_size: pageSize
      })
    }
  }