import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Code, Book, Github, Terminal, Boxes, Rocket, ExternalLink, Download } from 'lucide-react';

const DeveloperHub: React.FC = () => {
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
              href="https://github.com/rhizacore" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-bold text-primary hover:underline"
            >
              <Github size={16} /> View on GitHub
            </a>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
              <Code className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">Developer Hub</h1>
              <p className="text-slate-600 dark:text-gray-400 font-medium">Build on RhizaCore</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        {/* Hero */}
        <div className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl mb-12">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Build the Future of Commerce</h2>
          <p className="text-slate-600 dark:text-gray-300 text-lg mb-6">
            Access powerful APIs, SDKs, and tools to build decentralized applications on RhizaCore. 
            Join our developer community and shape the future of Web3 commerce.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="px-8 py-4 bg-primary text-black rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
              <Rocket size={18} /> Quick Start
            </button>
            <a 
              href="https://docs.rhizacore.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
            >
              <Book size={18} /> Documentation
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Developer Resources</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Book, title: 'Documentation', desc: 'Complete API reference and guides', link: 'https://docs.rhizacore.com' },
              { icon: Github, title: 'GitHub', desc: 'Open source code and examples', link: 'https://github.com/rhizacore' },
              { icon: Terminal, title: 'CLI Tools', desc: 'Command-line tools for developers', link: '#cli' },
              { icon: Boxes, title: 'SDKs', desc: 'Libraries for popular languages', link: '#sdks' },
              { icon: Code, title: 'API Reference', desc: 'REST API documentation', link: '#api' },
              { icon: ExternalLink, title: 'Playground', desc: 'Test APIs in your browser', link: 'https://playground.rhizacore.com' }
            ].map((resource, idx) => (
              <a
                key={idx}
                href={resource.link}
                target={resource.link.startsWith('http') ? '_blank' : undefined}
                rel={resource.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/30 transition-all group"
              >
                <resource.icon className="text-primary mb-4 group-hover:scale-110 transition-transform" size={28} />
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{resource.title}</h3>
                <p className="text-sm text-slate-600 dark:text-gray-400">{resource.desc}</p>
              </a>
            ))}
          </div>
        </section>

        {/* SDKs */}
        <section id="sdks" className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Official SDKs</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { 
                lang: 'JavaScript/TypeScript', 
                install: 'npm install @rhizacore/sdk',
                code: `import { RhizaCore } from '@rhizacore/sdk';

const rhiza = new RhizaCore({
  apiKey: 'YOUR_API_KEY'
});

const payment = await rhiza.payments.create({
  amount: '100.00',
  currency: 'RZC'
});`
              },
              { 
                lang: 'Python', 
                install: 'pip install rhizacore',
                code: `from rhizacore import RhizaCore

rhiza = RhizaCore(api_key='YOUR_API_KEY')

payment = rhiza.payments.create(
    amount='100.00',
    currency='RZC'
)`
              },
              { 
                lang: 'Go', 
                install: 'go get github.com/rhizacore/go-sdk',
                code: `import "github.com/rhizacore/go-sdk"

client := rhizacore.NewClient("YOUR_API_KEY")

payment, err := client.Payments.Create(&rhizacore.PaymentParams{
    Amount:   "100.00",
    Currency: "RZC",
})`
              },
              { 
                lang: 'PHP', 
                install: 'composer require rhizacore/php-sdk',
                code: `use RhizaCore\\RhizaCore;

$rhiza = new RhizaCore('YOUR_API_KEY');

$payment = $rhiza->payments->create([
    'amount' => '100.00',
    'currency' => 'RZC'
]);`
              }
            ].map((sdk, idx) => (
              <div key={idx} className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{sdk.lang}</h3>
                  <button className="p-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-all">
                    <Download size={18} className="text-primary" />
                  </button>
                </div>
                <div className="mb-4">
                  <div className="text-xs font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest mb-2">Install</div>
                  <div className="p-3 bg-slate-900 dark:bg-black rounded-lg">
                    <code className="text-primary text-sm font-mono">{sdk.install}</code>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest mb-2">Example</div>
                  <div className="p-3 bg-slate-900 dark:bg-black rounded-lg overflow-x-auto">
                    <pre className="text-primary text-xs font-mono">{sdk.code}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* API Endpoints */}
        <section id="api" className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Core API Endpoints</h2>
          <div className="space-y-4">
            {[
              { method: 'POST', endpoint: '/v1/payments', desc: 'Create a new payment' },
              { method: 'GET', endpoint: '/v1/payments/:id', desc: 'Retrieve payment details' },
              { method: 'GET', endpoint: '/v1/wallets/:address', desc: 'Get wallet information' },
              { method: 'POST', endpoint: '/v1/webhooks', desc: 'Register webhook endpoint' },
              { method: 'GET', endpoint: '/v1/transactions', desc: 'List transactions' },
              { method: 'POST', endpoint: '/v1/tokens/swap', desc: 'Swap tokens' }
            ].map((endpoint, idx) => (
              <div key={idx} className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-between hover:border-primary/30 transition-all group">
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-lg font-black text-xs uppercase ${
                    endpoint.method === 'POST' ? 'bg-green-100 dark:bg-green-500/20 text-green-900 dark:text-green-300' :
                    'bg-blue-100 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300'
                  }`}>
                    {endpoint.method}
                  </span>
                  <code className="text-slate-900 dark:text-white font-mono font-bold">{endpoint.endpoint}</code>
                </div>
                <span className="text-sm text-slate-600 dark:text-gray-400">{endpoint.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Smart Contracts */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Smart Contracts</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">$RZC Token Contract</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-black text-slate-500 dark:text-gray-400 uppercase mb-1">Network</div>
                  <div className="text-slate-900 dark:text-white font-mono">TON Mainnet</div>
                </div>
                <div>
                  <div className="text-xs font-black text-slate-500 dark:text-gray-400 uppercase mb-1">Address</div>
                  <div className="text-slate-900 dark:text-white font-mono text-sm break-all">EQA1_7xP2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7</div>
                </div>
                <a href="#" className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline">
                  View on Explorer <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">Staking Contract</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-black text-slate-500 dark:text-gray-400 uppercase mb-1">Network</div>
                  <div className="text-slate-900 dark:text-white font-mono">TON Mainnet</div>
                </div>
                <div>
                  <div className="text-xs font-black text-slate-500 dark:text-gray-400 uppercase mb-1">Address</div>
                  <div className="text-slate-900 dark:text-white font-mono text-sm break-all">EQB2_8xQ3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z8</div>
                </div>
                <a href="#" className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline">
                  View on Explorer <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Community */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Join the Community</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Discord', desc: 'Chat with developers', link: 'https://discord.gg/rhizacore', members: '5,000+' },
              { title: 'GitHub', desc: 'Contribute to code', link: 'https://github.com/rhizacore', members: '1,200+' },
              { title: 'Forum', desc: 'Technical discussions', link: 'https://forum.rhizacore.com', members: '3,500+' }
            ].map((community, idx) => (
              <a
                key={idx}
                href={community.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/30 transition-all group"
              >
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{community.title}</h3>
                <p className="text-sm text-slate-600 dark:text-gray-400 mb-4">{community.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-primary uppercase">{community.members} Members</span>
                  <ExternalLink size={16} className="text-slate-400 dark:text-gray-500 group-hover:text-primary transition-colors" />
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl text-center">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Start Building Today</h2>
          <p className="text-slate-600 dark:text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
            Get your API key and start building in minutes. Join thousands of developers building on RhizaCore.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button className="px-8 py-4 bg-primary text-black rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all">
              Get API Key
            </button>
            <a 
              href="https://docs.rhizacore.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all inline-block"
            >
              Read Docs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperHub;
