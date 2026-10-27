import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, Hash, Users, Smile,
  TrendingUp, BarChart2, Award, HelpCircle, Trash2,
  Wifi, WifiOff, Loader2, Lock, Globe, CheckCircle2,
  Clock, XCircle, Plus, X, Menu, ChevronLeft
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface ChatMessage {
  id: string; roomId: string; author: string;
  authorInitial: string; authorColor: string;
  text: string; timestamp: number;
  reactions: Record<string, string[]>;
}

interface Group {
  id: string; name: string; description: string;
  icon: string; color: string; isPrivate: boolean;
  createdAt: string; memberCount: number;
}

interface JoinRequest {
  id: string; groupId: string; groupName: string;
  username: string; status: 'pending' | 'accepted' | 'rejected';
  requestedAt: string; resolvedAt: string | null;
}

interface Room {
  id: string; label: string; icon: typeof Hash;
  description: string; color: string; isBuiltIn: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const BUILT_IN_ROOMS: Room[] = [
  { id: 'general',   label: 'General',   icon: Hash,       description: 'Open discussion for all traders',  color: 'text-blue-400',   isBuiltIn: true },
  { id: 'analysis',  label: 'Analysis',  icon: BarChart2,  description: 'Share trade analysis & setups',    color: 'text-emerald-400', isBuiltIn: true },
  { id: 'strategy',  label: 'Strategy',  icon: TrendingUp, description: 'Strategy talk and breakdowns',     color: 'text-violet-400',  isBuiltIn: true },
  { id: 'wins',      label: 'Wins 🏆',   icon: Award,      description: 'Post your winning trades',         color: 'text-amber-400',   isBuiltIn: true },
  { id: 'questions', label: 'Questions', icon: HelpCircle, description: 'Ask the community anything',       color: 'text-rose-400',    isBuiltIn: true },
];

const REACTION_EMOJIS = ['👍', '🔥', '💯', '📈', '🚀'];
const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600', 'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600', 'from-cyan-500 to-sky-600',
];

const API = 'http://localhost:5000/api/community';
const POLL_MS = 3000;

/* ------------------------------------------------------------------ */
/*  API helpers                                                         */
/* ------------------------------------------------------------------ */
const fetchMessages = (room: string, since?: number) => {
  const p = new URLSearchParams({ room });
  if (since) p.set('since', String(since));
  return fetch(`${API}/messages?${p}`).then(r => r.json()) as Promise<ChatMessage[]>;
};

const apiSend = (payload: any) =>
  fetch(`${API}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());

const apiReact = (id: string, emoji: string, username: string) =>
  fetch(`${API}/messages/${id}/react`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji, username }) }).then(r => r.json());

const apiDelete = (id: string, username: string) =>
  fetch(`${API}/messages/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });

const fetchGroups = () => fetch(`${API}/groups`).then(r => r.json()) as Promise<Group[]>;

const fetchMyMemberships = (username: string) =>
  fetch(`${API}/my-memberships?username=${encodeURIComponent(username)}`).then(r => r.json()) as Promise<JoinRequest[]>;

