import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  HelpCircle,
  ChevronDown,
  Search,
  Wallet,
  Shield,
  Send,
  DollarSign,
  Code,
  AlertTriangle
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  simple?: string;
  technical?: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: any;
  color: string;
  faqs: FAQItem[];
}

const FAQ: React.FC = () => {
  const [expandedFAQ, setExpandedFAQ] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? '' : id);
  };

  const categories: FAQCategory[] = [
    {
      id: 'general',
      title: 'General Questions',
      icon: HelpCircle,
      color: '#00FF88',
      faqs: [
        {
          question: 'What is RhizaCore?',
          simple: 'RhizaCore is a digital wallet where you can store, send, and receive money. You control it completely—no banks needed!',
          technical: 'RhizaCore is a non-custodial TON blockchain wallet with multi-wallet management, institutional-grade security, and integrated commerce features.'
        },
        {
          question: 'Is RhizaCore free to use?',
          answer: 'Yes! Creating and using a wallet is completely free. You only pay small blockchain fees (usually $0.01-0.05) when sending transactions. These fees go to blockchain validators, not RhizaCore.'
        },
        {
          question: 'Do I need to provide personal information?',
          answer: 'No! RhizaCore is completely anonymous. We don\'t require email, phone number, government ID, bank account, or any personal information. Just create a password and you\'re ready to go.'
        },
        {
          question: 'Is RhizaCore available in my country?',
          answer: 'Yes! RhizaCore works worldwide with no geographic limitations, no KYC requirements, and no country blocks. True global access for everyone.'
        },
        {
          question: 'Can I use RhizaCore on mobile?',
          answer: 'Currently, RhizaCore works best on desktop browsers (Chrome, Firefox, Safari, Edge). Mobile browser support is available but optimized for desktop. Native iOS and Android apps are coming in Q4 2026.'
        }
      ]
    },
    {
      id: 'wallet-security',
      title: 'Wallet & Security',
      icon: Shield,
      color: '#FF6B6B',
      faqs: [
        {
          question: 'How secure is RhizaCore?',
          answer: 'Very secure! RhizaCore uses AES-256-GCM encryption (military-grade), PBKDF2 key derivation with 100,000 iterations, non-custodial design (you control keys), password protection, and 15-minute session timeout. Your keys never leave your device, and even we can\'t access your funds.'
        },
        {
          question: 'What if I lose my 24-word phrase?',
          answer: 'If you still have your password, login and export your backup from Settings. If you lost both password and phrase, your wallet cannot be recovered. This is by design for security. Always backup your phrase in multiple safe places!'
        },
        {
          question: 'Can RhizaCore recover my wallet?',
          answer: 'No. We don\'t have your private keys, can\'t see your mnemonic phrase, and can\'t reset your password. This ensures YOUR money is truly YOURS. Maximum security means you\'re responsible for backups.'
        },
        {
          question: 'How many wallets can I create?',
          answer: 'Unlimited! Practical limits are around 50-100 wallets for best performance. Most users need 2-5 wallets for personal, business, savings, and other purposes.'
        },
        {
          question: 'Can I use the same mnemonic on multiple devices?',
          answer: 'Yes! Your mnemonic phrase works on any device. Just import it on the new device. Important: Both devices will have full access, so keep all devices secure and logout when not in use.'
        },
        {
          question: 'What happens if someone steals my device?',
          answer: 'If you have a password, your wallet is encrypted and they can\'t access it without the password. Session timeout also protects you. If compromised, use another device to import your wallet with your mnemonic and transfer funds to a new wallet.'
        }
      ]
    },
    {
      id: 'transactions',
      title: 'Transactions & Fees',
      icon: Send,
      color: '#00CCFF',
      faqs: [
        {
          question: 'How long do transactions take?',
          answer: 'TON blockchain transactions typically take 5-10 seconds. Fast transactions can complete in 2-3 seconds, while slow ones (rare) might take up to 30 seconds. Much faster than Bitcoin (10-60 min) or bank transfers (1-3 days)!'
        },
        {
          question: 'What are the fees?',
          answer: 'RhizaCore is free to use. Blockchain fees (paid to validators, not us) are: Send TON ~$0.01, Send tokens ~$0.02, Swap tokens ~$0.05-0.20. These fees keep the network secure and running.'
        },
        {
          question: 'Can I cancel a transaction?',
          answer: 'No. Blockchain transactions are permanent and cannot be reversed. This prevents fraud and double-spending. Always double-check addresses, verify amounts, and send test amounts first for large transactions.'
        },
        {
          question: 'What if I send to wrong address?',
          answer: 'Unfortunately, funds cannot be recovered. They went to the wrong address and are controlled by whoever has that private key. If you know the recipient, ask them to send back. If it\'s a random address, funds are likely lost forever. Prevention is key!'
        },
        {
          question: 'Why is my transaction pending?',
          answer: 'Common reasons: Network congestion (many transactions at once), low fee (rare on TON), internet issues, or normal processing time. Wait 1-2 minutes, check internet connection, view on blockchain explorer, or contact support if stuck >10 minutes.'
        }
      ]
    },
    {
      id: 'tokens',
      title: 'Tokens & Economics',
      icon: DollarSign,
      color: '#FFD93D',
      faqs: [
        {
          question: 'What is $RZC?',
          simple: '$RZC is RhizaCore\'s money. You use it to shop, send to friends, or save to earn more.',
          technical: '$RZC is RhizaCore\'s native utility token on the TON blockchain with a fixed supply of 1 billion tokens and deflationary mechanics.'
        },
        {
          question: 'How many $RZC tokens exist?',
          answer: 'Fixed supply of 1,000,000,000 $RZC (1 billion). Distribution: 60% Community Mining Pool, 20% Development & Operations, 20% Strategic Liquidity. No new tokens will ever be created, and supply decreases over time with 0.05% burn mechanism.'
        },
        {
          question: 'How do I get $RZC?',
          answer: 'Methods: 1) Buy with credit card via on-ramp service, 2) Swap other crypto using built-in DEX, 3) Earn through mining (Proof of Activity rewards), 4) Referral program (10% of friends\' fees), 5) Staking rewards (5-15% APY).'
        },
        {
          question: 'What is staking?',
          simple: 'Lock your $RZC to earn more $RZC over time. Like a savings account for crypto.',
          technical: 'Lock $RZC for 30/90/180 days to earn 5-15% APY. Your coins help secure the network while generating passive income. Rewards are distributed daily.'
        },
        {
          question: 'What is the referral program?',
          answer: 'Earn by inviting friends! Get your unique link, share it, and when friends create wallets you earn 10% of their transaction fees (lifetime) while they get 5% bonus on first transaction. No limit on referrals!'
        }
      ]
    },
    {
      id: 'technical',
      title: 'Technical Questions',
      icon: Code,
      color: '#9D4EDD',
      faqs: [
        {
          question: 'What blockchain does RhizaCore use?',
          answer: 'The Open Network (TON). Why TON? Ultra-fast (5-10 second transactions), low fees ($0.01-0.05), secure and decentralized, scalable (millions of TPS), and growing global adoption. Faster than Ethereum, cheaper than Bitcoin, more scalable than both.'
        },
        {
          question: 'What is a non-custodial wallet?',
          simple: 'You control your money, not a company. Your keys, your control, no one can freeze your account.',
          technical: 'Non-custodial means you hold your private keys. Unlike custodial wallets (exchanges) where the company controls your keys, you have complete sovereignty. More control = more responsibility for backups.'
        },
        {
          question: 'What is a mnemonic phrase?',
          simple: '24 special words that are the master key to your wallet.',
          technical: 'BIP39 mnemonic phrase - human-readable representation of your private key using a standardized 2048-word list. Generates your private key deterministically and works on any compatible wallet.'
        },
        {
          question: 'Can I use my RhizaCore wallet with other apps?',
          answer: 'Yes! Your mnemonic phrase is compatible with TON Wallet, Tonkeeper, TON Hub, and any BIP39-compatible wallet. Export your mnemonic from RhizaCore and import into other wallet apps to access the same funds. Be careful where you enter your mnemonic!'
        },
        {
          question: 'What is AES-256-GCM encryption?',
          simple: 'Military-grade encryption that keeps your wallet super secure.',
          technical: 'AES (Advanced Encryption Standard) with 256-bit key size in GCM (Galois/Counter Mode) for authenticated encryption. Would take billions of years to crack. Used by governments and militaries. Protects your mnemonic phrase, private keys, and wallet data.'
        },
        {
          question: 'Is my data stored on servers?',
          answer: 'No! Everything is stored locally on your device. Your encrypted wallet data, transaction history, and settings are all local. Your mnemonic phrase, password, and private keys are never sent to servers. Maximum privacy, no server breaches, you control your data.'
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: AlertTriangle,
      color: '#F59E0B',
      faqs: [
        {
          question: 'I can\'t login',
          answer: 'Common solutions: 1) Check password (try again, check caps lock), 2) Select correct wallet from list, 3) Forgot password? Use "Import Wallet" with your 24-word phrase to set new password, 4) Browser issues? Clear cache or try different browser.'
        },
        {
          question: 'My balance shows zero',
          answer: 'Quick fixes: 1) Refresh (pull down or click refresh icon), 2) Wait a few seconds (blockchain queries can be slow), 3) Check internet connection, 4) Verify on blockchain explorer that funds are there, 5) Make sure you\'re in correct wallet (check address).'
        },
        {
          question: 'Transaction failed',
          answer: 'Common reasons: 1) Insufficient balance (not enough for amount + fee), 2) Network issues (internet connection problem), 3) Invalid address (wrong format or typo), 4) Smart contract error (contract rejected transaction). Check error message, verify details, and try again.'
        },
        {
          question: 'Can\'t export backup',
          answer: 'Solutions: 1) Enter correct password, 2) Check browser download settings (allow downloads from site), 3) Free up device space, 4) Try different browser or update current browser.'
        },
        {
          question: 'Wallet won\'t load',
          answer: 'Troubleshooting: 1) Check internet connection, 2) Clear browser cache (Settings → Privacy → Clear browsing data), 3) Try different browser (Chrome, Firefox, Safari, Edge), 4) Check website status page for maintenance, 5) Restart device.'
        }
      ]
    }
  ];

  const filteredCategories = categories.filter(category => 
    selectedCategory === 'all' || category.id === selectedCategory
  );

  const searchResults = filteredCategories.flatMap(category =>
    category.faqs
      .filter(faq => 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.simple?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.technical?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map(faq => ({ ...faq, category: category.title, categoryColor: category.color }))
  );

  const displayItems = searchQuery ? searchResults : filteredCategories;

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

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
                <HelpCircle className="text-black" size={24} />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">FAQ</h1>
                <p className="text-slate-600 dark:text-gray-400 font-medium">Quick answers to common questions</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" size={20} />
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-6 py-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 outline-none focus:border-primary/50 transition-all font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        {/* Category Filter */}
        {!searchQuery && (
          <div className="mb-8 flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
                selectedCategory === 'all'
                  ? 'bg-primary text-black'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-2 ${
                  selectedCategory === category.id
                    ? 'bg-primary text-black'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                <category.icon size={16} />
                {category.title}
              </button>
            ))}
          </div>
        )}

        {/* FAQ Items */}
        <div className="space-y-8">
          {searchQuery ? (
            // Search Results
            <div className="space-y-3">
              {searchResults.length > 0 ? (
                searchResults.map((faq, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleFAQ(`search-${idx}`)}
                      className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span 
                            className="text-xs font-black uppercase tracking-widest px-2 py-1 rounded"
                            style={{ backgroundColor: `${faq.categoryColor}20`, color: faq.categoryColor }}
                          >
                            {faq.category}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">{faq.question}</h3>
                      </div>
                      <ChevronDown
                        className={`text-slate-400 dark:text-gray-500 transition-transform flex-shrink-0 ml-4 ${
                          expandedFAQ === `search-${idx}` ? 'rotate-180' : ''
                        }`}
                        size={24}
                      />
                    </button>
                    
                    {expandedFAQ === `search-${idx}` && (
                      <div className="px-6 pb-6 border-t border-slate-200 dark:border-white/10 pt-4">
                        {faq.simple && (
                          <div className="mb-4">
                            <p className="text-sm font-black text-slate-700 dark:text-gray-300 mb-1">Simple:</p>
                            <p className="text-slate-600 dark:text-gray-400 leading-relaxed">{faq.simple}</p>
                          </div>
                        )}
                        {faq.technical && (
                          <div className="mb-4">
                            <p className="text-sm font-black text-slate-700 dark:text-gray-300 mb-1">Technical:</p>
                            <p className="text-slate-600 dark:text-gray-400 leading-relaxed">{faq.technical}</p>
                          </div>
                        )}
                        {faq.answer && !faq.simple && !faq.technical && (
                          <p className="text-slate-600 dark:text-gray-400 leading-relaxed">{faq.answer}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <HelpCircle className="mx-auto text-slate-300 dark:text-gray-700 mb-4" size={48} />
                  <p className="text-slate-600 dark:text-gray-400 font-medium">No results found for "{searchQuery}"</p>
                </div>
              )}
            </div>
          ) : (
            // Category View
            filteredCategories.map((category) => (
              <div key={category.id} id={category.id}>
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <category.icon style={{ color: category.color }} size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{category.title}</h2>
                    <p className="text-sm text-slate-600 dark:text-gray-400">{category.faqs.length} questions</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {category.faqs.map((faq, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggleFAQ(`${category.id}-${idx}`)}
                        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                      >
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex-1">{faq.question}</h3>
                        <ChevronDown
                          className={`text-slate-400 dark:text-gray-500 transition-transform flex-shrink-0 ml-4 ${
                            expandedFAQ === `${category.id}-${idx}` ? 'rotate-180' : ''
                          }`}
                          size={24}
                        />
                      </button>
                      
                      {expandedFAQ === `${category.id}-${idx}` && (
                        <div className="px-6 pb-6 border-t border-slate-200 dark:border-white/10 pt-4">
                          {faq.simple && (
                            <div className="mb-4">
                              <p className="text-sm font-black text-slate-700 dark:text-gray-300 mb-1">Simple:</p>
                              <p className="text-slate-600 dark:text-gray-400 leading-relaxed">{faq.simple}</p>
                            </div>
                          )}
                          {faq.technical && (
                            <div className="mb-4">
                              <p className="text-sm font-black text-slate-700 dark:text-gray-300 mb-1">Technical:</p>
                              <p className="text-slate-600 dark:text-gray-400 leading-relaxed">{faq.technical}</p>
                            </div>
                          )}
                          {faq.answer && !faq.simple && !faq.technical && (
                            <p className="text-slate-600 dark:text-gray-400 leading-relaxed">{faq.answer}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FAQ;
