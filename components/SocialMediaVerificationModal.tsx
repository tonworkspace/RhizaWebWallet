import React, { useState, useRef } from 'react';
import { X, Twitter, MessageCircle, Linkedin, Instagram, FileText, Video, Users, Upload, Camera, Link } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface SocialMediaVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskAction: string;
  taskTitle: string;
  onVerify: (verificationData: any) => Promise<void>;
}

const SocialMediaVerificationModal: React.FC<SocialMediaVerificationModalProps> = ({
  isOpen,
  onClose,
  taskAction,
  taskTitle,
  onVerify
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    tweetId: '',
    urls: [''],
    description: '',
    screenshots: [''],
    uploadedFiles: [] as File[]
  });

  if (!isOpen) return null;

  const getTaskIcon = () => {
    switch (taskAction) {
      case 'follow':
      case 'retweet':
      case 'post_twitter':
      case 'comment_engagement':
        return <Twitter size={24} className="text-blue-500" />;
      case 'post_linkedin':
        return <Linkedin size={24} className="text-blue-600" />;
      case 'post_instagram':
        return <Instagram size={24} className="text-pink-500" />;
      case 'create_video':
        return <Video size={24} className="text-red-500" />;
      case 'write_article':
        return <FileText size={24} className="text-green-500" />;
      case 'share_groups':
      case 'share_discord':
        return <Users size={24} className="text-purple-500" />;
      default:
        return <MessageCircle size={24} className="text-gray-500" />;
    }
  };

  const requiresUsername = ['follow', 'retweet', 'post_twitter', 'comment_engagement'].includes(taskAction);
  const requiresTweetId = ['retweet'].includes(taskAction);
  const requiresManualProof = [
    'post_facebook', 'post_linkedin', 'post_instagram', 'share_groups',
    'create_video', 'write_article', 'post_reddit', 'share_discord',
    'create_meme', 'audio_mention', 'influencer_collab', 'ama_participation'
  ].includes(taskAction);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const verificationData: any = {};

      if (requiresUsername && !formData.username.trim()) {
        showToast('Please enter your Twitter username', 'error');
        return;
      }

      if (requiresTweetId && !formData.tweetId.trim()) {
        showToast('Please enter the tweet ID', 'error');
        return;
      }

      if (requiresManualProof && !formData.description.trim()) {
        showToast('Please provide a description of what you did', 'error');
        return;
      }

      if (requiresUsername) {
        verificationData.username = formData.username.replace('@', '');
      }

      if (requiresTweetId) {
        verificationData.tweetId = formData.tweetId;
      }

      if (requiresManualProof) {
        // Convert uploaded files to base64 for storage
        const fileData = await convertFilesToBase64(formData.uploadedFiles);
        
        verificationData.proofData = {
          taskId: Date.now(), // This should come from props
          urls: formData.urls.filter(url => url.trim()),
          screenshots: formData.screenshots.filter(url => url.trim()),
          uploadedFiles: fileData,
          fileNames: formData.uploadedFiles.map(f => f.name),
          fileSizes: formData.uploadedFiles.map(f => f.size),
          description: formData.description,
          additionalInfo: {
            taskAction,
            submittedAt: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        };
      }

      await onVerify(verificationData);
      onClose();
    } catch (error) {
      console.error('Verification error:', error);
      showToast('Verification failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addUrlField = () => {
    setFormData(prev => ({
      ...prev,
      urls: [...prev.urls, '']
    }));
  };

  const updateUrl = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      urls: prev.urls.map((url, i) => i === index ? value : url)
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      
      if (!isValidType) {
        showToast(`${file.name} is not a valid file type. Please upload images, videos, or PDFs.`, 'error');
        return false;
      }
      
      if (!isValidSize) {
        showToast(`${file.name} is too large. Please upload files under 10MB.`, 'error');
        return false;
      }
      
      return true;
    });

    setFormData(prev => ({
      ...prev,
      uploadedFiles: [...prev.uploadedFiles, ...validFiles]
    }));
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter((_, i) => i !== index)
    }));
  };

  const convertFilesToBase64 = async (files: File[]): Promise<string[]> => {
    const promises = files.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });
    
    return Promise.all(promises);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {getTaskIcon()}
              <div>
                <h3 className="font-black text-gray-900 dark:text-white">Verify Task</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{taskTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Twitter Username */}
            {requiresUsername && (
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Twitter Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter your Twitter username (without @)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                  required
                />
              </div>
            )}

            {/* Tweet ID */}
            {requiresTweetId && (
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Tweet ID
                </label>
                <input
                  type="text"
                  value={formData.tweetId}
                  onChange={(e) => setFormData(prev => ({ ...prev, tweetId: e.target.value }))}
                  placeholder="Enter the tweet ID from the URL"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Find the tweet ID in the URL: twitter.com/user/status/[TWEET_ID]
                </p>
              </div>
            )}

            {/* Manual Proof Fields */}
            {requiresManualProof && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what you did to complete this task..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Proof URLs
                  </label>
                  {formData.urls.map((url, index) => (
                    <input
                      key={index}
                      type="url"
                      value={url}
                      onChange={(e) => updateUrl(index, e.target.value)}
                      placeholder="https://example.com/your-post"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white mb-2"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={addUrlField}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <Link size={14} />
                    Add another URL
                  </button>
                </div>

                {/* File Upload Section */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Upload Proof Files (Screenshots, Videos, Documents)
                  </label>
                  
                  {/* Upload Button */}
                  <div className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-lg p-4 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 mx-auto px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                    >
                      <Upload size={16} />
                      Choose Files
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      Upload images, videos, or PDFs (max 10MB each)
                    </p>
                  </div>

                  {/* Uploaded Files List */}
                  {formData.uploadedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        Uploaded Files ({formData.uploadedFiles.length}):
                      </p>
                      {formData.uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                          <div className="flex items-center gap-2">
                            {file.type.startsWith('image/') && <Camera size={16} className="text-green-500" />}
                            {file.type.startsWith('video/') && <Video size={16} className="text-blue-500" />}
                            {file.type === 'application/pdf' && <FileText size={16} className="text-red-500" />}
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-500/20 rounded text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-white/20 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary text-black rounded-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-black"
              >
                {loading ? 'Verifying...' : 'Verify Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SocialMediaVerificationModal;