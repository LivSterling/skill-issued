-- Create friendships table for mutual friend relationships
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure users can't friend themselves
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id),
  -- Ensure unique friendship pairs (prevent duplicates)
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
);

-- Create follows table for one-way following relationships
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure users can't follow themselves
  CONSTRAINT no_self_follow CHECK (follower_id != following_id),
  -- Ensure unique follow relationships
  CONSTRAINT unique_follow UNIQUE (follower_id, following_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS friendships_user_id_idx ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS friendships_friend_id_idx ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS friendships_status_idx ON public.friendships(status);
CREATE INDEX IF NOT EXISTS friendships_created_at_idx ON public.friendships(created_at);

CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS follows_created_at_idx ON public.follows(created_at);

-- Create updated_at trigger for friendships
CREATE TRIGGER friendships_updated_at_trigger
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friendships table
-- Users can view their own friendships (sent and received)
CREATE POLICY "Users can view own friendships" ON public.friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can create friendship requests
CREATE POLICY "Users can send friend requests" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update friendships they're involved in (to accept/decline)
CREATE POLICY "Users can update own friendships" ON public.friendships
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can delete their own friendships
CREATE POLICY "Users can delete own friendships" ON public.friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for follows table
-- Users can view follows involving public profiles or themselves
CREATE POLICY "Users can view public follows" ON public.follows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = follows.following_id 
      AND profiles.privacy_level = 'public'
    ) OR 
    auth.uid() = follower_id OR 
    auth.uid() = following_id
  );

-- Users can create follows (follow others)
CREATE POLICY "Users can follow others" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Users can delete their own follows (unfollow)
CREATE POLICY "Users can unfollow others" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Create helper functions for social features

-- Function to get mutual friends count
CREATE OR REPLACE FUNCTION public.get_mutual_friends_count(user1_id UUID, user2_id UUID)
RETURNS INTEGER AS $$
DECLARE
  mutual_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO mutual_count
  FROM (
    SELECT friend_id FROM public.friendships 
    WHERE user_id = user1_id AND status = 'accepted'
    UNION
    SELECT user_id FROM public.friendships 
    WHERE friend_id = user1_id AND status = 'accepted'
  ) AS user1_friends
  INNER JOIN (
    SELECT friend_id FROM public.friendships 
    WHERE user_id = user2_id AND status = 'accepted'
    UNION
    SELECT user_id FROM public.friendships 
    WHERE friend_id = user2_id AND status = 'accepted'
  ) AS user2_friends ON user1_friends.friend_id = user2_friends.friend_id;
  
  RETURN mutual_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check friendship status between two users
CREATE OR REPLACE FUNCTION public.get_friendship_status(user1_id UUID, user2_id UUID)
RETURNS TEXT AS $$
DECLARE
  friendship_status TEXT;
BEGIN
  SELECT status INTO friendship_status
  FROM public.friendships
  WHERE (user_id = user1_id AND friend_id = user2_id)
     OR (user_id = user2_id AND friend_id = user1_id);
  
  RETURN COALESCE(friendship_status, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user1 follows user2
CREATE OR REPLACE FUNCTION public.is_following(follower_id UUID, following_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_following BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.follows
    WHERE follows.follower_id = is_following.follower_id 
    AND follows.following_id = is_following.following_id
  ) INTO is_following;
  
  RETURN COALESCE(is_following, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create views for easier querying

-- View for accepted friendships (bidirectional)
CREATE OR REPLACE VIEW public.accepted_friendships AS
SELECT 
  user_id,
  friend_id,
  created_at
FROM public.friendships
WHERE status = 'accepted'
UNION ALL
SELECT 
  friend_id AS user_id,
  user_id AS friend_id,
  created_at
FROM public.friendships
WHERE status = 'accepted';

-- Grant necessary permissions
GRANT ALL ON public.friendships TO authenticated;
GRANT ALL ON public.follows TO authenticated;
GRANT SELECT ON public.accepted_friendships TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_mutual_friends_count(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friendship_status(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_following(UUID, UUID) TO authenticated;
