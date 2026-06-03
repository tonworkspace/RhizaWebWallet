import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  HelpCircle, 
  Brain, 
  Wallet, 
  RefreshCw, 
  ShieldCheck,
  CheckCircle2,
  Zap,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { supabaseService, SupportTicket } from '../services/supabaseService';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';

/**
 * UnifiedSupportWidget Component
 * 
 * Combines both support systems (Tickets + Live Chat) in one widget.
 * Users can choose between:
 * 1. Live Chat (Tawk.to) - For instant support
 * 2. Support Tickets - For detailed requests
 */

const UnifiedSupportWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'menu' | 'tickets' | 'livechat'>('menu');
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [subject, setSubject] = useState('General Inquiry');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const { address, userProfile } = useWallet();
  const { showToast } = useToast();
  const chatRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Hide widget on scroll down (when closed)
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) return;
      
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isOpen]);

  // Load ticket history when switching to history tab
  useEffect(() => {
    if (view === 'tickets' && activeTab === 'history' && address) {
      loadTicketHistory();
    }
  }, [view, activeTab, address]);

  const loadTicketHistory = async () => {
    if (!address) return;
    setIsLoadingHistory(true);
    const result = await supabaseService.getUserTickets(address);
    if (result.success && result.data) {
      setUserTickets(result.data);
    }
    setIsLoadingHistory(false);
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !address) return;

    setIsSubmitting(true);
    try {
      const result = await supabaseService.submitSupportTicket({
        wallet_address: address,
        subject,
        message,
        user_id: userProfile?.id
      });

      if (result.success) {
        showToast('Support ticket submitted successfully!', 'success');
        setMessage('');
        setActiveTab('history');
        loadTicketHistory();
      } else {
        showToast(result.error || 'Failed to submit ticket', 'error');
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openLiveChat = () => {
    setView('livechat');
    // Open Tawk.to widget
    if (window.Tawk_API && window.Tawk_API.maximize) {
      window.Tawk_API.maximize();
    }
    // Close our widget after a short delay
    setTimeout(() => {
      setIsOpen(false);
      setView('menu');
    }, 500);
  };

  const subjects = [
    { label: 'General Inquiry', icon: HelpCircle, color: '#00FF88' },
    { label: 'Wallet & Security', icon: Wallet, color: '#FFD93D' },
    { label: 'Transactions', icon: RefreshCw, color: '#00CCFF' },
    { label: 'Technical Issue', icon: ShieldCheck, color: '#FF6B6B' },
    { label: 'RZC Utility', icon: Brain, color: '#A855F7' }
  ];

  if (!address) return null;

  return (
    <div className={`fixed bottom-28 md:bottom-8 right-6 z-[9999] flex flex-col items-end gap-4 font-sans transition-all duration-500 ${
      isVisible || isOpen ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
    }`}>
      {/* Expanded Widget Window */}
      {isOpen && (
        <div 
          ref={chatRef}
          className="w-[380px] h-[550px] bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-primary to-secondary/80">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {view !== 'menu' && (
                  <button
                    onClick={() => setView('menu')}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-black/10 hover:bg-black/20 text-white transition-all"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                    <MessageCircle className="text-white" size={22} />
                  </div>
                  <div>
                    <h3 className="text-white font-heading font-black text-lg leading-tight uppercase tracking-widest">
                      {view === 'menu' ? 'Get Support' : view === 'tickets' ? 'Support Tickets' : 'Live Chat'}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-white/80 text-[9px] font-heading font-black uppercase tracking-[0.2em]">
                        {view === 'menu' ? 'Choose Option' : view === 'tickets' ? 'Ticket System' : 'Instant Help'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsOpen(false);
                  setView('menu');
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-black/10 hover:bg-black/20 text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {/* Menu View - Choose Support Type */}
            {view === 'menu' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-gray-400 font-medium mb-6 text-center">
                  Choose how you'd like to get help
                </p>

                {/* Live Chat Option */}
                <button
                  onClick={openLiveChat}
                  className="w-full p-5 bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-500/10 dark:to-cyan-500/10 border-2 border-emerald-200 dark:border-emerald-500/20 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Zap size={24} className="text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="text-lg font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wide mb-2">
                        Live Chat
                      </h4>
                      <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium mb-3">
                        Get instant help from our support team
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-xs text-emerald-600 dark:text-emerald-500 font-bold">
                          Agents online • Instant response
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Support Tickets Option */}
                <button
                  onClick={() => setView('tickets')}
                  className="w-full p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border-2 border-blue-200 dark:border-blue-500/20 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Clock size={24} className="text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="text-lg font-black text-blue-900 dark:text-blue-300 uppercase tracking-wide mb-2">
                        Support Ticket
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-3">
                        Submit detailed request with tracking
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span className="text-xs text-blue-600 dark:text-blue-500 font-bold">
                          Response within 2 hours
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Info Section */}
                <div className="mt-6 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                  <div className="flex items-start gap-3">
                    <ShieldCheck size={20} className="text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                        Quick Tips
                      </h5>
                      <ul className="text-xs text-slate-600 dark:text-gray-400 space-y-1">
                        <li>• Use <strong>Live Chat</strong> for urgent issues</li>
                        <li>• Use <strong>Tickets</strong> for detailed requests</li>
                        <li>• Both are monitored 24/7</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tickets View */}
            {view === 'tickets' && (
              <>
                {/* Tabs */}
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl mb-6">
                  <button
                    onClick={() => setActiveTab('new')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-heading font-black uppercase tracking-widest transition-all ${
                      activeTab === 'new' ? 'bg-white dark:bg-white/10 text-primary shadow-lg' : 'text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'
                    }`}
                  >
                    New Ticket
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-heading font-black uppercase tracking-widest transition-all ${
                      activeTab === 'history' ? 'bg-white dark:bg-white/10 text-primary shadow-lg' : 'text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'
                    }`}
                  >
                    My Tickets
                  </button>
                </div>

                {/* New Ticket Form */}
                {activeTab === 'new' && (
                  <form onSubmit={handleSubmitTicket} className="space-y-6">
                    <div>
                      <label className="text-[10px] font-heading font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3 block">
                        Choose Subject
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {subjects.map((s, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSubject(s.label)}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all group ${
                              subject === s.label 
                                ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(0,255,136,0.1)]' 
                                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: `${s.color}20` }}
                              >
                                <s.icon size={16} style={{ color: s.color }} />
                              </div>
                              <span className={`text-sm font-bold transition-colors ${
                                subject === s.label ? 'text-primary' : 'text-slate-600 dark:text-gray-400'
                              }`}>
                                {s.label}
                              </span>
                            </div>
                            {subject === s.label && <div className="w-2 h-2 bg-primary rounded-full" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-heading font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3 block">
                        Your Message
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe your issue or question..."
                        className="w-full h-32 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-primary/50 transition-all resize-none font-medium"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !message.trim()}
                      className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-heading font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_10px_30px_rgba(0,255,136,0.2)]"
                    >
                      {isSubmitting ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <>
                          <Send size={18} />
                          Submit Ticket
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Ticket History */}
                {activeTab === 'history' && (
                  <div className="space-y-4">
                    {isLoadingHistory ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                          <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" size={20} />
                        </div>
                        <span className="text-[10px] font-heading font-black text-slate-400 uppercase tracking-widest">Loading tickets...</span>
                      </div>
                    ) : userTickets.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mb-4">
                          <HelpCircle size={32} className="text-slate-300 dark:text-gray-600" />
                        </div>
                        <h4 className="text-slate-900 dark:text-white font-heading font-black uppercase tracking-[0.15em] mb-2">No tickets yet</h4>
                        <p className="text-slate-500 dark:text-gray-500 text-xs font-medium px-8">
                          Your support tickets will appear here
                        </p>
                      </div>
                    ) : (
                      userTickets.map((ticket) => (
                        <div 
                          key={ticket.id}
                          className="p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl group hover:border-primary/30 transition-all cursor-default shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-heading font-black uppercase tracking-widest ${
                              ticket.status === 'open' ? 'bg-blue-500/10 text-blue-500' :
                              ticket.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                              ticket.status === 'resolved' ? 'bg-green-500/10 text-green-500' :
                              'bg-slate-500/10 text-slate-500'
                            }`}>
                              {ticket.status}
                            </span>
                            <span className="text-[10px] font-numbers font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.1em]">
                              {new Date(ticket.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="text-sm font-heading font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2 line-clamp-1">{ticket.subject}</h4>
                          <p className="text-xs text-slate-600 dark:text-gray-400 font-medium mb-4 line-clamp-2 leading-relaxed">
                            {ticket.message}
                          </p>
                          
                          {ticket.admin_notes && (
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                              <div className="flex items-start gap-2.5">
                                <div className="w-6 h-6 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <CheckCircle2 size={12} className="text-primary" />
                                </div>
                                <div>
                                  <span className="text-[10px] font-heading font-black text-primary uppercase tracking-[0.2em] mb-2 block">Support Response</span>
                                  <p className="text-xs text-slate-700 dark:text-gray-300 font-bold italic leading-relaxed">
                                    "{ticket.admin_notes}"
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-primary" />
            <span className="text-[10px] font-heading font-black text-slate-400 uppercase tracking-widest">Secured by RhizaCore</span>
          </div>
        </div>
      )}

      {/* Launcher Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group relative ${
          isOpen ? 'bg-black text-white hover:rotate-90' : 'bg-primary text-black'
        }`}
      >
        {isOpen ? (
          <X size={28} />
        ) : (
          <>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white dark:border-black rounded-full z-10 animate-bounce" />
            <MessageCircle size={30} className="group-hover:rotate-12 transition-transform" />
          </>
        )}
      </button>
    </div>
  );
};

export default UnifiedSupportWidget;
