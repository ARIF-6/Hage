import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '../dashboard/Sidebar';
import { TopHeader } from '../dashboard/TopHeader';
import { CongratulationsCertificateModal } from '../dashboard/CongratulationsCertificateModal';
import { AccountFailedModal } from '../dashboard/AccountFailedModal';
import { AddCampaignModal } from '../ui/AddCampaignModal';
import { AiLiveChatWidget } from '../chat/AiLiveChatWidget';
import { SubscriptionExpiredModal } from '../dashboard/SubscriptionExpiredModal';
import { useTradeStore, type Campaign } from '../../store/useTradeStore';
import {
  getSubscriptionStatus,
  triggerReadOnlyAlert,
  setSubscriptionExpired,
  hasUserPurchasedPlan,
  type SubscriptionStatusInfo
} from '../../store/subscriptionRules';
import { Lock, Sparkles, ArrowRight, AlertTriangle, RotateCcw } from 'lucide-react';

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    certificateModalCampaign, 
    setCertificateModalCampaign, 
    failedModalCampaign, 
    setFailedModalCampaign,
    updateCampaign
  } = useTradeStore();
  const [subStatus, setSubStatus] = useState<SubscriptionStatusInfo>(() => getSubscriptionStatus());
  const [isConnectNewOpen, setIsConnectNewOpen] = useState(false);
  const [connectInitialConfig, setConnectInitialConfig] = useState<{
    phase?: 'Phase 1' | 'Phase 2' | 'Funded';
    propFirm?: string;
    accountSize?: number;
    platform?: Campaign['platform'];
    name?: string;
    category?: 'prop_firm' | 'real';
    sourceCampaignId?: string;
  } | null>(null);

  useEffect(() => {
    const userRole = localStorage.getItem('user_role') || '';
    if (userRole !== 'admin' && !hasUserPurchasedPlan()) {
      if (location.pathname !== '/dashboard/subscription' && location.pathname !== '/dashboard/support') {
        navigate('/dashboard/subscription?purchase_required=true', { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handleSubChange = () => {
      setSubStatus(getSubscriptionStatus());
    };
    window.addEventListener('subscriptionStatusChanged', handleSubChange);
    window.addEventListener('planUpdated', handleSubChange);
    window.addEventListener('storage', handleSubChange);
    return () => {
      window.removeEventListener('subscriptionStatusChanged', handleSubChange);
      window.removeEventListener('planUpdated', handleSubChange);
      window.removeEventListener('storage', handleSubChange);
    };
  }, []);

  const handleConnectPhase2 = (passedCampaign: Campaign) => {
    if (triggerReadOnlyAlert('connect a Phase 2 account')) return;
    if (passedCampaign.nextPhaseConnected) {
      alert('This certificate has already been used to connect an account.');
      return;
    }
    // Mark as connected immediately to avoid duplicate clicks
    updateCampaign(passedCampaign.id, { nextPhaseConnected: true });
    setCertificateModalCampaign(null);
    setConnectInitialConfig({
      phase: 'Phase 2',
      propFirm: passedCampaign.broker,
      accountSize: passedCampaign.accountSize,
      platform: passedCampaign.platform,
      name: passedCampaign.name ? `${passedCampaign.name.replace(/ \((Phase \d|Funded|Passed)\)/gi, '').trim()} (Phase 2)` : undefined,
      category: 'prop_firm',
      sourceCampaignId: passedCampaign.id
    });
    setIsConnectNewOpen(true);
  };

  const handleConnectFunded = (passedCampaign: Campaign) => {
    if (triggerReadOnlyAlert('connect a Funded account')) return;
    if (passedCampaign.nextPhaseConnected) {
      alert('This certificate has already been used to connect an account.');
      return;
    }
    // Mark as connected immediately to avoid duplicate clicks
    updateCampaign(passedCampaign.id, { nextPhaseConnected: true });
    setCertificateModalCampaign(null);
    setConnectInitialConfig({
      phase: 'Funded',
      propFirm: passedCampaign.broker,
      accountSize: passedCampaign.accountSize,
      platform: passedCampaign.platform,
      name: passedCampaign.name ? `${passedCampaign.name.replace(/ \((Phase \d|Funded|Passed)\)/gi, '').trim()} (Funded)` : undefined,
      category: 'prop_firm',
      sourceCampaignId: passedCampaign.id
    });
    setIsConnectNewOpen(true);
  };

  const handleConnectNewFromFailed = () => {
    if (triggerReadOnlyAlert('connect a new trading account')) return;
    setConnectInitialConfig(null);
    setIsConnectNewOpen(true);
  };

  return (
    <div className="h-screen bg-[#F4F6F9] dark:bg-[#0B0E14] text-gray-900 dark:text-slate-100 flex flex-col font-sans overflow-hidden transition-colors duration-200">
      <TopHeader />

      {/* Subscription Expired / Read-Only Mode Banner */}
      {subStatus.isReadOnly && (
        <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Lock className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <p className="text-gray-900 dark:text-slate-200 truncate">
              <strong className="text-amber-600 dark:text-amber-400 font-bold">Subscription Expired:</strong> Your {subStatus.planName || '1-month'} subscription has ended. Dashboard is now in <span className="underline decoration-amber-500/60 font-black">Read-Only Mode</span>. Modifying data and adding trades are locked.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NavLink
              to="/dashboard/subscription"
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-[11px] shadow-sm shadow-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-slate-950" />
              <span>Renew Subscription</span>
              <ArrowRight className="w-3 h-3" />
            </NavLink>
          </div>
        </div>
      )}

      {/* Subscription Required to Unlock Dashboard (New Registered Users) */}
      {!hasUserPurchasedPlan() && localStorage.getItem('user_role') !== 'admin' && (
        <div className="bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-purple-600/15 border-b border-indigo-500/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <p className="text-gray-900 dark:text-slate-200 truncate">
              <strong className="text-indigo-600 dark:text-indigo-400 font-bold">Plan Purchase Required:</strong> Welcome! Please choose and purchase a subscription plan below to unlock your evaluation dashboard.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NavLink
              to="/dashboard/subscription"
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-[11px] shadow-sm shadow-indigo-500/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-white" />
              <span>Choose Plan</span>
              <ArrowRight className="w-3 h-3" />
            </NavLink>
          </div>
        </div>
      )}

      <div className="flex-1 flex min-w-0 overflow-hidden">
        {(hasUserPurchasedPlan() || localStorage.getItem('user_role') === 'admin') && <Sidebar />}
        <main className={`flex-1 min-w-0 overflow-y-auto custom-scrollbar pb-20 lg:pb-6 ${(hasUserPurchasedPlan() || localStorage.getItem('user_role') === 'admin') ? 'p-3 sm:p-5 lg:p-6' : 'p-4 sm:p-6 lg:p-8 w-full'}`}>
          <Outlet />
        </main>
      </div>

      {/* Global Modals for Passed & Failed Account Workflows */}
      <CongratulationsCertificateModal
        isOpen={Boolean(certificateModalCampaign)}
        campaign={certificateModalCampaign}
        onClose={() => setCertificateModalCampaign(null)}
        onConnectPhase2={handleConnectPhase2}
        onConnectFunded={handleConnectFunded}
      />

      <AccountFailedModal
        isOpen={Boolean(failedModalCampaign)}
        campaign={failedModalCampaign}
        onClose={() => setFailedModalCampaign(null)}
        onConnectNew={handleConnectNewFromFailed}
      />

      <AddCampaignModal
        isOpen={isConnectNewOpen}
        onClose={() => {
          setIsConnectNewOpen(false);
          setConnectInitialConfig(null);
        }}
        initialPhase={connectInitialConfig?.phase}
        initialPropFirm={connectInitialConfig?.propFirm}
        initialAccountSize={connectInitialConfig?.accountSize}
        initialPlatform={connectInitialConfig?.platform}
        initialName={connectInitialConfig?.name}
        initialCategory={connectInitialConfig?.category}
        sourceCampaignId={connectInitialConfig?.sourceCampaignId}
      />

      {/* Subscription Expired Read-Only Warning Modal */}
      <SubscriptionExpiredModal />

      {/* 24/7 AI Live Chat Support Widget */}
      <AiLiveChatWidget />
    </div>
  );
}
