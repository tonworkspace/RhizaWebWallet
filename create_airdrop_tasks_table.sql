-- Create comprehensive airdrop tasks table for database-driven task management
-- This replaces the hardcoded task configuration with flexible database storage

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

COMMENT ON TABLE airdrop_tasks IS 'Database-driven airdrop task definitions with full admin management';
COMMENT ON TABLE airdrop_task_stats IS 'Real-time statistics for each airdrop task';

-- Success message
SELECT 'Airdrop tasks database schema created successfully! 🎉' as status;