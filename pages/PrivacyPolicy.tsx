import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Lock, Database, Globe, UserX, FileText } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
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
              <Shield className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">Privacy Policy</h1>
              <p className="text-slate-600 dark:text-gray-400 font-medium">How we protect your privacy</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-12">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          {/* Introduction */}
          <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 flex items-center gap-3">
              <Eye size={24} className="text-primary" />
              Our Privacy Commitment
            </h2>
            <p className="text-slate-600 dark:text-gray-300 leading-relaxed mb-0">
              At RhizaCore, we believe privacy is a fundamental right. We've designed our wallet to be completely non-custodial, 
              meaning we never have access to your funds or private keys. This privacy policy explains what minimal data we collect, 
              how we use it, and your rights.
            </p>
          </div>

          {/* Key Principles */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Key Privacy Principles</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: Lock, title: 'Non-Custodial', desc: 'We never have access to your private keys or funds' },
                { icon: UserX, title: 'No Personal Data', desc: 'No email, phone, or ID required to use RhizaCore' },
                { icon: Database, title: 'Local Storage', desc: 'Your wallet data is stored only on your device' },
                { icon: Globe, title: 'No Tracking', desc: 'We don\'t track your transactions or behavior' }
              ].map((item, idx) => (
                <div key={idx} className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                  <item.icon className="text-primary mb-3" size={24} />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-gray-400 mb-0">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* What We Collect */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">What Information We Collect</h2>
            
            <div className="space-y-6">
              <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">Information You Provide</h3>
                <ul className="space-y-3 text-slate-600 dark:text-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-black">•</span>
                    <span><strong>Wallet Password:</strong> Stored locally on your device, encrypted. We never see it.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-black">•</span>
                    <span><strong>Mnemonic Phrase:</strong> Generated locally, encrypted, stored on your device only. We never see it.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-black">•</span>
                    <span><strong>Wallet Names:</strong> Custom names you give your wallets, stored locally.</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">Information We Automatically Collect</h3>
                <ul className="space-y-3 text-slate-600 dark:text-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-black">•</span>
                    <span><strong>Anonymous Usage Data:</strong> Page views, feature usage (no personal identifiers)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-black">•</span>
                    <span><strong>Error Logs:</strong> Technical errors to improve the app (no personal data)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-black">•</span>
                    <span><strong>Browser Type:</strong> To ensure compatibility</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-2xl">
                <h3 className="text-xl font-black text-green-900 dark:text-green-300 mb-4">What We DON'T Collect</h3>
                <ul className="space-y-3 text-green-900 dark:text-green-300">
                  <li className="flex items-start gap-3">
                    <span className="font-black">✓</span>
                    <span>No email addresses</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-black">✓</span>
                    <span>No phone numbers</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-black">✓</span>
                    <span>No government IDs</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-black">✓</span>
                    <span>No IP addresses (stored)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-black">✓</span>
                    <span>No transaction history (on our servers)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-black">✓</span>
                    <span>No wallet balances</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-black">✓</span>
                    <span>No private keys or mnemonics</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">How We Use Your Information</h2>
            <div className="space-y-4">
              <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3">To Provide Services</h3>
                <p className="text-slate-600 dark:text-gray-300 mb-0">
                  We use locally stored data to operate your wallet, display your balance, and process transactions. 
                  All of this happens on your device.
                </p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3">To Improve Our Service</h3>
                <p className="text-slate-600 dark:text-gray-300 mb-0">
                  Anonymous usage data helps us understand which features are popular and where we can improve. 
                  This data cannot be linked back to you.
                </p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3">To Fix Bugs</h3>
                <p className="text-slate-600 dark:text-gray-300 mb-0">
                  Error logs help us identify and fix technical issues. These logs contain no personal information.
                </p>
              </div>
            </div>
          </section>

          {/* Data Storage */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Where Your Data is Stored</h2>
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">Local Storage (Your Device)</h3>
              <p className="text-slate-600 dark:text-gray-300 mb-4">
                All sensitive data is stored locally on your device using browser localStorage:
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-gray-300">
                <li>• Encrypted wallet data (mnemonic, private keys)</li>
                <li>• Wallet names and settings</li>
                <li>• Transaction history</li>
                <li>• User preferences</li>
              </ul>
              <p className="text-sm text-slate-500 dark:text-gray-400 mt-4 mb-0 italic">
                This data never leaves your device unless you explicitly export it.
              </p>
            </div>
          </section>

          {/* Data Sharing */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Data Sharing</h2>
            <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
              <h3 className="text-xl font-black text-red-900 dark:text-red-300 mb-4">We Do NOT Share Your Data</h3>
              <p className="text-red-900 dark:text-red-300 mb-4">
                We do not sell, rent, or share your personal information with third parties. Period.
              </p>
              <p className="text-red-900 dark:text-red-300 mb-0">
                Since we don't collect personal information, there's nothing to share. Your wallet data stays on your device.
              </p>
            </div>
          </section>

          {/* Blockchain Transparency */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Blockchain Transparency</h2>
            <div className="p-6 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-2xl">
              <h3 className="text-xl font-black text-yellow-900 dark:text-yellow-300 mb-4">Important Note</h3>
              <p className="text-yellow-900 dark:text-yellow-300 mb-4">
                While RhizaCore doesn't collect your data, the TON blockchain is public. This means:
              </p>
              <ul className="space-y-2 text-yellow-900 dark:text-yellow-300">
                <li>• All transactions are publicly visible on the blockchain</li>
                <li>• Your wallet address is public</li>
                <li>• Transaction amounts and recipients are public</li>
                <li>• This is how blockchain technology works (transparency and security)</li>
              </ul>
              <p className="text-yellow-900 dark:text-yellow-300 mt-4 mb-0">
                However, your wallet address is not linked to your identity unless you choose to share it.
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Your Privacy Rights</h2>
            <div className="space-y-4">
              <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3">Access Your Data</h3>
                <p className="text-slate-600 dark:text-gray-300 mb-0">
                  All your data is on your device. You can access it anytime through your browser's developer tools.
                </p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3">Delete Your Data</h3>
                <p className="text-slate-600 dark:text-gray-300 mb-0">
                  Clear your browser's localStorage to delete all wallet data. Or use the "Delete Wallet" feature in Settings.
                </p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3">Export Your Data</h3>
                <p className="text-slate-600 dark:text-gray-300 mb-0">
                  Use the "Export Backup" feature to download your wallet data as a JSON file.
                </p>
              </div>
            </div>
          </section>

          {/* Cookies */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Cookies and Tracking</h2>
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <p className="text-slate-600 dark:text-gray-300 mb-4">
                We use minimal cookies for essential functionality:
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-gray-300">
                <li>• <strong>Session cookies:</strong> To keep you logged in</li>
                <li>• <strong>Preference cookies:</strong> To remember your theme (dark/light mode)</li>
              </ul>
              <p className="text-slate-600 dark:text-gray-300 mt-4 mb-0">
                We do NOT use tracking cookies, advertising cookies, or third-party analytics cookies.
              </p>
            </div>
          </section>

          {/* Security */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Data Security</h2>
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <p className="text-slate-600 dark:text-gray-300 mb-4">
                We take security seriously:
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-gray-300">
                <li>• <strong>AES-256-GCM encryption:</strong> Military-grade encryption for your wallet data</li>
                <li>• <strong>HTTPS only:</strong> All connections are encrypted</li>
                <li>• <strong>No server storage:</strong> Your keys never touch our servers</li>
                <li>• <strong>Regular audits:</strong> Third-party security audits</li>
                <li>• <strong>Open source:</strong> Code is publicly auditable</li>
              </ul>
            </div>
          </section>

          {/* Children's Privacy */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Children's Privacy</h2>
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <p className="text-slate-600 dark:text-gray-300 mb-0">
                RhizaCore is designed for users of all ages (10-100+). Since we don't collect personal information, 
                there's no special consideration needed for children's privacy. However, we recommend parental guidance 
                for users under 18 when managing cryptocurrency.
              </p>
            </div>
          </section>

          {/* Changes to Policy */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Changes to This Policy</h2>
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <p className="text-slate-600 dark:text-gray-300 mb-4">
                We may update this privacy policy from time to time. When we do:
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-gray-300">
                <li>• We'll update the "Last Updated" date at the top</li>
                <li>• We'll notify you via the app</li>
                <li>• Major changes will be highlighted</li>
              </ul>
              <p className="text-slate-600 dark:text-gray-300 mt-4 mb-0">
                Continued use of RhizaCore after changes means you accept the updated policy.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Contact Us</h2>
            <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl">
              <p className="text-slate-600 dark:text-gray-300 mb-4">
                Questions about this privacy policy? Contact us:
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-gray-300">
                <li>• <strong>Email:</strong> privacy@rhizacore.xyz</li>
                <li>• <strong>Discord:</strong> t.me/rhizacore</li>
                <li>• <strong>Twitter:</strong> @RhizaCore</li>
              </ul>
            </div>
          </section>

          {/* Footer */}
          <div className="pt-8 border-t border-slate-200 dark:border-white/10">
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <Link to="/terms" className="text-primary hover:underline font-bold">Terms of Service</Link>
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

export default PrivacyPolicy;
