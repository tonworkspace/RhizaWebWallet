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
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  ChevronLeft,
  User,
  Bot
} from 'lucide-react';
import { supabaseService, SupportTicket, SupportTicketReply } from '../services/supabaseService';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';

const FloatingSupportEnhanced: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'conversation'>('chat');
  const [subject, setSubject] = useState('General Inquiry');
  const [message, setMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketReplies, setTicketReplies] = useState<SupportTicketReply[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  
  const { address, userProfile } = useWallet();
  const { showToast } = useToast();
  const chatRef = useRef<HTMLDivElement>(null);
  const repliesEndRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  
  // Real-time unread tracking
  const [hasUnread, setHasUnread] = useState(false);
  const lastCheckRef = useRef<number>(Date.now());

  // Auto-scroll to bottom when new replies arrive
  useEffect(() => {
    if (activeTab === 'conversation' && repliesEndRef.current) {
      repliesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ticketReplies, activeTab]);

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

  useEffect(() => {
    if (isOpen && address) {
      const initSupport = async () => {
        setIsLoadingHistory(true);
        const result = await supabaseService.getUserTickets(address);
        if (result.success && result.data) {
          setUserTickets(result.data);
          
          // Auto-route to active ticket if one exists
          const activeTicket = result.data.find(t => t.status === 'open' || t.status === 'pending');
          if (activeTicket && !selectedTicket) {
            loadTicketConversation(activeTicket);
          } else if (!activeTicket && activeTab === 'conversation' && !selectedTicket) {
            setActiveTab('chat');
          }
        }
        setIsLoadingHistory(false);
      };
      initSupport();
    }
  }, [isOpen, address]);

  // Global polling for unread admin replies
  useEffect(() => {
    if (!address) return;
    const checkUnread = async () => {
      try {
        const client = supabaseService.getClient();
        if (!client) return;
        const { data, error } = await client
          .from('support_ticket_replies')
          .select('id')
          .eq('wallet_address', address)
          .eq('is_admin', true)
          .gt('created_at', new Date(lastCheckRef.current).toISOString());
        
        if (data && data.length > 0) {
          setHasUnread(true);
          if (!isOpen) {
            showToast('New response from support team!', 'success');
          }
          lastCheckRef.current = Date.now();
        }
      } catch (err) {
        console.error('Error checking unread support replies:', err);
      }
    };
    
    const interval = setInterval(checkUnread, 15000);
    return () => clearInterval(interval);
  }, [address, isOpen, showToast]);

  // Clear unread dot when modal is opened
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      lastCheckRef.current = Date.now();
    }
  }, [isOpen]);

  // Real-time subscription to ticket replies
  useEffect(() => {
    if (!selectedTicket || activeTab !== 'conversation') return;

    const subscription = supabaseService.subscribeToTicketReplies(
      selectedTicket.id,
      (newReply) => {
        setTicketReplies(prev => [...prev, newReply]);
        
        // Show toast for admin replies
        if (newReply.is_admin) {
          showToast('New response from support team!', 'success');
        }
      }
    );

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [selectedTicket, activeTab]);

  const loadTicketHistory = async () => {
    if (!address) return;
    setIsLoadingHistory(true);
    const result = await supabaseService.getUserTickets(address);
    if (result.success && result.data) {
      setUserTickets(result.data);
    }
    setIsLoadingHistory(false);
  };

  const loadTicketConversation = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsLoadingReplies(true);
    setActiveTab('conversation');
    
    const result = await supabaseService.getTicketReplies(ticket.id);
    if (result.success && result.data) {
      setTicketReplies(result.data);
    }
    setIsLoadingReplies(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        showToast('Support request sent successfully!', 'success');
        setMessage('');
        setActiveTab('history');
        loadTicketHistory();
      } else {
        showToast(result.error || 'Failed to send request', 'error');
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket || !address) return;

    setIsSendingReply(true);
    try {
      const result = await supabaseService.addTicketReply({
        ticket_id: selectedTicket.id,
        wallet_address: address,
        message: replyMessage,
        user_id: userProfile?.id,
        is_admin: false,
        is_internal: false
      });

      if (result.success && result.data) {
        setTicketReplies(prev => [...prev, result.data!]);
        setReplyMessage('');
        showToast('Reply sent!', 'success');
      } else {
        showToast(result.error || 'Failed to send reply', 'error');
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleBackToHistory = () => {
    setActiveTab('history');
    setSelectedTicket(null);
    setTicketReplies([]);
    setReplyMessage('');
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
      {/* Expanded Chat Window */}
      {isOpen && !isMinimized && (
        <div 
          ref={chatRef}
          className="w-[340px] h-[480px] bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="p-4 pb-3 bg-gradient-to-r from-primary to-secondary/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {activeTab === 'conversation' && (
                  <button
                    onClick={handleBackToHistory}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-black/10 hover:bg-black/20 text-white transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                <div className="w-10 h-10 bg-black/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                  <MessageCircle className="text-white" size={22} />
                </div>
                <div>
                  <h3 className="text-white font-heading font-black text-lg leading-tight uppercase tracking-widest">
                    {activeTab === 'conversation' ? 'Conversation' : 'Rhiza Support'}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-white/80 text-[9px] font-heading font-black uppercase tracking-[0.2em] shadow-sm">
                      {activeTab === 'conversation' ? `Ticket #${selectedTicket?.id.slice(0, 8)}` : 'Ticket System'}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-black/10 hover:bg-black/20 text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Tabs - Only show when not in conversation */}
            {activeTab !== 'conversation' && (
              <div className="flex bg-black/10 p-1 rounded-xl">
                {!userTickets.some(t => t.status === 'open' || t.status === 'pending') && (
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-heading font-black uppercase tracking-widest transition-all ${
                      activeTab === 'chat' ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    New Request
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-heading font-black uppercase tracking-widest transition-all ${
                    activeTab === 'history' || userTickets.some(t => t.status === 'open' || t.status === 'pending') ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white'
                  }`}
                >
                  My Tickets
                </button>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            {activeTab === 'chat' ? (
              // NEW TICKET FORM
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    className="w-full h-24 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-primary/50 transition-all resize-none font-medium"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-heading font-black uppercase tracking-widest py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_10px_30px_rgba(0,255,136,0.2)]"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <Send size={18} />
                      Send Request
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-slate-400 font-heading font-black uppercase tracking-widest">
                  Typical response time: &lt; <span className="font-numbers">2</span> hours
                </p>
              </form>
            ) : activeTab === 'history' ? (
              // TICKET HISTORY
              <div className="space-y-4">
                {isLoadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                      <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" size={20} />
                    </div>
                    <span className="text-[10px] font-heading font-black text-slate-400 uppercase tracking-widest">Retrieving cases...</span>
                  </div>
                ) : userTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mb-4">
                      <HelpCircle size={32} className="text-slate-300 dark:text-gray-600" />
                    </div>
                    <h4 className="text-slate-900 dark:text-white font-heading font-black uppercase tracking-[0.15em] mb-2">No active cases</h4>
                    <p className="text-slate-500 dark:text-gray-500 text-xs font-medium px-8">
                      Your support request history will appear here. Need help? Start a new case!
                    </p>
                  </div>
                ) : (
                  userTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => loadTicketConversation(ticket)}
                      className="w-full p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl group hover:border-primary/30 transition-all cursor-pointer shadow-sm text-left"
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
                        <div className="flex items-center gap-2">
                          {ticket.reply_count && ticket.reply_count > 0 && (
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-[9px] font-heading font-black">
                              {ticket.reply_count} {ticket.reply_count === 1 ? 'reply' : 'replies'}
                            </span>
                          )}
                          <ChevronRight size={16} className="text-slate-400 dark:text-gray-500 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                      <h4 className="text-sm font-heading font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2 line-clamp-1">{ticket.subject}</h4>
                      <p className="text-xs text-slate-600 dark:text-gray-400 font-medium mb-2 line-clamp-2 leading-relaxed">
                        {ticket.message}
                      </p>
                      <span className="text-[10px] font-numbers font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.1em]">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              // CONVERSATION VIEW
              <div className="flex flex-col h-full">
                {/* Ticket Info */}
                <div className="mb-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-heading font-black uppercase tracking-widest ${
                      selectedTicket?.status === 'open' ? 'bg-blue-500/10 text-blue-500' :
                      selectedTicket?.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                      selectedTicket?.status === 'resolved' ? 'bg-green-500/10 text-green-500' :
                      'bg-slate-500/10 text-slate-500'
                    }`}>
                      {selectedTicket?.status}
                    </span>
                    <span className="text-[10px] font-numbers font-black text-slate-400 dark:text-gray-500">
                      {selectedTicket && new Date(selectedTicket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-sm font-heading font-black text-slate-900 dark:text-white uppercase tracking-wide mb-1">
                    {selectedTicket?.subject}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-gray-400 font-medium leading-relaxed">
                    {selectedTicket?.message}
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 scrollbar-hide">
                  {isLoadingReplies ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-primary" size={24} />
                    </div>
                  ) : ticketReplies.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-xs text-slate-500 dark:text-gray-500 font-medium">
                        No replies yet. Send a message to continue the conversation.
                      </p>
                    </div>
                  ) : (
                    ticketReplies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`flex gap-3 ${reply.is_admin ? 'flex-row' : 'flex-row-reverse'}`}
                      >
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          reply.is_admin 
                            ? 'bg-primary/20' 
                            : 'bg-blue-500/20'
                        }`}>
                          {reply.is_admin ? (
                            <Bot size={16} className="text-primary" />
                          ) : (
                            <User size={16} className="text-blue-500" />
                          )}
                        </div>

                        {/* Message Bubble */}
                        <div className={`flex-1 max-w-[75%] ${reply.is_admin ? '' : 'flex flex-col items-end'}`}>
                          <div className={`p-3 rounded-2xl ${
                            reply.is_admin
                              ? 'bg-slate-100 dark:bg-white/5 rounded-tl-sm'
                              : 'bg-primary/10 rounded-tr-sm'
                          }`}>
                            <p className="text-xs text-slate-900 dark:text-white font-medium leading-relaxed">
                              {reply.message}
                            </p>
                          </div>
                          <span className="text-[9px] text-slate-400 dark:text-gray-500 font-medium mt-1 px-1">
                            {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={repliesEndRef} />
                </div>

                {/* Reply Input */}
                <form onSubmit={handleSendReply} className="flex gap-2 items-end">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = '48px';
                      target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (replyMessage.trim() && !isSendingReply) {
                          handleSendReply(e as any);
                        }
                      }
                    }}
                    placeholder="Type your reply... (Enter to send)"
                    className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-primary/50 transition-all font-medium resize-none min-h-[48px] scrollbar-hide"
                    rows={1}
                    disabled={isSendingReply || selectedTicket?.status === 'resolved' || selectedTicket?.status === 'closed'}
                  />
                  <button
                    type="submit"
                    disabled={isSendingReply || !replyMessage.trim() || selectedTicket?.status === 'resolved' || selectedTicket?.status === 'closed'}
                    className="w-12 h-12 bg-primary hover:bg-primary-hover disabled:opacity-50 text-black rounded-2xl flex items-center justify-center transition-all shadow-lg"
                  >
                    {isSendingReply ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
          
          {/* Footer Info */}
          <div className="p-4 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-primary" />
            <span className="text-[10px] font-heading font-black text-slate-400 uppercase tracking-widest">Secured by RhizaCore Cloud</span>
          </div>
        </div>
      )}

      {/* Launcher Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-[20px] flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group relative ${
          isOpen ? 'bg-black text-white hover:rotate-90' : 'bg-primary text-black'
        }`}
      >
        {isOpen ? (
          <X size={26} />
        ) : (
          <>
            {hasUnread && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white dark:border-black rounded-full z-10 animate-bounce shadow-md" />
            )}
            <MessageCircle size={26} className="group-hover:rotate-12 transition-transform" />
          </>
        )}
      </button>
    </div>
  );
};

export default FloatingSupportEnhanced;
