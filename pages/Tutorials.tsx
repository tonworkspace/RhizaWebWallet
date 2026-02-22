import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Video,
  Play,
  Clock,
  Users,
  ChevronRight,
  BookOpen
} from 'lucide-react';

interface Tutorial {
  id: string;
  title: string;
  duration: string;
  audience: string;
  description: string;
  topics: string[];
}

interface TutorialSeries {
  id: string;
  title: string;
  description: string;
  totalDuration: string;
  videos: Tutorial[];
}

const Tutorials: React.FC = () => {
  const [selectedSeries, setSelectedSeries] = useState<string>('getting-started');

  const series: TutorialSeries[] = [
    {
      id: 'getting-started',
      title: 'Getting Started Series',
      description: 'Perfect for beginners. Learn the basics of creating and using your RhizaCore wallet.',
      totalDuration: '15 minutes',
      videos: [
        {
          id: 'welcome',
          title: 'Welcome to RhizaCore',
          duration: '3 min',
          audience: 'Complete beginners',
          description: 'Introduction to RhizaCore and its benefits. Learn what makes RhizaCore different from traditional banking.',
          topics: ['What is RhizaCore', 'Why use crypto', 'Key benefits', 'Getting started']
        },
        {
          id: 'create-wallet',
          title: 'Creating Your First Wallet',
          duration: '7 min',
          audience: 'New users',
          description: 'Step-by-step guide through the wallet creation process. Learn how to save your secret phrase and set up security.',
          topics: ['Wallet creation', 'Secret phrase', 'Password setup', 'Backup verification']
        },
        {
          id: 'send-receive',
          title: 'Sending & Receiving Money',
          duration: '5 min',
          audience: 'New users with wallet',
          description: 'Learn how to send and receive your first transactions. Understand addresses, fees, and transaction times.',
          topics: ['Receiving money', 'Sending transactions', 'Understanding fees', 'Transaction history']
        }
      ]
    },
    {
      id: 'wallet-management',
      title: 'Wallet Management Series',
      description: 'Advanced wallet features for power users managing multiple wallets.',
      totalDuration: '6 minutes',
      videos: [
        {
          id: 'multiple-wallets',
          title: 'Managing Multiple Wallets',
          duration: '6 min',
          audience: 'Users wanting multiple wallets',
          description: 'Learn how to create, switch between, and manage multiple wallets. Perfect for separating personal and business funds.',
          topics: ['Creating second wallet', 'Switching wallets', 'Renaming wallets', 'Exporting backups', 'Deleting wallets']
        }
      ]
    },
    {
      id: 'security',
      title: 'Security Series',
      description: 'Essential security practices to keep your wallet and funds safe.',
      totalDuration: '8 minutes',
      videos: [
        {
          id: 'wallet-security',
          title: 'Keeping Your Wallet Secure',
          duration: '8 min',
          audience: 'All users',
          description: 'Comprehensive security guide covering secret phrase protection, password security, device security, and scam recognition.',
          topics: ['Secret phrase protection', 'Password best practices', 'Device security', 'Recognizing scams', 'Emergency procedures']
        }
      ]
    },
    {
      id: 'advanced',
      title: 'Advanced Features Series',
      description: 'Unlock advanced features like staking and referrals to maximize your earnings.',
      totalDuration: '9 minutes',
      videos: [
        {
          id: 'staking',
          title: 'Staking Your $RZC',
          duration: '5 min',
          audience: 'Users with $RZC',
          description: 'Learn how to stake your $RZC tokens to earn passive income. Understand APY, lock periods, and risks.',
          topics: ['What is staking', 'How to stake', 'Managing stakes', 'Understanding risks', 'Calculating rewards']
        },
        {
          id: 'referrals',
          title: 'Using the Referral Program',
          duration: '4 min',
          audience: 'All users',
          description: 'Earn money by inviting friends! Learn how to get your referral link, share it, and track your earnings.',
          topics: ['How referrals work', 'Getting your link', 'Sharing strategies', 'Tracking earnings', 'Maximizing rewards']
        }
      ]
    }
  ];

  const selectedSeriesData = series.find(s => s.id === selectedSeries);

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link 
              to="/help" 
              className="flex items-center gap-2 text-slate-600 dark:text-gray-400 hover:text-primary transition-colors group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-bold">Back to Help</span>
            </Link>
            <Link
              to="/"
              className="text-sm font-bold text-slate-600 dark:text-gray-400 hover:text-primary transition-colors"
            >
              Home
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
              <Video className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">Video Tutorials</h1>
              <p className="text-slate-600 dark:text-gray-400 font-medium">Watch and learn visually</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Series List */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-gray-400 mb-4">Series</h3>
              {series.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSeries(s.id)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    selectedSeries === s.id
                      ? 'bg-primary text-black'
                      : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                >
                  <h4 className={`text-sm font-black mb-1 ${selectedSeries === s.id ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
                    {s.title}
                  </h4>
                  <p className={`text-xs ${selectedSeries === s.id ? 'text-black/70' : 'text-slate-500 dark:text-gray-500'}`}>
                    {s.videos.length} videos • {s.totalDuration}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content - Video List */}
          <div className="lg:col-span-3">
            {selectedSeriesData && (
              <div className="space-y-8">
                {/* Series Header */}
                <div className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl">
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">{selectedSeriesData.title}</h2>
                  <p className="text-slate-600 dark:text-gray-300 font-medium mb-4">{selectedSeriesData.description}</p>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
                      <Video size={16} />
                      <span className="font-bold">{selectedSeriesData.videos.length} Videos</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
                      <Clock size={16} />
                      <span className="font-bold">{selectedSeriesData.totalDuration}</span>
                    </div>
                  </div>
                </div>

                {/* Video Cards */}
                <div className="space-y-4">
                  {selectedSeriesData.videos.map((video, idx) => (
                    <div
                      key={video.id}
                      className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden hover:border-primary/30 transition-all group"
                    >
                      <div className="p-6">
                        <div className="flex items-start gap-6">
                          {/* Video Thumbnail Placeholder */}
                          <div className="w-48 h-28 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-all relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
                            <div className="relative w-16 h-16 bg-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Play className="text-black fill-current ml-1" size={24} />
                            </div>
                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white text-xs font-black rounded">
                              {video.duration}
                            </div>
                          </div>

                          {/* Video Info */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-xs font-black text-primary uppercase tracking-widest">
                                    Video {idx + 1}
                                  </span>
                                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
                                    <Users size={14} />
                                    <span className="font-bold">{video.audience}</span>
                                  </div>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                  {video.title}
                                </h3>
                              </div>
                            </div>

                            <p className="text-slate-600 dark:text-gray-400 leading-relaxed mb-4">
                              {video.description}
                            </p>

                            {/* Topics */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              {video.topics.map((topic, topicIdx) => (
                                <span
                                  key={topicIdx}
                                  className="px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 text-xs font-bold rounded-full"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>

                            {/* Coming Soon Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 text-yellow-900 dark:text-yellow-300 rounded-xl text-sm font-black">
                              <Clock size={16} />
                              Coming Soon - Video in Production
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Production Note */}
                <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                  <div className="flex items-start gap-4">
                    <BookOpen className="text-primary flex-shrink-0" size={24} />
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white mb-2">Video Scripts Available</h4>
                      <p className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
                        While we're producing the videos, you can read the complete scripts with timestamps and detailed instructions. 
                        Each script is designed to be easy to follow and includes all the information you'll see in the final videos.
                      </p>
                      <Link
                        to="/guide"
                        className="inline-flex items-center gap-2 text-primary font-black text-sm hover:gap-3 transition-all"
                      >
                        Read User Guide Instead <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tutorials;
