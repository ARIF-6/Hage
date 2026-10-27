import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  };
};

export interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalAccounts: number;
  activeAccounts: number;
  passedAccounts: number;
  failedAccounts: number;
  fundedAccounts: number;
  realAccounts: number;
  totalTrades: number;
  totalPayoutRecords: number;
  totalPaidOut: number;
  freeUsers: number;
  proUsers: number;
  premiumUsers: number;
}

export interface ActivityItem {
  id: string;
  user?: string;
  email?: string;
  name?: string;
  account?: string;
  title?: string;
  amount?: number;
  action?: string;
  status?: string;
  broker?: string;
  phase?: string;
  currentBalance?: number;
  date: string;
}

export interface OverviewData {
  metrics: AdminMetrics;
  recentUserActivity: ActivityItem[];
  recentAccountActivity: ActivityItem[];
  recentPayoutActivity: ActivityItem[];
  recentSystemIssues: ActivityItem[];
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  isSuspended: boolean;
  accountsCount: number;
  tradesCount: number;
  subscriptionPlan: 'Free' | 'Pro' | 'Premium' | string;
  subscriptionStatus: 'Active' | 'Expired' | 'Pending';
  totalPaidOut: number;
  createdAt: string;
  lastLogin?: string;
}

export interface AdminAccount {
  _id: string;
  user: string;
  userName?: string;
  userEmail?: string;
  name: string;
  accountType: 'Prop Firm' | 'Real Account';
  broker: string;
  accountNumber?: string;
  platform?: string;
  phase: 'Phase 1' | 'Phase 2' | 'Funded' | 'Real Account';
  status: 'Active' | 'Passed' | 'Failed' | 'Closed';
  initialBalance: number;
  currentBalance: number;
  profitTarget?: number;
  profitTargetPercent?: number;
  maxDailyDrawdown?: number;
  maxDrawdown?: number;
  failureReason?: string;
  passedDate?: string;
  failedDate?: string;
  tradesCount?: number;
  netPnl: number;
  pnlPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupportIssue {
  _id: string;
  user: string;
  userName?: string;
  userEmail?: string;
  title: string;
  description: string;
  date: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  adminNotes?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface SystemErrorItem {
  _id: string;
  errorType: 'Database' | 'API' | 'Application' | 'Authentication' | 'Account Operation' | 'General';
  description: string;
  date: string;
  relatedUser?: string;
  status: 'Unresolved' | 'Investigating' | 'Resolved';
  endpoint?: string;
  statusCode?: number;
  adminNotes?: string;
}

export interface SubscriptionItem {
  _id: string;
  user: string;
  userName?: string;
  userEmail?: string;
  plan: 'Free' | 'Pro' | 'Premium';
  status: 'Active' | 'Expired' | 'Pending';
  paymentMethod?: string;
  startDate: string;
  endDate?: string;
}

export interface PayoutRecord {
  _id: string;
  user: string;
  account: string;
  userName?: string;
  userEmail?: string;
  accountName: string;
  accountNumber?: string;
  broker?: string;
  amount: number;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  balanceBefore: number;
  balanceAfter: number;
  rejectionReason?: string;
  notes?: string;
  proofUrl?: string;
  proofName?: string;
}

export interface AdminActivityLog {
  _id: string;
  admin: string;
  adminName: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: string;
  date: string;
}

export interface AdminReportsData {
  userStats: { totalUsers: number; activeUsers: number; suspendedUsers: number; verifiedUsers: number };
  accountStats: { totalAccounts: number; activeAccounts: number; passedAccounts: number; failedAccounts: number; fundedAccounts: number; realAccounts: number; passRate: string };
  tradeStats: { totalTrades: number; winningTrades: number; losingTrades: number; winRate: string; totalProfit: number; totalLoss: number; profitFactor: string };
  subscriptionStats: { freeCount: number; proCount: number; premiumCount: number };
  payoutStats: { totalPayouts: number; totalPaidOut: number; avgPayout: number; approvedCount: number };
}

// Local fallback store using REAL HAGE data only (no mock records, fake users or fabricated stats)
const getLocalFallbackStore = () => {
  const stored = localStorage.getItem('hage_admin_db');
  let baseStore: any = null;
  if (stored) {
    try { 
      baseStore = JSON.parse(stored);
      const virtualEmails = ['admin@hage.com', 'trader@hage.com', 'sarah.j@fxpro.io', 'david.m@riskfund.org'];
      if (baseStore?.users) {
        baseStore.users = baseStore.users.filter((u: any) => !virtualEmails.includes(u.email?.toLowerCase()));
      }
      if (baseStore?.accounts) {
        baseStore.accounts = baseStore.accounts.filter((a: any) => !['acc_001', 'acc_002', 'acc_003', 'acc_004', 'acc_005', 'acc_006'].includes(a._id));
      }
      if (baseStore?.payouts) {
        baseStore.payouts = baseStore.payouts.filter((p: any) => !virtualEmails.includes(p.userEmail?.toLowerCase()));
      }
    } catch (e) {}
  }

  // Load real trading data from HAGE's actual trading store
  let realCampaigns: any[] = [];
  let realTrades: any[] = [];
  let realPayouts: any[] = [];

  // Load real trading data from any HAGE trading store keys in localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('hage_trading_storage_') || k === 'hage-trading-storage')) {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.state) {
            if (Array.isArray(parsed.state.campaigns)) {
              for (const c of parsed.state.campaigns) {
                if (!realCampaigns.some(existing => existing.id === c.id)) {
                  realCampaigns.push(c);
                }
              }
            }
            if (Array.isArray(parsed.state.trades)) {
              for (const t of parsed.state.trades) {
                if (!realTrades.some(existing => existing.id === t.id)) {
                  realTrades.push(t);
                }
              }
            }
            if (Array.isArray(parsed.state.payouts)) {
              for (const p of parsed.state.payouts) {
                if (!realPayouts.some(existing => existing.id === p.id)) {
                  realPayouts.push(p);
                }
              }
            }
          }
        }
      } catch (e) {}
    }
  }

  // Load real registered users
  let realUsers: any[] = [];
  const registeredUsersRaw = localStorage.getItem('hage_registered_users');
  if (registeredUsersRaw) {
    try { realUsers = JSON.parse(registeredUsersRaw); } catch (e) {}
  }

  // Ensure current user profile is registered in real users list
  const currentEmail = localStorage.getItem('profile_email');
  const currentFirstName = localStorage.getItem('profile_firstName') || 'User';
  const currentLastName = localStorage.getItem('profile_lastName') || '';
  const currentRole = (localStorage.getItem('user_role') || 'user') as 'admin' | 'user';
  if (currentEmail && !realUsers.some(u => u.email?.toLowerCase() === currentEmail.toLowerCase())) {
    realUsers.push({
      _id: 'usr_' + Date.now(),
      name: `${currentFirstName} ${currentLastName}`.trim(),
      email: currentEmail,
      role: currentRole,
      isVerified: true,
      isSuspended: false,
      accountsCount: realCampaigns.length,
      tradesCount: realTrades.length,
      subscriptionPlan: 'Free',
      subscriptionStatus: 'Active',
      totalPaidOut: realPayouts.filter(p => p.status === 'Approved' || p.status === 'Completed').reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      createdAt: new Date().toISOString()
    });
  }

  // Convert real campaigns into AdminAccount shape
  const realAccounts = realCampaigns.map(c => ({
    _id: c.id,
    user: currentEmail || 'current_user',
    userName: `${currentFirstName} ${currentLastName}`.trim() || 'Trader',
    userEmail: currentEmail || '',
    name: c.name,
    accountType: c.phase === 'Real Account' ? 'Real Account' : 'Prop Firm',
    broker: c.broker,
    accountNumber: c.accountNumber,
    platform: c.platform,
    phase: c.phase,
    status: c.status,
    initialBalance: c.startingBalance || c.accountSize || 0,
    currentBalance: c.currentBalance || 0,
    profitTarget: c.profitTarget,
    profitTargetPercent: c.profitTargetPercent,
    maxDailyDrawdown: c.maxDailyDrawdown,
    maxDrawdown: c.maxDrawdown,
    failureReason: c.failureReason,
    passedDate: c.passedDate,
    failedDate: c.failedDate,
    tradesCount: realTrades.filter(t => t.campaignId === c.id).length,
    netPnl: (c.currentBalance || 0) - (c.startingBalance || c.accountSize || 0),
    pnlPercent: (c.startingBalance || c.accountSize) > 0 ? (((c.currentBalance - (c.startingBalance || c.accountSize)) / (c.startingBalance || c.accountSize)) * 100) : 0,
    createdAt: c.startDate || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  // Always include real campaigns — merge cached accounts that aren't already in realAccounts
  const realAccountIds = new Set(realAccounts.map((a: any) => a._id));
  const extraCachedAccounts = (baseStore?.accounts || []).filter((a: any) => !realAccountIds.has(a._id));
  const mergedAccounts = [...realAccounts, ...extraCachedAccounts];

  const initialStore = {
    users: baseStore?.users?.length ? baseStore.users : realUsers,
    accounts: mergedAccounts,
    trades: baseStore?.trades?.length ? baseStore.trades : realTrades,
    payouts: baseStore?.payouts?.length ? baseStore.payouts : realPayouts,
    supportIssues: baseStore?.supportIssues || [],
    systemErrors: baseStore?.systemErrors || [],
    subscriptions: baseStore?.subscriptions || (realUsers.map(u => ({
      _id: 'sub_' + u._id,
      user: u._id,
      userName: u.name,
      userEmail: u.email,
      plan: u.subscriptionPlan || 'Free',
      status: u.subscriptionStatus || 'Active',
      startDate: u.createdAt || new Date().toISOString()
    }))),
    adminActivities: baseStore?.adminActivities || []
  };

  return initialStore;
};

const saveLocalFallbackStore = (store: any) => {
  localStorage.setItem('hage_admin_db', JSON.stringify(store));
};

export const adminApi = {
  // 1. Overview
  getOverview: async (): Promise<OverviewData> => {
    try {
      const res = await axios.get(`${API_BASE}/admin/overview`, getAuthHeaders());
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      const approvedPayouts = store.payouts.filter((p: any) => p.status === 'Approved' || p.status === 'Completed');
      const totalPaidOut = approvedPayouts.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

      return {
        metrics: {
          totalUsers: store.users.length,
          activeUsers: store.users.filter((u: any) => !u.isSuspended).length,
          totalAccounts: store.accounts.length,
          activeAccounts: store.accounts.filter((a: any) => a.status === 'Active').length,
          passedAccounts: store.accounts.filter((a: any) => a.status === 'Passed').length,
          failedAccounts: store.accounts.filter((a: any) => a.status === 'Failed').length,
          fundedAccounts: store.accounts.filter((a: any) => a.phase === 'Funded').length,
          realAccounts: store.accounts.filter((a: any) => a.phase === 'Real Account' || a.accountType === 'Real Account').length,
          totalTrades: store.trades.length,
          totalPayoutRecords: store.payouts.length,
          totalPaidOut,
          freeUsers: store.subscriptions.filter((s: any) => s.plan === 'Free').length,
          proUsers: store.subscriptions.filter((s: any) => s.plan === 'Pro').length,
          premiumUsers: store.subscriptions.filter((s: any) => s.plan === 'Premium').length,
        },
        recentUserActivity: store.users.slice(-5).reverse().map((u: any) => ({
          id: u._id,
          user: u.name,
          email: u.email,
          action: u.isSuspended ? 'Account Suspended' : 'User Active',
          date: u.createdAt
        })),
        recentAccountActivity: store.accounts.slice(-5).reverse().map((a: any) => ({
          id: a._id,
          name: a.name,
          user: a.userName || 'Trader',
          broker: a.broker,
          phase: a.phase,
          status: a.status,
          currentBalance: a.currentBalance,
          date: a.createdAt
        })),
        recentPayoutActivity: store.payouts.slice(-5).reverse().map((p: any) => ({
          id: p._id,
          user: p.userName || 'Trader',
          account: p.accountName,
          amount: p.amount,
          status: p.status,
          date: p.date
        })),
        recentSystemIssues: store.supportIssues.filter((i: any) => i.status !== 'Resolved').slice(-5).reverse().map((i: any) => ({
          id: i._id,
          user: i.userName || 'Trader',
          title: i.title,
          status: i.status,
          date: i.date
        }))
      };
    }
  },

  // 2. Users
  getUsers: async (q = '', role = 'all', status = 'all'): Promise<AdminUser[]> => {
    try {
      const res = await axios.get(`${API_BASE}/admin/users`, {
        ...getAuthHeaders(),
        params: { q, role, status }
      });
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      let users = [...store.users];
      if (q) {
        users = users.filter((u: any) => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()));
      }
      if (role !== 'all') {
        users = users.filter((u: any) => u.role === role);
      }
      if (status === 'active') {
        users = users.filter((u: any) => !u.isSuspended);
      } else if (status === 'suspended') {
        users = users.filter((u: any) => u.isSuspended);
      }
      return users;
    }
  },

  getUserById: async (id: string): Promise<any> => {
    try {
      const res = await axios.get(`${API_BASE}/admin/users/${id}`, getAuthHeaders());
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      const user = store.users.find((u: any) => u._id === id);
      const accounts = store.accounts.filter((a: any) => a.user === id);
      const payouts = store.payouts.filter((p: any) => p.user === id);
      const subscription = store.subscriptions.find((s: any) => s.user === id) || { plan: 'Free', status: 'Active' };
      const issues = store.supportIssues.filter((i: any) => i.user === id);

      return {
        user,
        accounts,
        trades: store.trades.filter((t: any) => t.user === id || t.campaignId === id || accounts.some((a: any) => a._id === t.campaignId || a._id === t.account)),
        subscription,
        payouts,
        issues
      };
    }
  },

  suspendUser: async (id: string): Promise<any> => {
    try {
      const res = await axios.put(`${API_BASE}/admin/users/${id}/suspend`, {}, getAuthHeaders());
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      const user = store.users.find((u: any) => u._id === id);
      if (user) {
        user.isSuspended = true;
        store.adminActivities.unshift({
          _id: 'act_' + Date.now(),
          admin: 'admin',
          adminName: 'HAGE Super Admin',
          adminEmail: 'admin@hage.com',
          action: 'Suspended User',
          targetType: 'User',
          targetId: id,
          details: `Suspended user ${user.name}`,
          date: new Date().toISOString()
        });
        saveLocalFallbackStore(store);
      }
      return { message: 'User suspended successfully', user };
    }
  },

  unsuspendUser: async (id: string): Promise<any> => {
    try {
      const res = await axios.put(`${API_BASE}/admin/users/${id}/unsuspend`, {}, getAuthHeaders());
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      const user = store.users.find((u: any) => u._id === id);
      if (user) {
        user.isSuspended = false;
        store.adminActivities.unshift({
          _id: 'act_' + Date.now(),
          admin: 'admin',
          adminName: 'HAGE Super Admin',
          adminEmail: 'admin@hage.com',
          action: 'Unsuspended User',
          targetType: 'User',
          targetId: id,
          details: `Unsuspended user ${user.name}`,
          date: new Date().toISOString()
        });
        saveLocalFallbackStore(store);
      }
      return { message: 'User unsuspended successfully', user };
    }
  },

  // 3. Accounts
  getAccounts: async (type = 'all'): Promise<AdminAccount[]> => {
    try {
      const res = await axios.get(`${API_BASE}/admin/accounts`, {
        ...getAuthHeaders(),
        params: { type }
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
      const store = getLocalFallbackStore();
      let accounts = [...store.accounts];
      if (type === 'Active') accounts = accounts.filter(a => a.status === 'Active');
      if (type === 'Passed') accounts = accounts.filter(a => a.status === 'Passed');
      if (type === 'Failed') accounts = accounts.filter(a => a.status === 'Failed');
      if (type === 'Funded') accounts = accounts.filter(a => a.phase === 'Funded');
      if (type === 'Real') accounts = accounts.filter(a => a.phase === 'Real Account' || a.accountType === 'Real Account');
      return accounts.length > 0 ? accounts : res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      let accounts = [...store.accounts];
      if (type === 'Active') accounts = accounts.filter(a => a.status === 'Active');
      if (type === 'Passed') accounts = accounts.filter(a => a.status === 'Passed');
      if (type === 'Failed') accounts = accounts.filter(a => a.status === 'Failed');
      if (type === 'Funded') accounts = accounts.filter(a => a.phase === 'Funded');
      if (type === 'Real') accounts = accounts.filter(a => a.phase === 'Real Account' || a.accountType === 'Real Account');
      return accounts;
    }
  },

  getAccountById: async (id: string): Promise<any> => {
    try {
      const res = await axios.get(`${API_BASE}/admin/accounts/${id}`, getAuthHeaders());
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      const account = store.accounts.find((a: any) => a._id === id);
      const payouts = store.payouts.filter((p: any) => p.account === id);
      return {
        account,
        trades: store.trades.filter((t: any) => t.account === id || t.campaignId === id),
        payouts
      };
    }
  },

  updateAccountStatus: async (id: string, status: 'Active' | 'Passed' | 'Failed' | 'Closed', failureReason?: string): Promise<any> => {
    try {
      const res = await axios.put(`${API_BASE}/admin/accounts/${id}/status`, { status, failureReason }, getAuthHeaders());
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      const account = store.accounts.find((a: any) => a._id === id);
      if (account) {
        account.status = status;
        if (failureReason) account.failureReason = failureReason;
        if (status === 'Active') {
          account.failureReason = undefined;
        }
        const tradingRaw = localStorage.getItem('hage-trading-storage');
        if (tradingRaw) {
          try {
            const parsed = JSON.parse(tradingRaw);
            if (parsed.state?.campaigns) {
              const camp = parsed.state.campaigns.find((c: any) => c.id === id);
              if (camp) {
                camp.status = status;
                if (failureReason) camp.failureReason = failureReason;
                localStorage.setItem('hage-trading-storage', JSON.stringify(parsed));
              }
            }
          } catch (e) {}
        }
        store.adminActivities.unshift({
          _id: 'act_' + Date.now(),
          admin: 'admin',
          adminName: 'HAGE Super Admin',
          adminEmail: 'admin@hage.com',
          action: `Account ${status}`,
          targetType: 'Account',
          targetId: id,
          details: `Admin changed account "${account.name}" status to "${status}"${failureReason ? ' (' + failureReason + ')' : ''}`,
          date: new Date().toISOString()
        });
        saveLocalFallbackStore(store);
      }
      return { message: 'Account status updated', account };
    }
  },

  // 4. Issues / Support
  getIssues: async (status = 'all'): Promise<SupportIssue[]> => {
    try {
      const res = await axios.get(`${API_BASE}/admin/issues`, {
        ...getAuthHeaders(),
        params: { status }
      });
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      let issues = [...store.supportIssues];
      if (status !== 'all') issues = issues.filter((i: any) => i.status === status);
      return issues;
    }
  },

  updateIssue: async (id: string, status?: string, adminNotes?: string): Promise<any> => {
    try {
      const res = await axios.put(`${API_BASE}/admin/issues/${id}`, { status, adminNotes }, getAuthHeaders());
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      const issue = store.supportIssues.find((i: any) => i._id === id);
      if (issue) {
        if (status) issue.status = status;
        if (adminNotes !== undefined) issue.adminNotes = adminNotes;
        store.adminActivities.unshift({
          _id: 'act_' + Date.now(),
          admin: 'admin',
          adminName: 'HAGE Super Admin',
          adminEmail: 'admin@hage.com',
          action: status === 'Resolved' ? 'Resolved Support Issue' : 'Updated Support Issue',
          targetType: 'SupportIssue',
          targetId: id,
          details: `Updated issue "${issue.title}" status to "${issue.status}"`,
          date: new Date().toISOString()
        });
        saveLocalFallbackStore(store);
      }
      return { message: 'Issue updated', issue };
    }
  },

  createSupportIssue: async (title: string, description: string): Promise<any> => {
    try {
      const res = await axios.post(`${API_BASE}/support`, { title, description }, getAuthHeaders());
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      const newIssue = {
        _id: 'iss_' + Date.now(),
        user: 'current_user',
        userName: localStorage.getItem('profile_firstName') || 'User',
        userEmail: localStorage.getItem('profile_email') || '',
        title,
        description,
        date: new Date().toISOString(),
        status: 'Open',
        adminNotes: '',
        createdAt: new Date().toISOString()
      };
      store.supportIssues.unshift(newIssue);
      saveLocalFallbackStore(store);
      return newIssue;
    }
  },

  // 5. System Errors
  getSystemErrors: async (type = 'all', status = 'all'): Promise<SystemErrorItem[]> => {
    try {
      const res = await axios.get(`${API_BASE}/admin/errors`, {
        ...getAuthHeaders(),
        params: { type, status }
      });
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      let errors = [...store.systemErrors];
      if (type !== 'all') errors = errors.filter((e: any) => e.errorType === type);
      if (status !== 'all') errors = errors.filter((e: any) => e.status === status);
      return errors;
    }
  },

  resolveSystemError: async (id: string, status: string, adminNotes?: string): Promise<any> => {
    try {
      const res = await axios.put(`${API_BASE}/admin/errors/${id}/resolve`, { status, adminNotes }, getAuthHeaders());
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      const errItem = store.systemErrors.find((e: any) => e._id === id);
      if (errItem) {
        errItem.status = status;
        if (adminNotes !== undefined) errItem.adminNotes = adminNotes;
        saveLocalFallbackStore(store);
      }
      return { message: 'Error updated', error: errItem };
    }
  },

  resolveAllSystemErrors: async (status = 'Resolved', adminNotes = 'Bulk resolved by administrator'): Promise<any> => {
    try {
      const res = await axios.put(`${API_BASE}/admin/errors/resolve-all`, { status, adminNotes }, getAuthHeaders());
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      store.systemErrors.forEach((e: any) => {
        if (e.status !== 'Resolved') {
          e.status = status;
          if (adminNotes) e.adminNotes = adminNotes;
        }
      });
      saveLocalFallbackStore(store);
      return { message: 'All errors resolved' };
    }
  },

  // 6. Subscriptions
  getSubscriptions: async (): Promise<any> => {
    try {
      const res = await axios.get(`${API_BASE}/admin/subscriptions`, getAuthHeaders());
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      return {
        summary: {
          freeCount: store.subscriptions.filter((s: any) => s.plan === 'Free').length,
          proCount: store.subscriptions.filter((s: any) => s.plan === 'Pro').length,
          premiumCount: store.subscriptions.filter((s: any) => s.plan === 'Premium').length,
          activeCount: store.subscriptions.filter((s: any) => s.status === 'Active').length,
          expiredCount: store.subscriptions.filter((s: any) => s.status === 'Expired').length,
          totalSubscriptions: store.subscriptions.length
        },
        subscriptions: store.subscriptions
      };
    }
  },

  updateSubscription: async (userId: string, plan: string, status: string): Promise<any> => {
    try {
      const res = await axios.put(`${API_BASE}/admin/subscriptions/${userId}`, { plan, status }, getAuthHeaders());
      // Also sync local storage store if present
      const store = getLocalFallbackStore();
      const target = (userId || '').trim().toLowerCase();
      const sub = store.subscriptions.find((s: any) => s.user === userId || (s.userEmail && s.userEmail.toLowerCase() === target));
      if (sub) {
        sub.plan = plan;
        sub.status = status;
      }
      const user = store.users.find((u: any) => u._id === userId || (u.email && u.email.toLowerCase() === target));
      if (user) {
        user.subscriptionPlan = plan;
        user.subscriptionStatus = status;
      }
      saveLocalFallbackStore(store);

      const localUsersRaw = localStorage.getItem('hage_registered_users');
      if (localUsersRaw) {
        try {
          const uList = JSON.parse(localUsersRaw);
          const matched = uList.find((u: any) => u._id === userId || (u.email && u.email.toLowerCase() === target));
          if (matched) {
            matched.subscriptionPlan = plan;
            matched.subscriptionStatus = status;
            localStorage.setItem('hage_registered_users', JSON.stringify(uList));
          }
        } catch (_) {}
      }

      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      const target = (userId || '').trim().toLowerCase();
      const sub = store.subscriptions.find((s: any) => s.user === userId || (s.userEmail && s.userEmail.toLowerCase() === target));
      if (sub) {
        sub.plan = plan;
        sub.status = status;
      }
      const user = store.users.find((u: any) => u._id === userId || (u.email && u.email.toLowerCase() === target));
      if (user) {
        user.subscriptionPlan = plan;
        user.subscriptionStatus = status;
      }
      saveLocalFallbackStore(store);

      const localUsersRaw = localStorage.getItem('hage_registered_users');
      if (localUsersRaw) {
        try {
          const uList = JSON.parse(localUsersRaw);
          const matched = uList.find((u: any) => u._id === userId || (u.email && u.email.toLowerCase() === target));
          if (matched) {
            matched.subscriptionPlan = plan;
            matched.subscriptionStatus = status;
            localStorage.setItem('hage_registered_users', JSON.stringify(uList));
          }
        } catch (_) {}
      }

      return { message: 'Subscription updated', subscription: sub };
    }
  },

  // 7. Payouts
  getPayouts: async (status = 'all'): Promise<any> => {
    try {
      const res = await axios.get(`${API_BASE}/admin/payouts`, {
        ...getAuthHeaders(),
        params: { status }
      });
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      let payouts = [...store.payouts];
      if (status !== 'all') payouts = payouts.filter((p: any) => p.status === status);
      const approvedTotal = store.payouts
        .filter((p: any) => p.status === 'Approved' || p.status === 'Completed')
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

      return {
        summary: {
          totalPaidOut: approvedTotal,
          totalPayoutsCount: store.payouts.length,
          pendingCount: store.payouts.filter((p: any) => p.status === 'Pending').length,
          approvedCount: store.payouts.filter((p: any) => p.status === 'Approved' || p.status === 'Completed').length,
          rejectedCount: store.payouts.filter((p: any) => p.status === 'Rejected').length,
        },
        payouts
      };
    }
  },

  approvePayout: async (id: string): Promise<any> => {
    try {
      const res = await axios.put(`${API_BASE}/admin/payouts/${id}/approve`, {}, getAuthHeaders());
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      const payout = store.payouts.find((p: any) => p._id === id);
      if (payout) {
        payout.status = 'Approved';
        const account = store.accounts.find((a: any) => a._id === payout.account);
        if (account) {
          account.currentBalance = Math.max(0, account.currentBalance - payout.amount);
        }
        store.adminActivities.unshift({
          _id: 'act_' + Date.now(),
          admin: 'admin',
          adminName: 'HAGE Super Admin',
          adminEmail: 'admin@hage.com',
          action: 'Approved Payout Request',
          targetType: 'Payout',
          targetId: id,
          details: `Approved payout of $${payout.amount.toLocaleString()} for ${payout.userName}`,
          date: new Date().toISOString()
        });
        saveLocalFallbackStore(store);
      }
      return { message: 'Payout approved', payout };
    }
  },

  rejectPayout: async (id: string, rejectionReason: string): Promise<any> => {
    try {
      const res = await axios.put(`${API_BASE}/admin/payouts/${id}/reject`, { rejectionReason }, getAuthHeaders());
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      const payout = store.payouts.find((p: any) => p._id === id);
      if (payout) {
        payout.status = 'Rejected';
        payout.rejectionReason = rejectionReason;
        store.adminActivities.unshift({
          _id: 'act_' + Date.now(),
          admin: 'admin',
          adminName: 'HAGE Super Admin',
          adminEmail: 'admin@hage.com',
          action: 'Rejected Payout Request',
          targetType: 'Payout',
          targetId: id,
          details: `Rejected payout of $${payout.amount.toLocaleString()} for ${payout.userName}: "${rejectionReason}"`,
          date: new Date().toISOString()
        });
        saveLocalFallbackStore(store);
      }
      return { message: 'Payout rejected', payout };
    }
  },

  // 8. Reports
  getReports: async (): Promise<AdminReportsData> => {
    try {
      const res = await axios.get(`${API_BASE}/admin/reports`, getAuthHeaders());
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      const totalAccounts = store.accounts.length;
      const passedAccounts = store.accounts.filter((a: any) => a.status === 'Passed').length;
      const approvedPayouts = store.payouts.filter((p: any) => p.status === 'Approved' || p.status === 'Completed');
      const totalPaidOut = approvedPayouts.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);

      return {
        userStats: {
          totalUsers: store.users.length,
          activeUsers: store.users.filter((u: any) => !u.isSuspended).length,
          suspendedUsers: store.users.filter((u: any) => u.isSuspended).length,
          verifiedUsers: store.users.filter((u: any) => u.isVerified).length,
        },
        accountStats: {
          totalAccounts,
          activeAccounts: store.accounts.filter((a: any) => a.status === 'Active').length,
          passedAccounts,
          failedAccounts: store.accounts.filter((a: any) => a.status === 'Failed').length,
          fundedAccounts: store.accounts.filter((a: any) => a.phase === 'Funded').length,
          realAccounts: store.accounts.filter((a: any) => a.phase === 'Real Account' || a.accountType === 'Real Account').length,
          passRate: totalAccounts > 0 ? ((passedAccounts / totalAccounts) * 100).toFixed(1) : '0.0',
        },
        tradeStats: {
          totalTrades: store.trades.length,
          winningTrades: store.trades.filter((t: any) => t.result === 'Win' || (t.pnl || t.profitLossAmount || 0) > 0).length,
          losingTrades: store.trades.filter((t: any) => t.result === 'Loss' || (t.pnl || t.profitLossAmount || 0) < 0).length,
          winRate: store.trades.length > 0
            ? ((store.trades.filter((t: any) => t.result === 'Win' || (t.pnl || t.profitLossAmount || 0) > 0).length / store.trades.length) * 100).toFixed(1)
            : '0.0',
          totalProfit: store.trades.filter((t: any) => (t.pnl || t.profitLossAmount || 0) > 0).reduce((s: number, t: any) => s + (t.pnl || t.profitLossAmount || 0), 0),
          totalLoss: Math.abs(store.trades.filter((t: any) => (t.pnl || t.profitLossAmount || 0) < 0).reduce((s: number, t: any) => s + (t.pnl || t.profitLossAmount || 0), 0)),
          profitFactor: (() => {
            const profit = store.trades.filter((t: any) => (t.pnl || t.profitLossAmount || 0) > 0).reduce((s: number, t: any) => s + (t.pnl || t.profitLossAmount || 0), 0);
            const loss = Math.abs(store.trades.filter((t: any) => (t.pnl || t.profitLossAmount || 0) < 0).reduce((s: number, t: any) => s + (t.pnl || t.profitLossAmount || 0), 0));
            return loss > 0 ? (profit / loss).toFixed(2) : (profit > 0 ? 'Max' : '0.00');
          })(),
        },
        subscriptionStats: {
          freeCount: store.subscriptions.filter((s: any) => s.plan === 'Free').length,
          proCount: store.subscriptions.filter((s: any) => s.plan === 'Pro').length,
          premiumCount: store.subscriptions.filter((s: any) => s.plan === 'Premium').length,
        },
        payoutStats: {
          totalPayouts: store.payouts.length,
          totalPaidOut,
          avgPayout: approvedPayouts.length > 0 ? Math.round(totalPaidOut / approvedPayouts.length) : 0,
          approvedCount: approvedPayouts.length
        }
      };
    }
  },

  // 9. Admin Activity Log
  getActivityLogs: async (): Promise<AdminActivityLog[]> => {
    try {
      const res = await axios.get(`${API_BASE}/admin/activity`, getAuthHeaders());
      return res.data;
    } catch (err) {
      const store = getLocalFallbackStore();
      return store.adminActivities || [];
    }
  },

  // 10. Subscription Pricing Settings
  getPricing: async (): Promise<{ Free: any; Pro: any; Premium: any }> => {
    const res = await axios.get(`${API_BASE}/admin/settings/pricing`, getAuthHeaders());
    return res.data.pricing;
  },

  updatePricing: async (pricing: { Free: any; Pro: any; Premium: any }): Promise<void> => {
    await axios.put(`${API_BASE}/admin/settings/pricing`, pricing, getAuthHeaders());
  }
};
