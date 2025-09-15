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
  
  export class RAWGService {
    private apiKey: string
    private baseURL = 'https://api.rawg.io/api'
  
    constructor(apiKey: string) {
      this.apiKey = apiKey
    }
  
    async getGames(params: {
      page?: number
      page_size?: number
      search?: string
      genres?: string
      platforms?: string
      dates?: string
      ordering?: string
    } = {}) {
      const searchParams = new URLSearchParams({
        key: this.apiKey,
        ...params
      })
      
      const response = await fetch(`${this.baseURL}/games?${searchParams}`)
      return response.json()
    }
  
    async getGame(id: number) {
      const response = await fetch(`${this.baseURL}/games/${id}?key=${this.apiKey}`)
      return response.json()
    }
  
    async searchGames(query: string) {
      return this.getGames({ search: query })
    }
  }