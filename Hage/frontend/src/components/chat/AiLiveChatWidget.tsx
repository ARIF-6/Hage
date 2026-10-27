import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, X, ChevronLeft, Bot, RefreshCw, Loader2,
  Sparkles, History, Plus, Trash2, Copy, Check,
  LifeBuoy, ChevronDown, ExternalLink, ArrowRight,
  MessageSquare, User, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Message {
  _id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  suggestedActions?: { label: string; prompt: string }[];
  canEscalate?: boolean;
  feedback?: 'helpful' | 'unhelpful' | null;
  createdAt: string;
}

interface Conversation {
  _id: string;
  title: string;
  status: 'active' | 'archived';
  lastMessageAt: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Safe Markdown Formatter Helper                                     */
/* ------------------------------------------------------------------ */
function renderMarkdown(content: string) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5 leading-relaxed text-[13px] break-words select-text">
      {lines.map((line, idx) => {
        // Headers
        if (line.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-black text-sm text-indigo-400 dark:text-indigo-300 mt-2.5 mb-1">
              {line.replace('### ', '')}
            </h4>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h3 key={idx} className="font-black text-base text-indigo-400 dark:text-indigo-300 mt-2.5 mb-1">
              {line.replace('## ', '')}
            </h3>
          );
        }
        // Bullet points
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          const itemText = line.trim().replace(/^[-*]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5">
              <span className="text-indigo-500 font-bold shrink-0 mt-0.5">•</span>
              <span>{formatInlineStyles(itemText)}</span>
            </div>
          );
        }
        // Numbered list
        const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5">
              <span className="font-bold text-indigo-400 text-xs shrink-0 mt-0.5">{numMatch[1]}.</span>
              <span>{formatInlineStyles(numMatch[2])}</span>
            </div>
          );
        }
        // Empty line
        if (!line.trim()) {
          return <div key={idx} className="h-1" />;
        }
        // Regular line
        return <p key={idx}>{formatInlineStyles(line)}</p>;
      })}
    </div>
  );
}

