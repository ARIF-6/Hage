import { useState } from 'react';
import { 
  Search, ChevronLeft, ChevronRight, ImageIcon, 
  Trash2, X, ExternalLink, Lock, Pencil
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { useTradeStore } from '../../store/useTradeStore';
import { AddTradeModal } from '../ui/AddTradeModal';

interface TradeTableProps {
  campaignId?: string;
}

export function TradeTable({ campaignId: propCampaignId }: TradeTableProps) {
  const { trades, campaigns, deleteTrade, activeCampaignId } = useTradeStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recent' | 'winning' | 'losing'>('recent');
  const [editTrade, setEditTrade] = useState<any | null>(null);

  const effectiveCampaignId = propCampaignId !== undefined 
    ? propCampaignId 
    : (activeCampaignId || (campaigns.length > 0 ? campaigns[0].id : null));

  // ACTIVE ACCOUNT ONLY: Filter trades strictly belonging to the currently selected account!
  const accountScopedTrades = effectiveCampaignId
    ? trades.filter(trade => trade.campaignId === effectiveCampaignId)
    : trades;

  const filteredTrades = accountScopedTrades.filter(trade => {
    // Tab filter
    if (activeTab === 'winning' && trade.result !== 'Win') return false;
    if (activeTab === 'losing' && trade.result !== 'Loss') return false;

    // Search filter
    let matchesSearch = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const campaignName = campaigns.find(c => c.id === trade.campaignId)?.name?.toLowerCase() || '';
      matchesSearch = trade.symbol.toLowerCase().includes(q) || campaignName.includes(q) || (trade.notes || '').toLowerCase().includes(q);
    }

    // Date filter
    let matchesDate = true;
    if (dateFilter) {
      try {
        const tDate = new Date(trade.date);
        const fDate = new Date(dateFilter);
        if (!isNaN(tDate.getTime()) && !isNaN(fDate.getTime())) {
          matchesDate = tDate.toDateString() === fDate.toDateString();
        }
      } catch {
        // ignore
      }
    }

    return matchesSearch && matchesDate;
  });

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-[#1E293B] pb-3">
          
          {/* Left: Title & Tabs */}
          <div className="flex items-center gap-4">
            <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
              Recent Trades
            </CardTitle>
            <div className="flex items-center bg-gray-100 dark:bg-[#182030] p-0.5 rounded-lg border border-gray-200/60 dark:border-slate-700/60 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('recent')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'recent' 
                    ? 'bg-white dark:bg-[#111722] text-blue-600 dark:text-blue-400 shadow-xs font-bold' 
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                }`}
              >
                All ({trades.length})
              </button>
              <button
                onClick={() => setActiveTab('winning')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'winning' 
                    ? 'bg-white dark:bg-[#111722] text-emerald-600 dark:text-emerald-400 shadow-xs font-bold' 
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                }`}
              >
                Wins
              </button>
              <button
                onClick={() => setActiveTab('losing')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'losing' 
                    ? 'bg-white dark:bg-[#111722] text-rose-600 dark:text-rose-400 shadow-xs font-bold' 
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                }`}
              >
                Losses
              </button>
            </div>
          </div>

          {/* Right: Search & Date Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-52">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Filter symbol or notes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-[#182030] border border-gray-200 dark:border-slate-700/70 rounded-lg text-gray-800 dark:text-slate-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
            <div className="relative">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-2.5 pr-2 py-1.5 text-xs bg-gray-50 dark:bg-[#182030] border border-gray-200 dark:border-slate-700/70 rounded-lg text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
            {dateFilter && (
              <button 
                onClick={() => setDateFilter('')}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-lg"
                title="Clear date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto min-h-[220px] flex flex-col custom-scrollbar">
            <table className="w-full text-xs text-left min-w-[750px]">
              <thead className="bg-gray-50/80 dark:bg-[#161F30]/60 text-gray-500 dark:text-slate-400 font-semibold border-b border-gray-100 dark:border-[#1E293B]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3">Side</th>
                  <th className="px-4 py-3">Lots</th>
                  <th className="px-4 py-3">Risk %</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3 text-right">Net P&L</th>
                  <th className="px-4 py-3 text-center">Chart</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1E293B]/60">
                {filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-400 dark:text-slate-400">
                      <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">No trades logged yet</p>
                      <p className="text-xs">Click "+ Add Trade" in the sidebar to record your first trade.</p>
                    </td>
                  </tr>
                ) : (
                  filteredTrades.slice(0, 15).map((trade) => {
                    const isWin = trade.result === 'Win';
                    const isLoss = trade.result === 'Loss';

                    return (
                      <tr 
                        key={trade.id} 
                        className="hover:bg-gray-50/70 dark:hover:bg-[#161F30]/50 transition-colors group"
                      >
                        {/* Date */}
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-slate-300 font-medium">
                          {trade.date}
                        </td>

                        {/* Campaign Name */}
                        <td className="px-4 py-3 whitespace-nowrap text-gray-800 dark:text-slate-200 font-semibold">
                          <span className="max-w-[120px] truncate inline-block">
                            {campaigns.find(c => c.id === trade.campaignId)?.name || 'Default'}
                          </span>
                        </td>

                        {/* Symbol Chip */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-gray-100 dark:bg-[#182030] text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-black">
                              {trade.symbol.substring(0, 2).toUpperCase()}
                            </span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {trade.symbol}
                            </span>
                          </div>
                        </td>

                        {/* Side Pill */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wide",
                            trade.type === 'Buy' 
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60" 
                              : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
                          )}>
                            {trade.type}
                          </span>
                        </td>

                        {/* Lot Size */}
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-slate-300 font-medium">
                          {trade.lotSize}
                        </td>

                        {/* Risk % */}
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-slate-300 font-medium">
                          {trade.risk}%
                        </td>

                        {/* Result with Indicator Dot */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 font-bold",
                            isWin ? 'text-emerald-600 dark:text-emerald-400' :
                            isLoss ? 'text-rose-600 dark:text-rose-400' :
                            'text-gray-500 dark:text-slate-400'
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isWin ? 'bg-emerald-500' :
                              isLoss ? 'bg-rose-500' :
                              'bg-gray-400'
                            )} />
                            {trade.result}
                          </span>
                        </td>

                        {/* Net PnL */}
                        <td className={cn(
                          "px-4 py-3 whitespace-nowrap text-right font-black text-[13px]",
                          trade.pnl > 0 ? "text-emerald-600 dark:text-emerald-400" : 
                          trade.pnl < 0 ? "text-rose-600 dark:text-rose-400" : 
                          "text-gray-700 dark:text-slate-300"
                        )}>
                          {trade.pnl > 0 ? '+' : ''}${Math.abs(trade.pnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Chart Docs */}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {trade.imageUrl ? (
                            <button 
                              onClick={() => setSelectedImage(trade.imageUrl!)}
                              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-1"
                              title="View trade chart screenshot"
                            >
                              <ImageIcon className="w-4 h-4 mx-auto" />
                            </button>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-700">
                              <ImageIcon className="w-4 h-4 mx-auto" />
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {(() => {
                            const tradeCampaign = campaigns.find(c => c.id === trade.campaignId);
                            const isTradeLocked = tradeCampaign ? (tradeCampaign.status === 'Passed' || tradeCampaign.status === 'Failed') : false;
                            
                            if (isTradeLocked) {
                              return (
                                <span 
                                  className="text-gray-400 dark:text-slate-600 p-1 inline-flex items-center" 
                                  title="Historical account is read-only."
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </span>
                              );
                            }

                            return (
                              <div className="flex items-center justify-end gap-0.5">
                                <button 
                                  className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 p-1 transition-colors cursor-pointer rounded"
                                  onClick={() => setEditTrade(trade)}
                                  title="Edit trade"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  className="text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 p-1 transition-colors cursor-pointer rounded"
                                  onClick={() => {
                                    if (confirm('Delete this trade record?')) {
                                      deleteTrade(trade.id);
                                    }
                                  }}
                                  title="Delete trade"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="border-t border-gray-100 dark:border-[#1E293B] px-4 py-2.5 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
            <span>
              Showing <span className="font-bold text-gray-800 dark:text-slate-200">{filteredTrades.length > 0 ? 1 : 0}</span> to <span className="font-bold text-gray-800 dark:text-slate-200">{Math.min(15, filteredTrades.length)}</span> of <span className="font-bold text-gray-800 dark:text-slate-200">{filteredTrades.length}</span> trades
            </span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-7 px-2 py-0" disabled>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-2 py-0" disabled>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full bg-[#111722] rounded-2xl border border-slate-700 p-3 shadow-2xl">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                Trade Screenshot
              </h4>
              <a 
                href={selectedImage} 
                target="_blank" 
                rel="noreferrer" 
                className="text-xs text-blue-400 hover:underline flex items-center gap-1 mr-8"
              >
                Open original <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center">
              <img src={selectedImage} alt="Trade chart" className="rounded-lg object-contain w-full" />
            </div>
          </div>
        </div>
      )}

      {/* Edit Trade Modal */}
      <AddTradeModal
        isOpen={!!editTrade}
        onClose={() => setEditTrade(null)}
        prefillTrade={editTrade}
      />
    </>
  );
}
