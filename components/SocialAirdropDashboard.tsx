import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Check, 
  Clock, 
  ExternalLink, 
  ArrowRight, 
  Award, 
  Target, 
  MessageCircle,
  Zap,
  TrendingUp,
  Star,
  Copy,
  Users
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { airdropService } from '../services/airdropService';
import { notificationService } from '../services/notificationService';
import { TELEGRAM_MINI_APP_URL } from '../constants';
import { AIRDROP_TASKS, getActiveAirdropTasks, AirdropTaskConfig, getActiveAirdropTasksSync } from '../config/airdropTasks';
import SocialMediaVerificationModal from './SocialMediaVerificationModal';

interface AirdropTask extends AirdropTaskConfig {
  completed: boolean;
  verifying?: boolean;
}

const SocialAirdropDashboard: React.FC = () => {
  const { userProfile, address, referralData } = useWallet();
  const { showToast } = useToast();
  
  const [tasks, setTasks] = useState<AirdropTask[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'social' | 'engagement' | 'growth' | 'content'>('all');
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [verificationModal, setVerificationModal] = useState<{
    isOpen: boolean;
    task: AirdropTask | null;
  }>({ isOpen: false, task: null });

  // --- localStorage helpers for completion persistence ---
  const getLocalCompletions = (): number[] => {
    if (!address) return [];
    try {
      return JSON.parse(localStorage.getItem(`airdrop_completed_${address}`) || '[]');
    } catch { return []; }
  };

  const saveLocalCompletion = (taskId: number) => {
    if (!address) return;
    const existing = getLocalCompletions();
    if (!existing.includes(taskId)) {
      localStorage.setItem(`airdrop_completed_${address}`, JSON.stringify([...existing, taskId]));
    }
  };

  // Merge completed state from all sources into tasks array
  const applyCompletions = (baseTasks: AirdropTask[], dbCompletedIds: number[], localIds: number[], autoIds: number[]): AirdropTask[] => {
    const allCompleted = new Set([...dbCompletedIds, ...localIds, ...autoIds]);
    return baseTasks.map(t => ({ ...t, completed: allCompleted.has(t.id) }));
  };

  // Single unified load — runs once when address is ready
  useEffect(() => {
    if (!address) return;

    const init = async () => {
      // 1. Load task definitions
      let baseTasks: AirdropTask[] = [];
      try {
        const activeTasks = await getActiveAirdropTasks();
        baseTasks = activeTasks.map(t => ({ ...t, completed: false, verifying: false }));
      } catch {
        baseTasks = getActiveAirdropTasksSync().map(t => ({ ...t, completed: false, verifying: false }));
      }

      // 2. Collect completions from all sources in parallel
      const localIds = getLocalCompletions();

      const dbIds: number[] = [];
      try {
        const progressResult = await airdropService.getAirdropProgress(address);
        if (progressResult.success && progressResult.data?.completedTasks) {
          progressResult.data.completedTasks.forEach((c: any) => {
            if (c.task_id != null) dbIds.push(Number(c.task_id));
          });
        }
      } catch { /* non-fatal */ }

      // 3. Auto-complete tasks based on live state
      const autoIds: number[] = [];
      try {
        const taskStatus = await airdropService.getTaskStatus(address);
        setDailyStreak(taskStatus.dailyStreak || 0);
        baseTasks.forEach(t => {
          if (t.action === 'create_wallet' && taskStatus.walletCreated) autoIds.push(t.id);
          if (t.action === 'referral' && taskStatus.referralsCompleted) autoIds.push(t.id);
          if (t.action === 'profile_complete' && taskStatus.profileCompleted) autoIds.push(t.id);
          if (t.action === 'daily_checkin' && taskStatus.dailyCheckinCompleted) autoIds.push(t.id);
        });
      } catch {
        // Fallback auto-complete
        if (userProfile && address) {
          baseTasks.forEach(t => {
            if (t.action === 'create_wallet') autoIds.push(t.id);
          });
        }
        if (referralData && referralData.total_referrals >= 3) {
          baseTasks.forEach(t => { if (t.action === 'referral') autoIds.push(t.id); });
        }
        if (userProfile?.avatar && userProfile?.name) {
          baseTasks.forEach(t => { if (t.action === 'profile_complete') autoIds.push(t.id); });
        }
        const streak = parseInt(localStorage.getItem(`daily_streak_${address}`) || '0');
        setDailyStreak(streak);
      }

      // 4. Apply all completions at once — no race condition
      setTasks(applyCompletions(baseTasks, dbIds, localIds, autoIds));
      setTasksLoaded(true);
    };

    init();
  }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate stats
  const completedTasks = tasks.filter(t => t.completed);
  const totalReward = completedTasks.reduce((sum, t) => sum + t.reward, 0);
  const maxReward = tasks.reduce((sum, t) => sum + t.reward, 0);
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (selectedCategory !== 'all' && task.category !== selectedCategory) return false;
    if (!showCompletedTasks && task.completed) return false;
    return true;
  });



  const handleTaskAction = async (task: AirdropTask) => {
    try {
      switch (task.action) {
        case 'create_wallet':
          // This task is automatically completed when user is logged in
          showToast('Wallet creation task is automatically verified when logged in', 'info');
          break;
        case 'follow':
          window.open('https://twitter.com/RhizaCore', '_blank');
          showToast('Please follow @RhizaCore and then click "Verify" to confirm', 'info');
          break;
        case 'retweet':
          window.open('https://x.com/RhizaCore/status/2033090568226537721?s=20', '_blank');
          showToast('Please retweet the post and then click "Verify" to confirm', 'info');
          break;
        case 'telegram':
          window.open(TELEGRAM_MINI_APP_URL, '_blank');
          showToast('Please join our Telegram and then click "Verify" to confirm', 'info');
          break;
        case 'referral':
          // Copy referral link and provide better guidance
          const referralLink = referralData?.referral_code 
            ? `${window.location.origin}/#/join?ref=${referralData.referral_code}`
            : `https://rhizacore.xyz/#/join?ref=${referralData.referral_code}`;
          
          await navigator.clipboard.writeText(referralLink);
          
          const currentReferrals = referralData?.total_referrals || 0;
          if (currentReferrals === 0) {
            showToast('Referral link copied! Share with friends to start earning. You need 3 referrals to complete this task.', 'success');
          } else if (currentReferrals < 3) {
            showToast(`Referral link copied! You have ${currentReferrals}/3 referrals. ${3 - currentReferrals} more needed to complete task.`, 'success');
          } else {
            showToast('Referral link copied! You have completed this task - claim your reward!', 'success');
          }
          
          // Optional: Navigate to referral page for more details
          setTimeout(() => {
            if (window.confirm('Would you like to view your referral dashboard for detailed stats?')) {
              window.location.hash = '#/wallet/referral';
            }
          }, 2000);
          break;
        case 'daily_checkin':
          await handleDailyCheckin(task);
          break;
        case 'profile_complete':
          showToast('Please complete your profile in Settings', 'info');
          break;
        
        // NEW SOCIAL MEDIA & CONTENT TASKS
        case 'post_twitter':
          window.open('https://twitter.com/compose/tweet?text=Just%20discovered%20%40RhizaCore%20and%20their%20%24RZC%20token!%20%F0%9F%9A%80%20The%20future%20of%20decentralized%20finance%20looks%20bright%20%F0%9F%92%8E%20%23RZC%20%23RhizaCore%20%23DeFi%20%23Crypto', '_blank');
          showToast('Create your post about RZC and then click "Verify" to confirm', 'info');
          break;
        case 'post_facebook':
          window.open('https://www.facebook.com/sharer/sharer.php?u=https://rhizacore.xyz', '_blank');
          showToast('Share RhizaCore on Facebook and then click "Verify" to confirm', 'info');
          break;
        case 'post_linkedin':
          window.open('https://www.linkedin.com/sharing/share-offsite/?url=https://rhizacore.xyz', '_blank');
          showToast('Share RhizaCore on LinkedIn and then click "Verify" to confirm', 'info');
          break;
        case 'post_instagram':
          showToast('Create an Instagram post/story about RZC and then click "Verify" to confirm', 'info');
          break;
        case 'comment_engagement':
          window.open('https://twitter.com/RhizaCore', '_blank');
          showToast('Engage with our posts by commenting meaningfully, then click "Verify"', 'info');
          break;
        case 'share_groups':
          showToast('Share RhizaCore in crypto groups (follow group rules) and then click "Verify"', 'info');
          break;
        case 'create_video':
          showToast('Create a video about RZC (TikTok, YouTube, Instagram) and then click "Verify"', 'info');
          break;
        case 'write_article':
          showToast('Write an article about RhizaCore (Medium, blog, etc.) and then click "Verify"', 'info');
          break;
        case 'post_reddit':
          window.open('https://www.reddit.com/r/CryptoCurrency/submit', '_blank');
          showToast('Create a quality post about RZC on Reddit and then click "Verify"', 'info');
          break;
        case 'share_discord':
          showToast('Share RhizaCore in Discord servers (follow rules) and then click "Verify"', 'info');
          break;
        case 'create_meme':
          showToast('Create and share an original RZC meme and then click "Verify"', 'info');
          break;
        case 'audio_mention':
          showToast('Mention RhizaCore in audio content (podcast, spaces) and then click "Verify"', 'info');
          break;
        case 'influencer_collab':
          showToast('Collaborate with crypto influencers to promote RZC and then click "Verify"', 'info');
          break;
        case 'ama_participation':
          showToast('Participate in RhizaCore AMAs and community calls, then click "Verify"', 'info');
          break;
      }
    } catch (error) {
      console.error('Task action error:', error);
      showToast('An error occurred. Please try again.', 'error');
    }
  };
  const verifyTask = async (task: AirdropTask, verificationData?: any) => {
    try {
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, verifying: true } : t
      ));

      // Use enhanced airdrop service for verification
      const verificationResult = await airdropService.verifyTaskCompletion(
        task.action, 
        address, 
        verificationData
      );

      if (verificationResult.success) {
        // Record task completion with database tracking
        const completionResult = await airdropService.recordTaskCompletion(
          address,
          task.id,
          task.action,
          task.title,
          task.reward
        );

        if (completionResult.success) {
          handleTaskComplete(task.id);
          saveLocalCompletion(task.id);
          showToast(`Task "${task.title}" verified! +${task.reward} RZC earned`, 'success');
          
          // Log activity
          if (address) {
            await notificationService.logActivity(
              address,
              'feature_used',
              `Completed airdrop task: ${task.title}`,
              {
                taskId: task.id,
                reward: task.reward,
                category: task.category,
                timestamp: new Date().toISOString()
              }
            );
          }
        } else {
          showToast(`Task verified but completion failed: ${completionResult.message}`, 'error');
        }
      } else if (verificationResult.requiresManualReview) {
        showToast(verificationResult.message, 'info');
      } else {
        showToast(verificationResult.message, 'error');
      }
    } catch (error) {
      console.error('Task verification error:', error);
      showToast('Verification failed. Please try again.', 'error');
    } finally {
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, verifying: false } : t
      ));
    }
  };

  const handleTaskComplete = (taskId: number) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: true } : task
    ));
  };

  const handleDailyCheckin = async (task: AirdropTask) => {
    try {
      // Use enhanced airdrop service for daily checkin
      const checkinResult = await airdropService.recordDailyCheckin(address);
      
      if (!checkinResult.success) {
        showToast('You have already checked in today!', 'info');
        return;
      }

      // Record task completion with database tracking
      const completionResult = await airdropService.recordTaskCompletion(
        address,
        task.id,
        task.action,
        task.title,
        task.reward
      );

      if (completionResult.success) {
        // Mark as completed
        handleTaskComplete(task.id);
        saveLocalCompletion(task.id);
        
        // Update streak
        setDailyStreak(checkinResult.newStreak);
        
        showToast(`Daily check-in complete! Streak: ${checkinResult.newStreak} days. +${task.reward} RZC earned`, 'success');
        
        // Log activity
        if (address) {
          await notificationService.logActivity(
            address,
            'feature_used',
            `Daily check-in completed - Streak: ${checkinResult.newStreak}`,
            {
              streak: checkinResult.newStreak,
              reward: task.reward,
              timestamp: new Date().toISOString()
            }
          );
        }
      } else {
        showToast(`Check-in recorded but completion failed: ${completionResult.message}`, 'error');
      }
    } catch (error) {
      console.error('Daily checkin error:', error);
      showToast('Check-in failed. Please try again.', 'error');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/10';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-500/10';
      case 'hard': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-500/10';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'social': return <MessageCircle size={14} />;
      case 'engagement': return <Target size={14} />;
      case 'growth': return <TrendingUp size={14} />;
      default: return <Star size={14} />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-center">
          <div className="text-lg font-black text-primary">{completedTasks.length}</div>
          <div className="text-[9px] font-black uppercase tracking-widest text-gray-500">Completed</div>
        </div>
        <div className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-center">
          <div className="text-lg font-black text-secondary">{totalReward}</div>
          <div className="text-[9px] font-black uppercase tracking-widest text-gray-500">RZC Earned</div>
        </div>
        <div className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-center">
          <div className="text-lg font-black text-emerald-600">{completionRate}%</div>
          <div className="text-[9px] font-black uppercase tracking-widest text-gray-500">Progress</div>
        </div>
        <div className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-center">
          <div className="text-lg font-black text-orange-600">{dailyStreak}</div>
          <div className="text-[9px] font-black uppercase tracking-widest text-gray-500">Day Streak</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-black text-gray-900 dark:text-white">Airdrop Progress</h3>
          <span className="text-xs font-black text-primary">{totalReward} / {maxReward} RZC</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-1000"
            style={{ width: `${(totalReward / maxReward) * 100}%` }}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {(['all', 'social', 'engagement', 'growth', 'content'] as const).map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              selectedCategory === category
                ? 'bg-primary text-black'
                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            {category}
          </button>
        ))}
        <button
          onClick={() => setShowCompletedTasks(!showCompletedTasks)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
            showCompletedTasks
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
          }`}
        >
          Show Done
        </button>
      </div>
      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <div 
            key={task.id} 
            className={`p-4 border rounded-xl transition-all ${
              task.completed 
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' 
                : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-primary/30'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Task Icon */}
              <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${
                task.completed 
                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                  : 'border-gray-300 dark:border-white/20 text-gray-500 dark:text-gray-400'
              }`}>
                {task.completed ? <Check size={20} /> : getCategoryIcon(task.category)}
              </div>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-gray-900 dark:text-white text-sm mb-1 truncate">
                      {task.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                      {task.description}
                    </p>
                    {task.instructions && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                          💡 <strong>Instructions:</strong> {task.instructions}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-black text-primary">+{task.reward} RZC</span>
                  </div>
                </div>

                {/* Task Meta */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${getDifficultyColor(task.difficulty)}`}>
                    {task.difficulty}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400">
                    {task.category}
                  </span>
                  {task.timeLimit && (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center gap-1">
                      <Clock size={10} />
                      {task.timeLimit}
                    </span>
                  )}
                  {/* Referral Progress Indicator */}
                  {task.action === 'referral' && referralData && !task.completed && (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Users size={10} />
                      {referralData.total_referrals}/3
                    </span>
                  )}
                </div>

                {/* Referral Progress Bar */}
                {task.action === 'referral' && referralData && !task.completed && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">
                        Referral Progress
                      </span>
                      <span className="text-[10px] font-black text-primary">
                        {referralData.total_referrals}/3 friends
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((referralData.total_referrals / 3) * 100, 100)}%` }}
                      />
                    </div>
                    {referralData.total_referrals > 0 && (
                      <p className="text-[9px] text-gray-600 dark:text-gray-400 mt-1 font-semibold">
                        {referralData.total_referrals === 1 ? '1 friend joined!' : `${referralData.total_referrals} friends joined!`}
                        {referralData.total_referrals < 3 && ` ${3 - referralData.total_referrals} more to complete task.`}
                      </p>
                    )}
                  </div>
                )}

                {/* Task Actions */}
                {!task.completed && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleTaskAction(task)}
                      className="px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                    >
                      {task.action === 'create_wallet' && 'Verify'}
                      {task.action === 'follow' && 'Follow'}
                      {task.action === 'retweet' && 'Retweet'}
                      {task.action === 'telegram' && 'Join'}
                      {task.action === 'referral' && 'Copy Link'}
                      {task.action === 'daily_checkin' && 'Check In'}
                      {task.action === 'profile_complete' && 'Complete'}
                      {task.action === 'post_twitter' && 'Post on X'}
                      {task.action === 'post_facebook' && 'Post on Facebook'}
                      {task.action === 'post_linkedin' && 'Post on LinkedIn'}
                      {task.action === 'post_instagram' && 'Post on Instagram'}
                      {task.action === 'comment_engagement' && 'Engage'}
                      {task.action === 'share_groups' && 'Share'}
                      {task.action === 'create_video' && 'Create Video'}
                      {task.action === 'write_article' && 'Write Article'}
                      {task.action === 'post_reddit' && 'Post on Reddit'}
                      {task.action === 'share_discord' && 'Share on Discord'}
                      {task.action === 'create_meme' && 'Create Meme'}
                      {task.action === 'audio_mention' && 'Record Audio'}
                      {task.action === 'influencer_collab' && 'Collaborate'}
                      {task.action === 'ama_participation' && 'Participate'}
                      {(task.action === 'follow' || task.action === 'retweet' || task.action === 'telegram' || 
                        task.action === 'post_twitter' || task.action === 'post_facebook' || task.action === 'post_linkedin' || 
                        task.action === 'post_instagram' || task.action === 'post_reddit') && <ExternalLink size={12} />}
                      {task.action === 'referral' && <Copy size={12} />}
                      {task.action === 'daily_checkin' && <Zap size={12} />}
                    </button>
                    
                    {task.action !== 'daily_checkin' && task.action !== 'profile_complete' && task.action !== 'create_wallet' && (
                      <button 
                        onClick={() => {
                          // Tasks that need verification data should open modal
                          const needsVerificationData = [
                            'follow', 'retweet', 'post_twitter', 'comment_engagement',
                            'post_facebook', 'post_linkedin', 'post_instagram', 'share_groups',
                            'create_video', 'write_article', 'post_reddit', 'share_discord',
                            'create_meme', 'audio_mention', 'influencer_collab', 'ama_participation'
                          ].includes(task.action);

                          if (needsVerificationData) {
                            setVerificationModal({ isOpen: true, task });
                          } else {
                            verifyTask(task);
                          }
                        }}
                        disabled={task.verifying}
                        className="px-4 py-2 bg-primary text-black rounded-lg text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {task.verifying ? (
                          <>
                            <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <Check size={12} />
                            Verify
                          </>
                        )}
                      </button>
                    )}

                    {task.action === 'create_wallet' && (
                      <button 
                        onClick={() => verifyTask(task)}
                        disabled={task.verifying}
                        className="px-4 py-2 bg-primary text-black rounded-lg text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {task.verifying ? (
                          <>
                            <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <Check size={12} />
                            Verify
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {task.completed && (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Check size={16} />
                    <span className="text-xs font-black uppercase tracking-wider">Completed</span>
                    <span className="text-xs font-black">+{task.reward} RZC</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="p-8 text-center bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
            <Gift size={32} className="mx-auto mb-3 text-gray-400" />
            <h4 className="font-black text-gray-900 dark:text-white mb-2">No tasks available</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {showCompletedTasks ? 'No completed tasks yet' : 'All tasks completed! Check back later for more.'}
            </p>
          </div>
        )}
      </div>

      {/* Leaderboard Teaser */}
      {completedTasks.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 border border-purple-200 dark:border-purple-500/20 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Award size={20} className="text-white" />
              </div>
              <div>
                <h4 className="font-black text-gray-900 dark:text-white text-sm">Airdrop Leaderboard</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">Compete with other users for bonus rewards</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      )}

      {/* Social Media Verification Modal */}
      <SocialMediaVerificationModal
        isOpen={verificationModal.isOpen}
        onClose={() => setVerificationModal({ isOpen: false, task: null })}
        taskAction={verificationModal.task?.action || ''}
        taskTitle={verificationModal.task?.title || ''}
        onVerify={async (verificationData) => {
          if (verificationModal.task) {
            await verifyTask(verificationModal.task, verificationData);
          }
        }}
      />
    </div>
  );
};

export default SocialAirdropDashboard;