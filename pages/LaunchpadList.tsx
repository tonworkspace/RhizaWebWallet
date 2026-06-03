import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  TrendingUp,
  Clock,
  Users,
  CheckCircle2,
  Flame,
  Sparkles,
  ArrowRight,
  Filter,
  Search,
  Info,
  AlertTriangle
} from 'lucide-react';
import { launchpadService, LaunchpadProject } from '../services/launchpadService';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  symbol: string;
  tagline: string;
  logo: string;
  status: 'live' | 'upcoming' | 'ended' | 'success';
  progress: number;
  raised: number;
  hardCap: number;
  participants: number;
  endsIn: string;
  presaleRate: string;
  listingRate: string;
  badges: Array<'kyc' | 'audit' | 'safu' | 'doxxed'>;
  featured?: boolean;
  trending?: boolean;
}

// ── Helper Functions ───────────────────────────────────────────────────────────

const formatTimeRemaining = (endDate: string): string => {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
};

const formatTimeUntilStart = (startDate: string): string => {
  const now = new Date();
  const start = new Date(startDate);
  const diff = start.getTime() - now.getTime();

  if (diff <= 0) return 'Starting soon';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `Starts in ${days}d`;
};

const convertBackendProject = (project: LaunchpadProject): Project => {
  const progress = project.hard_cap > 0 
    ? (project.raised_amount / project.hard_cap) * 100 
    : 0;

  const badges: Array<'kyc' | 'audit' | 'safu' | 'doxxed'> = [];
  if (project.kyc_verified) badges.push('kyc');
  if (project.audit_verified) badges.push('audit');
  if (project.safu_verified) badges.push('safu');
  if (project.doxxed) badges.push('doxxed');

  const endsIn = project.status === 'upcoming'
    ? formatTimeUntilStart(project.presale_start)
    : project.status === 'live'
    ? formatTimeRemaining(project.presale_end)
    : 'Ended';

  return {
    id: project.id,
    name: project.name,
    symbol: project.symbol,
    tagline: project.tagline,
    logo: project.logo_url || project.symbol.charAt(0),
    status: project.status,
    progress,
    raised: project.raised_amount,
    hardCap: project.hard_cap,
    participants: project.participant_count,
    endsIn,
    presaleRate: `1 USDC = ${project.presale_rate} ${project.symbol}`,
    listingRate: `1 USDC = ${project.listing_rate} ${project.symbol}`,
    badges,
    featured: project.featured,
    trending: project.trending,
  };
};

