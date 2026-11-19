import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Flame, Plus, CheckCircle2, XCircle, Clock,
  Calendar as CalendarIcon, Upload, Video, Image, FileText,
  Award, TrendingUp, ChevronRight, X, AlertCircle, Play,
  Download, Eye, Check, Target, Zap
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { triggerReadOnlyAlert } from '../../store/subscriptionRules';
import { challengeService, type TradingChallengeData, type TradingCheckInData } from '../../services/challengeService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function TradingChallenge() {
  const [challenges, setChallenges] = useState<TradingChallengeData[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<TradingChallengeData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'checkin' | 'calendar' | 'history'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Creation modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newDuration, setNewDuration] = useState<number>(30);
  const [customDays, setCustomDays] = useState('');
  const [newCommitment, setNewCommitment] = useState('');
  const [newRuleInput, setNewRuleInput] = useState('');
  const [newRules, setNewRules] = useState<string[]>([]);
  const [newCoverImage, setNewCoverImage] = useState<string>('');
  const [createError, setCreateError] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Check-in state
  const [checkInText, setCheckInText] = useState('');
  const [screenshotData, setScreenshotData] = useState<{ url: string; name: string } | null>(null);
  const [videoData, setVideoData] = useState<{ url: string; name: string; duration: number } | null>(null);
  const [checkInDate, setCheckInDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [checkInError, setCheckInError] = useState('');
  const [checkInSuccess, setCheckInSuccess] = useState('');
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);

  // Certificate & Report Modal State
  const [viewingCertificate, setViewingCertificate] = useState<TradingChallengeData | null>(null);
  const [viewingReport, setViewingReport] = useState<TradingChallengeData | null>(null);
  const certRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Video duration element ref for pre-upload validation
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const data = await challengeService.getChallenges();
      setChallenges(data);
      if (data.length > 0) {
        if (!selectedChallenge) {
          const detail = await challengeService.getChallengeDetails(data[0]._id || data[0].id || '');
          setSelectedChallenge(detail);
        } else {
          const currentId = selectedChallenge._id || selectedChallenge.id || '';
          const detail = await challengeService.getChallengeDetails(currentId);
          setSelectedChallenge(detail);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSelectChallenge = async (ch: TradingChallengeData) => {
    const id = ch._id || ch.id || '';
    try {
      const details = await challengeService.getChallengeDetails(id);
      setSelectedChallenge(details);
    } catch (e) {
      setSelectedChallenge(ch);
    }
  };

  const handleAddRule = () => {
    if (newRuleInput.trim() && !newRules.includes(newRuleInput.trim())) {
      setNewRules([...newRules, newRuleInput.trim()]);
      setNewRuleInput('');
    }
  };

  const handleRemoveRule = (index: number) => {
    setNewRules(newRules.filter((_, i) => i !== index));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (triggerReadOnlyAlert('create a challenge')) return;

    if (!newName.trim()) {
      setCreateError('Please enter a challenge name.');
      return;
    }

    const duration = newDuration === 0 ? Number(customDays) : newDuration;
    if (isNaN(duration) || duration < 1 || duration > 365) {
      setCreateError('Duration must be between 1 and 365 days.');
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError('');

    try {
      const created = await challengeService.createChallenge({
        name: newName.trim(),
        goalDescription: newGoal.trim(),
        durationDays: duration,
        dailyCommitment: newCommitment.trim(),
        personalRules: newRules,
        coverImage: newCoverImage,
        startDate: new Date().toISOString().split('T')[0],
      });

      setIsCreateModalOpen(false);
      // Reset form
      setNewName('');
      setNewGoal('');
      setNewDuration(30);
      setCustomDays('');
      setNewCommitment('');
      setNewRules([]);
      setNewCoverImage('');
      await loadAll();
      setSelectedChallenge(created);
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create challenge.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Video validation: Validate duration <= 60s
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('mp4') && !file.type.includes('webm')) {
      setCheckInError('Only MP4 and WebM video formats are supported.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setCheckInError('Video file size exceeds maximum 15MB limit.');
      return;
    }

    // Inspect duration using temporary video object
    const videoElem = document.createElement('video');
    videoElem.preload = 'metadata';
    videoElem.onloadedmetadata = () => {
      window.URL.revokeObjectURL(videoElem.src);
      if (videoElem.duration > 60) {
        setCheckInError(`Video is ${Math.round(videoElem.duration)} seconds long. Maximum duration allowed is 60 seconds.`);
        setVideoData(null);
        if (videoInputRef.current) videoInputRef.current.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setVideoData({
          url: reader.result as string,
          name: file.name,
          duration: Math.round(videoElem.duration)
        });
        setCheckInError('');
      };
      reader.readAsDataURL(file);
    };

    videoElem.src = URL.createObjectURL(file);
  };

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setCheckInError('Screenshot file size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotData({
        url: reader.result as string,
        name: file.name
      });
      setCheckInError('');
    };
    reader.readAsDataURL(file);
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallenge) return;
    if (triggerReadOnlyAlert('submit a daily check-in')) return;

    if (!checkInText.trim() && !screenshotData && !videoData) {
      setCheckInError('Please provide at least a journal reflection, screenshot, or video.');
      return;
    }

    setIsSubmittingCheckIn(true);
    setCheckInError('');
    setCheckInSuccess('');

    try {
      const challengeId = selectedChallenge._id || selectedChallenge.id || '';
      const res = await challengeService.submitCheckIn(challengeId, {
        date: checkInDate,
        journalText: checkInText.trim(),
        screenshotUrl: screenshotData?.url,
        screenshotName: screenshotData?.name,
        videoUrl: videoData?.url,
        videoName: videoData?.name,
        videoDuration: videoData?.duration
      });

      setCheckInSuccess('Daily check-in saved! Streaks and metrics updated.');
      setCheckInText('');
      setScreenshotData(null);
      setVideoData(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';

      if (res.isCompleted) {
        setCheckInSuccess('🎉 CONGRATULATIONS! You have completed the challenge!');
      }

      await loadAll();
    } catch (err: any) {
      setCheckInError(err.response?.data?.message || 'Failed to submit check-in.');
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  const downloadCertificate = async () => {
    if (!certRef.current) return;
    try {
      const canvas = await html2canvas(certRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`HAGE_Challenge_Certificate_${viewingCertificate?.name.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const completedChallenges = challenges.filter(c => c.status === 'completed');

  // Overall metric totals
  const totalCompletedDays = challenges.reduce((sum, c) => sum + (c.completedDays || 0), 0);
  const highestStreak = challenges.reduce((max, c) => Math.max(max, c.longestStreak || 0), 0);
  const totalSubmissions = selectedChallenge?.checkIns?.length || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
              <Trophy className="w-7 h-7 text-[#6355F6]" />
              HAGE Trading Challenge
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#6355F6]/10 text-[#6355F6] border border-[#6355F6]/20">
              Discipline Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build unshakeable consistency, trade within your rules, and earn verified completion certificates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              if (triggerReadOnlyAlert('create a challenge')) return;
              setIsCreateModalOpen(true);
            }}
            className="bg-[#6355F6] hover:bg-[#5244E3] text-white flex items-center gap-2 shadow-sm font-semibold text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Challenge
          </Button>
        </div>
      </div>

      {/* ── STATS OVERVIEW CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-[#111722] border-gray-200/80 dark:border-[#1E293B]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Challenges</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{activeChallenges.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#6355F6]/10 flex items-center justify-between justify-center text-[#6355F6]">
              <Target className="w-5 h-5 m-auto" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#111722] border-gray-200/80 dark:border-[#1E293B]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Streak</p>
              <p className="text-2xl font-bold text-amber-500 mt-0.5 flex items-center gap-1.5">
                {selectedChallenge?.currentStreak || 0} <span className="text-xs font-semibold text-slate-400">days</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Flame className="w-5 h-5 m-auto" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#111722] border-gray-200/80 dark:border-[#1E293B]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Longest Streak</p>
              <p className="text-2xl font-bold text-emerald-500 mt-0.5 flex items-center gap-1.5">
                {highestStreak} <span className="text-xs font-semibold text-slate-400">days</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Zap className="w-5 h-5 m-auto" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#111722] border-gray-200/80 dark:border-[#1E293B]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completed Challenges</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{completedChallenges.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Award className="w-5 h-5 m-auto" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── TABS NAVIGATION ── */}
      <div className="flex border-b border-gray-200 dark:border-[#1E293B] gap-6 text-sm font-semibold">
        {[
          { id: 'overview', label: 'Challenge Dashboard', icon: Target },
          { id: 'checkin', label: 'Daily Check-in', icon: Flame },
          { id: 'calendar', label: 'Progress Calendar', icon: CalendarIcon },
          { id: 'history', label: 'History & Certificates', icon: Award },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#6355F6] text-[#6355F6]'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT ── */}
      {challenges.length === 0 && !isLoading ? (
        <Card className="bg-white dark:bg-[#111722] border-gray-200/80 dark:border-[#1E293B] p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#6355F6]/10 text-[#6355F6] flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Start Your First Discipline Challenge</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose a 7, 30, 60, or 90-day challenge duration. Set your trading rules, commit to daily check-ins, and build professional execution habits.
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#6355F6] hover:bg-[#5244E3] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Challenge
            </Button>
          </div>
        </Card>
      ) : null}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && selectedChallenge && (
        <div className="space-y-6">
          {/* Challenge Selector Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {challenges.map(ch => {
              const isSel = (ch._id || ch.id) === (selectedChallenge._id || selectedChallenge.id);
              return (
                <button
                  key={ch._id || ch.id}
                  onClick={() => handleSelectChallenge(ch)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSel
                      ? 'bg-[#6355F6] text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-[#182030] text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-[#1E293B]'
                  }`}
                >
                  {ch.name} ({ch.durationDays} Days)
                </button>
              );
            })}
          </div>

          {/* Active Challenge Card */}
          <Card className="bg-white dark:bg-[#111722] border-gray-200/80 dark:border-[#1E293B]">
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedChallenge.name}</h2>
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                      selectedChallenge.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                    }`}>
                      {selectedChallenge.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                  {selectedChallenge.goalDescription && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                      {selectedChallenge.goalDescription}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-2">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Start: {format(parseISO(selectedChallenge.startDate), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" /> Target End: {format(parseISO(selectedChallenge.endDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setActiveTab('checkin')}
                    className="bg-[#6355F6] hover:bg-[#5244E3] text-white text-xs font-semibold"
                  >
                    <Flame className="w-4 h-4 mr-1.5" />
                    Daily Check-in
                  </Button>
                  {selectedChallenge.status === 'completed' && (
                    <Button
                      onClick={() => setViewingCertificate(selectedChallenge)}
                      variant="outline"
                      className="text-xs font-semibold"
                    >
                      <Award className="w-4 h-4 mr-1.5 text-emerald-500" />
                      View Certificate
                    </Button>
                  )}
                  <Button
                    onClick={() => setViewingReport(selectedChallenge)}
                    variant="outline"
                    className="text-xs font-semibold"
                  >
                    <FileText className="w-4 h-4 mr-1.5 text-[#6355F6]" />
                    Final Report
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>Challenge Progress</span>
                  <span>{selectedChallenge.completedDays} / {selectedChallenge.durationDays} Days ({selectedChallenge.completionPercentage}%)</span>
                </div>
                <div className="w-full h-3 bg-gray-100 dark:bg-[#182030] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#6355F6] to-emerald-500 transition-all duration-500"
                    style={{ width: `${selectedChallenge.completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Rules & Daily Commitment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#182030]/60 border border-gray-200/60 dark:border-[#1E293B]">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Daily Commitment
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {selectedChallenge.dailyCommitment || 'Stick strictly to maximum risk and daily journal review.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#182030]/60 border border-gray-200/60 dark:border-[#1E293B]">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-[#6355F6]" /> Personal Rules
                  </h4>
                  {selectedChallenge.personalRules && selectedChallenge.personalRules.length > 0 ? (
                    <ul className="space-y-1">
                      {selectedChallenge.personalRules.map((rule, idx) => (
                        <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#6355F6]" />
                          {rule}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400">No specific rules set for this challenge.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. DAILY CHECK-IN TAB */}
      {activeTab === 'checkin' && selectedChallenge && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-white dark:bg-[#111722] border-gray-200/80 dark:border-[#1E293B]">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-500" />
                    Daily Check-In Station
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Log your daily performance, upload proof of execution (screenshot or $\le 60$s video), and keep your streak alive.
                  </p>
                </div>

                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#1E293B] bg-white dark:bg-[#182030] text-xs font-medium text-gray-900 dark:text-white"
                />
              </div>

              {checkInError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {checkInError}
                </div>
              )}

              {checkInSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {checkInSuccess}
                </div>
              )}

              <form onSubmit={handleCheckInSubmit} className="space-y-4">
                {/* Journal / Reflection Text */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Daily Reflection & Discipline Notes
                  </label>
                  <textarea
                    rows={4}
                    value={checkInText}
                    onChange={(e) => setCheckInText(e.target.value)}
                    placeholder="Did you follow your rules today? What emotions or market challenges arose? What will you improve tomorrow?"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-[#1E293B] bg-white dark:bg-[#182030] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6355F6]"
                  />
                </div>

                {/* Media Uploads Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Screenshot Upload */}
                  <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-[#1E293B] bg-gray-50/50 dark:bg-[#182030]/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Image className="w-4 h-4 text-blue-500" /> Chart Screenshot
                      </span>
                      {screenshotData && (
                        <button
                          type="button"
                          onClick={() => setScreenshotData(null)}
                          className="text-[11px] text-rose-500 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {screenshotData ? (
                      <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-[#1E293B]">
                        <img src={screenshotData.url} alt="Uploaded chart" className="w-full h-32 object-cover" />
                        <div className="p-1 text-[10px] text-slate-400 truncate">{screenshotData.name}</div>
                      </div>
                    ) : (
                      <label className="block cursor-pointer text-center py-6">
                        <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-[#6355F6]">Upload Screenshot</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG up to 5MB</p>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Video Upload (Validated <= 60s) */}
                  <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-[#1E293B] bg-gray-50/50 dark:bg-[#182030]/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-purple-500" /> Video Log (Max 60s)
                      </span>
                      {videoData && (
                        <button
                          type="button"
                          onClick={() => setVideoData(null)}
                          className="text-[11px] text-rose-500 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {videoData ? (
                      <div className="space-y-1">
                        <video controls src={videoData.url} className="w-full h-32 rounded-lg bg-black object-contain" />
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="truncate">{videoData.name}</span>
                          <span className="font-semibold text-emerald-500">{videoData.duration}s / 60s</span>
                        </div>
                      </div>
                    ) : (
                      <label className="block cursor-pointer text-center py-6">
                        <Video className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-[#6355F6]">Upload Video Note</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">MP4, WebM (Max 60 sec & 15MB)</p>
                        <input
                          ref={videoInputRef}
                          type="file"
                          accept="video/mp4,video/webm"
                          onChange={handleVideoSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingCheckIn}
                  className="w-full bg-[#6355F6] hover:bg-[#5244E3] text-white font-semibold py-2.5 rounded-xl shadow-sm text-xs sm:text-sm"
                >
                  {isSubmittingCheckIn ? 'Recording Check-in...' : 'Complete Today\'s Check-in'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Past Submissions Timeline */}
          <Card className="bg-white dark:bg-[#111722] border-gray-200/80 dark:border-[#1E293B]">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Submission History ({selectedChallenge.checkIns?.length || 0})
              </h3>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {selectedChallenge.checkIns && selectedChallenge.checkIns.length > 0 ? (
                  selectedChallenge.checkIns.map((ci) => (
                    <div
                      key={ci._id || ci.id || ci.date}
                      className="p-3 rounded-xl bg-gray-50 dark:bg-[#182030]/60 border border-gray-200/60 dark:border-[#1E293B] space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {format(parseISO(ci.date), 'MMM d, yyyy')}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Logged
                        </span>
                      </div>

                      {ci.journalText && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
                          {ci.journalText}
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        {ci.screenshotUrl && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                            <Image className="w-3 h-3" /> Image attached
                          </span>
                        )}
                        {ci.videoUrl && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-purple-500 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md">
                            <Video className="w-3 h-3" /> {ci.videoDuration || 60}s video
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No check-ins recorded yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. PROGRESS CALENDAR TAB */}
      {activeTab === 'calendar' && selectedChallenge && (
        <Card className="bg-white dark:bg-[#111722] border-gray-200/80 dark:border-[#1E293B]">
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#6355F6]" />
                Challenge Discipline Calendar
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Full visual map of your {selectedChallenge.durationDays}-day challenge timeline.
              </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-500" /> Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-rose-500" /> Missed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-[#6355F6] animate-pulse" /> Today
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-gray-200 dark:bg-[#182030]" /> Upcoming
              </span>
            </div>

            {/* Calendar Grid of Challenge Days */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {Array.from({ length: selectedChallenge.durationDays }).map((_, index) => {
                const startDate = new Date(selectedChallenge.startDate);
                const dayDate = new Date(startDate);
                dayDate.setDate(dayDate.getDate() + index);
                const dayStr = dayDate.toISOString().split('T')[0];
                const todayStr = new Date().toISOString().split('T')[0];

                const checkInSet = new Set((selectedChallenge.checkIns || []).map(c => c.date));
                const isCompleted = checkInSet.has(dayStr);
                const isToday = dayStr === todayStr;
                const isPast = dayStr < todayStr;
                const isMissed = isPast && !isCompleted;

                return (
                  <div
                    key={index}
                    className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                      isCompleted
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                        : isMissed
                        ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/40'
                        : isToday
                        ? 'bg-[#6355F6]/10 border-[#6355F6] ring-2 ring-[#6355F6]/30'
                        : 'bg-gray-50/50 dark:bg-[#182030]/30 border-gray-200 dark:border-[#1E293B]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className={isToday ? 'text-[#6355F6]' : 'text-slate-600 dark:text-slate-300'}>
                        Day {index + 1}
                      </span>
                      {isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : isMissed ? (
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      ) : null}
                    </div>

                    <div className="mt-2 text-[10px] text-slate-400">
                      {format(dayDate, 'MMM d')}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. HISTORY & CERTIFICATES TAB */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <Card className="bg-white dark:bg-[#111722] border-gray-200/80 dark:border-[#1E293B]">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-500" />
                Completed Challenges & Certificates
              </h3>

              {completedChallenges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedChallenges.map(ch => (
                    <div
                      key={ch._id || ch.id}
                      className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm">{ch.name}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {ch.durationDays} Days Finished ({ch.completedDays} Check-ins)
                          </p>
                        </div>
                        <Award className="w-6 h-6 text-emerald-500" />
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          onClick={() => setViewingCertificate(ch)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                        >
                          <Award className="w-3.5 h-3.5 mr-1.5" /> Certificate
                        </Button>
                        <Button
                          onClick={() => setViewingReport(ch)}
                          variant="outline"
                          className="text-xs font-semibold"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5" /> Final Report
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No completed challenges yet. Complete all days of an active challenge to unlock your verified certificate.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── CREATE CHALLENGE MODAL ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111722] border border-gray-200 dark:border-[#1E293B] rounded-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#6355F6]" />
                Create New Challenge
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Challenge Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. 30-Day Pure Discipline Challenge"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-[#1E293B] bg-white dark:bg-[#182030] text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Target Duration *
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[7, 30, 60, 90, 0].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setNewDuration(d)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        newDuration === d
                          ? 'bg-[#6355F6] text-white border-[#6355F6]'
                          : 'border-gray-200 dark:border-[#1E293B] text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-[#182030]'
                      }`}
                    >
                      {d === 0 ? 'Custom' : `${d}D`}
                    </button>
                  ))}
                </div>

                {newDuration === 0 && (
                  <div className="mt-2">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      placeholder="Enter custom duration in days (1 - 365)"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-[#1E293B] bg-white dark:bg-[#182030] text-gray-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Core Daily Commitment
                </label>
                <input
                  type="text"
                  value={newCommitment}
                  onChange={(e) => setNewCommitment(e.target.value)}
                  placeholder="e.g. Max 2 trades/day, strictly stop after 1.5R loss"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-[#1E293B] bg-white dark:bg-[#182030] text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Personal Rules
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRuleInput}
                    onChange={(e) => setNewRuleInput(e.target.value)}
                    placeholder="e.g. No trading during major red-folder news"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-[#1E293B] bg-white dark:bg-[#182030] text-gray-900 dark:text-white"
                  />
                  <Button type="button" onClick={handleAddRule} variant="outline" className="text-xs">
                    Add
                  </Button>
                </div>

                {newRules.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {newRules.map((rule, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#6355F6]/10 text-[#6355F6] text-xs font-medium"
                      >
                        {rule}
                        <button type="button" onClick={() => handleRemoveRule(idx)}>
                          <X className="w-3 h-3 hover:text-rose-500" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingCreate} className="bg-[#6355F6] hover:bg-[#5244E3] text-white">
                  {isSubmittingCreate ? 'Creating...' : 'Start Challenge'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CERTIFICATE MODAL ── */}
      {viewingCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111722] border border-gray-200 dark:border-[#1E293B] rounded-2xl w-full max-w-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-500" />
                Verified Certificate of Discipline
              </h3>
              <div className="flex items-center gap-2">
                <Button onClick={downloadCertificate} size="sm" className="bg-[#6355F6] text-white text-xs">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download PDF
                </Button>
                <button
                  onClick={() => setViewingCertificate(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Certificate Canvas / Container */}
            <div
              ref={certRef}
              className="p-8 rounded-2xl border-4 border-double border-emerald-500/40 bg-gradient-to-br from-white via-slate-50 to-emerald-50/20 dark:from-[#0E131F] dark:via-[#111722] dark:to-emerald-950/20 text-center space-y-6 shadow-xl"
            >
              <div className="space-y-1">
                <div className="inline-block p-3 rounded-full bg-emerald-500/10 text-emerald-500 mb-2">
                  <Award className="w-12 h-12 mx-auto" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-widest text-gray-900 dark:text-white">
                  Certificate of Discipline
                </h2>
                <p className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                  HAGE Trading Journal Discipline Program
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500">This officially certifies that</p>
                <p className="text-2xl font-extrabold text-[#6355F6]">
                  {localStorage.getItem('profile_firstName') || 'Trader'} {localStorage.getItem('profile_lastName') || ''}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
                  has successfully completed the <strong>{viewingCertificate.name}</strong>, committing to {viewingCertificate.durationDays} consecutive days of strict risk management and rules execution.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-b border-gray-200 dark:border-[#1E293B] py-4 text-xs">
                <div>
                  <span className="block text-slate-400">Total Days</span>
                  <span className="font-bold text-gray-900 dark:text-white">{viewingCertificate.completedDays} Days</span>
                </div>
                <div>
                  <span className="block text-slate-400">Best Streak</span>
                  <span className="font-bold text-amber-500">{viewingCertificate.longestStreak} Days</span>
                </div>
                <div>
                  <span className="block text-slate-400">Certificate ID</span>
                  <span className="font-mono font-bold text-emerald-500">{viewingCertificate.certificateId || 'CERT-HAGE-DISCIPLINE'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2">
                <span>Verified: {format(new Date(), 'MMMM d, yyyy')}</span>
                <span className="font-bold text-gray-900 dark:text-white">HAGE JOURNAL VERIFIED</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FINAL REPORT MODAL ── */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111722] border border-gray-200 dark:border-[#1E293B] rounded-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#6355F6]" />
                Final Challenge Performance Report
              </h3>
              <button
                onClick={() => setViewingReport(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={reportRef} className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#182030] space-y-1">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">{viewingReport.name}</h4>
                <p className="text-slate-500">
                  {viewingReport.startDate} — {viewingReport.endDate} ({viewingReport.durationDays} Days Total)
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-gray-200 dark:border-[#1E293B]">
                  <span className="text-slate-400 block">Completed Days</span>
                  <span className="text-base font-bold text-emerald-500">{viewingReport.completedDays}</span>
                </div>
                <div className="p-3 rounded-lg border border-gray-200 dark:border-[#1E293B]">
                  <span className="text-slate-400 block">Missed Days</span>
                  <span className="text-base font-bold text-rose-500">{viewingReport.missedDays}</span>
                </div>
                <div className="p-3 rounded-lg border border-gray-200 dark:border-[#1E293B]">
                  <span className="text-slate-400 block">Longest Streak</span>
                  <span className="text-base font-bold text-amber-500">{viewingReport.longestStreak}</span>
                </div>
                <div className="p-3 rounded-lg border border-gray-200 dark:border-[#1E293B]">
                  <span className="text-slate-400 block">Completion %</span>
                  <span className="text-base font-bold text-[#6355F6]">{viewingReport.completionPercentage}%</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-[#1E293B] space-y-2">
                <h5 className="font-bold text-gray-900 dark:text-white">Submission Breakdown</h5>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-gray-50 dark:bg-[#182030]/50 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Journal Entries</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {(viewingReport.checkIns || []).filter(c => c.journalText).length}
                    </span>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-[#182030]/50 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Screenshots</span>
                    <span className="font-bold text-blue-500">
                      {(viewingReport.checkIns || []).filter(c => c.screenshotUrl).length}
                    </span>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-[#182030]/50 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Videos</span>
                    <span className="font-bold text-purple-500">
                      {(viewingReport.checkIns || []).filter(c => c.videoUrl).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
