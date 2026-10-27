import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { resolvedTheme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Features', path: '/#features' },
    { name: 'Pricing', path: '/#pricing' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
    { name: 'FAQ', path: '/#faq' },
  ];

  return (
    <header
      className={cn(
        'fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent',
        isScrolled ? 'bg-white/90 dark:bg-[#0B0E14]/90 backdrop-blur-md border-gray-200/80 dark:border-slate-800 shadow-sm py-3' : 'bg-transparent py-5'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/Hage.png" alt="Hage Logo" className="w-10 h-10 object-contain rounded-lg shadow-sm" />
            <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">
              HAGE
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const className = "text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-primary dark:hover:text-blue-400 transition-colors";
              return link.path.startsWith('/#') ? (
                <a key={link.name} href={link.path} className={className}>
                  {link.name}
                </a>
              ) : (
                <Link key={link.name} to={link.path} className={className}>
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Action & Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-[#182030] transition-colors"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {resolvedTheme === 'dark' ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </button>

            <Link 
              to="/login" 
              className="text-sm font-semibold text-gray-700 dark:text-slate-200 hover:text-primary dark:hover:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#182030] transition-colors"
            >
              Log in
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-[#182030] transition-colors"
              title="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </button>
            <button
              className="p-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white focus:outline-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-[#111722] border-b border-gray-200 dark:border-slate-800 overflow-hidden shadow-lg"
          >
            <div className="px-4 py-6 space-y-4 flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-base font-medium text-gray-700 dark:text-slate-200 hover:text-primary dark:hover:text-blue-400"
                >
                  {link.name}
                </Link>
              ))}
              <hr className="my-2 border-gray-100 dark:border-slate-800" />
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block text-base font-semibold text-gray-700 dark:text-slate-200 hover:text-primary dark:hover:text-blue-400">
                Log in
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full">Get Started</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
