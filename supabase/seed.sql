-- Seed data for development and testing
-- This file contains sample data to help with development

-- Note: In a real application, you would typically have actual users created through the auth system
-- This seed data is for development purposes only

-- Sample gaming preferences structure for reference
-- This shows the expected JSON structure for gaming_preferences column

/*
Example gaming_preferences JSON structure:
{
  "favorite_genres": ["RPG", "Action", "Adventure", "Indie"],
  "platforms": ["PC", "PlayStation", "Nintendo Switch"],
  "gaming_style": "completionist", // "casual", "completionist", "speedrunner", "collector"
  "favorite_developers": ["FromSoftware", "CD Projekt Red", "Larian Studios"],
  "time_investment": "heavy", // "light", "moderate", "heavy"
  "difficulty_preference": "challenging", // "easy", "normal", "challenging", "hardcore"
  "multiplayer_preference": "co-op", // "solo", "co-op", "competitive", "mixed"
  "content_warnings": ["violence", "horror"], // content they want to avoid
  "accessibility_needs": ["colorblind_support", "subtitle_support"],
  "review_style": "detailed" // "brief", "detailed", "analytical"
}
*/

-- Sample privacy levels: 'public', 'friends', 'private'

-- Insert sample profiles (these would normally be created via the trigger when users register)
-- Note: These UUIDs should match actual auth.users entries in a real scenario

-- Example profile data structure for testing
INSERT INTO public.profiles (
  id, 
  username, 
  display_name, 
  bio, 
  privacy_level,
  gaming_preferences
) VALUES 
-- Sample user 1: Public RPG enthusiast
(
  '00000000-0000-0000-0000-000000000001'::UUID,
  'rpg_master',
  'Alex Chen',
  'Passionate RPG player who loves deep stories and character development. Always looking for the next great adventure!',
  'public',
  '{"favorite_genres": ["RPG", "Adventure", "Indie"], "platforms": ["PC", "PlayStation"], "gaming_style": "completionist", "time_investment": "heavy", "difficulty_preference": "challenging", "multiplayer_preference": "solo", "review_style": "detailed"}'::JSONB
),
-- Sample user 2: Casual gamer
(
  '00000000-0000-0000-0000-000000000002'::UUID,
  'casual_gamer92',
  'Jordan Smith',
  'Weekend warrior who enjoys relaxing games after work. Nintendo Switch is life! 🎮',
  'public',
  '{"favorite_genres": ["Puzzle", "Platformer", "Simulation"], "platforms": ["Nintendo Switch", "Mobile"], "gaming_style": "casual", "time_investment": "light", "difficulty_preference": "normal", "multiplayer_preference": "co-op", "review_style": "brief"}'::JSONB
),
-- Sample user 3: Competitive player
(
  '00000000-0000-0000-0000-000000000003'::UUID,
  'pro_player_x',
  'Sam Rodriguez',
  'Competitive FPS and fighting game player. Always grinding to improve!',
  'friends',
  '{"favorite_genres": ["FPS", "Fighting", "Action"], "platforms": ["PC", "Xbox"], "gaming_style": "competitive", "time_investment": "heavy", "difficulty_preference": "hardcore", "multiplayer_preference": "competitive", "review_style": "analytical"}'::JSONB
),
-- Sample user 4: Indie game lover
(
  '00000000-0000-0000-0000-000000000004'::UUID,
  'indie_explorer',
  'Taylor Kim',
  'Indie game enthusiast and aspiring game developer. Love discovering hidden gems!',
  'public',
  '{"favorite_genres": ["Indie", "Puzzle", "Art"], "platforms": ["PC", "Nintendo Switch"], "gaming_style": "explorer", "time_investment": "moderate", "difficulty_preference": "normal", "multiplayer_preference": "solo", "review_style": "detailed", "favorite_developers": ["Team Cherry", "Supergiant Games"]}'::JSONB
),
-- Sample user 5: Horror game fan
(
  '00000000-0000-0000-0000-000000000005'::UUID,
  'horror_fan_13',
  'Morgan Davis',
  'Horror game aficionado. If it doesn''t scare me, I''m not interested! 👻',
  'public',
  '{"favorite_genres": ["Horror", "Survival", "Thriller"], "platforms": ["PC", "PlayStation"], "gaming_style": "immersive", "time_investment": "moderate", "difficulty_preference": "challenging", "multiplayer_preference": "solo", "review_style": "detailed"}'::JSONB
) ON CONFLICT (id) DO NOTHING;

-- Sample friendships
INSERT INTO public.friendships (user_id, friend_id, status) VALUES
-- Alex and Jordan are friends
('00000000-0000-0000-0000-000000000001'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, 'accepted'),
-- Alex sent a friend request to Sam (pending)
('00000000-0000-0000-0000-000000000001'::UUID, '00000000-0000-0000-0000-000000000003'::UUID, 'pending'),
-- Taylor and Morgan are friends
('00000000-0000-0000-0000-000000000004'::UUID, '00000000-0000-0000-0000-000000000005'::UUID, 'accepted'),
-- Jordan and Taylor are friends
('00000000-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000004'::UUID, 'accepted')
ON CONFLICT (user_id, friend_id) DO NOTHING;

-- Sample follows (one-way relationships)
INSERT INTO public.follows (follower_id, following_id) VALUES
-- Alex follows Sam (even though friendship is pending)
('00000000-0000-0000-0000-000000000001'::UUID, '00000000-0000-0000-0000-000000000003'::UUID),
-- Sam follows Alex back
('00000000-0000-0000-0000-000000000003'::UUID, '00000000-0000-0000-0000-000000000001'::UUID),
-- Taylor follows Alex (admires their reviews)
('00000000-0000-0000-0000-000000000004'::UUID, '00000000-0000-0000-0000-000000000001'::UUID),
-- Morgan follows Taylor (indie game recommendations)
('00000000-0000-0000-0000-000000000005'::UUID, '00000000-0000-0000-0000-000000000004'::UUID),
-- Jordan follows Morgan (curious about horror games)
('00000000-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000005'::UUID)
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- Update timestamps to make data feel more realistic
UPDATE public.profiles SET 
  created_at = NOW() - INTERVAL '30 days',
  updated_at = NOW() - INTERVAL '5 days'
WHERE username = 'rpg_master';

UPDATE public.profiles SET 
  created_at = NOW() - INTERVAL '20 days',
  updated_at = NOW() - INTERVAL '2 days'
WHERE username = 'casual_gamer92';

UPDATE public.profiles SET 
  created_at = NOW() - INTERVAL '45 days',
  updated_at = NOW() - INTERVAL '1 day'
WHERE username = 'pro_player_x';

UPDATE public.profiles SET 
  created_at = NOW() - INTERVAL '15 days',
  updated_at = NOW() - INTERVAL '3 hours'
WHERE username = 'indie_explorer';

UPDATE public.profiles SET 
  created_at = NOW() - INTERVAL '60 days',
  updated_at = NOW() - INTERVAL '1 week'
WHERE username = 'horror_fan_13';
