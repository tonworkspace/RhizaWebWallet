-- Seed initial airdrop tasks if table is empty
-- Run this if you're getting "task not found" errors

-- First, check if we have any tasks
DO $$
DECLARE
    task_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO task_count FROM airdrop_tasks;
    
    IF task_count = 0 THEN
        RAISE NOTICE 'No tasks found. Seeding initial tasks...';
        
        -- Insert initial tasks
        INSERT INTO airdrop_tasks (
            id, title, description, reward, action, category, difficulty, 
            is_active, instructions, verification_type, sort_order
        ) VALUES
        (0, 'Create RhizaCore Wallet', 'Create or login to your RhizaCore wallet', 150, 'create_wallet', 'engagement', 'easy', true, 'Simply create an account to get started with RhizaCore', 'automatic', 0),
        (1, 'Follow @RhizaCore on X', 'Follow our official X account for updates', 100, 'follow', 'social', 'easy', true, 'Follow @RhizaCore on X (Twitter) to stay updated with latest news', 'social_api', 10),
        (2, 'Retweet Announcement', 'Retweet our latest announcement post', 75, 'retweet', 'social', 'easy', true, 'Retweet our pinned announcement to help spread the word', 'social_api', 20),
        (3, 'Join Telegram Community', 'Join our official Telegram group', 125, 'telegram', 'social', 'easy', true, 'Join our Telegram community for real-time updates and discussions', 'manual', 30),
        (4, 'Refer 3 Friends', 'Invite 3 friends to join RhizaCore', 300, 'referral', 'growth', 'hard', true, 'Share your referral link with friends and earn when they join', 'automatic', 40),
        (5, 'Daily Check-in', 'Complete your daily check-in streak', 50, 'daily_checkin', 'engagement', 'easy', true, 'Check in daily to maintain your streak and earn rewards', 'automatic', 50),
        (6, 'Complete Profile', 'Add avatar and complete profile setup', 150, 'profile_complete', 'engagement', 'medium', true, 'Complete your profile with avatar and personal information', 'automatic', 60),
        (7, 'Post About RZC on X', 'Create an original post about RhizaCore and RZC token on X', 200, 'post_twitter', 'content', 'medium', true, 'Share your thoughts about RZC, mention @RhizaCore, and include #RZC #RhizaCore hashtags', 'social_api', 70),
        (8, 'Share RZC on Facebook', 'Post about RhizaCore on your Facebook profile or page', 150, 'post_facebook', 'content', 'medium', true, 'Share why you believe in RZC and RhizaCore ecosystem on Facebook', 'manual', 80),
        (9, 'LinkedIn Professional Post', 'Write a professional post about RZC on LinkedIn', 250, 'post_linkedin', 'content', 'medium', true, 'Focus on the professional/business aspects of RhizaCore for LinkedIn audience', 'manual', 90),
        (10, 'Instagram Story/Post', 'Share RhizaCore on your Instagram story or feed', 175, 'post_instagram', 'content', 'medium', true, 'Use creative visuals and tag @rhizacore if available', 'manual', 100);
        
        RAISE NOTICE 'Seeded % initial tasks', (SELECT COUNT(*) FROM airdrop_tasks);
    ELSE
        RAISE NOTICE 'Tasks already exist (%). Skipping seed.', task_count;
    END IF;
END $$;

-- Verify tasks were created
SELECT 
    id,
    title,
    reward,
    category,
    difficulty,
    is_active
FROM airdrop_tasks
ORDER BY sort_order, id;

-- Show summary
SELECT 
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE is_active = true) as active_tasks,
    SUM(reward) FILTER (WHERE is_active = true) as total_rewards_available
FROM airdrop_tasks;
