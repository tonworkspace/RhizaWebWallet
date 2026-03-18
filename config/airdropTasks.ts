// Centralized Airdrop Task Configuration
// This file now serves as a fallback when database is not available
// Primary source is now the database (airdrop_tasks table)

import { databaseAirdropService, DatabaseAirdropTask } from '../services/databaseAirdropService';

export interface AirdropTaskConfig {
  id: number;
  title: string;
  description: string;
  reward: number;
  action: string;
  category: 'social' | 'engagement' | 'growth' | 'content';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  is_active: boolean;
  instructions?: string;
  timeLimit?: string;
  completions?: number;
  verification_type: 'automatic' | 'manual' | 'social_api';
  requirements?: {
    min_followers?: number;
    platforms?: string[];
    keywords?: string[];
    hashtags?: string[];
  };
}

// Master task configuration - single source of truth
export const AIRDROP_TASKS: AirdropTaskConfig[] = [
  {
    id: 0,
    title: 'Create RhizaCore Wallet',
    description: 'Create or login to your RhizaCore wallet',
    reward: 150,
    action: 'create_wallet',
    category: 'engagement',
    difficulty: 'easy',
    is_active: true,
    instructions: 'Simply create an account to get started with RhizaCore',
    timeLimit: '',
    completions: 1247,
    verification_type: 'automatic'
  },
  {
    id: 1,
    title: 'Follow @RhizaCore on X',
    description: 'Follow our official X account for updates',
    reward: 100,
    action: 'follow',
    category: 'social',
    difficulty: 'easy',
    is_active: true,
    instructions: 'Follow @RhizaCore on X (Twitter) to stay updated with latest news',
    timeLimit: '',
    completions: 892,
    verification_type: 'social_api',
    requirements: {
      platforms: ['twitter']
    }
  },
  {
    id: 2,
    title: 'Retweet Announcement',
    description: 'Retweet our latest announcement post',
    reward: 75,
    action: 'retweet',
    category: 'social',
    difficulty: 'easy',
    is_active: true,
    instructions: 'Retweet our pinned announcement to help spread the word',
    timeLimit: '',
    completions: 756,
    verification_type: 'social_api',
    requirements: {
      platforms: ['twitter']
    }
  },
  {
    id: 3,
    title: 'Join Telegram Community',
    description: 'Join our official Telegram group',
    reward: 125,
    action: 'telegram',
    category: 'social',
    difficulty: 'easy',
    is_active: true,
    instructions: 'Join our Telegram community for real-time updates and discussions',
    timeLimit: '',
    completions: 634,
    verification_type: 'manual',
    requirements: {
      platforms: ['telegram']
    }
  },
  {
    id: 4,
    title: 'Refer 3 Friends',
    description: 'Invite 3 friends to join RhizaCore',
    reward: 300,
    action: 'referral',
    category: 'growth',
    difficulty: 'hard',
    is_active: true,
    instructions: 'Share your referral link with friends and earn when they join',
    timeLimit: '',
    completions: 234,
    verification_type: 'automatic'
  },
  {
    id: 5,
    title: 'Daily Check-in',
    description: 'Complete your daily check-in streak',
    reward: 50,
    action: 'daily_checkin',
    category: 'engagement',
    difficulty: 'easy',
    is_active: true,
    instructions: 'Check in daily to maintain your streak and earn rewards',
    timeLimit: '24h',
    completions: 2156,
    verification_type: 'automatic'
  },
  {
    id: 6,
    title: 'Complete Profile',
    description: 'Add avatar and complete profile setup',
    reward: 150,
    action: 'profile_complete',
    category: 'engagement',
    difficulty: 'medium',
    is_active: true,
    instructions: 'Complete your profile with avatar and personal information',
    timeLimit: '',
    completions: 1089,
    verification_type: 'automatic'
  },
  {
    id: 7,
    title: 'Post About RZC on X',
    description: 'Create an original post about RhizaCore and RZC token on X (Twitter)',
    reward: 200,
    action: 'post_twitter',
    category: 'content',
    difficulty: 'medium',
    is_active: true,
    instructions: 'Share your thoughts about RZC, mention @RhizaCore, and include #RZC #RhizaCore hashtags',
    timeLimit: '',
    completions: 387,
    verification_type: 'social_api',
    requirements: {
      platforms: ['twitter'],
      keywords: ['rhizacore', 'rzc'],
      hashtags: ['#rzc', '#rhizacore']
    }
  },
  {
    id: 8,
    title: 'Share RZC on Facebook',
    description: 'Post about RhizaCore on your Facebook profile or page',
    reward: 150,
    action: 'post_facebook',
    category: 'content',
    difficulty: 'medium',
    is_active: true,
    instructions: 'Share why you believe in RZC and RhizaCore ecosystem on Facebook',
    timeLimit: '',
    completions: 234,
    verification_type: 'manual',
    requirements: {
      platforms: ['facebook']
    }
  },
  {
    id: 9,
    title: 'LinkedIn Professional Post',
    description: 'Write a professional post about RZC on LinkedIn',
    reward: 250,
    action: 'post_linkedin',
    category: 'content',
    difficulty: 'medium',
    is_active: true,
    instructions: 'Focus on the professional/business aspects of RhizaCore for LinkedIn audience',
    timeLimit: '',
    completions: 156,
    verification_type: 'manual',
    requirements: {
      platforms: ['linkedin']
    }
  },
  {
    id: 10,
    title: 'Instagram Story/Post',
    description: 'Share RhizaCore on your Instagram story or feed',
    reward: 175,
    action: 'post_instagram',
    category: 'content',
    difficulty: 'medium',
    is_active: true,
    instructions: 'Use creative visuals and tag @rhizacore if available',
    timeLimit: '',
    completions: 298,
    verification_type: 'manual',
    requirements: {
      platforms: ['instagram']
    }
  },
  {
    id: 11,
    title: 'Comment on RZC Posts',
    description: 'Leave meaningful comments on 3 RhizaCore social media posts',
    reward: 100,
    action: 'comment_engagement',
    category: 'social',
    difficulty: 'easy',
    is_active: true,
    instructions: 'Engage authentically with our content across platforms',
    timeLimit: '',
    completions: 567,
    verification_type: 'social_api',
    requirements: {
      platforms: ['twitter', 'facebook', 'linkedin']
    }
  },
  {
    id: 12,
    title: 'Share in Crypto Groups',
    description: 'Share RhizaCore in 2 relevant crypto/blockchain groups',
    reward: 300,
    action: 'share_groups',
    category: 'growth',
    difficulty: 'hard',
    is_active: true,
    instructions: 'Share in Telegram, Discord, or Reddit crypto communities (follow group rules)',
    timeLimit: '',
    completions: 123,
    verification_type: 'manual',
    requirements: {
      platforms: ['telegram', 'discord', 'reddit']
    }
  },
  {
    id: 13,
    title: 'Create RZC Video Content',
    description: 'Create a video about RhizaCore (TikTok, YouTube Shorts, Instagram Reels)',
    reward: 500,
    action: 'create_video',
    category: 'content',
    difficulty: 'hard',
    is_active: true,
    instructions: 'Minimum 30 seconds explaining RZC benefits or your experience',
    timeLimit: '7 days',
    completions: 45,
    verification_type: 'manual',
    requirements: {
      platforms: ['tiktok', 'youtube', 'instagram']
    }
  },
  {
    id: 14,
    title: 'Write RZC Blog/Article',
    description: 'Write a detailed article about RhizaCore (Medium, personal blog, etc.)',
    reward: 750,
    action: 'write_article',
    category: 'content',
    difficulty: 'hard',
    is_active: true,
    instructions: 'Minimum 500 words covering RZC utility, technology, or ecosystem',
    timeLimit: '14 days',
    completions: 23,
    verification_type: 'manual',
    requirements: {
      platforms: ['medium', 'blog']
    }
  },
  {
    id: 15,
    title: 'Reddit Community Post',
    description: 'Create a quality post about RZC in relevant Reddit communities',
    reward: 200,
    action: 'post_reddit',
    category: 'content',
    difficulty: 'medium',
    is_active: true,
    instructions: 'Post in r/cryptocurrency, r/defi, or other relevant subreddits',
    timeLimit: '',
    completions: 89,
    verification_type: 'manual',
    requirements: {
      platforms: ['reddit']
    }
  },
  {
    id: 16,
    title: 'Discord Community Share',
    description: 'Share RhizaCore in 3 crypto Discord servers',
    reward: 250,
    action: 'share_discord',
    category: 'growth',
    difficulty: 'medium',
    is_active: true,
    instructions: 'Share respectfully in appropriate channels, follow server rules',
    timeLimit: '',
    completions: 67,
    verification_type: 'manual',
    requirements: {
      platforms: ['discord']
    }
  },
  {
    id: 17,
    title: 'Create RZC Meme',
    description: 'Create and share an original RZC/RhizaCore meme',
    reward: 150,
    action: 'create_meme',
    category: 'content',
    difficulty: 'easy',
    is_active: true,
    instructions: 'Be creative and fun! Share on any social platform',
    timeLimit: '',
    completions: 234,
    verification_type: 'manual',
    requirements: {
      platforms: ['twitter', 'instagram', 'reddit']
    }
  },
  {
    id: 18,
    title: 'Podcast/Spaces Mention',
    description: 'Mention RhizaCore in a podcast, Twitter Space, or audio content',
    reward: 400,
    action: 'audio_mention',
    category: 'content',
    difficulty: 'hard',
    is_active: true,
    instructions: 'Speak about RZC in any audio format (podcast, spaces, clubhouse, etc.)',
    timeLimit: '',
    completions: 12,
    verification_type: 'manual',
    requirements: {
      platforms: ['twitter', 'clubhouse', 'podcast']
    }
  },
  {
    id: 19,
    title: 'Influencer Collaboration',
    description: 'Get a crypto influencer to mention or share RhizaCore',
    reward: 1000,
    action: 'influencer_collab',
    category: 'growth',
    difficulty: 'expert',
    is_active: true,
    instructions: 'Collaborate with influencers (1K+ followers) to promote RZC',
    timeLimit: '30 days',
    completions: 8,
    verification_type: 'manual',
    requirements: {
      min_followers: 1000,
      platforms: ['twitter', 'youtube', 'instagram', 'tiktok']
    }
  },
  {
    id: 20,
    title: 'Community AMA Question',
    description: 'Ask a thoughtful question in RhizaCore AMA or community call',
    reward: 100,
    action: 'ama_participation',
    category: 'engagement',
    difficulty: 'easy',
    is_active: true,
    instructions: 'Participate actively in community events and AMAs',
    timeLimit: '',
    completions: 145,
    verification_type: 'manual',
    requirements: {
      platforms: ['telegram', 'discord', 'twitter']
    }
  }
];

