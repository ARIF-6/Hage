import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import TradingChallenge from '../models/TradingChallenge';
import TradingCheckIn from '../models/TradingCheckIn';
import { dbManager } from '../config/dbManager';

function getStore() {
  const s = dbManager.getStore() as any;
  if (!s.tradingChallenges) s.tradingChallenges = [];
  if (!s.tradingCheckIns) s.tradingCheckIns = [];
  return s;
}

function saveStore() {
  dbManager.saveToDisk();
}

// Helper: Calculate streak, completed, missed, percentage from start date to today
// STRICT 24-HOUR STREAK RULE:
// The streak is broken (resets to 0) if a user misses any consecutive 24-hour cycle.
// Specifically: If today has not been checked in, and yesterday was missed (> 24 hours), current streak is immediately 0.
function calculateChallengeMetrics(
  startDateStr: string,
  durationDays: number,
  checkInDates: string[],
  lastCheckInCreatedAt?: string | Date
) {
  const checkInSet = new Set(checkInDates);
  const start = new Date(startDateStr);
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let completedDays = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;
  let missedDays = 0;

  for (let i = 0; i < durationDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    const hasCheckedIn = checkInSet.has(dateStr);

    if (hasCheckedIn) {
      completedDays++;
      runningStreak++;
      if (runningStreak > longestStreak) longestStreak = runningStreak;
    } else {
      if (dateStr < todayStr) {
        missedDays++;
      }
      runningStreak = 0;
    }

    if (dateStr === todayStr) {
      currentStreak = runningStreak;
    }
  }

  // Check strict 24-hour threshold
  if (checkInSet.has(todayStr)) {
    // Checked in today: streak is valid and active
    let traceStreak = 0;
    let cur = new Date(now);
    while (checkInSet.has(cur.toISOString().split('T')[0])) {
      traceStreak++;
      cur.setDate(cur.getDate() - 1);
    }
    currentStreak = traceStreak;
  } else if (checkInSet.has(yesterdayStr)) {
    // Yesterday was completed; user is currently within the 24-hour window for today
    if (lastCheckInCreatedAt) {
      const lastTime = new Date(lastCheckInCreatedAt).getTime();
      const elapsedHours = (now.getTime() - lastTime) / (1000 * 60 * 60);
      if (elapsedHours > 36) {
        // More than 36 hours since previous day check-in -> 24h cycle broken
        currentStreak = 0;
      } else {
        let traceStreak = 0;
        let cur = new Date(yesterday);
        while (checkInSet.has(cur.toISOString().split('T')[0])) {
          traceStreak++;
          cur.setDate(cur.getDate() - 1);
        }
        currentStreak = traceStreak;
      }
    } else {
      let traceStreak = 0;
      let cur = new Date(yesterday);
      while (checkInSet.has(cur.toISOString().split('T')[0])) {
        traceStreak++;
        cur.setDate(cur.getDate() - 1);
      }
      currentStreak = traceStreak;
    }
  } else {
    // Neither today nor yesterday was checked in (>24-48 hours passed) -> streak is strictly BROKEN (0)
    currentStreak = 0;
  }

  const completionPercentage = Math.min(100, Math.round((completedDays / durationDays) * 100));

  return {
    completedDays,
    missedDays,
    currentStreak,
    longestStreak,
    completionPercentage,
    remainingDays: Math.max(0, durationDays - completedDays)
  };
}

// GET /api/trading-challenges
export const getChallenges = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id?.toString() || req.user?.id?.toString();
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (dbManager.getIsMongoConnected()) {
      try {
        const challenges = await TradingChallenge.find({ user: userId }).sort({ createdAt: -1 });
        res.json(challenges);
        return;
      } catch (err) {
        // Fallback to store
      }
    }

    const store = getStore();
    const userChallenges = store.tradingChallenges.filter((c: any) => c.user?.toString() === userId);
    res.json(userChallenges);
  } catch (error) {
    console.error('getChallenges error:', error);
    res.status(500).json({ message: 'Failed to retrieve challenges' });
  }
};

