-- ============================================================================
-- SEARCH CACHE AND ANALYTICS TABLES
-- ============================================================================

-- Create search_cache table for caching search results
CREATE TABLE IF NOT EXISTS public.search_cache (
    id TEXT PRIMARY KEY,
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    results JSONB DEFAULT '[]',
    total_results INTEGER DEFAULT 0,
    response_time INTEGER DEFAULT 0,
    popularity_score DECIMAL(5,2) DEFAULT 0,
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create search_analytics table for tracking search behavior
CREATE TABLE IF NOT EXISTS public.search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    response_time INTEGER DEFAULT 0,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cache_hit BOOLEAN DEFAULT FALSE,
    source TEXT CHECK (source IN ('cache', 'api', 'database')) DEFAULT 'api'
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for search_cache table
CREATE INDEX IF NOT EXISTS idx_search_cache_query ON public.search_cache(query);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires_at ON public.search_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_search_cache_popularity_score ON public.search_cache(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_search_cache_hit_count ON public.search_cache(hit_count DESC);
CREATE INDEX IF NOT EXISTS idx_search_cache_last_accessed ON public.search_cache(last_accessed DESC);

-- Indexes for search_analytics table
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON public.search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON public.search_analytics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON public.search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_cache_hit ON public.search_analytics(cache_hit);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_search_cache_query_expires ON public.search_cache(query, expires_at);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query_timestamp ON public.search_analytics(query, timestamp DESC);

-- ============================================================================
-- FUNCTIONS FOR CACHE MANAGEMENT
-- ============================================================================

-- Function to increment hit count atomically
CREATE OR REPLACE FUNCTION increment_hit_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE(hit_count, 0) + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_search_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.search_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get popular search terms
CREATE OR REPLACE FUNCTION get_popular_search_terms(
    days_back INTEGER DEFAULT 7,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
    query TEXT,
    search_count BIGINT,
    avg_response_time NUMERIC,
    last_searched TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.query,
        COUNT(*) as search_count,
        ROUND(AVG(sa.response_time), 2) as avg_response_time,
        MAX(sa.timestamp) as last_searched
    FROM public.search_analytics sa
    WHERE sa.timestamp >= (NOW() - (days_back || ' days')::INTERVAL)
        AND LENGTH(TRIM(sa.query)) >= 2
    GROUP BY sa.query
    ORDER BY search_count DESC, last_searched DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get search cache statistics
CREATE OR REPLACE FUNCTION get_search_cache_stats()
RETURNS TABLE(
    total_entries BIGINT,
    total_hits BIGINT,
    avg_popularity_score NUMERIC,
    avg_response_time NUMERIC,
    cache_size_estimate TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_entries,
        SUM(hit_count) as total_hits,
        ROUND(AVG(popularity_score), 2) as avg_popularity_score,
        ROUND(AVG(response_time), 2) as avg_response_time,
        pg_size_pretty(pg_total_relation_size('public.search_cache')) as cache_size_estimate
    FROM public.search_cache;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC MAINTENANCE
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_search_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER search_cache_updated_at_trigger
    BEFORE UPDATE ON public.search_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_search_cache_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on search_cache (admin access only for direct queries)
ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;

-- Policy for service role to manage cache
CREATE POLICY "Service role can manage search cache" ON public.search_cache
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy for authenticated users to read their own cached searches (if needed)
CREATE POLICY "Users can read search cache" ON public.search_cache
    FOR SELECT TO authenticated
    USING (true);

-- Enable RLS on search_analytics
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- Policy for service role to manage analytics
CREATE POLICY "Service role can manage search analytics" ON public.search_analytics
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy for users to read their own analytics
CREATE POLICY "Users can read own search analytics" ON public.search_analytics
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================================
-- SCHEDULED CLEANUP TASKS
-- ============================================================================

-- Note: These would typically be set up with pg_cron or similar scheduler
-- For now, they're just function definitions that can be called manually or via cron

-- Function to perform daily maintenance
CREATE OR REPLACE FUNCTION daily_search_cache_maintenance()
RETURNS TEXT AS $$
DECLARE
    expired_cleaned INTEGER;
    analytics_cleaned INTEGER;
    result_text TEXT;
BEGIN
    -- Clean up expired cache entries
    SELECT cleanup_expired_search_cache() INTO expired_cleaned;
    
    -- Clean up old analytics (older than 30 days)
    DELETE FROM public.search_analytics 
    WHERE timestamp < (NOW() - INTERVAL '30 days');
    GET DIAGNOSTICS analytics_cleaned = ROW_COUNT;
    
    -- Update result
    result_text := format(
        'Maintenance completed: %s expired cache entries cleaned, %s old analytics entries cleaned',
        expired_cleaned,
        analytics_cleaned
    );
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL)
-- ============================================================================

-- Insert some sample popular searches for testing
DO $$
BEGIN
    -- Only insert if tables are empty (for development)
    IF NOT EXISTS (SELECT 1 FROM public.search_analytics LIMIT 1) THEN
        INSERT INTO public.search_analytics (query, results_count, response_time, timestamp, cache_hit, source) VALUES
            ('action games', 150, 800, NOW() - INTERVAL '1 day', false, 'api'),
            ('rpg', 200, 600, NOW() - INTERVAL '2 days', false, 'api'),
            ('adventure', 180, 700, NOW() - INTERVAL '1 day', true, 'cache'),
            ('strategy games', 120, 900, NOW() - INTERVAL '3 days', false, 'api'),
            ('indie games', 90, 500, NOW() - INTERVAL '1 day', false, 'api'),
            ('multiplayer', 300, 1200, NOW() - INTERVAL '2 days', false, 'api'),
            ('puzzle games', 80, 400, NOW() - INTERVAL '4 days', true, 'cache'),
            ('horror games', 60, 600, NOW() - INTERVAL '1 day', false, 'api'),
            ('racing games', 70, 550, NOW() - INTERVAL '3 days', false, 'api'),
            ('simulation', 40, 450, NOW() - INTERVAL '5 days', false, 'api');
    END IF;
END $$;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.search_cache IS 'Cache table for storing frequently accessed search results to improve performance';
COMMENT ON TABLE public.search_analytics IS 'Analytics table for tracking search behavior and optimizing cache strategy';

COMMENT ON COLUMN public.search_cache.id IS 'Unique cache key generated from query and filters';
COMMENT ON COLUMN public.search_cache.query IS 'Normalized search query';
COMMENT ON COLUMN public.search_cache.filters IS 'JSON object containing search filters';
COMMENT ON COLUMN public.search_cache.results IS 'Cached search results (limited to first 20 items)';
COMMENT ON COLUMN public.search_cache.total_results IS 'Total number of results available';
COMMENT ON COLUMN public.search_cache.response_time IS 'Original API response time in milliseconds';
COMMENT ON COLUMN public.search_cache.popularity_score IS 'Calculated popularity score for cache prioritization';
COMMENT ON COLUMN public.search_cache.hit_count IS 'Number of times this cache entry has been accessed';
COMMENT ON COLUMN public.search_cache.expires_at IS 'When this cache entry expires';
COMMENT ON COLUMN public.search_cache.last_accessed IS 'Last time this cache entry was accessed';

COMMENT ON COLUMN public.search_analytics.query IS 'Search query performed';
COMMENT ON COLUMN public.search_analytics.filters IS 'Filters applied to the search';
COMMENT ON COLUMN public.search_analytics.results_count IS 'Number of results returned';
COMMENT ON COLUMN public.search_analytics.response_time IS 'Time taken to process the search in milliseconds';
COMMENT ON COLUMN public.search_analytics.user_id IS 'User who performed the search (if authenticated)';
COMMENT ON COLUMN public.search_analytics.cache_hit IS 'Whether this search was served from cache';
COMMENT ON COLUMN public.search_analytics.source IS 'Source of the search results (cache, api, database)';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_cache TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_analytics TO service_role;
GRANT SELECT ON public.search_cache TO authenticated;
GRANT SELECT ON public.search_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_search_cache() TO service_role;
GRANT EXECUTE ON FUNCTION get_popular_search_terms(INTEGER, INTEGER) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_search_cache_stats() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION daily_search_cache_maintenance() TO service_role;
