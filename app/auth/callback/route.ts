import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    let response = NextResponse.redirect(`${origin}${next}`)
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          }
        }
      }
    )

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error && data.user) {
        // Check if user has a profile, if not create one
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create one
          let username: string
          let displayName: string
          let avatarUrl: string | undefined

          // Handle different OAuth providers
          if (data.user.app_metadata?.provider === 'google') {
            username = data.user.user_metadata?.full_name?.replace(/\s+/g, '_').toLowerCase() || 
                      data.user.email?.split('@')[0] || 
                      `user_${data.user.id.slice(0, 8)}`
            displayName = data.user.user_metadata?.full_name || username
            avatarUrl = data.user.user_metadata?.avatar_url
          } else if (data.user.app_metadata?.provider === 'discord') {
            username = data.user.user_metadata?.custom_claims?.global_name?.replace(/\s+/g, '_').toLowerCase() ||
                      data.user.user_metadata?.user_name ||
                      data.user.email?.split('@')[0] || 
                      `user_${data.user.id.slice(0, 8)}`
            displayName = data.user.user_metadata?.custom_claims?.global_name || 
                         data.user.user_metadata?.user_name || 
                         username
            avatarUrl = data.user.user_metadata?.avatar_url
          } else {
            // Default fallback
            username = data.user.email?.split('@')[0] || `user_${data.user.id.slice(0, 8)}`
            displayName = username
            avatarUrl = undefined
          }

          // Ensure username is unique by checking availability
          let finalUsername = username
          let counter = 1
          while (true) {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('username')
              .eq('username', finalUsername)
              .single()
            
            if (!existingProfile) break
            finalUsername = `${username}_${counter}`
            counter++
          }
          
          await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              username: finalUsername,
              display_name: displayName,
              avatar_url: avatarUrl
            })
        }

        return response
      }
    } catch (error) {
      console.error('OAuth callback error:', error)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