// POST /api/trading-challenges
export const createChallenge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id?.toString() || req.user?.id?.toString();
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { name, goalDescription, durationDays, dailyCommitment, personalRules, coverImage, startDate } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Challenge name is required' });
      return;
    }

    const validDuration = Number(durationDays);
    if (isNaN(validDuration) || validDuration < 1 || validDuration > 365) {
      res.status(400).json({ message: 'Duration must be between 1 and 365 days' });
      return;
    }

    const start = startDate ? new Date(startDate) : new Date();
    const startStr = start.toISOString().split('T')[0];
    const end = new Date(start);
    end.setDate(end.getDate() + validDuration);
    const endStr = end.toISOString().split('T')[0];

    const challengeData: any = {
      user: userId,
      name: name.trim(),
      goalDescription: goalDescription?.trim() || '',
      durationDays: validDuration,
      dailyCommitment: dailyCommitment?.trim() || '',
      personalRules: Array.isArray(personalRules) ? personalRules.filter((r: any) => typeof r === 'string' && r.trim()) : [],
      coverImage: coverImage || '',
      startDate: startStr,
      endDate: endStr,
      status: 'active',
      currentStreak: 0,
      longestStreak: 0,
      completedDays: 0,
      missedDays: 0,
      completionPercentage: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (dbManager.getIsMongoConnected()) {
      try {
        const created = await TradingChallenge.create(challengeData);
        res.status(201).json(created);
        return;
      } catch (err) {
        // Fallback to memory
      }
    }

    const store = getStore();
    challengeData._id = `tc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    store.tradingChallenges.unshift(challengeData);
    saveStore();

    res.status(201).json(challengeData);
  } catch (error) {
    console.error('createChallenge error:', error);
    res.status(500).json({ message: 'Failed to create challenge' });
  }
};

// GET /api/trading-challenges/:id
export const getChallengeDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id?.toString() || req.user?.id?.toString();
    const { id } = req.params;

    let challenge: any = null;
    let checkIns: any[] = [];

    if (dbManager.getIsMongoConnected()) {
      try {
        challenge = await TradingChallenge.findOne({ _id: id, user: userId });
        if (challenge) {
          checkIns = await TradingCheckIn.find({ challengeId: id, user: userId }).sort({ date: -1 });
        }
      } catch (err) {}
    }

    if (!challenge) {
      const store = getStore();
      challenge = store.tradingChallenges.find((c: any) => (c._id === id || c.id === id) && c.user?.toString() === userId);
      if (challenge) {
        checkIns = store.tradingCheckIns.filter((ci: any) => (ci.challengeId === id) && ci.user?.toString() === userId);
      }
    }

    if (!challenge) {
      res.status(404).json({ message: 'Challenge not found' });
      return;
    }

    // Refresh streak and metrics (Pass latest check-in time for strict 24-hour verification)
    const checkInDates = checkIns.map((c: any) => c.date);
    const latestCheckIn = checkIns.length > 0 ? checkIns[0] : null;
    const metrics = calculateChallengeMetrics(
      challenge.startDate,
      challenge.durationDays,
      checkInDates,
      latestCheckIn?.createdAt
    );

    let updatedStatus = challenge.status;
    if (metrics.completedDays >= challenge.durationDays && challenge.status === 'active') {
      updatedStatus = 'completed';
    }

    const responsePayload = {
      ...((challenge.toObject ? challenge.toObject() : challenge)),
      ...metrics,
      status: updatedStatus,
      checkIns
    };

    res.json(responsePayload);
  } catch (error) {
    console.error('getChallengeDetails error:', error);
    res.status(500).json({ message: 'Failed to load challenge details' });
  }
};

// POST /api/trading-challenges/:id/checkin
export const submitCheckIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id?.toString() || req.user?.id?.toString();
    const { id } = req.params;
    const { date, journalText, screenshotUrl, screenshotName, videoUrl, videoName, videoDuration } = req.body;

    if (!date) {
      res.status(400).json({ message: 'Check-in date is required' });
      return;
    }

    // Server-side video duration validation (Requirement 3: max 60s)
    if (videoDuration !== undefined && videoDuration !== null) {
      const dur = Number(videoDuration);
      if (isNaN(dur) || dur > 60) {
        res.status(400).json({ message: 'Video duration exceeds maximum allowed 60 seconds.' });
        return;
      }
    }

    // Check challenge ownership
    let challenge: any = null;
    if (dbManager.getIsMongoConnected()) {
      try {
        challenge = await TradingChallenge.findOne({ _id: id, user: userId });
      } catch (e) {}
    }
    const store = getStore();
    if (!challenge) {
      challenge = store.tradingChallenges.find((c: any) => (c._id === id || c.id === id) && c.user?.toString() === userId);
    }

    if (!challenge) {
      res.status(404).json({ message: 'Challenge not found or unauthorized' });
      return;
    }

    // Prevent duplicate submission for the same day
    let existingCheckIn: any = null;
    if (dbManager.getIsMongoConnected()) {
      try {
        existingCheckIn = await TradingCheckIn.findOne({ challengeId: id, user: userId, date });
      } catch (e) {}
    }
    if (!existingCheckIn) {
      existingCheckIn = store.tradingCheckIns.find((ci: any) => ci.challengeId === id && ci.user?.toString() === userId && ci.date === date);
    }

    if (existingCheckIn) {
      // Allow editing existing check-in text/media without duplicating day counts
      if (existingCheckIn.save) {
        if (journalText !== undefined) existingCheckIn.journalText = journalText;
        if (screenshotUrl !== undefined) existingCheckIn.screenshotUrl = screenshotUrl;
        if (screenshotName !== undefined) existingCheckIn.screenshotName = screenshotName;
        if (videoUrl !== undefined) existingCheckIn.videoUrl = videoUrl;
        if (videoName !== undefined) existingCheckIn.videoName = videoName;
        if (videoDuration !== undefined) existingCheckIn.videoDuration = videoDuration;
        await existingCheckIn.save();
        res.json({ message: 'Daily check-in updated successfully', checkIn: existingCheckIn });
        return;
      } else {
        if (journalText !== undefined) existingCheckIn.journalText = journalText;
        if (screenshotUrl !== undefined) existingCheckIn.screenshotUrl = screenshotUrl;
        if (screenshotName !== undefined) existingCheckIn.screenshotName = screenshotName;
        if (videoUrl !== undefined) existingCheckIn.videoUrl = videoUrl;
        if (videoName !== undefined) existingCheckIn.videoName = videoName;
        if (videoDuration !== undefined) existingCheckIn.videoDuration = videoDuration;
        existingCheckIn.updatedAt = new Date().toISOString();
        saveStore();
        res.json({ message: 'Daily check-in updated successfully', checkIn: existingCheckIn });
        return;
      }
    }

    // Create new check-in
    const newCheckInData: any = {
      challengeId: id,
      user: userId,
      date,
      journalText: journalText || '',
      screenshotUrl: screenshotUrl || '',
      screenshotName: screenshotName || '',
      videoUrl: videoUrl || '',
      videoName: videoName || '',
      videoDuration: videoDuration ? Number(videoDuration) : undefined,
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let savedCheckIn: any = null;
    if (dbManager.getIsMongoConnected()) {
      try {
        savedCheckIn = await TradingCheckIn.create(newCheckInData);
      } catch (e) {}
    }

    if (!savedCheckIn) {
      newCheckInData._id = `ci_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      store.tradingCheckIns.push(newCheckInData);
      savedCheckIn = newCheckInData;
    }

    // Recalculate metrics on challenge
    let allUserCheckIns: any[] = [];
    if (dbManager.getIsMongoConnected()) {
      try {
        allUserCheckIns = await TradingCheckIn.find({ challengeId: id, user: userId });
      } catch (e) {}
    }
    if (allUserCheckIns.length === 0) {
      allUserCheckIns = store.tradingCheckIns.filter((ci: any) => ci.challengeId === id && ci.user?.toString() === userId);
    }

    const checkInDates = allUserCheckIns.map(c => c.date);
    const metrics = calculateChallengeMetrics(
      challenge.startDate,
      challenge.durationDays,
      checkInDates,
      savedCheckIn.createdAt
    );

    let isCompleted = metrics.completedDays >= challenge.durationDays;
    let certId = challenge.certificateId;
    if (isCompleted && !certId) {
      certId = `CERT-HAGE-${Date.now().toString(36).toUpperCase()}`;
    }

    // Update challenge document
    if (challenge.save) {
      challenge.completedDays = metrics.completedDays;
      challenge.missedDays = metrics.missedDays;
      challenge.currentStreak = metrics.currentStreak;
      challenge.longestStreak = metrics.longestStreak;
      challenge.completionPercentage = metrics.completionPercentage;
      if (isCompleted) {
        challenge.status = 'completed';
        challenge.certificateId = certId;
      }
      await challenge.save();
    } else {
      challenge.completedDays = metrics.completedDays;
      challenge.missedDays = metrics.missedDays;
      challenge.currentStreak = metrics.currentStreak;
      challenge.longestStreak = metrics.longestStreak;
      challenge.completionPercentage = metrics.completionPercentage;
      if (isCompleted) {
        challenge.status = 'completed';
        challenge.certificateId = certId;
      }
      challenge.updatedAt = new Date().toISOString();
      saveStore();
    }

    res.status(201).json({
      message: 'Daily check-in completed successfully',
      checkIn: savedCheckIn,
      metrics,
      isCompleted,
      certificateId: certId
    });
  } catch (error) {
    console.error('submitCheckIn error:', error);
    res.status(500).json({ message: 'Failed to record check-in' });
  }
};

