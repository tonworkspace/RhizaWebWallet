import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const TermsOfService: React.FC = () => {
  const lastUpdated = 'February 21, 2026';

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-slate-600 dark:text-gray-400 hover:text-primary transition-colors group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-bold">Back to Home</span>
            </Link>
            <span className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest">
              Last Updated: {lastUpdated}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
              <FileText className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">Terms of Service</h1>
              <p className="text-slate-600 dark:text-gray-400 font-medium">User agreement and guidelines</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-12">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          {/* Introduction */}
          <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Agreement to Terms</h2>
            <p className="text-slate-600 dark:text-gray-300 leading-relaxed mb-0">
              By accessing and using RhizaCore, you agree to be bound by these Terms of Service. 
              If you disagree with any part of these terms, you may not use our service. 
              Please read these terms carefully before using RhizaCore.
            </p>
          </div>

          {/* Definitions */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Definitions</h2>
            <div className="space-y-4">
              {[
                { term: 'Service', def: 'RhizaCore wallet application and all related services' },
                { term: 'User/You', def: 'Any person or entity using RhizaCore' },
                { term: 'Wallet', def: 'Your non-custodial cryptocurrency wallet' },
                { term: 'Private Keys', def: 'Cryptographic keys that control your wallet' },
                { term: 'Mnemonic Phrase', def: 'Your 24-word recovery phrase' },
                { term: '$RZC', def: 'RhizaCore native utility token' }
              ].map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{item.term}</h3>
                  <p className="text-slate-600 dark:text-gray-300 mb-0">{item.def}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Acceptance */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">1. Acceptance of Terms</h2>
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <p className="text-slate-600 dark:text-gray-300 mb-4">
                By using RhizaCore, you acknowledge that:
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-gray-300">
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-primary flex-shrink-0 mt-0.5" />
                  <span>You have read and understood these Terms</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-primary flex-shrink-0 mt-0.5" />
                  <span>You agree to be bound by these Terms</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-primary flex-shrink-0 mt-0.5" />
                  <span>You are legally able to enter into this agreement</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-primary flex-shrink-0 mt-0.5" />
                  <span>You are at least 18 years old (or have parental consent)</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Non-Custodial Nature */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">2. Non-Custodial Service</h2>
            <div className="p-6 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-2xl">
              <h3 className="text-xl font-black text-yellow-900 dark:text-yellow-300 mb-4 flex items-center gap-2">
                <AlertTriangle size={24} />
                Critical Understanding
              </h3>
              <p className="text-yellow-900 dark:text-yellow-300 mb-4">
                RhizaCore is a NON-CUSTODIAL wallet. This means:
              </p>
              <ul className="space-y-3 text-yellow-900 dark:text-yellow-300">
                <li className="flex items-start gap-3">
                  <span className="font-black">•</span>
                  <span><strong>You control your private keys</strong> - We never have access to them</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-black">•</span>
                  <span><strong>You are responsible for security</strong> - Backup your mnemonic phrase</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-black">•</span>
                  <span><strong>We cannot recover your wallet</strong> - If you lose your phrase, funds are lost forever</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-black">•</span>
                  <span><strong>We cannot reverse transactions</strong> - Blockchain transactions are permanent</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-black">•</span>
                  <span><strong>We cannot freeze your account</strong> - You have complete control</span>
                </li>
              </ul>
            </div>
          </section>

          {/* User Responsibilities */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">3. Your Responsibilities</h2>
            <div className="space-y-4">
              <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3">Security</h3>
                <ul className="space-y-2 text-slate-600 dark:text-gray-300">
                  <li>• Keep your mnemonic phrase safe and private</li>
                  <li>• Use a strong password</li>
                  <li>• Never share your private keys</li>
                  <li>• Secure your device</li>
                  <li>• Logout when not in use</li>
                </ul>
              </div>

              <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3">Compliance</h3>
                <ul className="space-y-2 text-slate-600 dark:text-gray-300">
                  <li>• Comply with all applicable laws</li>
                  <li>• Pay any required taxes</li>
                  <li>• Not use for illegal activities</li>
                  <li>• Not violate sanctions or regulations</li>
                </ul>
              </div>

              <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3">Accuracy</h3>
                <ul className="space-y-2 text-slate-600 dark:text-gray-300">
                  <li>• Verify all transaction details before confirming</li>
                  <li>• Double-check recipient addresses</li>
                  <li>• Understand transaction fees</li>
                  <li>• Accept that transactions are irreversible</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Prohibited Activities */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">4. Prohibited Activities</h2>
            <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
              <h3 className="text-xl font-black text-red-900 dark:text-red-300 mb-4">You May NOT:</h3>
              <ul className="space-y-3 text-red-900 dark:text-red-300">
                <li className="flex items-start gap-3">
                  <XCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <span>Use RhizaCore for illegal activities</span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <span>Violate any laws or regulations</span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <span>Attempt to hack or compromise the service</span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <span>Impersonate others or create fake accounts</span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <span>Distribute malware or viruses</span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <span>Spam or harass other users</span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <span>Reverse engineer or copy our code (except as allowed by license)</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Disclaimers */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">5. Disclaimers</h2>
            <div className="space-y-4">
              <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3">"As Is" Service</h3>
                <p className="text-slate-600 dark:text-gray-300 mb-0">
                  RhizaCore is provided "as is" without warranties of any kind. We don't guarantee that the service will be 
                  error-free, uninterrupted, or secure. Use at your own risk.
                </p>
              </div>

              <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3">No Financial Advice</h3>
                <p className="text-slate-600 dark:text-gray-300 mb-0">
                  Nothing on RhizaCore constitutes financial, investment, legal, or tax advice. Consult professionals before 
                  making financial decisions. Cryptocurrency is volatile and risky.
                </p>
              </div>

              <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3">Third-Party Services</h3>
                <p className="text-slate-600 dark:text-gray-300 mb-0">
                  RhizaCore may integrate with third-party services (exchanges, DEXs, etc.). We're not responsible for their 
                  actions, security, or availability. Use them at your own risk.
                </p>
              </div>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">6. Limitation of Liability</h2>
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <p className="text-slate-600 dark:text-gray-300 mb-4">
                To the maximum extent permitted by law, RhizaCore and its team shall NOT be liable for:
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-gray-300">
                <li>• Loss of funds due to user error</li>
                <li>• Lost or stolen private keys or mnemonic phrases</li>
                <li>• Incorrect transactions</li>
                <li>• Blockchain network issues</li>
                <li>• Third-party service failures</li>
                <li>• Hacks or security breaches of your device</li>
                <li>• Market volatility or price changes</li>
                <li>• Regulatory changes</li>
                <li>• Any indirect, incidental, or consequential damages</li>
              </ul>
              <p className="text-slate-600 dark:text-gray-300 mt-4 mb-0 font-bold">
                Maximum liability: $100 USD or the amount you paid for the service (whichever is less).
              </p>
            </div>
          </section>

          {/* Indemnification */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">7. Indemnification</h2>
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <p className="text-slate-600 dark:text-gray-300 mb-0">
                You agree to indemnify and hold harmless RhizaCore, its team, and affiliates from any claims, damages, losses, 
                or expenses (including legal fees) arising from your use of the service, violation of these terms, or violation 
                of any laws or third-party rights.
              </p>
            </div>
          </section>

          {/* Termination */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">8. Termination</h2>
            <div className="space-y-4">
              <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3">By You</h3>
                <p className="text-slate-600 dark:text-gray-300 mb-0">
                  You may stop using RhizaCore at any time. Simply delete your wallet data from your device. 
                  Make sure to backup your mnemonic phrase first if you want to access your funds later.
                </p>
              </div>

              <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3">By Us</h3>
                <p className="text-slate-600 dark:text-gray-300 mb-0">
                  We may terminate or suspend access to RhizaCore for any reason, including violation of these terms. 
                  Since the service is non-custodial, your funds remain accessible via your mnemonic phrase even if we 
                  terminate the service.
                </p>
              </div>
            </div>
          </section>

          {/* Changes to Terms */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">9. Changes to Terms</h2>
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <p className="text-slate-600 dark:text-gray-300 mb-4">
                We may update these Terms from time to time. When we do:
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-gray-300">
                <li>• We'll update the "Last Updated" date</li>
                <li>• We'll notify you via the app</li>
                <li>• Major changes will be highlighted</li>
                <li>• You'll have 30 days to review changes</li>
              </ul>
              <p className="text-slate-600 dark:text-gray-300 mt-4 mb-0">
                Continued use after changes means you accept the updated terms. If you disagree, stop using the service.
              </p>
            </div>
          </section>

          {/* Governing Law */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">10. Governing Law</h2>
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <p className="text-slate-600 dark:text-gray-300 mb-0">
                These Terms are governed by the laws of [Jurisdiction], without regard to conflict of law principles. 
                Any disputes shall be resolved through binding arbitration in [Location], except where prohibited by law.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">11. Contact Information</h2>
            <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl">
              <p className="text-slate-600 dark:text-gray-300 mb-4">
                Questions about these Terms? Contact us:
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-gray-300">
                <li>• <strong>Email:</strong> legal@rhizacore.xyz</li>
                <li>• <strong>Telegram:</strong> t.me/rhizacore</li>
                <li>• <strong>Twitter:</strong> @RhizaCore</li>
              </ul>
            </div>
          </section>

          {/* Acknowledgment */}
          <section className="mb-12">
            <div className="p-6 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-2xl">
              <h3 className="text-xl font-black text-green-900 dark:text-green-300 mb-4">Acknowledgment</h3>
              <p className="text-green-900 dark:text-green-300 mb-0">
                By using RhizaCore, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. 
                You also acknowledge that cryptocurrency involves significant risk and that you are solely responsible for your funds.
              </p>
            </div>
          </section>

          {/* Footer */}
          <div className="pt-8 border-t border-slate-200 dark:border-white/10">
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <Link to="/privacy" className="text-primary hover:underline font-bold">Privacy Policy</Link>
              <span className="text-slate-400 dark:text-gray-500">•</span>
              <Link to="/security" className="text-primary hover:underline font-bold">Security Audit</Link>
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

export default TermsOfService;