const apiRequestJoin = (groupId: string, username: string) =>
  fetch(`${API}/join-requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId, username }) }).then(r => r.json());

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */
export default function Community() {
  const [activeRoom, setActiveRoom] = useState('general');
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [groups, setGroups]         = useState<Group[]>([]);
  const [memberships, setMemberships] = useState<JoinRequest[]>([]);
  const [inputText, setInputText]   = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [isOnline, setIsOnline]     = useState(true);
  const [isSending, setIsSending]   = useState(false);
  const [isLoading, setIsLoading]   = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [onlineCount]               = useState(Math.floor(Math.random() * 28) + 8);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const lastTsRef      = useRef<number>(0);
  const pollingRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Current user */
  const currentUser = (() => {
    try {
      const stored = localStorage.getItem('hage_user');
      if (stored) return JSON.parse(stored).username || JSON.parse(stored).name;
    } catch {}
    return localStorage.getItem('hage_username') || localStorage.getItem('hage_display_name') || 'Trader';
  })();
  const currentInitial = currentUser[0].toUpperCase();
  const currentColor   = AVATAR_COLORS[currentUser.charCodeAt(0) % AVATAR_COLORS.length];

  /* All rooms = built-in + groups where user is member */
  const allRooms: Room[] = [
    ...BUILT_IN_ROOMS,
    ...groups.map(g => ({
      id: g.id, label: g.name,
      icon: Hash as typeof Hash,
      description: g.description,
      color: g.color, isBuiltIn: false,
    })),
  ];
  const activeRoomData = allRooms.find(r => r.id === activeRoom) || BUILT_IN_ROOMS[0];

  /* Membership helpers */
  const getMembership = (groupId: string) => memberships.find(m => m.groupId === groupId);
  const isMember = (groupId: string) => getMembership(groupId)?.status === 'accepted';

  /* Check if user can chat in active room (built-in always yes, group needs membership) */
  const canChat = activeRoomData.isBuiltIn || isMember(activeRoom);

  /* ── Load groups + memberships on mount ── */
  useEffect(() => {
    (async () => {
      try {
        const [g, m] = await Promise.all([fetchGroups(), fetchMyMemberships(currentUser)]);
        setGroups(Array.isArray(g) ? g : []);
        setMemberships(Array.isArray(m) ? m : []);
      } catch {}
    })();
  }, [currentUser]);

  /* ── Load messages when room changes ── */
  const loadRoom = useCallback(async (room: string) => {
    setIsLoading(true);
    try {
      const msgs = await fetchMessages(room);
      setMessages(msgs);
      lastTsRef.current = msgs.length > 0 ? Math.max(...msgs.map(m => m.timestamp)) : 0;
      setIsOnline(true);
    } catch { setIsOnline(false); }
    setIsLoading(false);
  }, []);

  useEffect(() => { loadRoom(activeRoom); }, [activeRoom, loadRoom]);

  /* ── Polling ── */
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const newMsgs = await fetchMessages(activeRoom, lastTsRef.current);
        if (newMsgs.length > 0) {
          setMessages(prev => {
            const ids = new Set(prev.map(m => m.id));
            const fresh = newMsgs.filter(m => !ids.has(m.id));
            if (!fresh.length) return prev;
            const merged = [...prev, ...fresh];
            lastTsRef.current = Math.max(...merged.map(m => m.timestamp));
            return merged;
          });
        }
        setIsOnline(true);
      } catch { setIsOnline(false); }
    }, POLL_MS);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [activeRoom]);

  /* ── Scroll ── */
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  /* ── Send ── */
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending || !canChat) return;
    setIsSending(true); setInputText('');
    try {
      const msg = await apiSend({ roomId: activeRoom, author: currentUser, authorInitial: currentInitial, authorColor: currentColor, text });
      if (msg.id) {
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        lastTsRef.current = Math.max(lastTsRef.current, msg.timestamp || 0);
      }
      setIsOnline(true);
    } catch { setIsOnline(false); setInputText(text); }
    setIsSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [inputText, activeRoom, currentUser, currentInitial, currentColor, isSending, canChat]);

  /* ── React ── */
  const handleReact = async (msgId: string, emoji: string) => {
    setShowEmojiPicker(null);
    try {
      const updated = await apiReact(msgId, emoji, currentUser);
      setMessages(prev => prev.map(m => m.id === msgId ? updated : m));
    } catch {}
  };

  /* ── Delete ── */
  const handleDelete = async (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    try { await apiDelete(msgId, currentUser); } catch { loadRoom(activeRoom); }
  };

  /* ── Request Join ── */
  const handleRequestJoin = async (groupId: string) => {
    setRequestingId(groupId);
    try {
      const res = await apiRequestJoin(groupId, currentUser);
      if (res.id || res.request) {
        const jr: JoinRequest = res.id ? res : res.request;
        setMemberships(prev => {
          const exists = prev.find(m => m.groupId === groupId && m.username === currentUser);
          return exists ? prev : [...prev, jr];
        });
      }
    } catch {}
    setRequestingId(null);
  };

  /* Grouping messages by date */
  const roomMessages = messages.filter(m => m.roomId === activeRoom);
  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (ts: number) => {
    const d = new Date(ts), today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  const grouped = roomMessages.reduce<{ date: string; msgs: ChatMessage[] }[]>((acc, msg) => {
    const date = formatDate(msg.timestamp);
    const last = acc[acc.length - 1];
    if (last && last.date === date) last.msgs.push(msg);
    else acc.push({ date, msgs: [msg] });
    return acc;
  }, []);

  const onlineMembers = Array.from(
    new Map(messages.slice(-100).filter(m => m.author !== currentUser).reverse().map(m => [m.author, m])).values()
  ).slice(0, 8);

  return (
    <div className="max-w-[1400px] mx-auto w-full h-[calc(100vh-100px)] flex flex-col rounded-2xl overflow-hidden border border-gray-200/80 dark:border-[#1E293B] shadow-sm bg-white dark:bg-[#0E131F]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-3.5 border-b border-gray-200/80 dark:border-[#1E293B] bg-white/90 dark:bg-[#111722]/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Channels Toggle Button */}
          <button
            type="button"
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="md:hidden p-1.5 text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-[#182030] border border-gray-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
            title="Channels & Groups"
          >
            <Hash className="w-4 h-4 text-blue-500" />
            <span className="hidden xs:inline">Channels</span>
          </button>

          <div className="w-8 h-8 rounded-xl bg-blue-600/10 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h1 className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm tracking-tight truncate max-w-[140px] xs:max-w-none">
              Community Chat
            </h1>
            <p className="text-[10px] sm:text-[10.5px] text-gray-400 dark:text-slate-500 hidden xs:block">
              Trader-to-trader communication — live
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${isOnline ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
          {isOnline ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{onlineCount} online</> : <><WifiOff className="w-3 h-3" /> Offline</>}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 relative">

        {/* ── Mobile Sidebar Backdrop ── */}
        <AnimatePresence>
          {showMobileSidebar && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileSidebar(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
            />
          )}
        </AnimatePresence>

        {/* ── Channels Sidebar ── */}
        <div className={`w-64 md:w-48 shrink-0 border-r border-gray-200/80 dark:border-[#1E293B] bg-white dark:bg-[#0B0E17] flex flex-col py-3 gap-0.5 px-2 overflow-y-auto custom-scrollbar z-40 transition-all ${
          showMobileSidebar
            ? 'fixed inset-y-0 left-0 shadow-2xl md:static md:shadow-none'
            : 'hidden md:flex'
        }`}>

          {/* Mobile Drawer Header with Close Button */}
          <div className="md:hidden flex items-center justify-between pb-2 mb-2 px-2 border-b border-gray-100 dark:border-slate-800">
            <span className="font-bold text-xs text-gray-900 dark:text-white">Channels & Groups</span>
            <button
              onClick={() => setShowMobileSidebar(false)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Built-in rooms */}
          <p className="px-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-600 mb-1">Channels</p>
          {BUILT_IN_ROOMS.map(room => {
            const Icon = room.icon;
            const isActive = room.id === activeRoom;
            const count = messages.filter(m => m.roomId === room.id).length;
            return (
              <button key={room.id} 
                onClick={() => {
                  setActiveRoom(room.id);
                  setShowMobileSidebar(false);
                }}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer w-full text-xs font-medium ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-[#182030]'}`}>
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : room.color}`} />
                <span className="truncate flex-1">{room.label}</span>
                {!isActive && count > 0 && <span className="text-[9px] font-bold bg-blue-600/15 text-blue-500 px-1.5 py-0.5 rounded-full">{count > 99 ? '99+' : count}</span>}
              </button>
            );
          })}

          {/* Groups section */}
          {groups.length > 0 && (
            <>
              <p className="px-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-600 mb-1 mt-4">Groups</p>
              {groups.map(g => {
                const membership = getMembership(g.id);
                const isActive = g.id === activeRoom;
                const accepted = membership?.status === 'accepted';
                return (
                  <button key={g.id}
                    onClick={() => {
                      if (accepted) {
                        setActiveRoom(g.id);
                        setShowMobileSidebar(false);
                      }
                    }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all w-full text-xs font-medium ${
                      isActive && accepted ? 'bg-indigo-600 text-white shadow-sm cursor-pointer' :
                      accepted ? 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-[#182030] cursor-pointer' :
                      'text-gray-400 dark:text-slate-600 cursor-default opacity-70'
                    }`}>
                    <Hash className={`w-3.5 h-3.5 shrink-0 ${isActive && accepted ? 'text-white' : g.color}`} />
                    <span className="truncate flex-1">{g.name}</span>
                    {!membership && <Lock className="w-3 h-3 shrink-0 text-gray-400" />}
                    {membership?.status === 'pending' && <Clock className="w-3 h-3 shrink-0 text-amber-400" />}
                    {membership?.status === 'accepted' && !isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                    {membership?.status === 'rejected' && <XCircle className="w-3 h-3 shrink-0 text-rose-400" />}
                  </button>
                );
              })}
            </>
          )}

          {/* Members */}
          <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-[#1E293B]">
            <p className="px-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-600 mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" /> Members
            </p>
            <div className="flex items-center gap-2 px-2 py-1">
              <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${currentColor} flex items-center justify-center text-white font-bold text-[9px] relative shrink-0`}>
                {currentInitial}
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#0B0E17]" />
              </div>
              <span className="text-[10.5px] text-gray-600 dark:text-slate-400 truncate font-semibold">{currentUser} <span className="text-[9px] text-gray-400">(you)</span></span>
            </div>
            {onlineMembers.map((m, i) => (
              <div key={m.author} className="flex items-center gap-2 px-2 py-1">
                <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${m.authorColor || AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-[9px] relative shrink-0`}>
                  {m.authorInitial}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#0B0E17]" />
                </div>
                <span className="text-[10.5px] text-gray-600 dark:text-slate-400 truncate">{m.author}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* Room header */}
          <div className="px-4 py-2.5 border-b border-gray-200/80 dark:border-[#1E293B] shrink-0 flex items-center gap-2.5 bg-white/60 dark:bg-[#0E131F]/60">
            <activeRoomData.icon className={`w-4 h-4 ${activeRoomData.color}`} />
            <div className="flex-1 min-w-0">
              <span className="font-bold text-gray-900 dark:text-white text-sm"># {activeRoomData.label}</span>
              <span className="ml-2 text-[10.5px] text-gray-400 dark:text-slate-500">{activeRoomData.description}</span>
            </div>
            {!activeRoomData.isBuiltIn && (
              <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isMember(activeRoom) ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-[#182030] border-gray-200 dark:border-slate-700 text-gray-400'
              }`}>
                {isMember(activeRoom) ? <><CheckCircle2 className="w-3 h-3" /> Member</> : <><Lock className="w-3 h-3" /> Private Group</>}
              </span>
            )}
            <div className={`flex items-center gap-1 text-[10px] ${isOnline ? 'text-emerald-500' : 'text-rose-400'}`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            </div>
          </div>

          {/* ── GROUP GATE: show join prompt if not a member ── */}
          {!activeRoomData.isBuiltIn && !isMember(activeRoom) ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="max-w-sm w-full bg-white dark:bg-[#111722] rounded-2xl border border-gray-200/80 dark:border-[#1E293B] shadow-xl p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto">
                  <Lock className="w-7 h-7 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-1">#{activeRoomData.label}</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{activeRoomData.description || 'This is a private group.'}</p>
                </div>

                {(() => {
                  const m = getMembership(activeRoom);
                  if (!m) return (
                    <button
                      onClick={() => handleRequestJoin(activeRoom)}
                      disabled={requestingId === activeRoom}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {requestingId === activeRoom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Request to Join
                    </button>
                  );
                  if (m.status === 'pending') return (
                    <div className="py-3 px-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 font-semibold">
                      <Clock className="w-4 h-4 shrink-0" /> Request sent — waiting for admin approval
                    </div>
                  );
                  if (m.status === 'rejected') return (
                    <div className="py-3 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                      <XCircle className="w-4 h-4 shrink-0" /> Your request was declined
                    </div>
                  );
                  return null;
                })()}
              </div>
            </div>
          ) : (
            /* ── Messages ── */
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 custom-scrollbar" onClick={() => setShowEmojiPicker(null)}>
              {isLoading ? (
                <div className="flex items-center justify-center h-full gap-2 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span>
                </div>
              ) : grouped.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-60 text-center">
                  <activeRoomData.icon className={`w-10 h-10 ${activeRoomData.color}`} />
                  <p className="text-gray-500 dark:text-slate-400 text-sm font-semibold">No messages yet</p>
                  <p className="text-xs text-gray-400">Be the first to post in #{activeRoomData.label}!</p>
                </div>
              ) : grouped.map(group => (
                <div key={group.date}>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-[#1E293B]" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{group.date}</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-[#1E293B]" />
                  </div>
                  {group.msgs.map((msg, i) => {
                    const isMe = msg.author === currentUser;
                    const prev = group.msgs[i - 1];
                    const sameAuthor = prev && prev.author === msg.author;
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}
                        className={`group flex items-start gap-3 ${sameAuthor ? 'mt-0.5' : 'mt-3'}`}>
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${msg.authorColor || AVATAR_COLORS[0]} flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5 ${sameAuthor ? 'opacity-0 pointer-events-none' : ''}`}>
                          {msg.authorInitial}
                        </div>
                        <div className="flex-1 min-w-0">
                          {!sameAuthor && (
                            <div className="flex items-baseline gap-2 mb-0.5">
                              <span className={`text-xs font-bold ${isMe ? 'text-blue-500 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>{isMe ? 'You' : msg.author}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{formatTime(msg.timestamp)}</span>
                            </div>
                          )}
                          <p className="text-sm text-gray-800 dark:text-slate-200 leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
                          {/* Reactions */}
                          {Object.entries(msg.reactions).filter(([, u]) => u.length > 0).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {Object.entries(msg.reactions).filter(([, u]) => u.length > 0).map(([emoji, users]) => (
                                <button key={emoji} onClick={() => handleReact(msg.id, emoji)}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${users.includes(currentUser) ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-[#182030] border-gray-200/80 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-[#1E293B]'}`}>
                                  {emoji} {users.length}
                                </button>
                              ))}
                            </div>
                          )}
                          {/* Hover actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                            <button onClick={e => { e.stopPropagation(); setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id); }}
                              className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-[#182030] transition-colors cursor-pointer relative" title="React">
                              <Smile className="w-3.5 h-3.5" />
                              <AnimatePresence>
                                {showEmojiPicker === msg.id && (
                                  <motion.div initial={{ opacity: 0, scale: 0.9, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                                    className="absolute bottom-full left-0 mb-1 flex items-center gap-1 bg-white dark:bg-[#1a1e30] border border-gray-200 dark:border-slate-700 rounded-xl px-2 py-1.5 shadow-xl z-20">
                                    {REACTION_EMOJIS.map(emoji => (
                                      <button key={emoji} onClick={e => { e.stopPropagation(); handleReact(msg.id, emoji); }} className="text-lg hover:scale-125 transition-transform cursor-pointer">{emoji}</button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </button>
                            {isMe && (
                              <button onClick={() => handleDelete(msg.id)} className="p-1 rounded-md text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* ── Input bar (only when can chat) ── */}
          {(activeRoomData.isBuiltIn || isMember(activeRoom)) && (
            <div className="px-4 py-3 border-t border-gray-200/80 dark:border-[#1E293B] shrink-0 bg-white/80 dark:bg-[#0E131F]/80 backdrop-blur-md">
              <div className="flex items-end gap-3">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${currentColor} flex items-center justify-center text-white font-bold text-xs shrink-0`}>{currentInitial}</div>
                <div className="flex-1 flex items-end gap-2 bg-gray-100 dark:bg-[#182030] rounded-2xl border border-gray-200/80 dark:border-slate-700/60 px-3.5 py-2">
                  <textarea ref={inputRef} value={inputText} onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={`Message #${activeRoomData.label}…`} rows={1}
                    className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none resize-none max-h-32 overflow-y-auto custom-scrollbar"
                    style={{ lineHeight: '1.5' }} />
                  <button onClick={handleSend} disabled={!inputText.trim() || isSending}
                    className="p-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all cursor-pointer shrink-0 mb-0.5">
                    {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-1.5 ml-11">
                Press <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-slate-800 font-mono text-[9px]">Enter</kbd> to send ·{' '}
                <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-slate-800 font-mono text-[9px]">Shift+Enter</kbd> for new line
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
