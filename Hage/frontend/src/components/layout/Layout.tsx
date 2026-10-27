
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { AiLiveChatWidget } from '../chat/AiLiveChatWidget';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#f8fafc] dark:bg-[#0B0E14] text-gray-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />
      <main className="flex-grow pt-20">
        <Outlet />
      </main>
      <Footer />
      <AiLiveChatWidget />
    </div>
  );
}
