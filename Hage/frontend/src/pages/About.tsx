
import { Target, Shield, Users } from 'lucide-react';
import { Card } from '../components/ui/Card';

export default function About() {
  return (
    <div className="bg-white dark:bg-[#0B0E14] transition-colors">
      {/* Hero */}
      <section className="py-24 bg-gray-50 dark:bg-[#111722]/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Our Mission
          </h1>
          <p className="text-xl text-gray-600 dark:text-slate-300 max-w-3xl mx-auto">
            To empower traders with professional-grade analytics, seamless journaling, and actionable insights to achieve consistency in the markets.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg text-gray-600 dark:text-slate-300 max-w-none">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">The HAGE Story</h2>
            <p className="mb-4 text-gray-600 dark:text-slate-300">
              HAGE was born out of frustration. As traders ourselves, we were tired of using clunky spreadsheets that took hours to manage, or outdated software that felt like it belonged in the 90s.
            </p>
            <p className="mb-4 text-gray-600 dark:text-slate-300">
              We realized that the difference between an amateur and a professional trader isn't just strategy—it's how they analyze their data. Professionals treat trading like a business. They know their metrics intimately.
            </p>
            <p className="mb-4 text-gray-600 dark:text-slate-300">
              So we built HAGE. A modern, lightning-fast, beautifully designed trading journal that does the heavy lifting for you. 
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-gray-50 dark:bg-[#111722]/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-16 text-center">Our Core Values</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 text-center border-gray-200 dark:border-slate-800">
              <div className="w-16 h-16 bg-primary/10 dark:bg-blue-950/60 text-primary dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Precision</h3>
              <p className="text-gray-600 dark:text-slate-400">
                We believe in accurate data. Every metric in HAGE is rigorously tested to ensure you make decisions based on reality.
              </p>
            </Card>

            <Card className="p-8 text-center border-gray-200 dark:border-slate-800">
              <div className="w-16 h-16 bg-primary/10 dark:bg-blue-950/60 text-primary dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Security First</h3>
              <p className="text-gray-600 dark:text-slate-400">
                Your trading data is your edge. We use state-of-transform encryption to protect your strategies and financial information.
              </p>
            </Card>

            <Card className="p-8 text-center border-gray-200 dark:border-slate-800">
              <div className="w-16 h-16 bg-primary/10 dark:bg-blue-950/60 text-primary dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Trader Centric</h3>
              <p className="text-gray-600 dark:text-slate-400">
                Every feature we build is designed to solve real problems for real traders. If it doesn't help you trade better, we don't build it.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