// Helper functions for task management (now database-first with fallback)

/**
 * Get active airdrop tasks (database-first approach)
 */
export const getActiveAirdropTasks = async (): Promise<AirdropTaskConfig[]> => {
  try {
    // Try database first
    const result = await databaseAirdropService.getActiveTasks();
    if (result.success && result.data) {
      return result.data.map(convertDatabaseTaskToConfig);
    }
    
    // Fallback to hardcoded tasks
    console.warn('Database not available, using fallback tasks');
    return AIRDROP_TASKS.filter(task => task.is_active);
  } catch (error) {
    console.error('Error fetching active tasks:', error);
    return AIRDROP_TASKS.filter(task => task.is_active);
  }
};

/**
 * Get all airdrop tasks (database-first approach)
 */
export const getAllAirdropTasks = async (): Promise<AirdropTaskConfig[]> => {
  try {
    // Try database first
    const result = await databaseAirdropService.getAllTasks();
    if (result.success && result.data) {
      return result.data.map(convertDatabaseTaskToConfig);
    }
    
    // Fallback to hardcoded tasks
    console.warn('Database not available, using fallback tasks');
    return AIRDROP_TASKS;
  } catch (error) {
    console.error('Error fetching all tasks:', error);
    return AIRDROP_TASKS;
  }
};