function formatInlineStyles(text: string): React.ReactNode {
  // Regex to parse **bold** and `code`
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-gray-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-xs text-indigo-600 dark:text-indigo-300">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/* ================================================================== */
/*  AiLiveChatWidget Component                                         */
/* ================================================================== */
export function AiLiveChatWidget({
  externalOpen,
  onExternalClose
}: {
  externalOpen?: boolean;
  onExternalClose?: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Client anonymous ID for guest sessions
  const getAnonymousId = () => {
    let id = localStorage.getItem('hage_ai_anon_id');
    if (!id) {
      id = 'anon_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      localStorage.setItem('hage_ai_anon_id', id);
    }
    return id;
  };

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Sync external open trigger (e.g. from TopHeader or Navbar button)
  useEffect(() => {
    if (externalOpen && !isOpen) {
      setIsOpen(true);
    }
  }, [externalOpen]);

  useEffect(() => {
    if (!isOpen && onExternalClose) {
      onExternalClose();
    }
  }, [isOpen]);

  // Global event listeners
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    const handleToggle = () => setIsOpen(prev => !prev);

    window.addEventListener('openAiChat', handleOpen);
    window.addEventListener('closeAiChat', handleClose);
    window.addEventListener('toggleAiChat', handleToggle);
    return () => {
      window.removeEventListener('openAiChat', handleOpen);
      window.removeEventListener('closeAiChat', handleClose);
      window.removeEventListener('toggleAiChat', handleToggle);
    };
  }, []);

  // Broadcast state change
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('aiChatStateChanged', { detail: { isOpen } }));
  }, [isOpen]);

  // Load conversation list and initial active chat
  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  const loadConversations = async () => {
    try {
      const anonId = getAnonymousId();
      const res = await axios.get(`${API_BASE}/ai-support/conversations`, {
        headers: getHeaders(),
        params: { anonymousId: anonId }
      });
      const list = res.data;
      setConversations(list);

      // Restore active or create initial
      const savedConvId = localStorage.getItem('hage_active_conv_id');
      if (savedConvId && list.some((c: any) => c._id === savedConvId)) {
        loadConversationMessages(savedConvId);
      } else if (list.length > 0) {
        loadConversationMessages(list[0]._id);
      } else {
        startNewConversation();
      }
    } catch (err) {
      console.warn('Could not load conversations, creating new session:', err);
      startNewConversation();
    }
  };

  const loadConversationMessages = async (convId: string) => {
    try {
      setActiveConvId(convId);
      localStorage.setItem('hage_active_conv_id', convId);
      const res = await axios.get(`${API_BASE}/ai-support/conversations/${convId}`, {
        headers: getHeaders(),
        params: { anonymousId: getAnonymousId() }
      });
      setMessages(res.data.messages || []);
      setView('chat');
    } catch (err) {
      console.error('Error loading conversation messages:', err);
    }
  };

  const startNewConversation = async () => {
    try {
      const anonId = getAnonymousId();
      const res = await axios.post(`${API_BASE}/ai-support/conversations`, {
        anonymousId: anonId,
        title: 'New Conversation'
      }, {
        headers: getHeaders()
      });
      const newConv = res.data.conversation;
      const initMsg = res.data.initialMessage;

      setConversations(prev => [newConv, ...prev]);
      setActiveConvId(newConv._id);
      localStorage.setItem('hage_active_conv_id', newConv._id);
      setMessages([initMsg]);
      setView('chat');
    } catch (err) {
      console.error('Failed to create new conversation:', err);
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await axios.delete(`${API_BASE}/ai-support/conversations/${convId}`, {
        headers: getHeaders(),
        params: { anonymousId: getAnonymousId() }
      });

      setConversations(prev => prev.filter(c => c._id !== convId));
      if (activeConvId === convId) {
        const remaining = conversations.filter(c => c._id !== convId);
        if (remaining.length > 0) {
          loadConversationMessages(remaining[0]._id);
        } else {
          startNewConversation();
        }
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  };

  // Auto-scroll on new messages
  useEffect(() => {
    if (view === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, view]);

  // Send message handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isTyping) return;

    let convId = activeConvId;
    if (!convId) {
      await startNewConversation();
      convId = localStorage.getItem('hage_active_conv_id');
      if (!convId) return;
    }

    const optimisticUserMsg: Message = {
      _id: `user_${Date.now()}`,
      conversationId: convId,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticUserMsg]);
    if (!textToSend) setInputValue('');
    setIsTyping(true);

    try {
      const res = await axios.post(`${API_BASE}/ai-support/conversations/${convId}/messages`, {
        content: text,
        anonymousId: getAnonymousId()
      }, {
        headers: getHeaders()
      });

      const assistantMsg = res.data.assistantMessage;
      setMessages(prev => [...prev, assistantMsg]);

      // Update conversation title in list if updated
      setConversations(prev => prev.map(c => {
        if (c._id === convId) {
          return {
            ...c,
            title: c.title === 'New Conversation' ? text.slice(0, 40) + '...' : c.title,
            lastMessageAt: new Date().toISOString()
          };
        }
        return c;
      }));
    } catch (err: any) {
      console.error('AI chat send error:', err);
      const fallbackErrorMsg: Message = {
        _id: `err_${Date.now()}`,
        conversationId: convId,
        role: 'assistant',
        content: `Sorry, I'm having trouble connecting right now. Please try again in a moment.`,
        canEscalate: false,
        suggestedActions: [],
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, fallbackErrorMsg]);
    } finally {
      setIsTyping(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  // Copy message text
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Escalate to human ticket
  const handleEscalate = async (inquiryText: string) => {
    if (!activeConvId) return;
    setTicketStatus('Submitting ticket to support team...');
    try {
      await axios.post(`${API_BASE}/ai-support/conversations/${activeConvId}/escalate`, {
        inquiry: inquiryText
      }, {
        headers: getHeaders()
      });
      setTicketStatus('Ticket created! Support team will reach out shortly.');
      setTimeout(() => setTicketStatus(null), 4000);

      const confirmMsg: Message = {
        _id: `sys_${Date.now()}`,
        conversationId: activeConvId,
        role: 'assistant',
        content: `✅ **Support Ticket Created!**\n\nYour inquiry has been escalated directly to our administrator team. We will review your account history and get back to you promptly.`,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, confirmMsg]);
    } catch (err) {
      setTicketStatus('Could not submit ticket. Please email support@hagetrading.com directly.');
      setTimeout(() => setTicketStatus(null), 4000);
    }
  };

  const filteredConversations = conversations.filter(c => 
    !searchHistory || c.title.toLowerCase().includes(searchHistory.toLowerCase())
  );

  return (
    <>
      {/* ── Floating Launcher Button ── */}
      <div className="fixed bottom-5 right-5 z-50">
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 15 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative group"
            >
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                title="Open HAGE AI Support Chat"
                className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 shadow-xl shadow-indigo-600/30 flex items-center justify-center text-white cursor-pointer relative overflow-hidden transition-all group-hover:shadow-indigo-500/50"
              >
                {/* Subtle pulse ring */}
                <span className="absolute -inset-1 rounded-2xl bg-indigo-500/30 animate-pulse pointer-events-none" />
                <Bot className="w-7 h-7 relative z-10" />

                {/* Live green dot indicator */}
                <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 shadow-xs" />
              </button>

              {/* Tooltip */}
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:group-hover:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900/90 dark:bg-black/90 backdrop-blur-md text-white text-xs font-bold whitespace-nowrap shadow-xl border border-white/10">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Support 24/7</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Main Chat Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 w-[calc(100vw-32px)] sm:w-[420px] max-w-[420px]">
            <motion.div
              key="ai-chat-window"
              initial={{ opacity: 0, y: 25, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 25, scale: 0.95 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={`rounded-2xl shadow-2xl flex flex-col border overflow-hidden ${
                isDark 
                  ? 'bg-[#0D1120] border-slate-700/70 text-slate-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]' 
                  : 'bg-white border-gray-200 text-gray-900 shadow-[0_20px_60px_-15px_rgba(59,130,246,0.2)]'
              }`}
              style={{ height: '620px', maxHeight: 'calc(100vh - 40px)' }}
            >
              {/* ── Header ── */}
              <div className={`px-4 py-3 flex items-center justify-between border-b shrink-0 select-none ${
                isDark ? 'bg-[#10162A] border-slate-800' : 'bg-gray-50 border-gray-200'
              }`}>
                {/* Left: Avatar & Title */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0">
                    <Bot className="w-5 h-5" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-black text-xs sm:text-sm tracking-tight truncate">
                        HAGE AI Support
                      </h3>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                        Live 24/7
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                      Institutional Trading Assistant
                    </p>
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* New Chat Button */}
                  <button
                    type="button"
                    onClick={startNewConversation}
                    title="Start New Conversation"
                    className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Plus className="w-4 h-4 text-indigo-400" />
                    <span className="hidden sm:inline text-[11px]">New</span>
                  </button>

                  {/* History Toggle */}
                  <button
                    type="button"
                    onClick={() => setView(prev => prev === 'chat' ? 'history' : 'chat')}
                    title="Conversation History"
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      view === 'history'
                        ? 'bg-indigo-600 text-white'
                        : isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <History className="w-4 h-4" />
                  </button>

                  {/* Close Widget */}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    title="Close"
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ── Status Banner (Ticket / Escalation) ── */}
              {ticketStatus && (
                <div className="px-4 py-2 bg-indigo-500/10 border-b border-indigo-500/20 text-indigo-400 text-xs font-semibold flex items-center gap-2">
                  <LifeBuoy className="w-3.5 h-3.5 shrink-0 animate-spin" />
                  <span className="truncate">{ticketStatus}</span>
                </div>
              )}

              {/* ── View 1: Active Chat View ── */}
              {view === 'chat' && (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages.map((msg) => {
                      const isUser = msg.role === 'user';

                      return (
                        <div
                          key={msg._id}
                          className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                        >
                          <div className={`flex items-start gap-2 max-w-[88%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            {!isUser && (
                              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[10px] shrink-0 mt-0.5 shadow-xs">
                                <Bot className="w-3.5 h-3.5" />
                              </div>
                            )}

                            {/* Message Bubble */}
                            <div
                              className={`p-3 rounded-2xl text-[13px] shadow-sm relative group ${
                                isUser
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs'
                                  : isDark
                                  ? 'bg-[#151B2E] border border-slate-800 text-slate-200 rounded-tl-xs'
                                  : 'bg-gray-100 border border-gray-200 text-gray-800 rounded-tl-xs'
                              }`}
                            >
                              {isUser ? (
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                              ) : (
                                renderMarkdown(msg.content)
                              )}

                              {/* Copy & Time Footer */}
                              <div className={`flex items-center justify-between gap-3 mt-2 text-[10px] ${
                                isUser ? 'text-blue-100/80' : 'text-gray-400 dark:text-slate-500'
                              }`}>
                                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                                {!isUser && (
                                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(msg._id, msg.content)}
                                      title="Copy Response"
                                      className="p-1 hover:text-white transition-colors cursor-pointer"
                                    >
                                      {copiedId === msg._id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Escalation Action Button */}
                          {!isUser && msg.canEscalate && (
                            <div className="ml-8 mt-1.5">
                              <button
                                type="button"
                                onClick={() => handleEscalate(msg.content)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-all shadow-xs cursor-pointer"
                              >
                                <LifeBuoy className="w-3.5 h-3.5" />
                                <span>Submit Official Support Ticket</span>
                              </button>
                            </div>
                          )}

                          {/* Suggested Action Chips */}
                          {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                            <div className="ml-8 flex flex-wrap gap-1.5 mt-2">
                              {msg.suggestedActions.map((action, aIdx) => (
                                <button
                                  key={aIdx}
                                  type="button"
                                  onClick={() => handleSendMessage(action.prompt)}
                                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                    isDark
                                      ? 'bg-slate-800/80 hover:bg-indigo-600/30 text-slate-300 hover:text-white border-slate-700 hover:border-indigo-500/40'
                                      : 'bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-600 border-gray-300 hover:border-blue-300 shadow-2xs'
                                  }`}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Typing Animation */}
                    {isTyping && (
                      <div className="flex items-start gap-2 max-w-[85%]">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[10px] shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                        <div className={`p-3 rounded-2xl rounded-tl-xs flex items-center gap-1.5 ${
                          isDark ? 'bg-[#151B2E] border border-slate-800' : 'bg-gray-100 border border-gray-200'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Composer */}
                  <div className={`p-3 border-t shrink-0 ${
                    isDark ? 'bg-[#10162A] border-slate-800' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="space-y-1.5"
                    >
                      <div className="relative flex items-center">
                        <textarea
                          ref={textareaRef}
                          rows={2}
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder="Ask a question about HAGE, rules, or features... (Enter to send)"
                          className={`w-full pr-12 pl-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-colors ${
                            isDark
                              ? 'bg-[#151B2E] border-slate-700 text-white placeholder-slate-500'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                          }`}
                          maxLength={2000}
                        />

                        {/* Send Button */}
                        <button
                          type="submit"
                          disabled={!inputValue.trim() || isTyping}
                          className="absolute right-2.5 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                        >
                          {isTyping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-slate-500 px-1">
                        <span>Shift + Enter for new line</span>
                        <span>{inputValue.length}/2000</span>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* ── View 2: History View ── */}
              {view === 'history' && (
                <div className="flex-1 flex flex-col min-h-0 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400">
                      Saved Conversations
                    </h4>
                    <button
                      type="button"
                      onClick={startNewConversation}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Chat</span>
                    </button>
                  </div>

                  {/* Search History */}
                  <input
                    type="text"
                    value={searchHistory}
                    onChange={(e) => setSearchHistory(e.target.value)}
                    placeholder="Search past conversations..."
                    className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors ${
                      isDark
                        ? 'bg-[#151B2E] border-slate-700 text-white placeholder-slate-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                  />

                  {/* Conversations List */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                    {filteredConversations.length === 0 ? (
                      <div className="py-12 text-center text-xs text-gray-400 dark:text-slate-500">
                        No conversations found.
                      </div>
                    ) : (
                      filteredConversations.map((c) => {
                        const isCurrent = c._id === activeConvId;
                        return (
                          <div
                            key={c._id}
                            onClick={() => loadConversationMessages(c._id)}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                              isCurrent
                                ? isDark
                                  ? 'bg-indigo-950/40 border-indigo-500/40 text-white'
                                  : 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold'
                                : isDark
                                ? 'bg-[#151B2E] border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white'
                                : 'bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900'
                            }`}
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate">{c.title}</p>
                                <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">
                                  {new Date(c.lastMessageAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteConversation(c._id, e)}
                              title="Delete conversation"
                              className="p-1 text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setView('chat')}
                    className="w-full py-2 text-xs font-bold text-center text-indigo-500 hover:underline cursor-pointer"
                  >
                    Back to Active Chat
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
