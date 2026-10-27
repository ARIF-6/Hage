import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, RotateCcw, Maximize2, Minimize2,
  Sparkles, Layers, Target, BarChart2, Calendar as CalendarIcon,
  ShieldCheck, ArrowRight, Volume2, VolumeX
} from 'lucide-react';

interface Scene {
  id: number;
  title: string;
  badge: string;
  image: string;
  duration: number; // in seconds
  start: number;    // start time in seconds
  // Camera transform presets for Ken Burns / SaaS zoom
  initialTransform: { scale: number; x: string; y: string };
  animateTransform: { scale: number; x: string; y: string };
}

const SCENES: Scene[] = [
  {
    id: 1,
    title: 'Dashboard',
    badge: 'Overview & KPIs',
    image: '/demo/1_dashboard.png',
    duration: 4.5,
    start: 0,
    initialTransform: { scale: 1.0, x: '0%', y: '0%' },
    animateTransform: { scale: 1.08, x: '-3%', y: '-2%' }
  },
  {
    id: 2,
    title: 'Add Trade',
    badge: 'Execution Log',
    image: '/demo/2_add_trade.png',
    duration: 4.0,
    start: 4.5,
    initialTransform: { scale: 1.05, x: '0%', y: '0%' },
    animateTransform: { scale: 1.15, x: '0%', y: '-1%' }
  },
  {
    id: 3,
    title: 'Trades & Risk',
    badge: 'Risk Control & Goals',
    image: '/demo/3_trades.png',
    duration: 4.5,
    start: 8.5,
    initialTransform: { scale: 1.02, x: '1%', y: '0%' },
    animateTransform: { scale: 1.10, x: '-4%', y: '-3%' }
  },
  {
    id: 4,
    title: 'Analytics',
    badge: 'Performance Breakdown',
    image: '/demo/4_analytics.png',
    duration: 4.5,
    start: 13.0,
    initialTransform: { scale: 1.0, x: '0%', y: '0%' },
    animateTransform: { scale: 1.08, x: '-2%', y: '-3%' }
  },
  {
    id: 5,
    title: 'Calendar',
    badge: 'Monthly Performance',
    image: '/demo/1_dashboard.png', // focused camera crop on calendar in dashboard
    duration: 4.0,
    start: 17.5,
    initialTransform: { scale: 1.35, x: '-20%', y: '-10%' },
    animateTransform: { scale: 1.45, x: '-22%', y: '-12%' }
  },
  {
    id: 6,
    title: 'Accounts & Payouts',
    badge: 'Lifecycle Ledger',
    image: '/demo/6_accounts.png',
    duration: 4.5,
    start: 21.5,
    initialTransform: { scale: 1.0, x: '0%', y: '0%' },
    animateTransform: { scale: 1.08, x: '-3%', y: '-4%' }
  },
];

const TOTAL_DURATION = 26.0; // 26 seconds loop

