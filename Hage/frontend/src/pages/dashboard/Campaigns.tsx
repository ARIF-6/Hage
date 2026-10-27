import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Award, AlertTriangle, Plus, CheckCircle2, ShieldAlert, BarChart2
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { ChallengeCard } from '../../components/dashboard/ChallengeCard';
import { RealAccountCard } from '../../components/dashboard/RealAccountCard';
import { AddCampaignModal } from '../../components/ui/AddCampaignModal';
import { useTradeStore } from '../../store/useTradeStore';
import { triggerReadOnlyAlert } from '../../store/subscriptionRules';
import { format } from 'date-fns';

type AccountCategory = 'active' | 'passed' | 'failed';

export default function Campaigns() {
  const { campaigns, setActiveCampaign, activeCampaignId, trades, setCertificateModalCampaign } = useTradeStore();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<AccountCategory>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenConnectModal = () => {
    if (triggerReadOnlyAlert('connect or create a trading account')) {
      return;
    }
    setIsModalOpen(true);
  };

  // Categorize accounts according to requirements:
  // A. ACTIVE ACCOUNTS: Phase 1, Phase 2, Funded currently being traded (status === 'Active' or not Failed/Passed)
  const activeAccounts = campaigns.filter(c => 
    c.status === 'Active' || (!c.status && c.status !== 'Failed' && c.status !== 'Passed')
  );

  // B. PASSED ACCOUNTS: Completed challenge/phase, reached required target
  const passedAccounts = campaigns.filter(c => c.status === 'Passed');

  // C. FAILED ACCOUNTS: Accounts that failed because they violated rules such as maximum drawdown
  const failedAccounts = campaigns.filter(c => c.status === 'Failed');

  return (
    <div className="max-w-[1680px] mx-auto w-full pb-16 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        {/* Header Bar with Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-[#111722]/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-[#1E293B] shadow-xs">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Target className="w-7 h-7 text-primary dark:text-blue-400" />
              Account Management
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
              Track your prop firm evaluations across Active, Passed, and Failed challenge lifecycles.
            </p>
          </div>

          <button
            onClick={handleOpenConnectModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Connect New Account</span>
          </button>
        </div>



        {/* 3 Main Account Lifecycle Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 p-1.5 rounded-2xl bg-white/70 dark:bg-[#111722]/80 backdrop-blur-md border border-gray-200/80 dark:border-[#1E293B] shadow-xs">
          {/* Category A: ACTIVE ACCOUNTS */}
          <button
            onClick={() => setSelectedCategory('active')}
            className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${
              selectedCategory === 'active'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 dark:bg-blue-600 dark:text-white'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-[#182030]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Target className="w-4 h-4" />
              <span>ACTIVE ACCOUNTS</span>
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
              selectedCategory === 'active'
                ? 'bg-white/20 text-white'
                : 'bg-gray-200/60 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
            }`}>
              {activeAccounts.length}
            </span>
          </button>

          {/* Category B: PASSED ACCOUNTS */}
          <button
            onClick={() => setSelectedCategory('passed')}
            className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${
              selectedCategory === 'passed'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 dark:bg-emerald-600 dark:text-white'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-[#182030]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>PASSED ACCOUNTS</span>
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
              selectedCategory === 'passed'
                ? 'bg-white/20 text-white'
                : 'bg-gray-200/60 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
            }`}>
              {passedAccounts.length}
            </span>
          </button>

          {/* Category C: FAILED ACCOUNTS */}
          <button
            onClick={() => setSelectedCategory('failed')}
            className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${
              selectedCategory === 'failed'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20 dark:bg-rose-600 dark:text-white'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-[#182030]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4" />
              <span>FAILED ACCOUNTS</span>
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
              selectedCategory === 'failed'
                ? 'bg-white/20 text-white'
                : 'bg-gray-200/60 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
            }`}>
              {failedAccounts.length}
            </span>
          </button>
        </div>

        {/* Content Display by Category */}
        <AnimatePresence mode="wait">
          {/* CATEGORY A: ACTIVE ACCOUNTS */}
          {selectedCategory === 'active' && (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {activeAccounts.map(campaign => (
                  <div key={campaign.id} className="relative">
                    {campaign.phase === 'Real Account' ? (
                      <RealAccountCard campaign={campaign} />
                    ) : (
                      <ChallengeCard campaignId={campaign.id} onConnectNew={handleOpenConnectModal} />
                    )}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button 
                        onClick={() => setActiveCampaign(campaign.id)}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-colors cursor-pointer ${
                          activeCampaignId === campaign.id 
                            ? 'bg-blue-600 text-white shadow-xs' 
                            : 'bg-gray-100 dark:bg-[#182030] text-gray-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200/60 dark:border-slate-700'
                        }`}
                      >
                        {activeCampaignId === campaign.id ? 'Active Trading' : 'Set Active'}
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Connect New Challenge Card */}
                <Card 
                  onClick={handleOpenConnectModal}
                  className="border-dashed border-2 border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-[#111722]/50 flex flex-col items-center justify-center text-center p-8 hover:bg-gray-100/80 dark:hover:bg-[#161F30]/60 transition-all cursor-pointer min-h-[300px] group"
                >
                  <div className="w-14 h-14 bg-white dark:bg-[#182030] rounded-2xl flex items-center justify-center shadow-xs mb-3 border border-gray-100 dark:border-slate-700 group-hover:scale-105 transition-transform">
                    <Plus className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Connect New Account</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-[220px]">
                    Add a new Phase 1, Phase 2, Funded, or Real Account
                  </p>
                </Card>
              </div>
            </motion.div>
          )}

          {/* CATEGORY B: PASSED ACCOUNTS */}
          {selectedCategory === 'passed' && (
            <motion.div
              key="passed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {passedAccounts.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white/70 dark:bg-[#111722]/80 border border-gray-200/80 dark:border-[#1E293B]">
                  <Award className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No Passed Accounts Yet</h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                    When your active Phase 1 or Phase 2 challenge reaches its Profit Target, the completed evaluation will be preserved here in Passed Accounts history.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {passedAccounts.map(campaign => {
                    const campaignTrades = trades.filter(t => t.campaignId === campaign.id);
                    return (
                      <Card key={campaign.id} className="border-emerald-200 dark:border-emerald-900/50 shadow-xs">
                        <CardContent className="p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400">
                                PASSED • Read-only account
                              </span>
                              <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1.5">{campaign.name}</h3>
                              <p className="text-xs text-gray-400 font-medium">{campaign.broker} • #{campaign.accountNumber}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-gray-400 text-[10px] uppercase font-bold block">Account Size</span>
                              <span className="font-extrabold text-gray-900 dark:text-white">${campaign.accountSize.toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-gray-400 text-[10px] uppercase font-bold block">Profit Target Hit</span>
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">+${(campaign.profitTarget || 0).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100 dark:border-[#1E293B] text-gray-500 dark:text-slate-400">
                            <span>{campaignTrades.length} Trades Completed</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              Passed {campaign.passedDate ? format(new Date(campaign.passedDate), 'MMM d, yyyy') : 'Completed'}
                            </span>
                          </div>

                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => {
                                setActiveCampaign(campaign.id);
                                navigate('/dashboard/trades');
                              }}
                              className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <BarChart2 className="w-3.5 h-3.5" />
                              <span>View Trades</span>
                            </button>
                            <button
                              onClick={() => setCertificateModalCampaign(campaign)}
                              className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>View Certificate</span>
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* CATEGORY C: FAILED ACCOUNTS */}
          {selectedCategory === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {failedAccounts.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white/70 dark:bg-[#111722]/80 border border-gray-200/80 dark:border-[#1E293B]">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No Failed Accounts</h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                    Great discipline! None of your accounts have breached drawdown or challenge loss limits.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 text-xs">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-semibold">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>Failed accounts are permanently preserved in history so you can review mistakes and learn from loss rules.</span>
                    </div>
                    <button
                      onClick={handleOpenConnectModal}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs transition-colors shrink-0 cursor-pointer"
                    >
                      Connect New Account
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {failedAccounts.map(campaign => {
                      return (
                        <Card key={campaign.id} className="border-rose-200 dark:border-rose-900/50 shadow-xs">
                          <CardContent className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-50 dark:bg-rose-950/70 border border-rose-200/60 dark:border-rose-800/60 text-rose-600 dark:text-rose-400">
                                  FAILED • Account closed
                                </span>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1.5">{campaign.name}</h3>
                                <p className="text-xs text-gray-400 font-medium">{campaign.broker} • #{campaign.accountNumber}</p>
                              </div>
                              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-800/60 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-rose-500" />
                              </div>
                            </div>

                            {/* Failure Reason */}
                            <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 space-y-1">
                              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider block">
                                Reason for Failure
                              </span>
                              <p className="text-xs text-rose-800 dark:text-rose-300/90 font-medium leading-relaxed">
                                {campaign.failureReason || `Exceeded maximum drawdown rule limit of $${(campaign.maxDrawdown || 0).toLocaleString()}.`}
                              </p>
                            </div>

                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-gray-400 text-[10px] uppercase font-bold block">Account Size</span>
                                <span className="font-extrabold text-gray-900 dark:text-white">${campaign.accountSize.toLocaleString()}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-gray-400 text-[10px] uppercase font-bold block">Final Balance</span>
                                <span className="font-extrabold text-rose-600 dark:text-rose-400">${campaign.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>

                            {/* Obvious Action: Connect New Account */}
                            <button
                              onClick={handleOpenConnectModal}
                              className="w-full py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Connect New Account</span>
                            </button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>

      <AddCampaignModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
