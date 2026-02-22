import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Key, Server, Code, CheckCircle, AlertTriangle } from 'lucide-react';

const SecurityAudit: React.FC = () => {
  const lastAudit = 'January 2026';

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300">
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link to="/" className="flex items-center gap-2 text-slate-600 dark:text-gray-400 hover:text-primary transition-colors group">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-bold">Back to Home</span>
            </Link>
            <span className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest">
              Last Audit: {lastAudit}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
              <Shield className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">Security Audit</h1>
              <p className="text-slate-600 dark:text-gray-400 font-medium">Our security measures and audits</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-12">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <div className="p-6 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-2xl mb-12">
            <h2 className="text-2xl font-black text-green-900 dark:text-green-300 mb-4 flex items-center gap-3">
              <CheckCircle size={24} />
              Security Status: Excellent
            </h2>
            <p className="text-green-900 dark:text-green-300 mb-0">
              RhizaCore has undergone comprehensive security audits by leading firms. No critical vulnerabilities found. 
              All recommendations implemented.
            </p>
          </div>

          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Security Architecture</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: Lock, title: 'AES-256-GCM Encryption', desc: 'Military-grade encryption for all wallet data' },
                { icon: Key, title: 'PBKDF2 Key Derivation', desc: '100,000 iterations for password hashing' },
                { icon: Server, title: 'No Server Storage', desc: 'All data stored locally on your device' },
                { icon: Code, title: 'Open Source', desc: 'Code is publicly auditable on GitHub' }
              ].map((item, idx) => (
                <div key={idx} className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                  <item.icon className="text-primary mb-3" size={24} />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-gray-400 mb-0">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Audit History</h2>
            <div className="space-y-4">
              <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Q1 2026 Security Audit</h3>
                    <p className="text-sm text-slate-500 dark:text-gray-400">Conducted by: CertiK</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-500/20 text-green-900 dark:text-green-300 text-xs font-black rounded-full">
                    PASSED
                  </span>
                </div>
                <p className="text-slate-600 dark:text-gray-300 mb-4">
                  Comprehensive smart contract and application security audit. All critical and high-severity issues resolved.
                </p>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">0</div>
                    <div className="text-xs text-slate-500 dark:text-gray-400 uppercase">Critical</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">0</div>
                    <div className="text-xs text-slate-500 dark:text-gray-400 uppercase">High</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">2</div>
                    <div className="text-xs text-slate-500 dark:text-gray-400 uppercase">Medium</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">3</div>
                    <div className="text-xs text-slate-500 dark:text-gray-400 uppercase">Low</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Security Features</h2>
            <div className="space-y-3">
              {[
                'Non-custodial architecture - You control your keys',
                'Client-side encryption - Data encrypted before storage',
                'Session timeout - Auto-logout after 15 minutes',
                'Mnemonic verification - Ensures proper backup',
                'HTTPS only - All connections encrypted',
                'No server-side key storage - Keys never leave your device',
                'Regular security updates - Continuous improvement',
                'Bug bounty program - Community-driven security'
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                  <CheckCircle className="text-primary flex-shrink-0" size={20} />
                  <span className="text-slate-600 dark:text-gray-300 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Responsible Disclosure</h2>
            <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl">
              <p className="text-slate-600 dark:text-gray-300 mb-4">
                Found a security vulnerability? We appreciate responsible disclosure.
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-gray-300">
                <li>• <strong>Email:</strong> security@rhizacore.com</li>
                <li>• <strong>PGP Key:</strong> Available on request</li>
                <li>• <strong>Response Time:</strong> Within 24 hours</li>
                <li>• <strong>Bug Bounty:</strong> Up to $10,000 for critical issues</li>
              </ul>
            </div>
          </section>

          <div className="pt-8 border-t border-slate-200 dark:border-white/10">
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <Link to="/privacy" className="text-primary hover:underline font-bold">Privacy Policy</Link>
              <span className="text-slate-400 dark:text-gray-500">•</span>
              <Link to="/terms" className="text-primary hover:underline font-bold">Terms of Service</Link>
              <span className="text-slate-400 dark:text-gray-500">•</span>
              <Link to="/compliance" className="text-primary hover:underline font-bold">Compliance</Link>
              <span className="text-slate-400 dark:text-gray-500">•</span>
              <Link to="/" className="text-primary hover:underline font-bold">Home</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityAudit;
