import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileCheck, Globe, Shield, Users, CheckCircle, Info } from 'lucide-react';

const Compliance: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300">
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link to="/" className="flex items-center gap-2 text-slate-600 dark:text-gray-400 hover:text-primary transition-colors group">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-bold">Back to Home</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
              <FileCheck className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">Compliance</h1>
              <p className="text-slate-600 dark:text-gray-400 font-medium">Regulatory compliance and standards</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-12">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Our Commitment</h2>
            <p className="text-slate-600 dark:text-gray-300 mb-0">
              RhizaCore is committed to operating within legal frameworks while maintaining user privacy and decentralization. 
              As a non-custodial wallet, we have unique compliance considerations.
            </p>
          </div>

          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Regulatory Framework</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: Globe, title: 'Global Accessibility', desc: 'Available worldwide with no geographic restrictions' },
                { icon: Shield, title: 'Non-Custodial', desc: 'We never hold user funds or private keys' },
                { icon: Users, title: 'No KYC Required', desc: 'Anonymous usage - no personal data collection' },
                { icon: FileCheck, title: 'Self-Regulatory', desc: 'Following best practices and industry standards' }
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
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Compliance Standards</h2>
            <div className="space-y-4">
              <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
                <div className="flex items-start gap-4">
                  <CheckCircle className="text-primary flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">GDPR Compliant</h3>
                    <p className="text-slate-600 dark:text-gray-300 mb-0">
                      We don't collect personal data, making GDPR compliance straightforward. Users have full control over their data.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
                <div className="flex items-start gap-4">
                  <CheckCircle className="text-primary flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">CCPA Compliant</h3>
                    <p className="text-slate-600 dark:text-gray-300 mb-0">
                      California Consumer Privacy Act compliance through minimal data collection and user control.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
                <div className="flex items-start gap-4">
                  <CheckCircle className="text-primary flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Open Source</h3>
                    <p className="text-slate-600 dark:text-gray-300 mb-0">
                      Code is publicly available for audit and verification, ensuring transparency.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">User Responsibilities</h2>
            <div className="p-6 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-2xl">
              <div className="flex items-start gap-4">
                <Info className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="text-lg font-black text-yellow-900 dark:text-yellow-300 mb-3">Important Notice</h3>
                  <p className="text-yellow-900 dark:text-yellow-300 mb-4">
                    As a non-custodial wallet user, you are responsible for:
                  </p>
                  <ul className="space-y-2 text-yellow-900 dark:text-yellow-300">
                    <li>• Complying with local laws and regulations</li>
                    <li>• Reporting and paying taxes on cryptocurrency transactions</li>
                    <li>• Not using the service for illegal activities</li>
                    <li>• Understanding and accepting the risks of cryptocurrency</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Anti-Money Laundering (AML)</h2>
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <p className="text-slate-600 dark:text-gray-300 mb-4">
                As a non-custodial wallet provider, RhizaCore:
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-gray-300">
                <li>• Does not facilitate fiat-to-crypto transactions directly</li>
                <li>• Does not hold or transmit user funds</li>
                <li>• Provides tools for users to manage their own funds</li>
                <li>• Encourages users to comply with local AML regulations</li>
              </ul>
              <p className="text-slate-600 dark:text-gray-300 mt-4 mb-0">
                Users are responsible for ensuring their transactions comply with applicable AML laws.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Contact Compliance Team</h2>
            <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl">
              <p className="text-slate-600 dark:text-gray-300 mb-4">
                Questions about compliance? Contact our team:
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-gray-300">
                <li>• <strong>Email:</strong> compliance@rhizacore.com</li>
                <li>• <strong>Legal:</strong> legal@rhizacore.com</li>
              </ul>
            </div>
          </section>

          <div className="pt-8 border-t border-slate-200 dark:border-white/10">
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <Link to="/privacy" className="text-primary hover:underline font-bold">Privacy Policy</Link>
              <span className="text-slate-400 dark:text-gray-500">•</span>
              <Link to="/terms" className="text-primary hover:underline font-bold">Terms of Service</Link>
              <span className="text-slate-400 dark:text-gray-500">•</span>
              <Link to="/security" className="text-primary hover:underline font-bold">Security Audit</Link>
              <span className="text-slate-400 dark:text-gray-500">•</span>
              <Link to="/" className="text-primary hover:underline font-bold">Home</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Compliance;
