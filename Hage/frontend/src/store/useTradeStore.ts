import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { isDashboardReadOnly, triggerReadOnlyAlert } from './subscriptionRules';

export const getCurrentUserEmail = (): string => {
  try {
    const email = localStorage.getItem('profile_email') || localStorage.getItem('user_email');
    if (email) return email.toLowerCase().trim();
  } catch (_) {}
  return 'default_user';
};

export const getUserStorageKey = (email?: string): string => {
  const user = (email || getCurrentUserEmail()).replace(/[^a-zA-Z0-9_.-]/g, '_');
  return `hage_trading_storage_${user}`;
};

const userScopedStorage = {
  getItem: (_name: string): string | null => {
    const key = getUserStorageKey();
    return localStorage.getItem(key);
  },
  setItem: (_name: string, value: string): void => {
    const key = getUserStorageKey();
    localStorage.setItem(key, value);
  },
  removeItem: (_name: string): void => {
    const key = getUserStorageKey();
    localStorage.removeItem(key);
  },
};

export interface Trade {
  id: string;
  date: string;
  symbol: string;
  type: 'Buy' | 'Sell';
  lotSize: number;
  entryPrice?: number;
  exitPrice?: number;
  risk: number; // percentage
  rr?: number;
  result: 'Win' | 'Loss' | 'Break Even' | 'Pending';
  pnl: number;
  notes?: string;
  campaignId: string;
  imageUrl?: string;
  session?: 'London' | 'New York' | 'Asia' | 'London / New York Overlap';
}

export interface Campaign {
  id: string;
  name: string;
  broker: string;
  accountSize: number;
  accountNumber: string;
  platform: 'MT4' | 'MT5' | 'cTrader' | 'DXTrade' | 'Match-Trader';
  phase: 'Phase 1' | 'Phase 2' | 'Funded' | 'Real Account';
  status: 'Active' | 'Passed' | 'Failed' | 'Archived';
  startingBalance: number;
  currentBalance: number;
  profitTarget: number; // target amount in dollars
  profitTargetPercent?: number; // target in percent e.g. 8 for 8%
  maxDailyDrawdown: number; // dollar amount
  maxDailyDrawdownPercent?: number; // percent e.g. 5 for 5%
  maxDrawdown: number; // dollar amount
  maxDrawdownPercent?: number; // percent e.g. 10 for 10%
  startDate: string;
  endDate?: string;
  failureReason?: string;
  passedDate?: string;
  failedDate?: string;
  nextPhaseConnected?: boolean;
  parentCampaignId?: string;
}

export interface AccountTransaction {
  id: string;
  campaignId: string;
  type: 'Deposit' | 'Withdrawal';
  amount: number;
  date: string;
  note?: string;
  balanceBefore: number;
  balanceAfter: number;
}

