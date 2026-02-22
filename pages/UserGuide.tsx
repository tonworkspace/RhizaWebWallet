import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  BookOpen,
  ChevronDown,
  ChevronRight,
  Wallet,
  Download,
  Send,
  Shield,
  Settings as SettingsIcon,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';

interface Section {
  id: string;
  title: string;
  icon: any;
  content: React.ReactNode;
}

const UserGuide: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string>('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? '' : id);
  };

  const InfoBox: React.FC<{ type: 'info' | 'success' | 'warning' | 'error'; children: React.ReactNode }> = ({ type, children }) => {
    const styles = {
      info: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-900 dark:text-blue-300',
      success: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-900 dark:text-green-300',
      warning: 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20 text-yellow-900 dark:text-yellow-300',
      error: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-900 dark:text-red-300'
    };

    const icons = {
      info: Info,
      success: CheckCircle,
      warning: AlertCircle,
      error: XCircle
    };

    const Icon = icons[type];

    return (
      <div className={`p-4 border rounded-2xl flex items-start gap-3 ${styles[type]} my-4`}>
        <Icon size={20} className="flex-shrink-0 mt-0.5" />
        <div className="text-sm font-medium leading-relaxed">{children}</div>
      </div>
    );
  };

  const sections: Section[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Wallet,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">What is RhizaCore?</h3>
            <p className="text-slate-600 dark:text-gray-300 leading-relaxed mb-2">
              <strong>Simple:</strong> RhizaCore is like a digital wallet where you can store, send, and receive money. You control it completely—no banks needed!
            </p>
            <p className="text-slate-600 dark:text-gray-300 leading-relaxed">
              <strong>Technical:</strong> RhizaCore is a non-custodial TON blockchain wallet with multi-wallet management, AES-256-GCM encryption, and self-sovereign key management.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">What You'll Need</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-3 text-slate-600 dark:text-gray-300">
                <CheckCircle size={20} className="text-primary flex-shrink-0" />
                A computer or smartphone with internet
              </li>
              <li className="flex items-center gap-3 text-slate-600 dark:text-gray-300">
                <CheckCircle size={20} className="text-primary flex-shrink-0" />
                5 minutes of your time
              </li>
              <li className="flex items-center gap-3 text-slate-600 dark:text-gray-300">
                <CheckCircle size={20} className="text-primary flex-shrink-0" />
                A pen and paper (for your secret phrase)
              </li>
              <li className="flex items-center gap-3 text-slate-600 dark:text-gray-300">
                <CheckCircle size={20} className="text-primary flex-shrink-0" />
                A strong password you'll remember
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">Quick Start (3 Steps)</h3>
            <div className="grid gap-4">
              {[
                { step: '1', title: 'Visit', desc: 'Go to RhizaCore website' },
                { step: '2', title: 'Click', desc: '"Open Wallet" button' },
                { step: '3', title: 'Choose', desc: 'Create New or Import Existing' }
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                  <div className="w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center font-black flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white mb-1">{item.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-gray-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'creating-wallet',
      title: 'Creating Your First Wallet',
      icon: Wallet,
      content: (
        <div className="space-y-6">
          <InfoBox type="info">
            This process takes about 5 minutes. Make sure you have paper and pen ready to write down your secret phrase!
          </InfoBox>

          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">Step 1: Start the Process</h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-gray-300">
              <li>Click <strong>"Open Wallet"</strong> on the homepage</li>
              <li>On the onboarding page, click <strong>"Create New Wallet"</strong></li>
            </ol>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">Step 2: Save Your Secret Phrase</h3>
            <p className="text-slate-600 dark:text-gray-300 mb-4">
              You'll see 24 words displayed on screen. These are your SECRET PHRASE.
            </p>
            
            <InfoBox type="warning">
              <strong>CRITICAL:</strong> Write down all 24 words on paper in order. Never take a photo or save digitally. These words are the ONLY way to recover your wallet!
            </InfoBox>

            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-3">
              <h4 className="font-black text-slate-900 dark:text-white">What to Do:</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-3 text-slate-600 dark:text-gray-300">
                  <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                  Write down all 24 words on paper in order
                </li>
                <li className="flex items-start gap-3 text-slate-600 dark:text-gray-300">
                  <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                  Number them (1-24) so you don't mix them up
                </li>
                <li className="flex items-start gap-3 text-slate-600 dark:text-gray-300">
                  <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                  Store the paper safely (like in a safe or locked drawer)
                </li>
                <li className="flex items-start gap-3 text-slate-600 dark:text-gray-300">
                  <XCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                  Never take a photo or save digitally
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">Step 3: Create a Password</h3>
            <p className="text-slate-600 dark:text-gray-300 mb-4">
              Your password encrypts your wallet on this device.
            </p>
            
            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
              <h4 className="font-black text-slate-900 dark:text-white mb-3">Password Requirements:</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-3 text-slate-600 dark:text-gray-300">
                  <CheckCircle size={16} className="text-primary" />
                  At least 8 characters
                </li>
                <li className="flex items-center gap-3 text-slate-600 dark:text-gray-300">
                  <CheckCircle size={16} className="text-primary" />
                  One uppercase letter (A-Z)
                </li>
                <li className="flex items-center gap-3 text-slate-600 dark:text-gray-300">
                  <CheckCircle size={16} className="text-primary" />
                  One lowercase letter (a-z)
                </li>
                <li className="flex items-center gap-3 text-slate-600 dark:text-gray-300">
                  <CheckCircle size={16} className="text-primary" />
                  One number (0-9)
                </li>
                <li className="flex items-center gap-3 text-slate-600 dark:text-gray-300">
                  <CheckCircle size={16} className="text-primary" />
                  One special character (!@#$%^&*)
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">Step 4: Verify Your Backup</h3>
            <p className="text-slate-600 dark:text-gray-300 mb-4">
              System will ask for 3 random words from your phrase to verify you wrote them down correctly.
            </p>
            <InfoBox type="info">
              Look at your written paper, find the words at the requested positions, and type them in correctly.
            </InfoBox>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">Step 5: Final Confirmation</h3>
            <p className="text-slate-600 dark:text-gray-300 mb-4">
              Review and confirm the security checklist, then click "Initialize My Vault".
            </p>
            <InfoBox type="success">
              Congratulations! Your wallet is created and ready to use! 🎉
            </InfoBox>
          </div>
        </div>
      )
    },
    {
      id: 'transactions',
      title: 'Using Your Wallet',
      icon: Send,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">Sending Money</h3>
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-gray-300">Follow these steps to send money:</p>
              <ol className="list-decimal list-inside space-y-3 text-slate-600 dark:text-gray-300">
                <li>Click <strong>"Send"</strong> or <strong>"Transfer"</strong></li>
                <li>Enter recipient's wallet address (or scan QR code)</li>
                <li>Enter amount to send</li>
                <li>Review transaction details and fee</li>
                <li>Click <strong>"Confirm & Send"</strong></li>
                <li>Wait 5-10 seconds for confirmation</li>
              </ol>
              
              <InfoBox type="warning">
                <strong>Important:</strong> Always double-check the address! Transactions cannot be reversed.
              </InfoBox>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">Receiving Money</h3>
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-gray-300">To receive money:</p>
              <ol className="list-decimal list-inside space-y-3 text-slate-600 dark:text-gray-300">
                <li>Click <strong>"Receive"</strong></li>
                <li>Copy your wallet address OR show QR code</li>
                <li>Share with sender</li>
                <li>Wait for payment (arrives in 5-10 seconds)</li>
              </ol>
              
              <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                <h4 className="font-black text-slate-900 dark:text-white mb-2">Your Wallet Address:</h4>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
                  <li>• Starts with <code className="px-2 py-1 bg-slate-200 dark:bg-white/10 rounded">EQ</code> or <code className="px-2 py-1 bg-slate-200 dark:bg-white/10 rounded">UQ</code></li>
                  <li>• 48 characters long</li>
                  <li>• Safe to share publicly</li>
                  <li>• Like your bank account number</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'security',
      title: 'Security Best Practices',
      icon: Shield,
      content: (
        <div className="space-y-6">
          <InfoBox type="error">
            Security is YOUR responsibility. Follow these practices to keep your funds safe!
          </InfoBox>

          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">Protecting Your Secret Phrase</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-6 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-2xl">
                <h4 className="font-black text-green-900 dark:text-green-300 mb-3 flex items-center gap-2">
                  <CheckCircle size={20} /> DO
                </h4>
                <ul className="space-y-2 text-sm text-green-900 dark:text-green-300">
                  <li>✅ Write it on paper</li>
                  <li>✅ Store in multiple safe places</li>
                  <li>✅ Keep it private (never share)</li>
                  <li>✅ Make multiple copies</li>
                  <li>✅ Use a fireproof safe</li>
                </ul>
              </div>
              <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
                <h4 className="font-black text-red-900 dark:text-red-300 mb-3 flex items-center gap-2">
                  <XCircle size={20} /> DON'T
                </h4>
                <ul className="space-y-2 text-sm text-red-900 dark:text-red-300">
                  <li>❌ Take photos or screenshots</li>
                  <li>❌ Save in cloud storage</li>
                  <li>❌ Email it to yourself</li>
                  <li>❌ Store in password managers</li>
                  <li>❌ Tell anyone (even family)</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">Recognizing Scams</h3>
            <div className="space-y-4">
              {[
                {
                  title: 'Fake Support',
                  desc: '"Send me your 24-word phrase to verify your account"',
                  warning: 'Real support NEVER asks for your phrase!'
                },
                {
                  title: 'Phishing Websites',
                  desc: 'Fake websites that look like RhizaCore',
                  warning: 'Always check the URL carefully!'
                },
                {
                  title: 'Too Good to Be True',
                  desc: '"Send 1 TON, get 10 back!"',
                  warning: 'If it sounds too good, it\'s a scam!'
                }
              ].map((scam, idx) => (
                <div key={idx} className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
                  <h4 className="font-black text-red-900 dark:text-red-300 mb-2">{scam.title}</h4>
                  <p className="text-sm text-red-800 dark:text-red-400 mb-2 italic">"{scam.desc}"</p>
                  <p className="text-sm text-red-900 dark:text-red-300 font-bold">⚠️ {scam.warning}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'wallet-management',
      title: 'Managing Multiple Wallets',
      icon: SettingsIcon,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">Why Have Multiple Wallets?</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: '💼', title: 'Personal & Business', desc: 'Separate funds for different purposes' },
                { icon: '💰', title: 'Different Goals', desc: 'Savings, trading, daily use' },
                { icon: '🎁', title: 'Gift Wallets', desc: 'Create wallets for family members' },
                { icon: '🔒', title: 'Extra Security', desc: 'Don\'t keep all eggs in one basket' }
              ].map((reason, idx) => (
                <div key={idx} className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                  <div className="text-3xl mb-2">{reason.icon}</div>
                  <h4 className="font-black text-slate-900 dark:text-white mb-1">{reason.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-gray-400">{reason.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">Adding a Second Wallet</h3>
            <ol className="list-decimal list-inside space-y-3 text-slate-600 dark:text-gray-300">
              <li>Go to Settings (gear icon)</li>
              <li>Scroll to "Wallet Manager"</li>
              <li>Click "Add Wallet"</li>
              <li>Choose "Create New" or "Import Existing"</li>
              <li>Follow the setup steps</li>
            </ol>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">Switching Between Wallets</h3>
            <p className="text-slate-600 dark:text-gray-300 mb-4">
              From Settings → Wallet Manager:
            </p>
            <ol className="list-decimal list-inside space-y-3 text-slate-600 dark:text-gray-300">
              <li>Find "Wallet Manager" section</li>
              <li>See all your wallets listed</li>
              <li>Click the checkmark (✓) icon on desired wallet</li>
              <li>Enter password</li>
              <li>Wallet switches instantly!</li>
            </ol>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-6">
          <div className="flex items-center justify-between">
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

          <div className="mt-6 flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
              <BookOpen className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">User Guide</h1>
              <p className="text-slate-600 dark:text-gray-400 font-medium">Complete guide for using RhizaCore</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-gray-400 mb-4">Contents</h3>
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                    expandedSection === section.id
                      ? 'bg-primary text-black font-black'
                      : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 font-bold'
                  }`}
                >
                  <section.icon size={18} />
                  <span className="text-sm">{section.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {sections.map((section) => (
              <div
                key={section.id}
                id={section.id}
                className={`bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden transition-all ${
                  expandedSection === section.id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <section.icon className="text-primary" size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{section.title}</h2>
                  </div>
                  <ChevronDown
                    className={`text-slate-400 dark:text-gray-500 transition-transform ${
                      expandedSection === section.id ? 'rotate-180' : ''
                    }`}
                    size={24}
                  />
                </button>
                
                {expandedSection === section.id && (
                  <div className="p-6 pt-0 border-t border-slate-200 dark:border-white/10">
                    {section.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;
