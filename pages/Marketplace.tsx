import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Search, Filter, Star, TrendingUp, Shield, Zap, Heart, ExternalLink } from 'lucide-react';

const Marketplace: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Products', count: 1247 },
    { id: 'digital', name: 'Digital Goods', count: 523 },
    { id: 'services', name: 'Services', count: 312 },
    { id: 'nft', name: 'NFTs', count: 189 },
    { id: 'physical', name: 'Physical Goods', count: 156 },
    { id: 'subscriptions', name: 'Subscriptions', count: 67 }
  ];

  const featuredProducts = [
    {
      id: 1,
      name: 'Premium Web Design Course',
      seller: 'DesignMaster',
      price: '299',
      rating: 4.9,
      reviews: 1234,
      image: '🎨',
      category: 'Digital Goods',
      verified: true
    },
    {
      id: 2,
      name: 'Smart Contract Audit Service',
      seller: 'SecureCode',
      price: '1500',
      rating: 5.0,
      reviews: 89,
      image: '🔒',
      category: 'Services',
      verified: true
    },
    {
      id: 3,
      name: 'Crypto Trading Bot License',
      seller: 'TradePro',
      price: '499',
      rating: 4.7,
      reviews: 567,
      image: '🤖',
      category: 'Digital Goods',
      verified: true
    },
    {
      id: 4,
      name: 'Exclusive NFT Collection',
      seller: 'ArtistDAO',
      price: '2.5',
      rating: 4.8,
      reviews: 234,
      image: '🖼️',
      category: 'NFTs',
      verified: true
    },
    {
      id: 5,
      name: 'Monthly SEO Optimization',
      seller: 'GrowthHacker',
      price: '199',
      rating: 4.9,
      reviews: 445,
      image: '📈',
      category: 'Subscriptions',
      verified: true
    },
    {
      id: 6,
      name: 'Custom Logo Design',
      seller: 'BrandStudio',
      price: '150',
      rating: 4.8,
      reviews: 892,
      image: '✨',
      category: 'Services',
      verified: true
    }
  ];

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
            <Link
              to="/onboarding"
              className="px-6 py-2 bg-primary text-black rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all"
            >
              Start Selling
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
              <ShoppingBag className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">Product Marketplace</h1>
              <p className="text-slate-600 dark:text-gray-400 font-medium">Buy and sell with $RZC</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        {/* Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <div className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl">
            <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">1,247</div>
            <div className="text-sm text-slate-600 dark:text-gray-400 font-bold">Active Listings</div>
          </div>
          <div className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl">
            <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">$2.8M</div>
            <div className="text-sm text-slate-600 dark:text-gray-400 font-bold">Total Volume</div>
          </div>
          <div className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl">
            <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">15,432</div>
            <div className="text-sm text-slate-600 dark:text-gray-400 font-bold">Happy Buyers</div>
          </div>
          <div className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl">
            <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">3,891</div>
            <div className="text-sm text-slate-600 dark:text-gray-400 font-bold">Verified Sellers</div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, services, NFTs..."
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-6 py-4 text-slate-900 dark:text-white outline-none focus:border-primary/50 transition-all"
              />
            </div>
            <button className="px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-slate-900 dark:text-white hover:border-primary/50 transition-all flex items-center gap-2">
              <Filter size={20} />
              Filters
            </button>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                  selectedCategory === category.id
                    ? 'bg-primary text-black'
                    : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </div>

        {/* Why Choose Our Marketplace */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Why Buy & Sell Here?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Buyer Protection', desc: 'Escrow system protects every transaction' },
              { icon: Zap, title: 'Instant Payments', desc: 'Receive $RZC immediately after sale' },
              { icon: TrendingUp, title: 'Low Fees', desc: 'Only 2.5% marketplace fee, no hidden costs' }
            ].map((feature, idx) => (
              <div key={idx} className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/30 transition-all">
                <feature.icon className="text-primary mb-4" size={28} />
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 dark:text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Featured Products</h2>
            <button className="text-primary font-bold text-sm hover:underline flex items-center gap-2">
              View All <ExternalLink size={14} />
            </button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <div key={product.id} className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/30 transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-5xl">{product.image}</div>
                  <button className="p-2 bg-slate-50 dark:bg-white/5 rounded-lg hover:bg-primary/10 transition-all">
                    <Heart size={18} className="text-slate-400 dark:text-gray-500 group-hover:text-primary" />
                  </button>
                </div>
                <div className="mb-3">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                    {product.category}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-slate-600 dark:text-gray-400">by</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{product.seller}</span>
                  {product.verified && (
                    <Shield size={14} className="text-primary" />
                  )}
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{product.rating}</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-gray-400">({product.reviews} reviews)</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{product.price} $RZC</div>
                  </div>
                  <button className="px-4 py-2 bg-primary text-black rounded-xl font-black text-xs uppercase hover:scale-105 transition-all">
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">How It Works</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* For Buyers */}
            <div className="p-8 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-600/10 border border-blue-200 dark:border-blue-500/20 rounded-3xl">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">For Buyers</h3>
              <div className="space-y-4">
                {[
                  { step: '1', text: 'Browse products and find what you need' },
                  { step: '2', text: 'Pay with $RZC (funds held in escrow)' },
                  { step: '3', text: 'Receive product and confirm delivery' },
                  { step: '4', text: 'Funds released to seller automatically' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary text-black rounded-lg flex items-center justify-center font-black flex-shrink-0">
                      {item.step}
                    </div>
                    <p className="text-slate-700 dark:text-gray-300 font-medium pt-1">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* For Sellers */}
            <div className="p-8 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-500/10 dark:to-green-600/10 border border-green-200 dark:border-green-500/20 rounded-3xl">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">For Sellers</h3>
              <div className="space-y-4">
                {[
                  { step: '1', text: 'Create your seller account (free)' },
                  { step: '2', text: 'List your products with photos & details' },
                  { step: '3', text: 'Deliver product when order comes in' },
                  { step: '4', text: 'Get paid instantly in $RZC' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary text-black rounded-lg flex items-center justify-center font-black flex-shrink-0">
                      {item.step}
                    </div>
                    <p className="text-slate-700 dark:text-gray-300 font-medium pt-1">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl text-center">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Ready to Start Trading?</h2>
          <p className="text-slate-600 dark:text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
            Join thousands of buyers and sellers in the RhizaCore marketplace. Safe, fast, and decentralized.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/onboarding"
              className="px-8 py-4 bg-primary text-black rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all inline-block"
            >
              Start Buying
            </Link>
            <Link
              to="/onboarding"
              className="px-8 py-4 bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all inline-block"
            >
              Start Selling
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