/**
 * Get airdrop task by ID (database-first approach)
 */
export const getAirdropTaskById = async (id: number): Promise<AirdropTaskConfig | undefined> => {
  try {
    // Try database first
    const result = await databaseAirdropService.getTaskById(id);
    if (result.success && result.data) {
      return convertDatabaseTaskToConfig(result.data);
    }
    
    // Fallback to hardcoded tasks
    console.warn('Database not available, using fallback task lookup');
    return AIRDROP_TASKS.find(task => task.id === id);
  } catch (error) {
    console.error('Error fetching task by ID:', error);
    return AIRDROP_TASKS.find(task => task.id === id);
  }
};

/**
 * Convert database task to config format
 */
const convertDatabaseTaskToConfig = (dbTask: DatabaseAirdropTask): AirdropTaskConfig => {
  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description,
    reward: dbTask.reward,
    action: dbTask.action,
    category: dbTask.category,
    difficulty: dbTask.difficulty,
    is_active: dbTask.is_active,
    instructions: dbTask.instructions,
    timeLimit: dbTask.time_limit,
    completions: dbTask.total_completions || 0,
    verification_type: dbTask.verification_type,
    requirements: dbTask.requirements
  };
};

/**
 * Synchronous versions for backward compatibility
 */
export const getActiveAirdropTasksSync = (): AirdropTaskConfig[] => {
  return AIRDROP_TASKS.filter(task => task.is_active);
};

