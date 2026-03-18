-- Minimal Manual Verification System for Airdrop Tasks
-- This creates only the essential tables and functions needed

-- Manual submissions table
CREATE TABLE IF NOT EXISTS airdrop_manual_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    task_id INTEGER NOT NULL,
    task_action TEXT NOT NULL,
    proof_urls TEXT[] DEFAULT '{}',
    proof_screenshots TEXT[] DEFAULT '{}',
    description TEXT NOT NULL,
    additional_info JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    review_notes TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_manual_submissions_wallet ON airdrop_manual_submissions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_manual_submissions_status ON airdrop_manual_submissions(status);
CREATE INDEX IF NOT EXISTS idx_manual_submissions_task ON airdrop_manual_submissions(task_id, task_action);

-- Social verification cache table
CREATE TABLE IF NOT EXISTS social_verification_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    verification_type TEXT NOT NULL,
    verification_data JSONB DEFAULT '{}',
    result BOOLEAN NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for verification cache
CREATE INDEX IF NOT EXISTS idx_social_cache_wallet ON social_verification_cache(wallet_address);
CREATE INDEX IF NOT EXISTS idx_social_cache_platform ON social_verification_cache(platform, username);
CREATE INDEX IF NOT EXISTS idx_social_cache_expires ON social_verification_cache(expires_at);

-- User social profiles table
CREATE TABLE IF NOT EXISTS user_social_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    profile_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(wallet_address, platform)
);

-- Create indexes for social profiles
CREATE INDEX IF NOT EXISTS idx_social_profiles_wallet ON user_social_profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_social_profiles_platform ON user_social_profiles(platform, username);

-- Simple view for pending submissions (no username dependency)
CREATE OR REPLACE VIEW pending_manual_submissions AS
SELECT 
    ms.id,
    ms.wallet_address,
    LEFT(ms.wallet_address, 6) || '...' || RIGHT(ms.wallet_address, 4) as wallet_display,
    ms.task_id,
    ms.task_action,
    ms.description,
    ms.proof_urls,
    ms.proof_screenshots,
    ms.additional_info,
    ms.submitted_at,
    EXTRACT(EPOCH FROM (NOW() - ms.submitted_at))/3600 as hours_pending
FROM airdrop_manual_submissions ms
WHERE ms.status = 'pending'
ORDER BY ms.submitted_at ASC;

-- Function to approve manual submission
CREATE OR REPLACE FUNCTION approve_manual_submission(
    p_submission_id UUID,
    p_reviewer TEXT,
    p_review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    submission_record RECORD;
BEGIN
    -- Get submission details
    SELECT * INTO submission_record
    FROM airdrop_manual_submissions
    WHERE id = p_submission_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update submission status
    UPDATE airdrop_manual_submissions
    SET status = 'approved',
        reviewed_by = p_reviewer,
        review_notes = p_review_notes,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_submission_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to reject manual submission
CREATE OR REPLACE FUNCTION reject_manual_submission(
    p_submission_id UUID,
    p_reviewer TEXT,
    p_review_notes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE airdrop_manual_submissions
    SET status = 'rejected',
        reviewed_by = p_reviewer,
        review_notes = p_review_notes,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_submission_id AND status = 'pending';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to cache verification result
CREATE OR REPLACE FUNCTION cache_verification_result(
    p_wallet_address TEXT,
    p_platform TEXT,
    p_username TEXT,
    p_verification_type TEXT,
    p_verification_data JSONB,
    p_result BOOLEAN,
    p_cache_hours INTEGER DEFAULT 24
)
RETURNS UUID AS $$
DECLARE
    cache_id UUID;
BEGIN
    INSERT INTO social_verification_cache (
        wallet_address, 
        platform, 
        username, 
        verification_type, 
        verification_data, 
        result,
        expires_at
    )
    VALUES (
        p_wallet_address, 
        p_platform, 
        p_username, 
        p_verification_type, 
        p_verification_data, 
        p_result,
        NOW() + (p_cache_hours || ' hours')::INTERVAL
    )
    RETURNING id INTO cache_id;
    
    RETURN cache_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get cached verification result
CREATE OR REPLACE FUNCTION get_cached_verification(
    p_wallet_address TEXT,
    p_platform TEXT,
    p_username TEXT,
    p_verification_type TEXT,
    p_verification_data JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
    cached_result BOOLEAN;
BEGIN
    SELECT result INTO cached_result
    FROM social_verification_cache
    WHERE wallet_address = p_wallet_address
        AND platform = p_platform
        AND username = p_username
        AND verification_type = p_verification_type
        AND verification_data = p_verification_data
        AND expires_at > NOW()
    ORDER BY verified_at DESC
    LIMIT 1;
    
    RETURN cached_result;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS for manual submissions
ALTER TABLE airdrop_manual_submissions ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be enhanced later)
CREATE POLICY IF NOT EXISTS user_own_submissions ON airdrop_manual_submissions
    FOR SELECT USING (wallet_address = current_setting('app.current_user_wallet', true));

CREATE POLICY IF NOT EXISTS user_insert_submissions ON airdrop_manual_submissions
    FOR INSERT WITH CHECK (wallet_address = current_setting('app.current_user_wallet', true));

-- Success message
SELECT 'Minimal manual verification system created successfully! ✅' as status,
       'Tables: airdrop_manual_submissions, social_verification_cache, user_social_profiles' as tables_created,
       'Views: pending_manual_submissions' as views_created,
       'Functions: approve_manual_submission, reject_manual_submission, cache_verification_result, get_cached_verification' as functions_created;