import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Sparkles, MessageSquare, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../services/adminApi';

export default function Support() {
  const [isSent, setIsSent] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject || !message) return;
    setSending(true);
    try {
      await adminApi.createSupportIssue(subject, message);
      setIsSent(true);
      setSubject('');
      setMessage('');
      setTimeout(() => setIsSent(false), 3500);
    } catch (err) {
      console.error('Error submitting support ticket:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto w-full pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Help &amp; Support</h1>
            <p className="text-gray-500 dark:text-slate-400">Get immediate 24/7 help from our AI Assistant or log a ticket with human support.</p>
          </div>
        </div>

        {/* Top 24/7 AI Live Chat Highlight Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shrink-0">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Need Immediate Help? Try AI Live Support</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  Online 24/7
                </span>
              </div>
              <p className="text-xs text-blue-100/90 max-w-xl mt-1 leading-relaxed">
                Get instant answers to drawdown rules, challenge targets, subscription questions, and trade journaling. No waiting time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('openAiChat'))}
              className="px-4 py-2 rounded-xl bg-white text-indigo-700 font-bold text-xs shadow-md hover:bg-blue-50 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span>Start Live Chat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSent && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-sm rounded-lg border border-emerald-200 dark:border-emerald-900/60 font-medium">
                  Message sent successfully! Your issue has been logged with platform support.
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Subject</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm" 
                  placeholder="How can we help?" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Message</label>
                <textarea 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full h-32 px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded-lg resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm" 
                  placeholder="Describe your issue..." 
                />
              </div>
              <Button className="w-full" onClick={handleSend} disabled={!subject || !message || sending}>
                {sending ? 'Sending...' : 'Send Message'}
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-1">How do I sync my MT5 account?</h4>
                <p className="text-sm text-gray-600 dark:text-slate-400">Go to Settings &gt; Connections and enter your MT5 credentials. Our servers will securely sync your trades.</p>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-1">Can I export my journal data?</h4>
                <p className="text-sm text-gray-600 dark:text-slate-400">Yes, you can export your data as a CSV or PDF from the Analytics tab.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
