import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Plus, Search, Calendar, Tag, Trash2, Edit3, 
  CheckCircle2, X, Filter, Save, Layers, Smile, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useTradeStore, type JournalEntry } from '../../store/useTradeStore';
import { triggerReadOnlyAlert } from '../../store/subscriptionRules';
import { format } from 'date-fns';
import axios from 'axios';

const MOODS: ('Disciplined' | 'Neutral' | 'Excited' | 'Frustrated' | 'Patient')[] = [
  'Disciplined',
  'Patient',
  'Neutral',
  'Excited',
  'Frustrated'
];

export default function Journal() {
  const { 
    journalEntries, 
    activeCampaignId, 
    campaigns, 
    addJournalEntry, 
    updateJournalEntry, 
    deleteJournalEntry 
  } = useTradeStore();

  const [selectedAccountId, setSelectedAccountId] = useState<string | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState<string>('All');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<'Disciplined' | 'Neutral' | 'Excited' | 'Frustrated' | 'Patient'>('Disciplined');
  const [tags, setTags] = useState('');
  const [campaignId, setCampaignId] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');

  // Active account resolution
  const activeId = activeCampaignId || (campaigns.length > 0 ? campaigns[0].id : null);
  const effectiveId = selectedAccountId === 'active' ? activeId : selectedAccountId === 'all' ? null : selectedAccountId;

  // Initialize form campaignId
  useEffect(() => {
    if (!campaignId && activeId) {
      setCampaignId(activeId);
    }
  }, [activeId, campaignId]);

  // Attempt initial fetch from backend database if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const fetchDatabaseEntries = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/journal', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (Array.isArray(res.data) && res.data.length > 0) {
          // Merge with store entries
          res.data.forEach((dbEntry: any) => {
            const exists = journalEntries.some(e => e.id === dbEntry._id || e.id === dbEntry.id);
            if (!exists) {
              addJournalEntry({
                title: dbEntry.title,
                content: dbEntry.content,
                date: dbEntry.date,
                campaignId: dbEntry.account || activeId,
                mood: dbEntry.mood,
                tags: dbEntry.tags
              });
            }
          });
        }
      } catch (err) {
        // Backend not running or token invalid - gracefully persist via local store
      }
    };
    fetchDatabaseEntries();
  }, []);

  // Filter entries based on account selection, search query, and mood
  const filteredEntries = useMemo(() => {
    return (journalEntries || []).filter(entry => {
      // Account isolation
      if (effectiveId && entry.campaignId && entry.campaignId !== effectiveId) {
        return false;
      }

      // Mood filter
      if (moodFilter !== 'All' && entry.mood !== moodFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (entry.title || '').toLowerCase().includes(q);
        const matchesContent = (entry.content || '').toLowerCase().includes(q);
        const matchesTags = (entry.tags || []).some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesTags) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [journalEntries, effectiveId, moodFilter, searchQuery]);

  const handleOpenCreate = () => {
    if (triggerReadOnlyAlert('create a new journal entry')) return;
    setEditingId(null);
    setTitle('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setContent('');
    setMood('Disciplined');
    setTags('');
    setCampaignId(effectiveId || activeId || (campaigns.length > 0 ? campaigns[0].id : ''));
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (entry: JournalEntry) => {
    if (triggerReadOnlyAlert('edit a journal entry')) return;
    setEditingId(entry.id);
    setTitle(entry.title || `Trading Log - ${format(new Date(entry.date), 'MMM d, yyyy')}`);
    setDate(entry.date);
    setContent(entry.content);
    setMood(entry.mood || 'Disciplined');
    setTags((entry.tags || []).join(', '));
    setCampaignId(entry.campaignId || activeId || '');
    setIsEditorOpen(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (triggerReadOnlyAlert('save a journal entry')) return;
    if (!content.trim()) return;

    const parsedTags = tags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const entryTitle = title.trim() || `Daily Thesis - ${format(new Date(date), 'MMMM d, yyyy')}`;

    if (editingId) {
      // Update entry in store
      updateJournalEntry(editingId, {
        title: entryTitle,
        date,
        content: content.trim(),
        mood,
        tags: parsedTags,
        campaignId
      });

      // Sync with database if token available
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await axios.put(`http://localhost:5000/api/journal/${editingId}`, {
            title: entryTitle,
            date,
            content: content.trim(),
            mood,
            tags: parsedTags,
            account: campaignId
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch {
          // gracefully saved locally
        }
      }
    } else {
      // Create new entry
      addJournalEntry({
        title: entryTitle,
        date,
        content: content.trim(),
        mood,
        tags: parsedTags,
        campaignId
      });

      // Sync with database if token available
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await axios.post('http://localhost:5000/api/journal', {
            title: entryTitle,
            date,
            content: content.trim(),
            mood,
            tags: parsedTags,
            account: campaignId
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch {
          // gracefully saved locally
        }
      }
    }

    setIsSaved(true);
    setSyncNotice('Saved and persisted successfully!');
    setTimeout(() => {
      setIsSaved(false);
      setSyncNotice('');
      setIsEditorOpen(false);
    }, 1000);
  };

  const handleDelete = async (id: string) => {
    if (triggerReadOnlyAlert('delete a journal entry')) return;
    if (!confirm('Are you sure you want to delete this journal entry?')) return;
    deleteJournalEntry(id);

    const token = localStorage.getItem('token');
    if (token) {
      try {
        await axios.delete(`http://localhost:5000/api/journal/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {
        // deleted locally
      }
    }
  };

  return (
    <div className="max-w-[1680px] mx-auto w-full pb-16 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-[#111722]/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-[#1E293B] shadow-xs">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <BookOpen className="w-7 h-7 text-primary dark:text-blue-400" />
              Trading Journal
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
              Document execution psychology, market hypotheses, session reviews, and lessons learned.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Account Selector */}
            {campaigns.length > 0 && (
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-gray-100 dark:bg-[#182030] text-gray-900 dark:text-white font-bold text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-gray-200/80 dark:border-slate-700 cursor-pointer shadow-xs"
              >
                <option value="active">Active Account Only</option>
                <option value="all">All Accounts</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Entry</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-[#111722]/80 backdrop-blur-md border border-gray-200/80 dark:border-[#1E293B] shadow-xs text-xs">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes, titles, or #tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/80 dark:border-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Mood Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-gray-400 font-bold text-[11px] mr-1 hidden md:inline">State:</span>
            {['All', ...MOODS].map(m => (
              <button
                key={m}
                onClick={() => setMoodFilter(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  moodFilter === m
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-[#182030] text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Editor Modal / Panel */}
        <AnimatePresence>
          {isEditorOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#111722] rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-[#1E293B] overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#1E293B]">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {editingId ? 'Edit Journal Entry' : 'Create Journal Entry'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsEditorOpen(false)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEntry} className="p-5 space-y-4 text-xs">
                  
                  {/* Title & Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                        Entry Title / Daily Thesis
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. London Open Gold Breakout & FOMC Bias"
                        className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                        Trading Date
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Account & Mood */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                        Associated Account
                      </label>
                      <select
                        value={campaignId}
                        onChange={e => setCampaignId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
                      >
                        {campaigns.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.phase})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                        Emotional State / Mood
                      </label>
                      <div className="flex gap-1.5 flex-wrap">
                        {MOODS.map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setMood(m)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              mood === m
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-gray-100 dark:bg-[#182030] text-gray-600 dark:text-slate-400 hover:bg-gray-200'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Tags (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={e => setTags(e.target.value)}
                      placeholder="e.g. gold, breakout, news, patience, risk-respected"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Journal Notes Content */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Trading Notes & Analysis
                    </label>
                    <textarea
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="What was your pre-market bias? What mistakes or disciplined executions took place today? Any rule adjustments?"
                      className="w-full h-44 p-3.5 border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-[#182030] text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded-xl focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                      required
                    />
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#1E293B]">
                    <span className="text-[11px] text-emerald-600 font-semibold">{syncNotice}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditorOpen(false)}
                        className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSaved ? 'Saved!' : 'Save Entry'}</span>
                      </button>
                    </div>
                  </div>

                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Entries List */}
        {filteredEntries.length === 0 ? (
          <Card className="shadow-xs border border-gray-200/80 dark:border-[#1E293B]">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                No Journal Entries Found
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                Record your daily pre-market preparation, psychology observations, and risk discipline.
              </p>
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Create First Entry
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {filteredEntries.map(entry => {
              const linkedCampaign = campaigns.find(c => c.id === entry.campaignId);

              return (
                <Card 
                  key={entry.id} 
                  className="shadow-xs hover:shadow-md transition-all duration-200 border border-gray-200/80 dark:border-[#1E293B] bg-white/80 dark:bg-[#111722]/80 backdrop-blur-md flex flex-col justify-between"
                >
                  <CardHeader className="p-4 sm:p-5 pb-2 border-b border-gray-100 dark:border-[#1E293B]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                            <Calendar className="w-3 h-3 text-blue-500" />
                            {format(new Date(entry.date), 'MMMM d, yyyy')}
                          </span>

                          {/* Mood Badge */}
                          {entry.mood && (
                            <span className={`px-2 py-0.2 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                              entry.mood === 'Disciplined' || entry.mood === 'Patient'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/60'
                                : entry.mood === 'Frustrated'
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200/60'
                                : entry.mood === 'Excited'
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200/60'
                                : 'bg-gray-100 dark:bg-[#182030] text-gray-600 dark:text-slate-300 border-gray-200/60'
                            }`}>
                              {entry.mood}
                            </span>
                          )}

                          {/* Linked Account Badge */}
                          {linkedCampaign && (
                            <span className="px-2 py-0.2 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-[#182030] text-gray-600 dark:text-slate-400 border border-gray-200/60 dark:border-slate-700">
                              {linkedCampaign.name}
                            </span>
                          )}
                        </div>

                        <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white pt-0.5">
                          {entry.title || `Journal Entry - ${format(new Date(entry.date), 'MMM d, yyyy')}`}
                        </CardTitle>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEdit(entry)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit entry"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 pt-3 space-y-3 flex-1 flex flex-col justify-between">
                    {/* Notes Content */}
                    <p className="whitespace-pre-wrap text-xs sm:text-sm text-gray-700 dark:text-slate-300 leading-relaxed font-normal">
                      {entry.content}
                    </p>

                    {/* Tags List */}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-gray-100 dark:border-[#1E293B]">
                        <Tag className="w-3 h-3 text-gray-400 shrink-0" />
                        {entry.tags.map((t, i) => (
                          <span 
                            key={i} 
                            className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#182030] text-gray-600 dark:text-slate-400 text-[10px] font-semibold"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      </motion.div>
    </div>
  );
}
