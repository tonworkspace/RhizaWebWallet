import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Store, Code, Zap, Shield, Globe, DollarSign, CheckCircle, Copy, ExternalLink } from 'lucide-react';

const MerchantAPI: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string>('');

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link to="/" className="flex items-center gap-2 text-slate-600 dark:text-gray-400 hover:text-primary transition-colors group">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-bold">Back to Home</span>
            </Link>
            <a 
              href="https://docs.rhizacore.com/api" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-bold text-primary hover:underline"
            >
              Full API Docs <ExternalLink size={14} />
            </a>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
              <Store className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">Merchant API</h1>
              <p className="text-slate-600 dark:text-gray-400 font-medium">Accept $RZC payments in your business</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        {/* Hero */}
        <div className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl mb-12">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Start Accepting Crypto Payments Today</h2>
          <p className="text-slate-600 dark:text-gray-300 text-lg mb-6">
            Integrate RhizaCore's payment API in minutes. Accept $RZC and other cryptocurrencies with low fees, instant settlement, and no chargebacks.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="px-8 py-4 bg-primary text-black rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all">
              Get API Key
            </button>
            <button className="px-8 py-4 bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all">
              View Demo
            </button>
          </div>
        </div>

        {/* Features */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Why Choose RhizaCore Payments?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: 'Instant Settlement', desc: 'Receive payments in 5-10 seconds, not days' },
              { icon: DollarSign, title: 'Low Fees', desc: 'Only 0.5% transaction fee, no hidden costs' },
              { icon: Shield, title: 'No Chargebacks', desc: 'Blockchain transactions are irreversible' },
              { icon: Globe, title: 'Global Reach', desc: 'Accept payments from 190+ countries' },
              { icon: Code, title: 'Easy Integration', desc: 'Simple REST API, ready in minutes' },
              { icon: CheckCircle, title: 'No KYC Required', desc: 'Start accepting payments immediately' }
            ].map((feature, idx) => (
              <div key={idx} className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/30 transition-all">
                <feature.icon className="text-primary mb-4" size={28} />
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 dark:text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Start */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Quick Start Guide</h2>
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center font-black flex-shrink-0">1</div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Get Your API Key</h3>
                  <p className="text-slate-600 dark:text-gray-300 mb-4">Sign up and generate your API credentials from the merchant dashboard.</p>
                  <div className="p-4 bg-slate-900 dark:bg-black rounded-xl relative group">
                    <code className="text-primary text-sm font-mono">
                      API_KEY: rzc_live_1234567890abcdef
                    </code>
                    <button 
                      onClick={() => copyCode('rzc_live_1234567890abcdef', 'api-key')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Copy size={16} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center font-black flex-shrink-0">2</div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Create a Payment</h3>
                  <p className="text-slate-600 dark:text-gray-300 mb-4">Make a POST request to create a payment intent.</p>
                  <div className="p-4 bg-slate-900 dark:bg-black rounded-xl relative group overflow-x-auto">
                    <pre className="text-primary text-sm font-mono">
{`curl -X POST https://api.rhizacore.com/v1/payments \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "100.00",
    "currency": "RZC",
    "description": "Order #1234",
    "callback_url": "https://yoursite.com/callback"
  }'`}
                    </pre>
                    <button 
                      onClick={() => copyCode('curl -X POST...', 'create-payment')}
                      className="absolute right-4 top-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Copy size={16} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center font-black flex-shrink-0">3</div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Receive Payment</h3>
                  <p className="text-slate-600 dark:text-gray-300 mb-4">Get notified via webhook when payment is confirmed.</p>
                  <div className="p-4 bg-slate-900 dark:bg-black rounded-xl relative group overflow-x-auto">
                    <pre className="text-primary text-sm font-mono">
{`{
  "event": "payment.completed",
  "payment_id": "pay_abc123",
  "amount": "100.00",
  "currency": "RZC",
  "status": "completed",
  "tx_hash": "0x1234...5678"
}`}
                    </pre>
                    <button 
                      onClick={() => copyCode('{"event": "payment.completed"...', 'webhook')}
                      className="absolute right-4 top-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Copy size={16} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Transparent Pricing</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-8 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Starter</h3>
              <div className="text-4xl font-black text-slate-900 dark:text-white mb-4">Free</div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                  <CheckCircle size={16} className="text-primary" />
                  Up to $10K/month
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                  <CheckCircle size={16} className="text-primary" />
                  0.5% transaction fee
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                  <CheckCircle size={16} className="text-primary" />
                  Basic support
                </li>
              </ul>
              <button className="w-full py-3 bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all">
                Get Started
              </button>
            </div>

            <div className="p-8 bg-primary/10 border-2 border-primary rounded-2xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-black text-xs font-black uppercase rounded-full">
                Popular
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Business</h3>
              <div className="text-4xl font-black text-slate-900 dark:text-white mb-4">0.3%</div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                  <CheckCircle size={16} className="text-primary" />
                  Unlimited volume
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                  <CheckCircle size={16} className="text-primary" />
                  0.3% transaction fee
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                  <CheckCircle size={16} className="text-primary" />
                  Priority support
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                  <CheckCircle size={16} className="text-primary" />
                  Custom integration
                </li>
              </ul>
              <button className="w-full py-3 bg-primary text-black rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all">
                Get Started
              </button>
            </div>

            <div className="p-8 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Enterprise</h3>
              <div className="text-4xl font-black text-slate-900 dark:text-white mb-4">Custom</div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                  <CheckCircle size={16} className="text-primary" />
                  Volume discounts
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                  <CheckCircle size={16} className="text-primary" />
                  Dedicated support
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                  <CheckCircle size={16} className="text-primary" />
                  SLA guarantee
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                  <CheckCircle size={16} className="text-primary" />
                  White-label option
                </li>
              </ul>
              <button className="w-full py-3 bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all">
                Contact Sales
              </button>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'E-commerce', desc: 'Accept crypto payments in your online store', examples: ['Shopify', 'WooCommerce', 'Custom stores'] },
              { title: 'SaaS', desc: 'Subscription billing with cryptocurrency', examples: ['Monthly subscriptions', 'Usage-based billing', 'Freemium models'] },
              { title: 'Gaming', desc: 'In-game purchases and rewards', examples: ['Virtual goods', 'Premium features', 'Tournament prizes'] },
              { title: 'Content', desc: 'Monetize your content with crypto', examples: ['Paywalls', 'Tips', 'Memberships'] }
            ].map((useCase, idx) => (
              <div key={idx} className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{useCase.title}</h3>
                <p className="text-slate-600 dark:text-gray-300 mb-4">{useCase.desc}</p>
                <ul className="space-y-2">
                  {useCase.examples.map((example, i) => (
                    <li key={i} className="text-sm text-slate-500 dark:text-gray-400 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl text-center">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Ready to Get Started?</h2>
          <p className="text-slate-600 dark:text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
            Join thousands of merchants already accepting crypto payments with RhizaCore.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button className="px-8 py-4 bg-primary text-black rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all">
              Create Account
            </button>
            <a 
              href="mailto:merchants@rhizacore.com"
              className="px-8 py-4 bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all inline-block"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantAPI;
