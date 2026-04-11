import { supabaseService } from './supabaseService';

// Manual Verification Service for complex tasks
class ManualVerificationService {
  async submitProofForReview(
    walletAddress: string,
    taskId: number,
    taskAction: string,
    proofData: {
      urls?: string[];
      screenshots?: string[];
      uploadedFiles?: string[]; // Base64 encoded files
      fileNames?: string[];
      fileSizes?: number[];
      description: string;
      additionalInfo?: Record<string, any>;
    }
  ): Promise<{ success: boolean; submissionId?: string; message: string }> {
    try {
      if (!supabaseService.isConfigured()) {
        return {
          success: false,
          message: 'Database not configured. Please contact support.'
        };
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        return {
          success: false,
          message: 'Database connection failed. Please try again.'
        };
      }

      // Prepare additional info with file metadata
      const additionalInfo = {
        ...proofData.additionalInfo,
        fileCount: proofData.uploadedFiles?.length || 0,
        fileNames: proofData.fileNames || [],
        fileSizes: proofData.fileSizes || [],
        totalFileSize: proofData.fileSizes?.reduce((sum, size) => sum + size, 0) || 0,
        submissionMethod: 'enhanced_modal_v2'
      };

      const { data, error } = await supabase
        .from('airdrop_manual_submissions')
        .insert({
          wallet_address: walletAddress,
          task_id: taskId,
          task_action: taskAction,
          proof_urls: proofData.urls || [],
          proof_screenshots: [...(proofData.screenshots || []), ...(proofData.uploadedFiles || [])], // Store base64 files in screenshots field
          description: proofData.description,
          additional_info: additionalInfo,
          status: 'pending',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        submissionId: data.id,
        message: `Proof submitted successfully! Your submission includes ${proofData.uploadedFiles?.length || 0} files and will be reviewed within 24-48 hours.`
      };
    } catch (error) {
      console.error('Manual verification submission error:', error);
      return {
        success: false,
        message: 'Failed to submit proof for review. Please try again.'
      };
    }
  }

  async getSubmissionStatus(walletAddress: string, taskId: number): Promise<{
    status: 'pending' | 'approved' | 'rejected' | 'not_found';
    reviewNotes?: string;
    reviewedAt?: string;
  }> {
    try {
      if (!supabaseService.isConfigured()) {
        return { status: 'not_found' };
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        return { status: 'not_found' };
      }

      const { data, error } = await supabase
        .from('airdrop_manual_submissions')
        .select('status, review_notes, reviewed_at')
        .eq('wallet_address', walletAddress)
        .eq('task_id', taskId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return { status: 'not_found' };
      }

      return {
        status: data.status,
        reviewNotes: data.review_notes,
        reviewedAt: data.reviewed_at
      };
    } catch (error) {
      console.error('Submission status check error:', error);
      return { status: 'not_found' };
    }
  }
}

// Enhanced Social Verification Service
export class SocialVerificationService {
  private manualService: ManualVerificationService;

  constructor() {
    this.manualService = new ManualVerificationService();
  }

  async verifyTask(
    taskAction: string,
    userWallet: string,
    verificationData?: {
      username?: string;
      tweetId?: string;
      keywords?: string[];
      hashtags?: string[];
      proofData?: any;
    }
  ): Promise<{ success: boolean; requiresManualReview?: boolean; message: string }> {
    try {
      switch (taskAction) {
        case 'follow':
          // Trust model: user confirms they followed, submit proof for manual review if username provided
          if (verificationData?.username && verificationData.proofData) {
            const taskIdMap: Record<string, number> = { follow: 1, retweet: 2, post_twitter: 3, comment_engagement: 4 };
            await this.manualService.submitProofForReview(userWallet, taskIdMap[taskAction] ?? 0, taskAction, verificationData.proofData);
          }
          return { success: true, message: 'Follow verified! Thank you for supporting RhizaCore.' };

        case 'retweet':
          if (verificationData?.username && verificationData.proofData) {
            await this.manualService.submitProofForReview(userWallet, 2, taskAction, verificationData.proofData);
          }
          return { success: true, message: 'Retweet verified! Thank you for spreading the word.' };

        case 'post_twitter':
          if (verificationData?.username && verificationData.proofData) {
            await this.manualService.submitProofForReview(userWallet, 3, taskAction, verificationData.proofData);
          }
          return { success: true, message: 'Twitter post verified! Great content.' };

        case 'comment_engagement':
          if (verificationData?.username && verificationData.proofData) {
            await this.manualService.submitProofForReview(userWallet, 4, taskAction, verificationData.proofData);
          }
          return { success: true, message: 'Engagement verified! Thanks for interacting with our posts.' };

        // Manual review tasks
        case 'post_facebook':
        case 'post_linkedin':
        case 'post_instagram':
        case 'share_groups':
        case 'create_video':
        case 'write_article':
        case 'post_reddit':
        case 'share_discord':
        case 'create_meme':
        case 'audio_mention':
        case 'influencer_collab':
        case 'ama_participation':
          if (!verificationData?.proofData) {
            return {
              success: false,
              requiresManualReview: true,
              message: 'This task requires manual verification. Please provide proof of completion.'
            };
          }

          const submissionResult = await this.manualService.submitProofForReview(
            userWallet,
            verificationData.proofData.taskId,
            taskAction,
            verificationData.proofData
          );

          return {
            success: submissionResult.success,
            requiresManualReview: true,
            message: submissionResult.message
          };

        default:
          return { success: false, message: 'Unknown task type' };
      }
    } catch (error) {
      console.error('Social verification error:', error);
      return { success: false, message: 'Verification failed due to technical error. Please try again.' };
    }
  }

  async getManualSubmissionStatus(walletAddress: string, taskId: number) {
    return this.manualService.getSubmissionStatus(walletAddress, taskId);
  }

  // Helper method to check if Twitter API is available
  async isTwitterApiAvailable(): Promise<boolean> {
    try {
      // Twitter API integration would go here
      // For now, return false to use manual verification
      console.warn('Twitter API not configured, using manual verification');
      return false;
    } catch (error) {
      console.warn('Twitter API not available, falling back to manual verification');
      return false;
    }
  }
}

export const socialVerificationService = new SocialVerificationService();