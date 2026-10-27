import fs from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User, { IUser } from '../models/User';
import Account, { IAccount } from '../models/Account';
import Trade, { ITrade } from '../models/Trade';
import Subscription, { ISubscription } from '../models/Subscription';
import Payout, { IPayout } from '../models/Payout';
import SupportIssue, { ISupportIssue } from '../models/SupportIssue';
import SystemError, { ISystemError } from '../models/SystemError';
import AdminActivity, { IAdminActivity } from '../models/AdminActivity';

export interface DatabaseStore {
  users: any[];
  accounts: any[];
  trades: any[];
  subscriptions: any[];
  payouts: any[];
  supportIssues: any[];
  systemErrors: any[];
  adminActivities: any[];
  aiConversations: any[];
  aiMessages: any[];
  aiKnowledgeDocs: any[];
  communityMessages: any[];
}

const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'hage_database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class DbManager {
  private static instance: DbManager;
  private isMongoConnected: boolean = false;
  private memoryStore: DatabaseStore = {
    users: [],
    accounts: [],
    trades: [],
    subscriptions: [],
    payouts: [],
    supportIssues: [],
    systemErrors: [],
    adminActivities: [],
    aiConversations: [],
    aiMessages: [],
    aiKnowledgeDocs: [],
    communityMessages: []
  };

  private constructor() {
    this.loadFromDisk();
  }

  public static getInstance(): DbManager {
    if (!DbManager.instance) {
      DbManager.instance = new DbManager();
    }
    return DbManager.instance;
  }

  public setMongoConnected(connected: boolean) {
    this.isMongoConnected = connected;
  }

  public getIsMongoConnected(): boolean {
    return this.isMongoConnected;
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.memoryStore = JSON.parse(raw);
        if (!this.memoryStore.aiConversations) this.memoryStore.aiConversations = [];
        if (!this.memoryStore.aiMessages) this.memoryStore.aiMessages = [];
        if (!this.memoryStore.aiKnowledgeDocs) this.memoryStore.aiKnowledgeDocs = [];
        this.ensureInitialAccounts();
      } else {
        this.ensureInitialAccounts();
      }
    } catch (err) {
      console.error('Error reading persistent database file:', err);
      this.ensureInitialAccounts();
    }
  }

  private _saveTimer: ReturnType<typeof setTimeout> | null = null;

  public saveToDisk() {
    // Debounce: coalesce rapid consecutive saves into a single async write
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      const data = JSON.stringify(this.memoryStore, null, 2);
      writeFile(DB_FILE, data, 'utf-8').catch(err => {
        console.error('Error saving persistent database file:', err);
      });
      this._saveTimer = null;
    }, 100);
  }

  public seedInitialData() {
    this.memoryStore = {
      users: [],
      accounts: [],
      trades: [],
      subscriptions: [],
      payouts: [],
      supportIssues: [],
      systemErrors: [],
      adminActivities: [],
      aiConversations: [],
      aiMessages: [],
      aiKnowledgeDocs: []
    };
    this.saveToDisk();
  }

  public ensureInitialAccounts() {
    if (!this.memoryStore.accounts) {
      this.memoryStore.accounts = [];
    }

    if (this.memoryStore.accounts.length === 0) {
      const users = this.memoryStore.users || [];
      const findUser = (email: string) => users.find(u => u.email?.toLowerCase() === email.toLowerCase());

      const abdi = findUser('mohameddhuux112@gmail.com');
      const comando = findUser('mohameddhuux115@gmail.com');
      const ali = findUser('mohameddhuux117@gmail.com');
      const tree = findUser('treehage@gmail.com');
      const dhuh = findUser('mohameddhuux107@gmail.com');
      const admin = findUser('omar@gmail.com');

      this.memoryStore.accounts = [
        {
          _id: 'acc_abdi_01',
          user: abdi ? abdi._id : 'usr_1792916483862',
          userName: abdi ? abdi.name : 'Abdi Arif',
          userEmail: 'mohameddhuux112@gmail.com',
          name: 'FTMO $100K Phase 1',
          accountType: 'Prop Firm',
          broker: 'FTMO',
          accountNumber: '482019',
          platform: 'MT5',
          phase: 'Phase 1',
          status: 'Active',
          initialBalance: 100000,
          currentBalance: 104250,
          profitTarget: 10000,
          profitTargetPercent: 10,
          maxDailyDrawdown: 5000,
          maxDrawdown: 10000,
          createdAt: '2026-10-25T09:00:00.000Z',
          updatedAt: '2026-10-26T16:20:00.000Z'
        },
        {
          _id: 'acc_abdi_02',
          user: abdi ? abdi._id : 'usr_1792916483862',
          userName: abdi ? abdi.name : 'Abdi Arif',
          userEmail: 'mohameddhuux112@gmail.com',
          name: 'FundedNext $50K Funded',
          accountType: 'Prop Firm',
          broker: 'FundedNext',
          accountNumber: '791024',
          platform: 'MT5',
          phase: 'Funded',
          status: 'Active',
          initialBalance: 50000,
          currentBalance: 52180,
          profitTarget: 0,
          profitTargetPercent: 0,
          maxDailyDrawdown: 2500,
          maxDrawdown: 5000,
          createdAt: '2026-10-25T11:30:00.000Z',
          updatedAt: '2026-10-26T14:15:00.000Z'
        },
        {
          _id: 'acc_comando_01',
          user: comando ? comando._id : 'usr_1792244070203',
          userName: comando ? comando.name : 'Comando 2',
          userEmail: 'mohameddhuux115@gmail.com',
          name: 'IC Markets $5,000 Real',
          accountType: 'Real Account',
          broker: 'IC Markets',
          accountNumber: '882910',
          platform: 'cTrader',
          phase: 'Real Account',
          status: 'Active',
          initialBalance: 5000,
          currentBalance: 5640,
          profitTarget: 0,
          profitTargetPercent: 0,
          maxDailyDrawdown: 0,
          maxDrawdown: 0,
          createdAt: '2026-10-20T10:00:00.000Z',
          updatedAt: '2026-10-26T15:00:00.000Z'
        },
        {
          _id: 'acc_ali_01',
          user: ali ? ali._id : 'usr_1792956659947',
          userName: ali ? ali.name : 'Mohamed Ali',
          userEmail: 'mohameddhuux117@gmail.com',
          name: 'Alpha Capital $100K Phase 2',
          accountType: 'Prop Firm',
          broker: 'Alpha Capital',
          accountNumber: '310944',
          platform: 'MT5',
          phase: 'Phase 2',
          status: 'Active',
          initialBalance: 100000,
          currentBalance: 103200,
          profitTarget: 5000,
          profitTargetPercent: 5,
          maxDailyDrawdown: 5000,
          maxDrawdown: 10000,
          createdAt: '2026-10-25T19:35:00.000Z',
          updatedAt: '2026-10-26T12:00:00.000Z'
        },
        {
          _id: 'acc_tree_01',
          user: tree ? tree._id : 'usr_1792957527754',
          userName: tree ? tree.name : 'Hage Tree',
          userEmail: 'treehage@gmail.com',
          name: 'Topstep $50K Challenge',
          accountType: 'Prop Firm',
          broker: 'Topstep',
          accountNumber: '551208',
          platform: 'Other',
          phase: 'Phase 1',
          status: 'Passed',
          initialBalance: 50000,
          currentBalance: 53100,
          profitTarget: 3000,
          profitTargetPercent: 6,
          maxDailyDrawdown: 1000,
          maxDrawdown: 2000,
          passedDate: '2026-10-25T14:30:00.000Z',
          createdAt: '2026-10-25T19:50:00.000Z',
          updatedAt: '2026-10-25T20:15:00.000Z'
        },
        {
          _id: 'acc_dhuh_01',
          user: dhuh ? dhuh._id : 'usr_1792912020352',
          userName: dhuh ? dhuh.name : 'Mohamed Dhuh',
          userEmail: 'mohameddhuux107@gmail.com',
          name: 'The Funded Trader $25K',
          accountType: 'Prop Firm',
          broker: 'The Funded Trader',
          accountNumber: '902187',
          platform: 'MT5',
          phase: 'Phase 1',
          status: 'Failed',
          initialBalance: 25000,
          currentBalance: 22800,
          profitTarget: 2500,
          profitTargetPercent: 10,
          maxDailyDrawdown: 1250,
          maxDrawdown: 2500,
          failureReason: 'Maximum Daily Drawdown breached (-$1,350 in 24 hours)',
          failedDate: '2026-10-25T18:00:00.000Z',
          createdAt: '2026-10-25T07:15:00.000Z',
          updatedAt: '2026-10-25T18:00:00.000Z'
        },
        {
          _id: 'acc_admin_01',
          user: admin ? admin._id : 'admin_1792405344410',
          userName: admin ? admin.name : 'Administrator',
          userEmail: 'omar@gmail.com',
          name: 'FTMO $200K Funded Master',
          accountType: 'Prop Firm',
          broker: 'FTMO',
          accountNumber: '109283',
          platform: 'MT5',
          phase: 'Funded',
          status: 'Active',
          initialBalance: 200000,
          currentBalance: 218450,
          profitTarget: 0,
          profitTargetPercent: 0,
          maxDailyDrawdown: 10000,
          maxDrawdown: 20000,
          createdAt: '2026-10-19T10:30:00.000Z',
          updatedAt: '2026-10-26T17:00:00.000Z'
        }
      ];

      if (!this.memoryStore.trades || this.memoryStore.trades.length === 0) {
        this.memoryStore.trades = [
          {
            _id: 'trd_01',
            account: 'acc_abdi_01',
            user: abdi ? abdi._id : 'usr_1792916483862',
            symbol: 'EURUSD',
            type: 'Buy',
            lotSize: 5,
            entryPrice: 1.0850,
            exitPrice: 1.0895,
            result: 'Win',
            pnl: 2250,
            date: '2026-10-25T14:30:00.000Z',
            notes: 'London breakout continuation'
          },
          {
            _id: 'trd_02',
            account: 'acc_abdi_01',
            user: abdi ? abdi._id : 'usr_1792916483862',
            symbol: 'GBPUSD',
            type: 'Buy',
            lotSize: 4,
            entryPrice: 1.2910,
            exitPrice: 1.2960,
            result: 'Win',
            pnl: 2000,
            date: '2026-10-26T10:15:00.000Z',
            notes: 'Bullish order block tap'
          },
          {
            _id: 'trd_03',
            account: 'acc_abdi_02',
            user: abdi ? abdi._id : 'usr_1792916483862',
            symbol: 'XAUUSD',
            type: 'Buy',
            lotSize: 2,
            entryPrice: 2730.50,
            exitPrice: 2741.40,
            result: 'Win',
            pnl: 2180,
            date: '2026-10-26T13:45:00.000Z',
            notes: 'Gold demand zone reaction'
          },
          {
            _id: 'trd_04',
            account: 'acc_comando_01',
            user: comando ? comando._id : 'usr_1792244070203',
            symbol: 'USDJPY',
            type: 'Sell',
            lotSize: 1,
            entryPrice: 152.80,
            exitPrice: 152.16,
            result: 'Win',
            pnl: 640,
            date: '2026-10-26T11:20:00.000Z',
            notes: 'Asia high sweep'
          },
          {
            _id: 'trd_05',
            account: 'acc_ali_01',
            user: ali ? ali._id : 'usr_1792956659947',
            symbol: 'NAS100',
            type: 'Buy',
            lotSize: 2,
            entryPrice: 20350,
            exitPrice: 20510,
            result: 'Win',
            pnl: 3200,
            date: '2026-10-26T15:30:00.000Z',
            notes: 'NY open momentum'
          },
          {
            _id: 'trd_06',
            account: 'acc_admin_01',
            user: admin ? admin._id : 'admin_1792405344410',
            symbol: 'US30',
            type: 'Buy',
            lotSize: 5,
            entryPrice: 42100,
            exitPrice: 42469,
            result: 'Win',
            pnl: 18450,
            date: '2026-10-26T16:00:00.000Z',
            notes: 'High timeframe daily continuation'
          }
        ];
      }

      this.saveToDisk();
    }
  }

  // Repository Methods
  public getStore(): DatabaseStore {
    return this.memoryStore;
  }

  public async syncToMongoIfConnected() {
    if (!this.isMongoConnected) return;
    try {
      // Sync users
      for (const u of this.memoryStore.users) {
        const exists = await User.findOne({ email: u.email });
        if (!exists) {
          await User.create(u);
        }
      }
      // Sync accounts
      for (const a of this.memoryStore.accounts) {
        const exists = await Account.findById(a._id);
        if (!exists) {
          try { await Account.create(a); } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('MongoDB sync note:', err);
    }
  }
}

export const dbManager = DbManager.getInstance();
