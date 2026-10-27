import { useRef, useState } from 'react';
import { 
  Award, CheckCircle2, Download, Printer, X, ShieldCheck, 
  Sparkles, Check, ArrowRight
} from 'lucide-react';
import { type Campaign, useTradeStore } from '../../store/useTradeStore';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';

interface CongratulationsCertificateModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  onConnectPhase2?: (campaign: Campaign) => void;
  onConnectFunded?: (campaign: Campaign) => void;
}

export function CongratulationsCertificateModal({
  campaign,
  isOpen,
  onClose,
  onConnectPhase2,
  onConnectFunded
}: CongratulationsCertificateModalProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const campaigns = useTradeStore(state => state.campaigns);

  if (!isOpen || !campaign) return null;

  const isAlreadyConnected = Boolean(
    campaign.nextPhaseConnected || 
    campaigns.some(c => c.parentCampaignId === campaign.id)
  );

  const isPhase1Passed = campaign.phase === 'Phase 1' && campaign.status === 'Passed';
  const isPhase2Passed = campaign.phase === 'Phase 2' && campaign.status === 'Passed';
  const passedDateFormatted = campaign.passedDate 
    ? format(new Date(campaign.passedDate), 'MMMM d, yyyy') 
    : format(new Date(), 'MMMM d, yyyy');

  const certId = `HAGE-PASSED-${campaign.accountNumber || '1001'}-${Math.abs(campaign.accountSize).toString().slice(0, 5)}`;
  const targetPct = campaign.profitTargetPercent || 8;
  const targetDollar = campaign.profitTarget || Math.round(campaign.accountSize * (targetPct / 100));

  const handleDownload = async () => {
    if (!certificateRef.current) return;
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0d131f'
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `HAGE_Certificate_${campaign.name.replace(/\s+/g, '_')}_Passed.png`;
      link.href = dataUrl;
      link.click();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to export certificate:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl my-auto" onClick={(e) => e.stopPropagation()}>
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between mb-3 text-white">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified Evaluation Pass
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloading ? 'Exporting...' : 'Save Certificate'}</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Certificate Card Printable Canvas */}
        <div 
          ref={certificateRef}
          className="relative bg-gradient-to-br from-[#0B0E14] via-[#111827] to-[#0A101D] text-white p-7 sm:p-10 rounded-2xl border-4 border-[#C9A227]/70 shadow-2xl overflow-hidden font-sans select-none"
        >
          {/* Ornate corner accents */}
          <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-[#C9A227]" />
          <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-[#C9A227]" />
          <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-[#C9A227]" />
          <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-[#C9A227]" />

          {/* Subtle Background Seal */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <Award className="w-[450px] h-[450px] text-[#C9A227]" />
          </div>

          <div className="relative z-10 text-center space-y-5">
            {/* HAGE Brand Header */}
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A227] to-[#8C6D14] flex items-center justify-center shadow-md">
                <Sparkles className="w-6 h-6 text-black" />
              </div>
              <span className="text-2xl sm:text-3xl font-black tracking-widest text-[#E5C358]">
                HAGE
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.3em] text-[#C9A227]/90">
                Official Certificate of Achievement
              </p>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                CONGRATULATIONS!
              </h2>
              <p className="text-xs sm:text-sm text-emerald-400 font-semibold tracking-wide">
                {isPhase1Passed 
                  ? 'You successfully passed Phase 1.' 
                  : isPhase2Passed 
                  ? 'You successfully passed Phase 2 and are now ready for your Funded Account!' 
                  : 'You successfully reached your Profit Target.'}
              </p>
            </div>

            {/* Phase 1 Passed Action: Connect Phase 2 Account OR Already Connected Badge */}
            {isPhase1Passed && (
              <div className="pt-1 flex justify-center" data-html2canvas-ignore="true">
                {isAlreadyConnected ? (
                  <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs sm:text-sm font-bold shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span>Phase 2 Account Connected</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onConnectPhase2?.(campaign);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-blue-500/25 border border-blue-400/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 print:hidden"
                  >
                    <span>Connect Phase 2 Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Phase 2 Passed Action: Connect Funded Account OR Already Connected Badge */}
            {isPhase2Passed && (
              <div className="pt-1 flex justify-center" data-html2canvas-ignore="true">
                {isAlreadyConnected ? (
                  <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs sm:text-sm font-bold shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Funded Account Connected</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onConnectFunded?.(campaign);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-500/25 border border-emerald-400/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 print:hidden"
                  >
                    <span>Connect Funded Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed font-light">
              This document officially certifies that the prop firm challenge account detailed below has satisfied all profit targets and risk management rules with verified discipline.
            </p>

            {/* Certificate Details Grid */}
            <div className="my-6 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-white/[0.04] border border-[#C9A227]/30 backdrop-blur-md text-left">
              
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account</span>
                <span className="text-xs sm:text-sm font-extrabold text-white truncate block mt-0.5">
                  {campaign.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">#{campaign.accountNumber}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prop Firm</span>
                <span className="text-xs sm:text-sm font-extrabold text-white truncate block mt-0.5">
                  {campaign.broker}
                </span>
                <span className="text-[10px] text-slate-400">{campaign.platform}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Size</span>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-400 block mt-0.5">
                  ${campaign.accountSize.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400">Trading Capital</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Evaluation Phase</span>
                <span className="text-xs sm:text-sm font-extrabold text-white block mt-0.5">
                  {campaign.phase}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">Requirement Satisfied</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Profit Target Reached</span>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-400 block mt-0.5">
                  +{targetPct}% (${targetDollar.toLocaleString()})
                </span>
                <span className="text-[10px] text-slate-400">Target Attained</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date Passed</span>
                <span className="text-xs sm:text-sm font-extrabold text-white block mt-0.5">
                  {passedDateFormatted}
                </span>
                <span className="text-[10px] text-slate-400">Timestamp Recorded</span>
              </div>

            </div>

            {/* Bottom Verification Seal & Signature */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#C9A227]/20 text-xs">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Verification Code</span>
                  <span className="font-mono text-xs text-[#E5C358] font-bold">{certId}</span>
                </div>
              </div>

              <div className="text-center sm:text-right">
                <div className="h-6 flex items-end justify-center sm:justify-end">
                  <span className="font-serif italic text-base text-[#C9A227] tracking-wider">HAGE Verification System</span>
                </div>
                <div className="w-44 border-t border-slate-600 mt-1" />
                <span className="text-[10px] text-slate-400 tracking-wider uppercase block mt-0.5">
                  Official Verification & Risk Engine
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