export const getAirdropTaskByIdSync = (id: number): AirdropTaskConfig | undefined => {
  return AIRDROP_TASKS.find(task => task.id === id);
};

export const getAirdropTasksByCategory = (category: string): AirdropTaskConfig[] => {
  return AIRDROP_TASKS.filter(task => task.category === category && task.is_active);
};

export const getAirdropTasksByDifficulty = (difficulty: string): AirdropTaskConfig[] => {
  return AIRDROP_TASKS.filter(task => task.difficulty === difficulty && task.is_active);
};

export const getTotalAirdropRewards = (): number => {
  return AIRDROP_TASKS.reduce((total, task) => total + (task.is_active ? task.reward : 0), 0);
};

export const getAirdropStats = async () => {
  try {
    // Try database first
    const result = await databaseAirdropService.getAirdropStats();
    if (result.success && result.data) {
      return result.data;
    }
    
    // Fallback to hardcoded calculation
    console.warn('Database not available, using fallback stats calculation');
    const activeTasks = getActiveAirdropTasksSync();
    const totalCompletions = AIRDROP_TASKS.reduce((sum, task) => sum + (task.completions || 0), 0);
    const totalRewardsDistributed = AIRDROP_TASKS.reduce((sum, task) => 
      sum + ((task.completions || 0) * task.reward), 0
    );

    return {
      totalTasks: AIRDROP_TASKS.length,
      activeTasks: activeTasks.length,
      totalRewards: activeTasks.reduce((sum, task) => sum + task.reward, 0),
      totalCompletions,
      totalDistributed: totalRewardsDistributed,
      averageReward: Math.round(activeTasks.reduce((sum, task) => sum + task.reward, 0) / activeTasks.length)
    };
  } catch (error) {
    console.error('Error fetching airdrop stats:', error);
    // Return fallback stats
    const activeTasks = getActiveAirdropTasksSync();
    return {
      totalTasks: AIRDROP_TASKS.length,
      activeTasks: activeTasks.length,
      totalRewards: activeTasks.reduce((sum, task) => sum + task.reward, 0),
      totalCompletions: 0,
      totalDistributed: 0,
      averageReward: Math.round(activeTasks.reduce((sum, task) => sum + task.reward, 0) / activeTasks.length)
    };
  }
};

// Task action type definitions for TypeScript
export type AirdropTaskAction = 
  | 'create_wallet' | 'follow' | 'retweet' | 'telegram' | 'referral' 
  | 'daily_checkin' | 'profile_complete' | 'post_twitter' | 'post_facebook' 
  | 'post_linkedin' | 'post_instagram' | 'comment_engagement' | 'share_groups' 
  | 'create_video' | 'write_article' | 'post_reddit' | 'share_discord' 
  | 'create_meme' | 'audio_mention' | 'influencer_collab' | 'ama_participation';

export type AirdropTaskCategory = 'social' | 'engagement' | 'growth' | 'content';
export type AirdropTaskDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type AirdropVerificationType = 'automatic' | 'manual' | 'social_api';