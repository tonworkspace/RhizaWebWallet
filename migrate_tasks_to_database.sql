-- Migrate existing hardcoded tasks to database
-- This script populates the airdrop_tasks table with all 21 existing tasks
-- NOTE: Run create_airdrop_tasks_table.sql FIRST before running this script

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

-- Verify the migration
SELECT 
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE is_active = TRUE) as active_tasks,
    SUM(reward) as total_rewards,
    SUM(total_completions) as total_completions
FROM airdrop_tasks t
LEFT JOIN airdrop_task_stats s ON t.id = s.task_id;

-- Success message
SELECT 'Successfully migrated 21 airdrop tasks to database! 🎉' as status,
       'Tasks are now fully database-driven and can be managed through admin interface' as info;