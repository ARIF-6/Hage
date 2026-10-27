import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { 
  Sparkles, ShieldCheck, TrendingUp, Zap, 
  Maximize2, Moon, Sun, CheckCircle2, 
  Flame, Lock, ArrowUpRight, X, BarChart3, Calendar
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function HeroDashboardPreview() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [isZoomed, setIsZoomed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDark = resolvedTheme === 'dark';

  // Smooth 3D tilt effect on mouse move
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [7, -7]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-9, 9]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <>
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative max-w-6xl mx-auto mt-12 sm:mt-16 px-2 sm:px-4 perspective-[1400px]"
      >
        {/* Glowing Ambient Halo Behind the Showcase (Glows match theme) */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
          <div 
            className={`w-[90%] h-[75%] rounded-full blur-[100px] transition-all duration-700 ${
              isDark 
                ? 'bg-gradient-to-r from-blue-600/30 via-emerald-500/25 to-indigo-600/30' 
                : 'bg-gradient-to-r from-blue-400/25 via-indigo-300/20 to-emerald-400/25'
            }`} 
          />
        </div>

        {/* Floating Live Badge 1: Top Left - Net P&L */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          className="hidden lg:flex items-center gap-2.5 absolute -top-5 left-4 z-20 px-3.5 py-2 rounded-xl backdrop-blur-xl bg-white/90 dark:bg-[#0E131F]/90 border border-emerald-500/30 dark:border-emerald-500/40 shadow-xl shadow-emerald-500/10 text-xs font-semibold text-gray-900 dark:text-white"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-500">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-slate-400">Realized Net P&L</div>
            <div className="text-emerald-600 dark:text-emerald-400 font-black text-sm">+$5,500.00 <span className="text-[10px] font-bold text-emerald-500/80">(+5.5%)</span></div>
          </div>
        </motion.div>

        {/* Floating Live Badge 2: Top Right - Drawdown Safety */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="hidden lg:flex items-center gap-2.5 absolute -top-5 right-4 z-20 px-3.5 py-2 rounded-xl backdrop-blur-xl bg-white/90 dark:bg-[#0E131F]/90 border border-blue-500/30 dark:border-blue-500/40 shadow-xl shadow-blue-500/10 text-xs font-semibold text-gray-900 dark:text-white"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-500">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-slate-400">Prop Firm Safety</div>
            <div className="text-blue-600 dark:text-blue-400 font-black text-sm">0.75% / 5.0% <span className="text-[10px] font-bold text-blue-500/80">Drawdown</span></div>
          </div>
        </motion.div>

        {/* Floating Live Badge 3: Bottom Left - Win Rate */}
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="hidden sm:flex items-center gap-2.5 absolute -bottom-5 left-8 z-20 px-3.5 py-2 rounded-xl backdrop-blur-xl bg-white/90 dark:bg-[#0E131F]/90 border border-purple-500/30 dark:border-purple-500/40 shadow-xl shadow-purple-500/10 text-xs font-semibold text-gray-900 dark:text-white"
        >
          <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-500">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-slate-400">HAGE Score & Edge</div>
            <div className="text-purple-600 dark:text-purple-400 font-black text-sm">66.67% Win Rate <span className="text-[10px] font-bold text-purple-500/80">• 4.17 W/L</span></div>
          </div>
        </motion.div>

        {/* Floating Live Badge 4: Bottom Right - Streak */}
        <motion.div
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="hidden sm:flex items-center gap-2.5 absolute -bottom-5 right-8 z-20 px-3.5 py-2 rounded-xl backdrop-blur-xl bg-white/90 dark:bg-[#0E131F]/90 border border-amber-500/30 dark:border-amber-500/40 shadow-xl shadow-amber-500/10 text-xs font-semibold text-gray-900 dark:text-white"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-500">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-slate-400">October 2026 Streak</div>
            <div className="text-amber-600 dark:text-amber-400 font-black text-sm">5 Profitable Days <span className="text-[10px] font-bold text-amber-500/80">• +$3,750 Peak</span></div>
          </div>
        </motion.div>

        {/* ── Main Mockup Window Container with 3D Tilt ── */}
        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className={`relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 border ${
            isDark 
              ? 'bg-[#0B0F19] border-slate-700/60 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.85)] ring-1 ring-white/10' 
              : 'bg-white border-gray-200/90 shadow-[0_20px_70px_-15px_rgba(59,130,246,0.18)] ring-1 ring-black/5'
          }`}
        >
          {/* Window Chrome Titlebar */}
          <div className={`px-4 py-3 flex items-center justify-between border-b select-none transition-colors duration-500 ${
            isDark ? 'bg-[#0E1322] border-slate-800' : 'bg-gray-100/90 border-gray-200'
          }`}>
            {/* macOS Window Controls */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/90 inline-block shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-amber-500/90 inline-block shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/90 inline-block shadow-sm" />
              <span className="hidden sm:inline-block ml-2 text-xs font-bold text-gray-400 dark:text-slate-400">
                HAGE Trading System
              </span>
            </div>

            {/* Address / Status Bar */}
            <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
              isDark 
                ? 'bg-[#141A2B] border-slate-800 text-slate-300' 
                : 'bg-white border-gray-200 text-gray-600 shadow-xs'
            }`}>
              <Lock className="w-3 h-3 text-emerald-500" />
              <span className="font-mono text-[11px]">app.hage.io/dashboard/performance</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-bold ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            </div>

            {/* Actions: Theme Toggle & Zoom */}
            <div className="flex items-center gap-2">
              {/* Quick Theme Switcher inside Mockup */}
              <button
                type="button"
                onClick={toggleTheme}
                title={isDark ? "Switch to White / Light Mode" : "Switch to Black / Dark Mode"}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isDark 
                    ? 'bg-slate-800/90 text-amber-400 hover:bg-slate-700 border border-slate-700' 
                    : 'bg-white text-indigo-600 hover:bg-gray-50 border border-gray-300 shadow-xs'
                }`}
              >
                {isDark ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                    <span className="text-[11px]">Dark Active</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-[11px]">Light Active</span>
                  </>
                )}
              </button>

              {/* Fullscreen Zoom */}
              <button
                type="button"
                onClick={() => setIsZoomed(true)}
                title="View Full Resolution"
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Visual Screenshot Display with Silky Crossfade ── */}
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
            {/* Dark Mode Screenshot */}
            <img
              src="/hero-dashboard-dark.png"
              alt="HAGE Trading Journal - Dark Mode Dashboard"
              className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-700 ease-in-out ${
                isDark 
                  ? 'opacity-100 scale-100 pointer-events-auto filter-none' 
                  : 'opacity-0 scale-[1.02] pointer-events-none'
              }`}
              loading="eager"
            />

            {/* Light Mode Screenshot */}
            <img
              src="/hero-dashboard-light.png"
              alt="HAGE Trading Journal - Light Mode Dashboard"
              className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-700 ease-in-out ${
                !isDark 
                  ? 'opacity-100 scale-100 pointer-events-auto filter-none' 
                  : 'opacity-0 scale-[1.02] pointer-events-none'
              }`}
              loading="eager"
            />

            {/* Subtle Gradient Vignette for Depth */}
            <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
              isDark 
                ? 'bg-gradient-to-t from-[#0B0F19]/40 via-transparent to-transparent' 
                : 'bg-gradient-to-t from-gray-200/20 via-transparent to-transparent'
            }`} />

            {/* Floating Hover Indicator Hint */}
            <div className="absolute bottom-3 right-3 z-10">
              <button 
                type="button"
                onClick={() => setIsZoomed(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-md transition-all shadow-lg cursor-pointer ${
                  isDark 
                    ? 'bg-[#0E1322]/80 text-slate-200 hover:bg-blue-600 hover:text-white border border-slate-700' 
                    : 'bg-white/85 text-gray-800 hover:bg-blue-600 hover:text-white border border-gray-300'
                }`}
              >
                <Maximize2 className="w-3 h-3" />
                <span>Click to Expand</span>
              </button>
            </div>
          </div>

        </motion.div>
      </div>

      {/* ── Zoomed Fullscreen Modal Lightbox ── */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsZoomed(false)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md p-4 sm:p-8 flex flex-col items-center justify-center cursor-zoom-out"
          >
            <div className="relative max-w-6xl w-full max-h-[90vh] flex flex-col items-center">
              <div className="w-full flex items-center justify-between text-white mb-3 px-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">
                    HAGE Dashboard ({isDark ? 'Dark Mode' : 'Light Mode'})
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTheme();
                    }}
                    className="ml-3 px-2.5 py-1 rounded-md text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-blue-300" />}
                    <span>Switch to {isDark ? 'Light' : 'Dark'}</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsZoomed(false)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="relative rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-slate-950 w-full"
              >
                <img
                  src={isDark ? "/hero-dashboard-dark.png" : "/hero-dashboard-light.png"}
                  alt="HAGE Dashboard High Resolution"
                  className="w-full h-auto max-h-[80vh] object-contain mx-auto"
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
