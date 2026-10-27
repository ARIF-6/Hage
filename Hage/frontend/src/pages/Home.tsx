
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  BarChart2, Calendar, Target, Shield, Zap, LayoutDashboard, 
  CheckCircle2, ChevronRight, Star, ChevronDown 
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { loadPlanPricing, fetchRemotePricing, type AllPlanPricing } from '../store/pricingStore';
import { HeroDashboardPreview } from '../components/home/HeroDashboardPreview';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true },
  transition: { staggerChildren: 0.1 }
};

export default function Home() {
  const [pricing, setPricing] = useState<AllPlanPricing>(() => loadPlanPricing());

  useEffect(() => {
    fetchRemotePricing().then(setPricing);

    const handlePricingUpdated = (e: any) => {
      if (e.detail) {
        setPricing(e.detail);
      } else {
        setPricing(loadPlanPricing());
      }
    };

    window.addEventListener('pricingUpdated', handlePricingUpdated);
    return () => window.removeEventListener('pricingUpdated', handlePricingUpdated);
  }, []);
  return (
    <div className="flex flex-col min-h-screen">
      
      {/* HERO SECTION */}
      <section className="pt-20 pb-16 md:pt-28 md:pb-24 px-4 overflow-hidden relative">
        {/* Dynamic Ambient Background: Uses Black screenshot for Dark mode and White screenshot for Light mode */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">
          {/* Dark Mode Ambient Background (Black) */}
          <img 
            src="/hero-dashboard-dark.png" 
            alt="" 
            className="w-full h-full object-cover object-top opacity-0 dark:opacity-20 blur-3xl scale-110 transition-opacity duration-700" 
          />
          {/* Light Mode Ambient Background (White) */}
          <img 
            src="/hero-dashboard-light.png" 
            alt="" 
            className="w-full h-full object-cover object-top opacity-20 dark:opacity-0 blur-3xl scale-110 transition-opacity duration-700 absolute inset-0" 
          />
          {/* Ambient gradient overlay to seamlessly blend with page */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white dark:via-[#0B0E14]/85 dark:to-[#0B0E14]" />
        </div>

        {/* Dynamic Glowing Ambient Light Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42rem] h-[26rem] bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-emerald-500/20 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -z-10 mix-blend-multiply pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -z-10 mix-blend-multiply pointer-events-none" />
        
        <div className="max-w-7xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            {/* Top Pill Tag */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 text-xs font-black tracking-wide uppercase mb-6 shadow-xs"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Next-Gen Prop Firm & Trading Journal</span>
            </motion.div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-gray-900 dark:text-white mb-6 leading-[1.08]">
              Track Every Trade. <br className="hidden md:block" />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
                Master Every Decision.
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              The institutional-grade trading journal engineered for serious traders. Realized net P&L, multi-factor HAGE scores, prop firm drawdown safety, and interactive performance calendars.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-8">
              <Link to="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto group shadow-lg shadow-blue-500/25 cursor-pointer font-bold">
                  Get Started
                  <ChevronRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto cursor-pointer font-bold border border-gray-200 dark:border-slate-700">
                  Login
                </Button>
              </Link>
            </div>

            {/* Quick Stats Micro Strip */}
            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 text-xs text-gray-500 dark:text-slate-400 font-semibold mb-6">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Prop Firm Rule Tracking
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Real-Time Analytics
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Institutional Precision
              </span>
            </div>
          </motion.div>

          {/* ── Interactive Hero Showcase (User's Exact Dashboard Components) ── */}
          <HeroDashboardPreview />

        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-24 bg-white dark:bg-[#0B0E14] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-sm font-semibold text-primary dark:text-blue-400 uppercase tracking-wider mb-2">Everything you need</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Powerful features for serious traders
            </h3>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {[
              { icon: <LayoutDashboard className="w-6 h-6 text-primary dark:text-blue-400" />, title: 'Trading Journal', desc: 'Log every trade with detail. Add screenshots, emotions, and setup criteria.' },
              { icon: <BarChart2 className="w-6 h-6 text-primary dark:text-blue-400" />, title: 'Performance Analytics', desc: 'Visualize your win rate, profit factor, and equity curve in real-time.' },
              { icon: <Target className="w-6 h-6 text-primary dark:text-blue-400" />, title: 'Challenge Tracking', desc: 'Monitor your prop firm challenges and evaluations in one centralized place.' },
              { icon: <Calendar className="w-6 h-6 text-primary dark:text-blue-400" />, title: 'Trading Calendar', desc: 'See your daily, weekly, and monthly performance at a glance.' },
              { icon: <Shield className="w-6 h-6 text-primary dark:text-blue-400" />, title: 'Risk Management', desc: 'Track your R-multiple and ensure you stick to your risk parameters.' },
              { icon: <Zap className="w-6 h-6 text-primary dark:text-blue-400" />, title: 'Future MT5 Integration', desc: 'Seamlessly sync your trades from MetaTrader 5 automatically. (Coming Soon)' }
            ].map((feature, idx) => (
              <motion.div key={idx} variants={fadeInUp}>
                <Card className="h-full hover:shadow-md transition-shadow border-gray-100 dark:border-slate-800">
                  <div className="p-6">
                    <div className="w-12 h-12 bg-primary/10 dark:bg-blue-950/60 rounded-xl flex items-center justify-center mb-6">
                      {feature.icon}
                    </div>
                    <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{feature.title}</h4>
                    <p className="text-gray-600 dark:text-slate-400">{feature.desc}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* WHY HAGE */}
      <section className="py-24 bg-gray-50 dark:bg-[#111722]/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Why choose HAGE over Excel?
              </h2>
              <p className="text-lg text-gray-600 dark:text-slate-300 mb-8">
                Spreadsheets are great, but they aren't built for modern trading. HAGE gives you the professional edge with automated analytics and a beautiful interface.
              </p>
              
              <ul className="space-y-4">
                {[
                  'Professional, beautiful design',
                  'Simple, intuitive interface',
                  'Lightning-fast performance',
                  'Advanced Trading Statistics',
                  'Future AI Insights & Analysis'
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-slate-200 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="aspect-square bg-gradient-to-tr from-primary/20 to-blue-300/20 dark:from-blue-600/20 dark:to-indigo-600/20 rounded-3xl p-8">
                <div className="w-full h-full bg-white dark:bg-[#161F30] rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gray-50/50 dark:bg-[#111722]/80 flex flex-col items-center justify-center p-8 text-center">
                    <BarChart2 className="w-16 h-16 text-primary dark:text-blue-400 mb-4" />
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Automated Insights</h4>
                    <p className="text-gray-500 dark:text-slate-400">Stop calculating metrics manually. Let HAGE do the heavy lifting while you focus on trading.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-white dark:bg-[#0B0E14] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-gray-600 dark:text-slate-400">
              Choose the plan that fits your trading goals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <Card className="flex flex-col border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 transition-all">
              <div className="p-8 flex-grow">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Starter</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    ${pricing.Starter.monthly}
                  </span>
                  <span className="text-gray-500 dark:text-slate-400">/mo</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {pricing.Starter.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-primary dark:text-blue-400 shrink-0" /> {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-8 pt-0 mt-auto">
                <Link to="/register"><Button variant="outline" className="w-full">Get Starter</Button></Link>
              </div>
            </Card>

            {/* Pro */}
            <Card className="flex flex-col border-primary dark:border-blue-500 shadow-lg shadow-blue-500/10 relative">
              <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl">
                MOST POPULAR
              </div>
              <div className="p-8 flex-grow">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Pro</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    ${pricing.Pro.monthly}
                  </span>
                  <span className="text-gray-500 dark:text-slate-400">/mo</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {pricing.Pro.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-primary dark:text-blue-400 shrink-0" /> {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-8 pt-0 mt-auto">
                <Link to="/register"><Button className="w-full">Upgrade to Pro</Button></Link>
              </div>
            </Card>

            {/* Premium */}
            <Card className="flex flex-col border-gray-200 dark:border-slate-800 hover:border-amber-500/40 transition-all">
              <div className="p-8 flex-grow">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Premium</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    ${pricing.Premium.monthly}
                  </span>
                  <span className="text-gray-500 dark:text-slate-400">/mo</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {pricing.Premium.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-primary dark:text-blue-400 shrink-0" /> {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-8 pt-0 mt-auto">
                <Link to="/register"><Button variant="outline" className="w-full">Get Premium</Button></Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-gray-50 dark:bg-[#111722]/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-16">
            Loved by professional traders
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((_, idx) => (
              <Card key={idx} className="p-6 text-left border-gray-200 dark:border-slate-800">
                <div className="flex text-yellow-400 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-gray-600 dark:text-slate-300 mb-6">
                  "HAGE completely transformed how I analyze my setups. The clean UI and powerful analytics are unmatched."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    AT
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white text-sm">Alex Thompson</h5>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Funded Trader</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-white dark:bg-[#0B0E14] transition-colors">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-12 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              { q: 'Is my trading data secure?', a: 'Yes, we use bank-level encryption to ensure your data is always private and secure.' },
              { q: 'Can I import my history from other platforms?', a: 'Currently you can import via CSV. Direct MT5/MT4 integration is coming very soon.' },
              { q: 'What markets does HAGE support?', a: 'You can use HAGE for Forex, Crypto, Stocks, Options, and Futures. Our analytics are market-agnostic.' }
            ].map((faq, idx) => (
              <details key={idx} className="group border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#111722] [&_summary::-webkit-details-marker]:hidden shadow-xs">
                <summary className="flex cursor-pointer items-center justify-between gap-1.5 p-6 text-gray-900 dark:text-white font-medium">
                  {faq.q}
                  <ChevronDown className="w-5 h-5 transition duration-300 group-open:-rotate-180 text-gray-500 dark:text-slate-400" />
                </summary>
                <div className="px-6 pb-6 text-gray-600 dark:text-slate-300">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
