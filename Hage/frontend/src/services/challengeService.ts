import axios from 'axios';
import { AUTH_API } from '../config/api';

const API_BASE = AUTH_API.replace(/\/auth$/, '') + '/trading-challenges';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface TradingChallengeData {
  _id?: string;
  id?: string;
  user?: string;
  name: string;
  goalDescription: string;
  durationDays: number;
  dailyCommitment: string;
  personalRules: string[];
  coverImage?: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'failed' | 'abandoned';
  currentStreak: number;
  longestStreak: number;
  completedDays: number;
  missedDays: number;
  remainingDays?: number;
  completionPercentage: number;
  certificateId?: string;
  checkIns?: TradingCheckInData[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TradingCheckInData {
  _id?: string;
  id?: string;
  challengeId: string;
  date: string; // YYYY-MM-DD
  journalText: string;
  screenshotUrl?: string;
  screenshotName?: string;
  videoUrl?: string;
  videoName?: string;
  videoDuration?: number;
  status?: 'completed';
  createdAt?: string;
}

export const challengeService = {
  async getChallenges(): Promise<TradingChallengeData[]> {
    try {
      const res = await axios.get(API_BASE, { headers: getAuthHeaders() });
      return res.data;
    } catch (err) {
      // Fallback to local storage if offline
      const user = localStorage.getItem('profile_email') || 'default';
      const stored = localStorage.getItem(`hage_challenges_${user}`);
      return stored ? JSON.parse(stored) : [];
    }
  },

  async createChallenge(data: Partial<TradingChallengeData>): Promise<TradingChallengeData> {
    try {
      const res = await axios.post(API_BASE, data, { headers: getAuthHeaders() });
      return res.data;
    } catch (err: any) {
      // Fallback offline creation
      const user = localStorage.getItem('profile_email') || 'default';
      const key = `hage_challenges_${user}`;
      const stored: TradingChallengeData[] = JSON.parse(localStorage.getItem(key) || '[]');
      const newChallenge: TradingChallengeData = {
        _id: `tc_${Date.now()}`,
        id: `tc_${Date.now()}`,
        name: data.name || 'Discipline Challenge',
        goalDescription: data.goalDescription || '',
        durationDays: data.durationDays || 30,
        dailyCommitment: data.dailyCommitment || '',
        personalRules: data.personalRules || [],
        coverImage: data.coverImage,
        startDate: data.startDate || new Date().toISOString().split('T')[0],
        endDate: data.endDate || new Date().toISOString().split('T')[0],
        status: 'active',
        currentStreak: 0,
        longestStreak: 0,
        completedDays: 0,
        missedDays: 0,
        completionPercentage: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      stored.unshift(newChallenge);
      localStorage.setItem(key, JSON.stringify(stored));
      return newChallenge;
    }
  },

  async getChallengeDetails(id: string): Promise<TradingChallengeData> {
    try {
      const res = await axios.get(`${API_BASE}/${id}`, { headers: getAuthHeaders() });
      return res.data;
    } catch (err) {
      const user = localStorage.getItem('profile_email') || 'default';
      const stored: TradingChallengeData[] = JSON.parse(localStorage.getItem(`hage_challenges_${user}`) || '[]');
      const found = stored.find(c => c._id === id || c.id === id);
      if (!found) throw new Error('Challenge not found');
      return found;
    }
  },

  async submitCheckIn(challengeId: string, data: Partial<TradingCheckInData>): Promise<{
    checkIn: TradingCheckInData;
    metrics: any;
    isCompleted: boolean;
    certificateId?: string;
  }> {
    const res = await axios.post(`${API_BASE}/${challengeId}/checkin`, data, { headers: getAuthHeaders() });
    return res.data;
  }
};
