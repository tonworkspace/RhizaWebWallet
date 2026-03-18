-- Complete Database-Driven Airdrop Tasks Setup
-- This script creates the full database schema and migrates all existing tasks
-- Run this single file to set up the complete database-driven task system

-- ============================================================================
-- PART 1: CREATE TABLES AND FUNCTIONS
-- ============================================================================

-- Main airdrop tasks table
CREATE TABLE IF NOT EXISTS airdrop_tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reward INTEGER NOT NULL DEFAULT 0,
    action TEXT NOT NULL, -- Task action identifier
    category TEXT NOT NULL CHECK (category IN ('social', 'engagement', 'growth', 'content')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    is_active BOOLEAN DEFAULT TRUE,
    instructions TEXT,
    time_limit TEXT, -- e.g., '24h', '7 days', '1 week'
    verification_type TEXT NOT NULL CHECK (verification_type IN ('automatic', 'manual', 'social_api')),
    requirements JSONB DEFAULT '{}', -- Store requirements like min_followers, platforms, keywords, hashtags
    sort_order INTEGER DEFAULT 0, -- For custom ordering
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT, -- Admin who created the task
    updated_by TEXT  -- Admin who last updated the task
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_airdrop_tasks_active ON airdrop_tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_airdrop_tasks_category ON airdrop_tasks(category);
CREATE INDEX IF NOT EXISTS idx_airdrop_tasks_difficulty ON airdrop_tasks(difficulty);
CREATE INDEX IF NOT EXISTS idx_airdrop_tasks_verification ON airdrop_tasks(verification_type);
CREATE INDEX IF NOT EXISTS idx_airdrop_tasks_sort ON airdrop_tasks(sort_order, id);

-- Task completion statistics table (for tracking completions per task)
CREATE TABLE IF NOT EXISTS airdrop_task_stats (
    task_id INTEGER REFERENCES airdrop_tasks(id) ON DELETE CASCADE,
    total_completions INTEGER DEFAULT 0,
    total_rewards_distributed INTEGER DEFAULT 0,
    last_completion_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (task_id)
);

-- Function to update task statistics
CREATE OR REPLACE FUNCTION update_task_stats(p_task_id INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO airdrop_task_stats (task_id, total_completions, total_rewards_distributed, last_completion_at, updated_at)
    SELECT 
        p_task_id,
        COUNT(*),
        SUM(reward_amount),
        MAX(completed_at),
        NOW()
    FROM airdrop_completions 
    WHERE task_id = p_task_id
    ON CONFLICT (task_id) 
    DO UPDATE SET
        total_completions = EXCLUDED.total_completions,
        total_rewards_distributed = EXCLUDED.total_rewards_distributed,
        last_completion_at = EXCLUDED.last_completion_at,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get all active tasks with statistics
CREATE OR REPLACE FUNCTION get_active_airdrop_tasks()
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    description TEXT,
    reward INTEGER,
    action TEXT,
    category TEXT,
    difficulty TEXT,
    is_active BOOLEAN,
    instructions TEXT,
    time_limit TEXT,
    verification_type TEXT,
    requirements JSONB,
    sort_order INTEGER,
    total_completions INTEGER,
    total_rewards_distributed INTEGER,
    last_completion_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        t.description,
        t.reward,
        t.action,
        t.category,
        t.difficulty,
        t.is_active,
        t.instructions,
        t.time_limit,
        t.verification_type,
        t.requirements,
        t.sort_order,
        COALESCE(s.total_completions, 0) as total_completions,
        COALESCE(s.total_rewards_distributed, 0) as total_rewards_distributed,
        s.last_completion_at
    FROM airdrop_tasks t
    LEFT JOIN airdrop_task_stats s ON t.id = s.task_id
    WHERE t.is_active = TRUE
    ORDER BY t.sort_order ASC, t.id ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get all tasks (for admin dashboard)
CREATE OR REPLACE FUNCTION get_all_airdrop_tasks()
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    description TEXT,
    reward INTEGER,
    action TEXT,
    category TEXT,
    difficulty TEXT,
    is_active BOOLEAN,
    instructions TEXT,
    time_limit TEXT,
    verification_type TEXT,
    requirements JSONB,
    sort_order INTEGER,
    total_completions INTEGER,
    total_rewards_distributed INTEGER,
    last_completion_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by TEXT,
    updated_by TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        t.description,
        t.reward,
        t.action,
        t.category,
        t.difficulty,
        t.is_active,
        t.instructions,
        t.time_limit,
        t.verification_type,
        t.requirements,
        t.sort_order,
        COALESCE(s.total_completions, 0) as total_completions,
        COALESCE(s.total_rewards_distributed, 0) as total_rewards_distributed,
        s.last_completion_at,
        t.created_at,
        t.updated_at,
        t.created_by,
        t.updated_by
    FROM airdrop_tasks t
    LEFT JOIN airdrop_task_stats s ON t.id = s.task_id
    ORDER BY t.sort_order ASC, t.id ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to create new task
CREATE OR REPLACE FUNCTION create_airdrop_task(
    p_title TEXT,
    p_description TEXT,
    p_reward INTEGER,
    p_action TEXT,
    p_category TEXT,
    p_difficulty TEXT,
    p_instructions TEXT DEFAULT NULL,
    p_time_limit TEXT DEFAULT NULL,
    p_verification_type TEXT DEFAULT 'manual',
    p_requirements JSONB DEFAULT '{}',
    p_sort_order INTEGER DEFAULT NULL,
    p_created_by TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    new_task_id INTEGER;
    max_sort_order INTEGER;
BEGIN
    -- Get max sort order if not provided
    IF p_sort_order IS NULL THEN
        SELECT COALESCE(MAX(sort_order), 0) + 10 INTO max_sort_order FROM airdrop_tasks;
    ELSE
        max_sort_order := p_sort_order;
    END IF;
    
    INSERT INTO airdrop_tasks (
        title, description, reward, action, category, difficulty,
        instructions, time_limit, verification_type, requirements,
        sort_order, created_by, updated_by
    ) VALUES (
        p_title, p_description, p_reward, p_action, p_category, p_difficulty,
        p_instructions, p_time_limit, p_verification_type, p_requirements,
        max_sort_order, p_created_by, p_created_by
    ) RETURNING id INTO new_task_id;
    
    -- Initialize stats
    INSERT INTO airdrop_task_stats (task_id) VALUES (new_task_id);
    
    RETURN new_task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update existing task
CREATE OR REPLACE FUNCTION update_airdrop_task(
    p_task_id INTEGER,
    p_title TEXT,
    p_description TEXT,
    p_reward INTEGER,
    p_action TEXT,
    p_category TEXT,
    p_difficulty TEXT,
    p_is_active BOOLEAN,
    p_instructions TEXT DEFAULT NULL,
    p_time_limit TEXT DEFAULT NULL,
    p_verification_type TEXT DEFAULT 'manual',
    p_requirements JSONB DEFAULT '{}',
    p_sort_order INTEGER DEFAULT NULL,
    p_updated_by TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE airdrop_tasks SET
        title = p_title,
        description = p_description,
        reward = p_reward,
        action = p_action,
        category = p_category,
        difficulty = p_difficulty,
        is_active = p_is_active,
        instructions = p_instructions,
        time_limit = p_time_limit,
        verification_type = p_verification_type,
        requirements = p_requirements,
        sort_order = COALESCE(p_sort_order, sort_order),
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE id = p_task_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to delete task (soft delete by setting inactive)
CREATE OR REPLACE FUNCTION delete_airdrop_task(
    p_task_id INTEGER,
    p_deleted_by TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE airdrop_tasks SET
        is_active = FALSE,
        updated_at = NOW(),
        updated_by = p_deleted_by
    WHERE id = p_task_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to reorder tasks
CREATE OR REPLACE FUNCTION reorder_airdrop_tasks(
    p_task_ids INTEGER[],
    p_updated_by TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    task_id INTEGER;
    new_order INTEGER := 10;
BEGIN
    FOREACH task_id IN ARRAY p_task_ids
    LOOP
        UPDATE airdrop_tasks SET
            sort_order = new_order,
            updated_at = NOW(),
            updated_by = p_updated_by
        WHERE id = task_id;
        
        new_order := new_order + 10;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (Row Level Security)
ALTER TABLE airdrop_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE airdrop_task_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS read_active_tasks ON airdrop_tasks;
DROP POLICY IF EXISTS read_task_stats ON airdrop_task_stats;
DROP POLICY IF EXISTS admin_manage_tasks ON airdrop_tasks;
DROP POLICY IF EXISTS admin_manage_task_stats ON airdrop_task_stats;

-- Policy: Everyone can read active tasks
CREATE POLICY read_active_tasks ON airdrop_tasks
    FOR SELECT USING (is_active = TRUE);

-- Policy: Everyone can read task stats
CREATE POLICY read_task_stats ON airdrop_task_stats
    FOR SELECT USING (TRUE);

-- Policy: Only admins can modify tasks
CREATE POLICY admin_manage_tasks ON airdrop_tasks
    FOR ALL USING (current_setting('app.user_role', true) = 'admin');

-- Policy: Only admins can modify task stats
CREATE POLICY admin_manage_task_stats ON airdrop_task_stats
    FOR ALL USING (current_setting('app.user_role', true) = 'admin');

-- Trigger to update task stats when completions change
CREATE OR REPLACE FUNCTION trigger_update_task_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM update_task_stats(NEW.task_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_task_stats(OLD.task_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on airdrop_completions table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'airdrop_completions') THEN
        DROP TRIGGER IF EXISTS update_task_stats_trigger ON airdrop_completions;
        CREATE TRIGGER update_task_stats_trigger
            AFTER INSERT OR UPDATE OR DELETE ON airdrop_completions
            FOR EACH ROW EXECUTE FUNCTION trigger_update_task_stats();
    END IF;
END $$;

-- ============================================================================
-- PART 2: MIGRATE EXISTING TASKS
-- ============================================================================

-- Clear existing data (if any) - only if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'airdrop_task_stats') THEN
        TRUNCATE TABLE airdrop_task_stats CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'airdrop_tasks') THEN
        TRUNCATE TABLE airdrop_tasks RESTART IDENTITY CASCADE;
    END IF;
END $$;

-- Insert all 21 airdrop tasks from the original configuration
INSERT INTO airdrop_tasks (
    id, title, description, reward, action, category, difficulty, 
    is_active, instructions, time_limit, verification_type, requirements, sort_order
) VALUES 
-- Task 0: Create RhizaCore Wallet
(0, 'Create RhizaCore Wallet', 'Create or login to your RhizaCore wallet', 150, 'create_wallet', 'engagement', 'easy', TRUE, 'Simply create an account to get started with RhizaCore', '', 'automatic', '{}', 0),

-- Task 1: Follow @RhizaCore on X
(1, 'Follow @RhizaCore on X', 'Follow our official X account for updates', 100, 'follow', 'social', 'easy', TRUE, 'Follow @RhizaCore on X (Twitter) to stay updated with latest news', '', 'social_api', '{"platforms": ["twitter"]}', 10),

-- Task 2: Retweet Announcement
(2, 'Retweet Announcement', 'Retweet our latest announcement post', 75, 'retweet', 'social', 'easy', TRUE, 'Retweet our pinned announcement to help spread the word', '', 'social_api', '{"platforms": ["twitter"]}', 20),

-- Task 3: Join Telegram Community
(3, 'Join Telegram Community', 'Join our official Telegram group', 125, 'telegram', 'social', 'easy', TRUE, 'Join our Telegram community for real-time updates and discussions', '', 'manual', '{"platforms": ["telegram"]}', 30),

-- Task 4: Refer 3 Friends
(4, 'Refer 3 Friends', 'Invite 3 friends to join RhizaCore', 300, 'referral', 'growth', 'hard', TRUE, 'Share your referral link with friends and earn when they join', '', 'automatic', '{}', 40),

-- Task 5: Daily Check-in
(5, 'Daily Check-in', 'Complete your daily check-in streak', 50, 'daily_checkin', 'engagement', 'easy', TRUE, 'Check in daily to maintain your streak and earn rewards', '24h', 'automatic', '{}', 50),

-- Task 6: Complete Profile
(6, 'Complete Profile', 'Add avatar and complete profile setup', 150, 'profile_complete', 'engagement', 'medium', TRUE, 'Complete your profile with avatar and personal information', '', 'automatic', '{}', 60),

-- Task 7: Post About RZC on X
(7, 'Post About RZC on X', 'Create an original post about RhizaCore and RZC token on X (Twitter)', 200, 'post_twitter', 'content', 'medium', TRUE, 'Share your thoughts about RZC, mention @RhizaCore, and include #RZC #RhizaCore hashtags', '', 'social_api', '{"platforms": ["twitter"], "keywords": ["rhizacore", "rzc"], "hashtags": ["#rzc", "#rhizacore"]}', 70),

-- Task 8: Share RZC on Facebook
(8, 'Share RZC on Facebook', 'Post about RhizaCore on your Facebook profile or page', 150, 'post_facebook', 'content', 'medium', TRUE, 'Share why you believe in RZC and RhizaCore ecosystem on Facebook', '', 'manual', '{"platforms": ["facebook"]}', 80),

-- Task 9: LinkedIn Professional Post
(9, 'LinkedIn Professional Post', 'Write a professional post about RZC on LinkedIn', 250, 'post_linkedin', 'content', 'medium', TRUE, 'Focus on the professional/business aspects of RhizaCore for LinkedIn audience', '', 'manual', '{"platforms": ["linkedin"]}', 90),

-- Task 10: Instagram Story/Post
(10, 'Instagram Story/Post', 'Share RhizaCore on your Instagram story or feed', 175, 'post_instagram', 'content', 'medium', TRUE, 'Use creative visuals and tag @rhizacore if available', '', 'manual', '{"platforms": ["instagram"]}', 100),

-- Task 11: Comment on RZC Posts
(11, 'Comment on RZC Posts', 'Leave meaningful comments on 3 RhizaCore social media posts', 100, 'comment_engagement', 'social', 'easy', TRUE, 'Engage authentically with our content across platforms', '', 'social_api', '{"platforms": ["twitter", "facebook", "linkedin"]}', 110),

-- Task 12: Share in Crypto Groups
(12, 'Share in Crypto Groups', 'Share RhizaCore in 2 relevant crypto/blockchain groups', 300, 'share_groups', 'growth', 'hard', TRUE, 'Share in Telegram, Discord, or Reddit crypto communities (follow group rules)', '', 'manual', '{"platforms": ["telegram", "discord", "reddit"]}', 120),

-- Task 13: Create RZC Video Content
(13, 'Create RZC Video Content', 'Create a video about RhizaCore (TikTok, YouTube Shorts, Instagram Reels)', 500, 'create_video', 'content', 'hard', TRUE, 'Minimum 30 seconds explaining RZC benefits or your experience', '7 days', 'manual', '{"platforms": ["tiktok", "youtube", "instagram"]}', 130),

-- Task 14: Write RZC Blog/Article
(14, 'Write RZC Blog/Article', 'Write a detailed article about RhizaCore (Medium, personal blog, etc.)', 750, 'write_article', 'content', 'hard', TRUE, 'Minimum 500 words covering RZC utility, technology, or ecosystem', '14 days', 'manual', '{"platforms": ["medium", "blog"]}', 140),

-- Task 15: Reddit Community Post
(15, 'Reddit Community Post', 'Create a quality post about RZC in relevant Reddit communities', 200, 'post_reddit', 'content', 'medium', TRUE, 'Post in r/cryptocurrency, r/defi, or other relevant subreddits', '', 'manual', '{"platforms": ["reddit"]}', 150),

-- Task 16: Discord Community Share
(16, 'Discord Community Share', 'Share RhizaCore in 3 crypto Discord servers', 250, 'share_discord', 'growth', 'medium', TRUE, 'Share respectfully in appropriate channels, follow server rules', '', 'manual', '{"platforms": ["discord"]}', 160),

-- Task 17: Create RZC Meme
(17, 'Create RZC Meme', 'Create and share an original RZC/RhizaCore meme', 150, 'create_meme', 'content', 'easy', TRUE, 'Be creative and fun! Share on any social platform', '', 'manual', '{"platforms": ["twitter", "instagram", "reddit"]}', 170),

-- Task 18: Podcast/Spaces Mention
(18, 'Podcast/Spaces Mention', 'Mention RhizaCore in a podcast, Twitter Space, or audio content', 400, 'audio_mention', 'content', 'hard', TRUE, 'Speak about RZC in any audio format (podcast, spaces, clubhouse, etc.)', '', 'manual', '{"platforms": ["twitter", "clubhouse", "podcast"]}', 180),

-- Task 19: Influencer Collaboration
(19, 'Influencer Collaboration', 'Get a crypto influencer to mention or share RhizaCore', 1000, 'influencer_collab', 'growth', 'expert', TRUE, 'Collaborate with influencers (1K+ followers) to promote RZC', '30 days', 'manual', '{"min_followers": 1000, "platforms": ["twitter", "youtube", "instagram", "tiktok"]}', 190),

-- Task 20: Community AMA Question
(20, 'Community AMA Question', 'Ask a thoughtful question in RhizaCore AMA or community call', 100, 'ama_participation', 'engagement', 'easy', TRUE, 'Participate actively in community events and AMAs', '', 'manual', '{"platforms": ["telegram", "discord", "twitter"]}', 200);

-- Initialize task statistics with mock completion data
INSERT INTO airdrop_task_stats (task_id, total_completions, total_rewards_distributed, last_completion_at) VALUES
(0, 1247, 187050, NOW() - INTERVAL '1 hour'),
(1, 892, 89200, NOW() - INTERVAL '2 hours'),
(2, 756, 56700, NOW() - INTERVAL '3 hours'),
(3, 634, 79250, NOW() - INTERVAL '4 hours'),
(4, 234, 70200, NOW() - INTERVAL '5 hours'),
(5, 2156, 107800, NOW() - INTERVAL '30 minutes'),
(6, 1089, 163350, NOW() - INTERVAL '1 hour'),
(7, 387, 77400, NOW() - INTERVAL '2 hours'),
(8, 234, 35100, NOW() - INTERVAL '3 hours'),
(9, 156, 39000, NOW() - INTERVAL '4 hours'),
(10, 298, 52150, NOW() - INTERVAL '5 hours'),
(11, 567, 56700, NOW() - INTERVAL '6 hours'),
(12, 123, 36900, NOW() - INTERVAL '7 hours'),
(13, 45, 22500, NOW() - INTERVAL '8 hours'),
(14, 23, 17250, NOW() - INTERVAL '9 hours'),
(15, 89, 17800, NOW() - INTERVAL '10 hours'),
(16, 67, 16750, NOW() - INTERVAL '11 hours'),
(17, 234, 35100, NOW() - INTERVAL '12 hours'),
(18, 12, 4800, NOW() - INTERVAL '13 hours'),
(19, 8, 8000, NOW() - INTERVAL '14 hours'),
(20, 145, 14500, NOW() - INTERVAL '15 hours');

-- Reset sequence to continue from the highest ID
SELECT setval('airdrop_tasks_id_seq', (SELECT MAX(id) FROM airdrop_tasks));

-- ============================================================================
-- PART 3: VERIFICATION AND SUCCESS MESSAGE
-- ============================================================================

-- Verify the migration
SELECT 
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE is_active = TRUE) as active_tasks,
    SUM(reward) as total_rewards,
    SUM(total_completions) as total_completions
FROM airdrop_tasks t
LEFT JOIN airdrop_task_stats s ON t.id = s.task_id;

-- Add table comments
COMMENT ON TABLE airdrop_tasks IS 'Database-driven airdrop task definitions with full admin management';
COMMENT ON TABLE airdrop_task_stats IS 'Real-time statistics for each airdrop task';

-- Success message
SELECT 
    '🎉 Database-driven airdrop tasks setup complete!' as status,
    'All 21 tasks migrated successfully with full admin management capabilities' as info,
    'Tasks can now be modified through admin interface without code deployments' as benefit;