export interface Payout {
  id: string;
  campaignId: string;
  accountName: string;
  accountNumber: string;
  broker: string;
  amount: number;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  balanceBefore: number;
  balanceAfter: number;
  rejectionReason?: string;
  notes?: string;
  proofUrl?: string;
  proofName?: string;
  proofDate?: string;
  hasQrCode?: boolean;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  campaignId?: string;
  mood?: 'Disciplined' | 'Neutral' | 'Excited' | 'Frustrated' | 'Patient';
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface TradeStore {
  trades: Trade[];
  campaigns: Campaign[];
  payouts: Payout[];
  transactions: AccountTransaction[];
  journalEntries: JournalEntry[];
  activeCampaignId: string | null;
  certificateModalCampaign: Campaign | null;
  failedModalCampaign: Campaign | null;
  
  // Actions
  addTrade: (trade: Omit<Trade, 'id' | 'campaignId'>) => void;
  updateTrade: (id: string, trade: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
  
  addCampaign: (campaign: Omit<Campaign, 'id'>) => void;
  updateCampaign: (id: string, campaign: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  setActiveCampaign: (id: string) => void;

  setCertificateModalCampaign: (campaign: Campaign | null) => void;
  setFailedModalCampaign: (campaign: Campaign | null) => void;

  // Real Account Transactions
  addDeposit: (campaignId: string, amount: number, note?: string) => void;
  addWithdrawal: (campaignId: string, amount: number, note?: string) => void;

  // Account Lifecycle & Payout Actions
  advanceCampaign: (id: string, options?: { phase2TargetPercent?: number; phase2TargetAmount?: number }) => { message: string; newPhase: 'Phase 2' | 'Funded' } | null;
  failCampaign: (id: string, reason: string) => void;
  addPayout: (payout: {
    campaignId: string;
    amount: number;
    date?: string;
    notes?: string;
    status?: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
    rejectionReason?: string;
    proofUrl?: string;
    proofName?: string;
    proofDate?: string;
    hasQrCode?: boolean;
  }) => void;
  approvePayout: (id: string) => void;
  rejectPayout: (id: string, reason: string) => void;
  deletePayout: (id: string) => void;

  addJournalEntry: (entry: Omit<JournalEntry, 'id'>) => void;
  updateJournalEntry: (id: string, entry: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
  resetUserStore: () => void;
}

export const useTradeStore = create<TradeStore>()(
  persist(
    (set) => ({
      trades: [],
      campaigns: [],
      payouts: [],
      transactions: [],
      journalEntries: [],
      activeCampaignId: null,
      certificateModalCampaign: null,
      failedModalCampaign: null,

      setCertificateModalCampaign: (campaign) => set({ certificateModalCampaign: campaign }),
      setFailedModalCampaign: (campaign) => set({ failedModalCampaign: campaign }),

      addTrade: (trade) => set((state) => {
        if (isDashboardReadOnly()) {
          triggerReadOnlyAlert('add or log a trade');
          return state;
        }

        let campaignId = state.activeCampaignId || (state.campaigns.length > 0 ? state.campaigns[0].id : null);
        let updatedCampaigns = [...state.campaigns];

        if (!campaignId) {
          const defaultCampaign: Campaign = {
            id: crypto.randomUUID(),
            name: 'Main Account',
            broker: 'Prop Firm',
            accountSize: 100000,
            accountNumber: '1001',
            platform: 'MT5',
            phase: 'Funded',
            status: 'Active',
            startingBalance: 100000,
            currentBalance: 100000 + trade.pnl,
            profitTarget: 8000,
            maxDailyDrawdown: 5000,
            maxDrawdown: 10000,
            startDate: new Date().toISOString()
          };
          campaignId = defaultCampaign.id;
          const newTrade: Trade = { ...trade, id: crypto.randomUUID(), campaignId };
          return {
            trades: [newTrade, ...state.trades],
            campaigns: [defaultCampaign],
            activeCampaignId: campaignId
          };
        }

        const targetCampaign = state.campaigns.find(c => c.id === campaignId);
        if (!targetCampaign) return state;

        // RULE 1 & 11: PASSED AND FAILED ACCOUNTS ARE LOCKED (READ-ONLY)
        if (targetCampaign.status === 'Passed' || targetCampaign.status === 'Failed') {
          console.warn(`Blocked trade: Account ${targetCampaign.name} is ${targetCampaign.status} (Read-only).`);
          return state;
        }

        // RULE 8 & 11: REAL ACCOUNT WITH $0 OR NEGATIVE BALANCE IS PAUSED
        if (targetCampaign.phase === 'Real Account' && targetCampaign.currentBalance <= 0) {
          console.warn(`Blocked trade: Real Account balance is $${targetCampaign.currentBalance}. Trading is paused until deposit.`);
          return state;
        }

        const newTrade: Trade = {
          ...trade,
          id: crypto.randomUUID(),
          campaignId: targetCampaign.id
        };

        const updatedTrades = [newTrade, ...state.trades];
        const newBalance = targetCampaign.currentBalance + trade.pnl;

        // Check if Prop Firm account breaches drawdown rules or reaches Profit Target
        let newStatus: Campaign['status'] = targetCampaign.status;
        let failureReason = targetCampaign.failureReason;
        let failedDate = targetCampaign.failedDate;
        let passedDate = targetCampaign.passedDate;
        let modalPassedCampaign: Campaign | null = null;
        let modalFailedCampaign: Campaign | null = null;

        if (targetCampaign.phase !== 'Real Account' && targetCampaign.status === 'Active') {
          // 1. Max Drawdown breach check
          const maxDdLimit = targetCampaign.maxDrawdown || (targetCampaign.startingBalance * 0.10);
          const currentTotalLoss = targetCampaign.startingBalance - newBalance;
          
          // 2. Daily Drawdown breach check
          const todayPrefix = new Date().toISOString().slice(0, 10);
          const todaysTradesForCampaign = updatedTrades.filter(t => 
            t.campaignId === targetCampaign.id && t.date.includes(todayPrefix)
          );
          const todaysPnl = todaysTradesForCampaign.reduce((sum, t) => sum + t.pnl, 0);
          const dailyDdLimit = targetCampaign.maxDailyDrawdown || (targetCampaign.startingBalance * 0.05);

          // 3. Challenge Profit Target reached check (Phase 1 & Phase 2)
          const isChallenge = targetCampaign.phase === 'Phase 1' || targetCampaign.phase === 'Phase 2';
          const targetRequired = targetCampaign.profitTarget || (targetCampaign.startingBalance * ((targetCampaign.profitTargetPercent || 8) / 100));
          const currentTotalProfit = newBalance - targetCampaign.startingBalance;

          if (currentTotalLoss >= maxDdLimit) {
            newStatus = 'Failed';
            failureReason = `Exceeded maximum drawdown rule limit of $${maxDdLimit.toLocaleString()}. (Loss: -$${currentTotalLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })})`;
            failedDate = new Date().toISOString();
            modalFailedCampaign = {
              ...targetCampaign,
              currentBalance: newBalance,
              status: 'Failed',
              failureReason,
              failedDate
            };
          } else if (-todaysPnl >= dailyDdLimit) {
            newStatus = 'Failed';
            failureReason = `Exceeded daily drawdown rule limit of $${dailyDdLimit.toLocaleString()}. (Daily loss: -$${Math.abs(todaysPnl).toLocaleString(undefined, { minimumFractionDigits: 2 })})`;
            failedDate = new Date().toISOString();
            modalFailedCampaign = {
              ...targetCampaign,
              currentBalance: newBalance,
              status: 'Failed',
              failureReason,
              failedDate
            };
          } else if (isChallenge && targetRequired > 0 && currentTotalProfit >= targetRequired) {
            // IMMEDIATELY:
            // 1. Mark account as PASSED.
            // 2. Lock the account.
            // 3. Move it to PASSED ACCOUNTS.
            // 4. Make it read-only.
            // 5. Stop all further trading activity on that account.
            newStatus = 'Passed';
            passedDate = new Date().toISOString();
            modalPassedCampaign = {
              ...targetCampaign,
              currentBalance: newBalance,
              status: 'Passed',
              passedDate
            };
          }
        }

        updatedCampaigns = state.campaigns.map(c => {
          if (c.id === targetCampaign.id) {
            return {
              ...c,
              currentBalance: newBalance,
              status: newStatus,
              failureReason,
              failedDate,
              passedDate
            };
          }
          return c;
        });

        return { 
          trades: updatedTrades, 
          campaigns: updatedCampaigns,
          activeCampaignId: state.activeCampaignId || campaignId,
          certificateModalCampaign: modalPassedCampaign || state.certificateModalCampaign,
          failedModalCampaign: modalFailedCampaign || state.failedModalCampaign
        };
      }),

      updateTrade: (id, updatedFields) => set((state) => {
        if (isDashboardReadOnly()) {
          triggerReadOnlyAlert('edit a trade');
          return state;
        }

        const tradeToUpdate = state.trades.find(t => t.id === id);
        if (!tradeToUpdate) return state;

        const campaign = state.campaigns.find(c => c.id === tradeToUpdate.campaignId);
        // LOCKED FOR PASSED / FAILED ACCOUNTS
        if (campaign && (campaign.status === 'Passed' || campaign.status === 'Failed')) {
          console.warn(`Cannot update trade: Account ${campaign.name} is ${campaign.status} (Read-only).`);
          return state;
        }

        let pnlDiff = 0;
        if (updatedFields.pnl !== undefined) {
          pnlDiff = updatedFields.pnl - tradeToUpdate.pnl;
        }

        const updatedTrades = state.trades.map(t => t.id === id ? { ...t, ...updatedFields } : t);
        let newStatus: Campaign['status'] = campaign ? campaign.status : 'Active';
        let passedDate = campaign ? campaign.passedDate : undefined;
        let failureReason = campaign ? campaign.failureReason : undefined;
        let failedDate = campaign ? campaign.failedDate : undefined;
        let modalPassedCampaign: Campaign | null = null;
        let modalFailedCampaign: Campaign | null = null;

        const newBalance = campaign ? campaign.currentBalance + pnlDiff : 0;

        if (campaign && campaign.phase !== 'Real Account' && campaign.status === 'Active') {
          const isChallenge = campaign.phase === 'Phase 1' || campaign.phase === 'Phase 2';
          const targetRequired = campaign.profitTarget || (campaign.startingBalance * ((campaign.profitTargetPercent || 8) / 100));
          const currentTotalProfit = newBalance - campaign.startingBalance;
          const maxDdLimit = campaign.maxDrawdown || (campaign.startingBalance * 0.10);
          const currentTotalLoss = campaign.startingBalance - newBalance;

          if (currentTotalLoss >= maxDdLimit) {
            newStatus = 'Failed';
            failureReason = `Exceeded maximum drawdown rule limit of $${maxDdLimit.toLocaleString()}.`;
            failedDate = new Date().toISOString();
            modalFailedCampaign = {
              ...campaign,
              currentBalance: newBalance,
              status: 'Failed',
              failureReason,
              failedDate
            };
          } else if (isChallenge && targetRequired > 0 && currentTotalProfit >= targetRequired) {
            newStatus = 'Passed';
            passedDate = new Date().toISOString();
            modalPassedCampaign = {
              ...campaign,
              currentBalance: newBalance,
              status: 'Passed',
              passedDate
            };
          }
        }

        const updatedCampaigns = state.campaigns.map(c => {
          if (c.id === tradeToUpdate.campaignId) {
            return { 
              ...c, 
              currentBalance: newBalance,
              status: newStatus,
              failureReason,
              failedDate,
              passedDate
            };
          }
          return c;
        });

        return { 
          trades: updatedTrades, 
          campaigns: updatedCampaigns,
          certificateModalCampaign: modalPassedCampaign || state.certificateModalCampaign,
          failedModalCampaign: modalFailedCampaign || state.failedModalCampaign
        };
      }),

      deleteTrade: (id) => set((state) => {
        if (isDashboardReadOnly()) {
          triggerReadOnlyAlert('delete a trade');
          return state;
        }

        const tradeToDelete = state.trades.find(t => t.id === id);
        if (!tradeToDelete) return state;

        const campaign = state.campaigns.find(c => c.id === tradeToDelete.campaignId);
        // LOCKED FOR PASSED / FAILED ACCOUNTS
        if (campaign && (campaign.status === 'Passed' || campaign.status === 'Failed')) {
          console.warn(`Cannot delete trade: Account ${campaign.name} is ${campaign.status} (Read-only).`);
          return state;
        }

        const updatedCampaigns = state.campaigns.map(c => {
          if (c.id === tradeToDelete.campaignId) {
            return { ...c, currentBalance: c.currentBalance - tradeToDelete.pnl };
          }
          return c;
        });

        return {
          trades: state.trades.filter(t => t.id !== id),
          campaigns: updatedCampaigns
        };
      }),

      addDeposit: (campaignId, amount, note) => set((state) => {
        if (isDashboardReadOnly()) {
          triggerReadOnlyAlert('make an account deposit');
          return state;
        }

        const campaign = state.campaigns.find(c => c.id === campaignId);
        if (!campaign || amount <= 0 || campaign.status === 'Passed' || campaign.status === 'Failed') return state;

        const balanceBefore = campaign.currentBalance;
        const balanceAfter = balanceBefore + amount;

        const transaction: AccountTransaction = {
          id: crypto.randomUUID(),
          campaignId,
          type: 'Deposit',
          amount,
          date: new Date().toISOString(),
          note: note || 'Account Deposit',
          balanceBefore,
          balanceAfter
        };

        const updatedCampaigns = state.campaigns.map(c => {
          if (c.id === campaignId) {
            return { ...c, currentBalance: balanceAfter };
          }
          return c;
        });

        return {
          transactions: [transaction, ...(state.transactions || [])],
          campaigns: updatedCampaigns
        };
      }),

      addWithdrawal: (campaignId, amount, note) => set((state) => {
        if (isDashboardReadOnly()) {
          triggerReadOnlyAlert('make an account withdrawal');
          return state;
        }

        const campaign = state.campaigns.find(c => c.id === campaignId);
        if (!campaign || amount <= 0 || campaign.currentBalance < amount || campaign.status === 'Passed' || campaign.status === 'Failed') return state;

        const balanceBefore = campaign.currentBalance;
        const balanceAfter = balanceBefore - amount;

        const transaction: AccountTransaction = {
          id: crypto.randomUUID(),
          campaignId,
          type: 'Withdrawal',
          amount,
          date: new Date().toISOString(),
          note: note || 'Account Withdrawal',
          balanceBefore,
          balanceAfter
        };

        const updatedCampaigns = state.campaigns.map(c => {
          if (c.id === campaignId) {
            return { ...c, currentBalance: balanceAfter };
          }
          return c;
        });

        return {
          transactions: [transaction, ...(state.transactions || [])],
          campaigns: updatedCampaigns
        };
      }),

      addCampaign: (campaign) => set((state) => {
        if (isDashboardReadOnly()) {
          triggerReadOnlyAlert('connect or create a new account');
          return state;
        }

        const newCampaign: Campaign = {
          ...campaign,
          id: crypto.randomUUID()
        };
        return { 
          campaigns: [...state.campaigns, newCampaign],
          activeCampaignId: newCampaign.id // newly connected account becomes the active account
        };
      }),

      updateCampaign: (id, updatedFields) => set((state) => {
        if (isDashboardReadOnly()) {
          triggerReadOnlyAlert('modify account settings');
          return state;
        }
        return {
          campaigns: state.campaigns.map(c => c.id === id ? { ...c, ...updatedFields } : c)
        };
      }),

      deleteCampaign: (id) => set((state) => {
        if (isDashboardReadOnly()) {
          triggerReadOnlyAlert('delete an account');
          return state;
        }
        return {
          campaigns: state.campaigns.filter(c => c.id !== id),
          trades: state.trades.filter(t => t.campaignId !== id),
          activeCampaignId: state.activeCampaignId === id 
            ? (state.campaigns.find(c => c.id !== id)?.id || null)
            : state.activeCampaignId
        };
      }),

      setActiveCampaign: (id) => set({ activeCampaignId: id }),

      advanceCampaign: (id, options) => {
        if (isDashboardReadOnly()) {
          triggerReadOnlyAlert('advance or connect a challenge phase');
          return null;
        }
        let result: { message: string; newPhase: 'Phase 2' | 'Funded' } | null = null;
        set((state) => {
          const target = state.campaigns.find(c => c.id === id);
          if (!target) return state;

          if (target.phase === 'Phase 1') {
            // 1. Mark Phase 1 as PASSED and archive it to PASSED ACCOUNTS (preserving its trades and history)
            const passedPhase1: Campaign = {
              ...target,
              status: 'Passed',
              passedDate: new Date().toISOString(),
              nextPhaseConnected: true
            };

            // 2. User-selected Phase 2 Profit Target % (defaults to 5% if not provided)
            const phase2TargetPct = options?.phase2TargetPercent ?? 5;
            const phase2TargetDollar = options?.phase2TargetAmount ?? Math.round(target.accountSize * (phase2TargetPct / 100));

            // 3. New Phase 2 account starts from the ORIGINAL account size (e.g. $10,000, NOT $10,800!)
            const cleanBaseName = target.name.replace(/ \((Phase \d|Funded|Passed)\)/gi, '');
            const newPhase2Account: Campaign = {
              id: crypto.randomUUID(),
              name: `${cleanBaseName} (Phase 2)`,
              broker: target.broker,
              accountSize: target.accountSize,
              accountNumber: target.accountNumber,
              platform: target.platform,
              phase: 'Phase 2',
              status: 'Active',
              startingBalance: target.accountSize, // ORIGINAL account size ($10,000)
              currentBalance: target.accountSize,  // Starts fresh at $10,000
              profitTarget: phase2TargetDollar,
              profitTargetPercent: phase2TargetPct,
              maxDailyDrawdown: target.maxDailyDrawdown,
              maxDailyDrawdownPercent: target.maxDailyDrawdownPercent || 5,
              maxDrawdown: target.maxDrawdown,
              maxDrawdownPercent: target.maxDrawdownPercent || 10,
              startDate: new Date().toISOString(),
              parentCampaignId: target.id
            };

            const updatedCampaigns = state.campaigns.map(c => c.id === id ? passedPhase1 : c);
            updatedCampaigns.unshift(newPhase2Account);

            result = {
              message: 'Congratulations! You reached your Profit Target.',
              newPhase: 'Phase 2'
            };

            return {
              campaigns: updatedCampaigns,
              activeCampaignId: newPhase2Account.id
            };
          } else if (target.phase === 'Phase 2') {
            // 1. Mark Phase 2 as PASSED and archive to PASSED ACCOUNTS (preserving its trades and history)
            const passedPhase2: Campaign = {
              ...target,
              status: 'Passed',
              passedDate: new Date().toISOString(),
              nextPhaseConnected: true
            };

            // 2. New Funded account starts from the ORIGINAL account size (e.g. $10,000, NOT $10,500!)
            const cleanBaseName = target.name.replace(/ \((Phase \d|Funded|Passed)\)/gi, '');
            const newFundedAccount: Campaign = {
              id: crypto.randomUUID(),
              name: `${cleanBaseName} (Funded)`,
              broker: target.broker,
              accountSize: target.accountSize,
              accountNumber: target.accountNumber,
              platform: target.platform,
              phase: 'Funded',
              status: 'Active',
              startingBalance: target.accountSize, // ORIGINAL account size ($10,000)
              currentBalance: target.accountSize,  // Starts fresh at $10,000
              profitTarget: 0,
              profitTargetPercent: 0,
              maxDailyDrawdown: target.maxDailyDrawdown,
              maxDailyDrawdownPercent: target.maxDailyDrawdownPercent || 5,
              maxDrawdown: target.maxDrawdown,
              maxDrawdownPercent: target.maxDrawdownPercent || 10,
              startDate: new Date().toISOString(),
              parentCampaignId: target.id
            };

            const updatedCampaigns = state.campaigns.map(c => c.id === id ? passedPhase2 : c);
            updatedCampaigns.unshift(newFundedAccount);

            result = {
              message: 'Congratulations! You passed the challenge and are now Funded.',
              newPhase: 'Funded'
            };

            return {
              campaigns: updatedCampaigns,
              activeCampaignId: newFundedAccount.id
            };
          }

          return state;
        });
        return result;
      },

      failCampaign: (id, reason) => set((state) => {
        const updatedCampaigns = state.campaigns.map(c => {
          if (c.id === id) {
            return {
              ...c,
              status: 'Failed' as const,
              failureReason: reason,
              failedDate: new Date().toISOString()
            };
          }
          return c;
        });

        let newActiveId = state.activeCampaignId;
        if (state.activeCampaignId === id) {
          const nextActive = updatedCampaigns.find(c => c.id !== id && c.status === 'Active');
          newActiveId = nextActive ? nextActive.id : id;
        }

        return {
          campaigns: updatedCampaigns,
          activeCampaignId: newActiveId
        };
      }),

      addPayout: (payoutData) => set((state) => {
        if (isDashboardReadOnly()) {
          triggerReadOnlyAlert('request a payout');
          return state;
        }

        const campaign = state.campaigns.find(c => c.id === payoutData.campaignId);
        if (!campaign) return state;

        const payoutStatus = payoutData.status || 'Pending';
        const isApproved = payoutStatus === 'Approved' || payoutStatus === 'Completed';

        const balanceBefore = campaign.currentBalance;
        // ONLY deduct when payout status is Approved or Completed!
        const balanceAfter = isApproved ? balanceBefore - payoutData.amount : balanceBefore;

        const newPayout: Payout = {
          id: crypto.randomUUID(),
          campaignId: campaign.id,
          accountName: campaign.name,
          accountNumber: campaign.accountNumber || '1001',
          broker: campaign.broker || 'Prop Firm',
          amount: payoutData.amount,
          date: payoutData.date || new Date().toISOString(),
          status: payoutStatus,
          balanceBefore,
          balanceAfter,
          rejectionReason: payoutData.rejectionReason,
          notes: payoutData.notes || '',
          proofUrl: payoutData.proofUrl,
          proofName: payoutData.proofName,
          proofDate: payoutData.proofDate,
          hasQrCode: payoutData.hasQrCode
        };

        const updatedCampaigns = isApproved
          ? state.campaigns.map(c => c.id === campaign.id ? { ...c, currentBalance: balanceAfter } : c)
          : state.campaigns;

        return {
          payouts: [newPayout, ...(state.payouts || [])],
          campaigns: updatedCampaigns
        };
      }),

      approvePayout: (id) => set((state) => {
        const payout = (state.payouts || []).find(p => p.id === id);
        if (!payout || payout.status === 'Approved' || payout.status === 'Completed') return state;

        const campaign = state.campaigns.find(c => c.id === payout.campaignId);
        const currentBal = campaign ? campaign.currentBalance : payout.balanceBefore;
        const newBal = currentBal - payout.amount;

        const updatedPayouts = state.payouts.map(p => {
          if (p.id === id) {
            return {
              ...p,
              status: 'Approved' as const,
              balanceBefore: currentBal,
              balanceAfter: newBal,
              rejectionReason: undefined
            };
          }
          return p;
        });

        const updatedCampaigns = campaign
          ? state.campaigns.map(c => c.id === campaign.id ? { ...c, currentBalance: newBal } : c)
          : state.campaigns;

        return {
          payouts: updatedPayouts,
          campaigns: updatedCampaigns
        };
      }),

      rejectPayout: (id, reason) => set((state) => {
        const payout = (state.payouts || []).find(p => p.id === id);
        if (!payout) return state;

        const wasApproved = payout.status === 'Approved' || payout.status === 'Completed';
        const campaign = state.campaigns.find(c => c.id === payout.campaignId);

        // If it was previously approved and deducted, restore the money
        const currentBal = campaign ? campaign.currentBalance : payout.balanceAfter;
        const restoredBal = wasApproved ? currentBal + payout.amount : currentBal;

        const updatedPayouts = state.payouts.map(p => {
          if (p.id === id) {
            return {
              ...p,
              status: 'Rejected' as const,
              rejectionReason: reason || 'Requirements not met.',
              balanceAfter: p.balanceBefore
            };
          }
          return p;
        });

        const updatedCampaigns = wasApproved && campaign
          ? state.campaigns.map(c => c.id === campaign.id ? { ...c, currentBalance: restoredBal } : c)
          : state.campaigns;

        return {
          payouts: updatedPayouts,
          campaigns: updatedCampaigns
        };
      }),

      deletePayout: (id) => set((state) => {
        if (isDashboardReadOnly()) {
          triggerReadOnlyAlert('delete a payout');
          return state;
        }

        const payout = (state.payouts || []).find(p => p.id === id);
        if (!payout) return state;

        const wasApproved = payout.status === 'Approved' || payout.status === 'Completed';
        const campaign = state.campaigns.find(c => c.id === payout.campaignId);

        // If it was approved, restore the deducted balance
        const updatedCampaigns = wasApproved && campaign
          ? state.campaigns.map(c => c.id === campaign.id ? { ...c, currentBalance: c.currentBalance + payout.amount } : c)
          : state.campaigns;

        return {
          payouts: (state.payouts || []).filter(p => p.id !== id),
          campaigns: updatedCampaigns
        };
      }),

      addJournalEntry: (entry) => set((state) => {
        if (isDashboardReadOnly()) {
          triggerReadOnlyAlert('create a journal log');
          return state;
        }

        let campaignId = entry.campaignId || state.activeCampaignId || (state.campaigns.length > 0 ? state.campaigns[0].id : undefined);

        const newEntry: JournalEntry = {
          ...entry,
          id: crypto.randomUUID(),
          campaignId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        return { 
          journalEntries: [newEntry, ...(state.journalEntries || [])]
        };
      }),

      updateJournalEntry: (id, updatedFields) => set((state) => {
        if (isDashboardReadOnly()) {
          triggerReadOnlyAlert('update a journal log');
          return state;
        }

        return {
          journalEntries: (state.journalEntries || []).map(e => e.id === id ? { 
            ...e, 
            ...updatedFields, 
            updatedAt: new Date().toISOString() 
          } : e)
        };
      }),

      deleteJournalEntry: (id) => set((state) => {
        if (isDashboardReadOnly()) {
          triggerReadOnlyAlert('delete a journal log');
          return state;
        }

        return {
          journalEntries: (state.journalEntries || []).filter(e => e.id !== id)
        };
      }),

      resetUserStore: () => set({
        trades: [],
        campaigns: [],
        payouts: [],
        transactions: [],
        journalEntries: [],
        activeCampaignId: null,
        certificateModalCampaign: null,
        failedModalCampaign: null,
      }),
    }),
    {
      name: 'hage-trading-storage',
      storage: createJSONStorage(() => userScopedStorage),
    }
  )
);

export const switchActiveUser = (email?: string) => {
  const targetEmail = (email || localStorage.getItem('profile_email') || '').toLowerCase().trim();
  if (!targetEmail) {
    useTradeStore.setState({
      trades: [],
      campaigns: [],
      payouts: [],
      transactions: [],
      journalEntries: [],
      activeCampaignId: null,
      certificateModalCampaign: null,
      failedModalCampaign: null,
    });
    return;
  }

  const storageKey = getUserStorageKey(targetEmail);
  const raw = localStorage.getItem(storageKey);

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const state = parsed.state || parsed;
      useTradeStore.setState({
        trades: state.trades || [],
        campaigns: state.campaigns || [],
        payouts: state.payouts || [],
        transactions: state.transactions || [],
        journalEntries: state.journalEntries || [],
        activeCampaignId: state.activeCampaignId || (state.campaigns?.[0]?.id || null),
        certificateModalCampaign: null,
        failedModalCampaign: null,
      });
      return;
    } catch (e) {
      console.error('Error switching user trade store:', e);
    }
  }

  // Brand-new empty state for this user
  useTradeStore.setState({
    trades: [],
    campaigns: [],
    payouts: [],
    transactions: [],
    journalEntries: [],
    activeCampaignId: null,
    certificateModalCampaign: null,
    failedModalCampaign: null,
  });
};