// ── Project Card Component ─────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const statusConfig = {
    live: {
      badge: 'LIVE',
      badgeClass: 'bg-emerald-500 text-white',
      borderClass: 'border-emerald-200 dark:border-emerald-500/20',
      glowClass: 'shadow-emerald-500/10',
    },
    upcoming: {
      badge: 'UPCOMING',
      badgeClass: 'bg-amber-500 text-white',
      borderClass: 'border-amber-200 dark:border-amber-500/20',
      glowClass: 'shadow-amber-500/10',
    },
    ended: {
      badge: 'ENDED',
      badgeClass: 'bg-slate-400 text-white',
      borderClass: 'border-slate-200 dark:border-slate-700',
      glowClass: '',
    },
    success: {
      badge: 'SUCCESS',
      badgeClass: 'bg-cyan-500 text-white',
      borderClass: 'border-cyan-200 dark:border-cyan-500/20',
      glowClass: 'shadow-cyan-500/10',
    },
  };

  const config = statusConfig[project.status];
  const progressPercent = project.progress.toFixed(1);

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#1a1a1a] rounded-xl border-2 ${config.borderClass} ${config.glowClass} shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden`}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-50 via-slate-50 to-slate-100 dark:from-slate-900/50 dark:via-slate-900/50 dark:to-slate-800/50 p-4 border-b border-slate-200 dark:border-white/10">
        {/* Badges Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            {project.featured && (
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                <Sparkles size={10} />
                FEATURED
              </span>
            )}
            {project.trending && (
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                <Flame size={10} />
                TRENDING
              </span>
            )}
          </div>
          <span className={`inline-flex items-center gap-1 ${config.badgeClass} text-[9px] font-bold px-2 py-1 rounded-full shadow-lg`}>
            <div className={`w-1 h-1 bg-white rounded-full ${project.status === 'live' ? 'animate-pulse' : ''}`} />
            {config.badge}
          </span>
        </div>

        {/* Project Info */}
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white font-black text-2xl shadow-lg border-2 border-white dark:border-white/20 group-hover:scale-105 transition-transform overflow-hidden">
            {project.logo.startsWith('http') ? (
              <img src={project.logo} alt={project.name} className="w-full h-full object-cover" />
            ) : (
              project.logo
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {project.name}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{project.tagline}</p>
            <div className="flex items-center gap-1 mt-1">
              {project.badges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[8px] font-medium px-1.5 py-0.5 rounded uppercase"
                >
                  <CheckCircle2 size={8} />
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Progress */}
        {project.status !== 'upcoming' && (
          <div>
            <div className="flex justify-between text-[10px] mb-1.5 font-medium">
              <span className="text-slate-500 dark:text-slate-400">Progress</span>
              <span className="text-slate-700 dark:text-slate-300">{progressPercent}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] mt-1 text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {project.raised.toLocaleString()} USDC
              </span>
              <span>of {project.hardCap.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 dark:bg-[#12141A] rounded-lg p-2 border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-1.5 mb-1">
              <Users size={11} className="text-slate-500 dark:text-slate-400" />
              <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 uppercase">Participants</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {project.participants > 0 ? project.participants.toLocaleString() : 'TBA'}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#12141A] rounded-lg p-2 border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={11} className="text-slate-500 dark:text-slate-400" />
              <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 uppercase">
                {project.status === 'upcoming' ? 'Starts' : project.status === 'ended' || project.status === 'success' ? 'Status' : 'Ends'}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{project.endsIn}</p>
          </div>
        </div>

        {/* Rates */}
        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-2.5 border border-emerald-100 dark:border-emerald-500/20">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Presale Rate</span>
            <span className="text-emerald-700 dark:text-emerald-300 font-bold">{project.presaleRate}</span>
          </div>
        </div>

        {/* View Button */}
        <button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-emerald-500/25 text-sm">
          View Details
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

const LaunchpadList: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'ended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'landing' | 'catalog'>('landing');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ liveProjects: 0, totalInvestors: 0, totalRaised: 0 });

  // Fetch projects from backend
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await launchpadService.getProjects();
        
        if (result.success && result.data) {
          const convertedProjects = result.data.map(convertBackendProject);
          setProjects(convertedProjects);
        } else {
          setError(result.error || 'Failed to load projects');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();

    // Refresh every 30 seconds
    const interval = setInterval(fetchProjects, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      const result = await launchpadService.getStats();
      if (result.success && result.data) {
        setStats({
          liveProjects: result.data.live_projects,
          totalInvestors: result.data.total_participants,
          totalRaised: result.data.total_raised,
        });
      }
    };

    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    const matchesFilter = filter === 'all' || project.status === filter || (filter === 'ended' && project.status === 'success');
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleProjectClick = (projectId: string) => {
    // Navigate to project detail page
    navigate(`/wallet/launchpad/${projectId}`);
  };

  // Landing View Component
  const LandingView = () => (
    <>
      {/* Hero Section - Advisor Style */}
      <div className="bg-gradient-to-br from-emerald-500 via-cyan-500 to-teal-500 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-2">
            <Sparkles size={16} className="text-white" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Early-Stage Investment Opportunity</span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
            Invest in Web3 Projects<br />
            <span className="text-white/90">Before They Launch</span>
          </h2>

          {/* Value Proposition */}
          <p className="text-base md:text-lg text-white/90 leading-relaxed max-w-2xl">
            Get exclusive access to pre-launch token sales (IPOs) of vetted Web3 projects. Buy at presale prices before public listing and earn potential returns as projects grow within the RhizaCore ecosystem.
          </p>

          {/* Key Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {[
              {
                icon: TrendingUp,
                title: 'Early Access',
                desc: 'Buy tokens at presale rates before public launch',
              },
              {
                icon: CheckCircle2,
                title: 'Vetted Projects',
                desc: 'All projects undergo KYC, audit & security review',
              },
              {
                icon: Users,
                title: 'Community Driven',
                desc: 'Join thousands of investors in the RhizaCore ecosystem',
              },
            ].map((benefit, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-3">
                  <benefit.icon size={20} className="text-white" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{benefit.title}</h3>
                <p className="text-xs text-white/80 leading-relaxed">{benefit.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => setCurrentView('catalog')}
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-emerald-600 font-bold px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              <Sparkles size={16} />
              View Live Sales
              <ArrowRight size={16} />
            </button>
            <button className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold px-6 py-3 rounded-xl transition-all">
              <Info size={16} />
              How It Works
            </button>
          </div>
        </div>
      </div>

      {/* Why Invest Section */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Why Invest in Launchpad IPOs?</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              icon: '💰',
              title: 'Presale Pricing Advantage',
              desc: 'Buy tokens at 10-30% below listing price. Lock in early-bird rates before public launch.',
            },
            {
              icon: '🚀',
              title: 'High Growth Potential',
              desc: 'Early investors in successful projects can see 2-10x returns as projects scale and gain adoption.',
            },
            {
              icon: '🛡️',
              title: 'Risk Mitigation',
              desc: 'All projects undergo KYC verification, smart contract audits, and security reviews before listing.',
            },
            {
              icon: '📊',
              title: 'Portfolio Diversification',
              desc: 'Spread investments across multiple Web3 sectors: DeFi, Gaming, Infrastructure, and more.',
            },
            {
              icon: '🔒',
              title: 'Transparent Vesting',
              desc: 'Clear token unlock schedules protect against dumps. Team tokens locked for 6-12 months.',
            },
            {
              icon: '🌐',
              title: 'RhizaCore Ecosystem',
              desc: 'Projects integrate with RhizaCore infrastructure, creating network effects and utility.',
            },
          ].map((reason, i) => (
            <div key={i} className="flex gap-3 p-4 rounded-lg bg-slate-50 dark:bg-[#12141A] border border-slate-200 dark:border-white/10">
              <div className="text-2xl flex-shrink-0">{reason.icon}</div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{reason.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{reason.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
              <span className="font-bold">Investment Disclaimer:</span> Cryptocurrency investments carry risk. Past performance doesn't guarantee future results. Only invest what you can afford to lose. This is not financial advice. DYOR (Do Your Own Research).
            </p>
          </div>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-teal-500 rounded-xl p-4 shadow-lg">
        <div className="grid grid-cols-3 gap-4 text-center text-white">
          <div>
            <p className="text-2xl font-black">{stats.liveProjects}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-90">Live Sales</p>
          </div>
          <div>
            <p className="text-2xl font-black">{stats.totalInvestors.toLocaleString()}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-90">Total Investors</p>
          </div>
          <div>
            <p className="text-2xl font-black">${stats.totalRaised.toLocaleString()}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-90">Total Raised</p>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="text-center py-8">
        <button
          onClick={() => setCurrentView('catalog')}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl"
        >
          <Sparkles size={18} />
          Explore Available Projects
          <ArrowRight size={18} />
        </button>
      </div>
    </>
  );

  // Catalog View Component
  const CatalogView = () => (
    <>
      {/* Back to Landing Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentView('landing')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Overview
        </button>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          <span className="font-bold text-slate-900 dark:text-white">{filteredProjects.length}</span> {filteredProjects.length === 1 ? 'project' : 'projects'} available
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 pl-10 pr-4 py-2.5 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-lg p-1">
          {(['all', 'live', 'upcoming', 'ended'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                filter === tab
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading projects...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={24} className="text-rose-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Failed to Load Projects</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Projects Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => handleProjectClick(project.id)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <Filter size={24} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No projects found</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Try adjusting your filters or search query
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-20 px-4 pt-4 space-y-4">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 dark:from-emerald-500/5 dark:to-cyan-500/5 rounded-full blur-[100px]"
          style={{ animation: 'pulse 8s ease-in-out infinite, float 15s ease-in-out infinite' }} />
        <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] bg-gradient-to-l from-cyan-500/10 to-teal-500/10 dark:from-cyan-500/5 dark:to-teal-500/5 rounded-full blur-[120px]"
          style={{ animation: 'pulse 10s ease-in-out infinite, float 20s ease-in-out infinite reverse' }} />
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float {
            0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
            25% { transform: translateY(-20px) translateX(10px) scale(1.02); }
            50% { transform: translateY(-10px) translateX(-5px) scale(0.98); }
            75% { transform: translateY(-15px) translateX(8px) scale(1.01); }
          }
        `
      }} />

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => navigate('/wallet/dashboard')}
          className="p-2 rounded-lg bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">RhizaX Launchpad</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
            {currentView === 'landing' ? 'Web3 IPO Investment Platform' : 'Browse Available Projects'}
          </p>
        </div>
      </div>

      {/* Render Current View */}
      {currentView === 'landing' ? <LandingView /> : <CatalogView />}
    </div>
  );
};

export default LaunchpadList;