// POST /api/trading-challenges/:id/restore-streak
export const restoreStreak = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id?.toString() || req.user?.id?.toString();
    const { id } = req.params;

    let challenge: any = null;
    let checkIns: any[] = [];

    if (dbManager.getIsMongoConnected()) {
      try {
        challenge = await TradingChallenge.findOne({ _id: id, user: userId });
        if (challenge) {
          checkIns = await TradingCheckIn.find({ challengeId: id, user: userId }).sort({ date: -1 });
        }
      } catch (e) {}
    }

    const store = getStore();
    if (!challenge) {
      challenge = store.tradingChallenges.find((c: any) => (c._id === id || c.id === id) && c.user?.toString() === userId);
      if (challenge) {
        checkIns = store.tradingCheckIns.filter((ci: any) => (ci.challengeId === id) && ci.user?.toString() === userId);
      }
    }

    if (!challenge) {
      res.status(404).json({ message: 'Challenge not found' });
      return;
    }

    // A broken streak means longestStreak > 0 and currentStreak === 0 (or less than previous unbroken count)
    const restoredValue = Math.max(1, challenge.longestStreak || checkIns.length || 1);

    if (challenge.save) {
      challenge.currentStreak = restoredValue;
      challenge.restoredStreak = restoredValue;
      challenge.streakRestoredAt = new Date();
      await challenge.save();
    } else {
      challenge.currentStreak = restoredValue;
      challenge.restoredStreak = restoredValue;
      challenge.streakRestoredAt = new Date().toISOString();
      challenge.updatedAt = new Date().toISOString();
      saveStore();
    }

    res.json({
      message: `Streak successfully restored to ${restoredValue} days!`,
      currentStreak: restoredValue
    });
  } catch (error) {
    console.error('restoreStreak error:', error);
    res.status(500).json({ message: 'Failed to restore streak' });
  }
};