export function ProductDemoVideo() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Current scene calculation based on timeline
  const currentSceneIndex = useMemo(() => {
    for (let i = SCENES.length - 1; i >= 0; i--) {
      if (currentTime >= SCENES[i].start) return i;
    }
    return 0;
  }, [currentTime]);

  const currentScene = SCENES[currentSceneIndex];

  // Timeline runner
  useEffect(() => {
    if (!isPlaying) return;

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setCurrentTime(prev => {
        const next = prev + delta;
        if (next >= TOTAL_DURATION) {
          return 0; // seamless loop
        }
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  const jumpToScene = (sceneIndex: number) => {
    setCurrentTime(SCENES[sceneIndex].start);
    setIsPlaying(true);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setCurrentTime(pos * TOTAL_DURATION);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct = (currentTime / TOTAL_DURATION) * 100;

  return (
    <div 
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden shadow-2xl border-2 border-[#C9A227]/40 bg-[#0B0E14] text-white select-none font-sans group transition-all duration-300 ${
        isFullscreen ? 'h-screen w-screen rounded-none' : 'aspect-[16/10] sm:aspect-[16/9.2]'
      }`}
    >
      {/* 1. TOP MAC BROWSER WINDOW BAR */}
      <div className="h-10 sm:h-11 bg-[#101520] border-b border-[#C9A227]/25 px-3 sm:px-4 flex items-center justify-between z-30 relative backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-xs" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-xs" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F] shadow-xs" />
          <span className="hidden md:inline-block ml-2 text-[11px] font-bold text-slate-400 font-mono tracking-wider">
            app.hage.trade
          </span>
        </div>

        {/* Chapter Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-1 px-1">
          {SCENES.map((scene, idx) => {
            const isActive = currentSceneIndex === idx;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => jumpToScene(idx)}
                className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#C9A227] to-[#A07C16] text-black shadow-md font-black scale-105'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                }`}
              >
                <span className="opacity-80 font-mono">{scene.id}.</span>
                <span>{scene.title}</span>
              </button>
            );
          })}
        </div>

        {/* Live Product Demo Badge */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline tracking-wider">HAGE SAAS</span>
          </span>
        </div>
      </div>

      {/* 2. CINEMATIC STAGE WITH REAL HAGE SCREENSHOTS */}
      <div className="relative w-full h-[calc(100%-6.5rem)] sm:h-[calc(100%-5.5rem)] overflow-hidden bg-[#070A10]">
        
        {/* Subtle Ambient Backlight Glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#C9A227]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentScene.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="w-full h-full relative overflow-hidden"
          >
            {/* Smooth Ken Burns Camera Zoom on the REAL Screenshot */}
            <motion.div
              initial={{ 
                scale: currentScene.initialTransform.scale, 
                x: currentScene.initialTransform.x, 
                y: currentScene.initialTransform.y 
              }}
              animate={{ 
                scale: currentScene.animateTransform.scale, 
                x: currentScene.animateTransform.x, 
                y: currentScene.animateTransform.y 
              }}
              transition={{ 
                duration: currentScene.duration, 
                ease: 'easeInOut' 
              }}
              className="w-full h-full origin-center relative flex items-center justify-center"
            >
              <img 
                src={currentScene.image} 
                alt={currentScene.title}
                className="w-full h-full object-cover sm:object-contain object-center drop-shadow-2xl"
              />
            </motion.div>

            {/* Elegant Floating Scene Info Overlay (Bottom-Left) */}
            <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-[#C9A227]/30 shadow-xl flex items-center gap-2"
              >
                <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#C9A227] to-[#8C6D14] flex items-center justify-center text-black font-black text-[10px]">
                  {currentScene.id}
                </div>
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>{currentScene.title}</span>
                    <span className="text-[9px] font-bold text-[#E5C358] uppercase px-1.5 py-0.2 rounded bg-[#C9A227]/15 border border-[#C9A227]/25">
                      {currentScene.badge}
                    </span>
                  </h4>
                </div>
              </motion.div>
            </div>

          </motion.div>
        </AnimatePresence>
      </div>

      {/* 3. BOTTOM VIDEO CONTROLS & TIMELINE SCRUBBER */}
      <div className="h-14 sm:h-12 bg-[#0B0E14]/95 border-t border-[#C9A227]/25 px-3 sm:px-4 flex flex-col justify-center z-30 relative backdrop-blur-md">
        
        {/* Interactive Timeline Bar */}
        <div 
          onClick={handleSeek}
          className="w-full h-2 rounded-full bg-slate-800/80 hover:bg-slate-700/80 cursor-pointer relative overflow-hidden mb-2 group/scrubber transition-all"
        >
          {/* Progress fill */}
          <div 
            className="h-full bg-gradient-to-r from-[#C9A227] via-[#E5C358] to-[#C9A227] rounded-full transition-all duration-75 relative"
            style={{ width: `${progressPct}%` }}
          />

          {/* Chapter divider marks */}
          {SCENES.map(scene => (
            <div 
              key={scene.id} 
              className="absolute top-0 bottom-0 w-0.5 bg-black/80"
              style={{ left: `${(scene.start / TOTAL_DURATION) * 100}%` }}
            />
          ))}
        </div>

        {/* Control Buttons & Timers */}
        <div className="flex items-center justify-between text-xs">
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Play/Pause */}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-[#C9A227] hover:text-black transition-all cursor-pointer active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>

            {/* Restart */}
            <button
              type="button"
              onClick={() => {
                setCurrentTime(0);
                setIsPlaying(true);
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Restart Showcase"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Time Stamp */}
            <span className="text-[11px] text-slate-400 font-mono">
              <span className="text-white font-bold">{formatTime(currentTime)}</span>
              <span className="mx-1">/</span>
              <span>{formatTime(TOTAL_DURATION)}</span>
            </span>
          </div>

          {/* Current Chapter Tagline */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#C9A227]" />
            <span className="text-slate-400">Viewing:</span>
            <span className="font-bold text-white">{currentScene.title}</span>
          </div>

          {/* Right Tools: Fullscreen */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
