
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { MOCK_ASSETS } from '../constants';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am RhizaCore AI. I can analyze your portfolio, explain TON concepts, or help you with security tips. How can I assist you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await geminiService.askAssistant(userMsg, {
        assets: MOCK_ASSETS,
        network: 'TON Mainnet'
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response || 'I couldn\'t process that.' }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'An error occurred while reaching my neural core.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3">
            <Bot className="text-[#00FF88]" /> RhizaCore <span className="text-[#00FF88]">AI</span>
          </h2>
          <p className="text-gray-500 text-sm">Powered by Gemini 3.0 Pro Insights</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400">
          <ShieldCheck size={14} className="text-[#00FF88]" /> Secure Session
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-6 scrollbar-hide" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
              msg.role === 'user' ? 'bg-white/10' : 'bg-[#00FF88] text-black'
            }`}>
              {msg.role === 'user' ? <User size={20} /> : <Zap size={20} className="fill-current" />}
            </div>
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-white/5 border border-white/10 text-white' 
                : 'bg-[#00FF88]/10 border border-[#00FF88]/20 text-gray-200'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#00FF88] text-black flex items-center justify-center shrink-0 animate-pulse">
              <Sparkles size={20} />
            </div>
            <div className="bg-[#00FF88]/10 border border-[#00FF88]/20 p-4 rounded-2xl">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#00FF88] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[#00FF88] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[#00FF88] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about your portfolio, TON tech, or market news..."
          className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-[#00FF88]/50 transition-all text-white placeholder:text-gray-600"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="w-14 h-14 bg-[#00FF88] text-black rounded-2xl flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
        >
          <Send size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={() => setInput("Explain TON Proof-of-Stake")} className="text-xs bg-white/5 border border-white/5 p-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all">"Explain TON Proof-of-Stake"</button>
        <button onClick={() => setInput("Analyze my risk profile")} className="text-xs bg-white/5 border border-white/5 p-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all">"Analyze my risk profile"</button>
        <button onClick={() => setInput("Recent TON Ecosystem news")} className="text-xs bg-white/5 border border-white/5 p-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all">"Recent Ecosystem news"</button>
      </div>
    </div>
  );
};

export default AIAssistant;
