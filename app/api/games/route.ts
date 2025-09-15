import { RAWGService } from '@/lib/services/rawg-service'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract all supported parameters
    const params: any = {}
    
    if (searchParams.get('search')) params.search = searchParams.get('search')
    if (searchParams.get('page')) params.page = parseInt(searchParams.get('page') || '1')
    if (searchParams.get('page_size')) params.page_size = parseInt(searchParams.get('page_size') || '20')
    if (searchParams.get('ordering')) params.ordering = searchParams.get('ordering')
    if (searchParams.get('genres')) params.genres = searchParams.get('genres')
    if (searchParams.get('platforms')) params.platforms = searchParams.get('platforms')
    if (searchParams.get('dates')) params.dates = searchParams.get('dates')
    if (searchParams.get('developers')) params.developers = searchParams.get('developers')
    if (searchParams.get('publishers')) params.publishers = searchParams.get('publishers')
    
    const rawg = new RAWGService(process.env.RAWG_API_KEY!)
    const rawgData = await rawg.getGames(params)
    
    if (!rawgData || rawgData.error) {
      return Response.json(
        { error: rawgData?.error || 'Failed to fetch games from RAWG API' },
        { status: 502 }
      )
    }
    
    // Store/update games in database (optional, for caching)
    try {
      const supabase = createClient()
      if (rawgData.results && rawgData.results.length > 0) {
        for (const game of rawgData.results) {
          await supabase
            .from('games')
            .upsert({
              id: game.id,
              slug: game.slug,
              name: game.name,
              description: game.description,
              released: game.released,
              background_image: game.background_image,
              rating: game.rating,
              rating_top: game.rating_top,
              ratings_count: game.ratings_count,
              metacritic: game.metacritic,
              playtime: game.playtime,
              genres: game.genres,
              platforms: game.platforms,
              developers: game.developers,
              publishers: game.publishers,
              esrb_rating: game.esrb_rating,
              tags: game.tags,
              updated_at: new Date().toISOString()
            } as any)
        }
      }
    } catch (dbError) {
      // Don't fail the request if database caching fails
      console.warn('Failed to cache games in database:', dbError)
    }
    
    return Response.json(rawgData)
    
  } catch (error) {
    console.error('Games API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/games/[id]/user-data/route.ts
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { rating, difficulty, hours, status, review, completed } = await request.json()
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_games')
    .upsert({
      user_id: user.id,
      game_id: parseInt(params.id),
      user_rating: rating,
      difficulty_rating: difficulty,
      hours_played: hours,
      status,
      review,
      completed,
    } as any)

  return Response.json({ data, error })
}