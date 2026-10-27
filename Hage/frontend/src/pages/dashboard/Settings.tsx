import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function Settings() {
  const [mt5Connected, setMt5Connected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setMt5Connected(true);
    }, 1500);
  };

  return (
    <div className="max-w-[1600px] mx-auto w-full pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
        <p className="text-gray-500 dark:text-slate-400 mb-8">Manage app preferences and connections.</p>
        
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Broker Connections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border border-gray-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">MetaTrader 5</h4>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {mt5Connected ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">Connected (Syncing active)</span> : 'Not connected'}
                </p>
              </div>
              {mt5Connected ? (
                <Button variant="outline" className="text-red-600 dark:text-rose-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-rose-950/50 border-red-200 dark:border-rose-900/60" onClick={() => setMt5Connected(false)}>Disconnect</Button>
              ) : (
                <Button variant="outline" onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting ? 'Connecting...' : 'Connect MT5'}
                </Button>
              )}
            </div>
            
            <div className="p-4 border border-gray-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">MetaTrader 4</h4>
                <p className="text-sm text-gray-500 dark:text-slate-400">Coming soon</p>
              </div>
              <Button variant="outline" disabled>Coming Soon</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
