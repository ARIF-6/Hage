import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Sun, Moon } from 'lucide-react';
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

  const isDark = resolvedTheme !== 'light';

  return (
    <header
      style={{
        backgroundColor: isDark ? '#0E235C' : '#FFFFFF',
        borderBottom: isScrolled
          ? (isDark ? '1px solid rgba(235, 165, 70, 0.45)' : '1px solid rgba(14, 35, 92, 0.12)')
          : (isDark ? '1px solid rgba(235, 165, 70, 0.25)' : '1px solid rgba(14, 35, 92, 0.08)'),
        boxShadow: isScrolled 
          ? (isDark ? '0 4px 20px -2px rgba(14, 35, 92, 0.6)' : '0 4px 20px -2px rgba(0, 0, 0, 0.06)') 
          : 'none',
        backdropFilter: 'blur(12px)',
      }}
      className="fixed top-0 w-full z-50 transition-all duration-300 py-3 sm:py-3.5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/Hage.png"
              alt="Hage Logo"
              className="w-9 h-9 object-contain rounded-lg shadow-sm"
              style={{ border: '1px solid rgba(235, 165, 70, 0.4)' }}
            />
            <span
              style={{ color: isDark ? '#FFFFFF' : '#0E235C' }}
              className="font-extrabold text-xl tracking-tight flex items-center gap-1.5 transition-colors"
            >
              HAGE
              <span
                style={{
                  backgroundColor: 'rgba(235, 165, 70, 0.18)',
                  color: '#EBA546',
                  borderColor: 'rgba(235, 165, 70, 0.45)',
                }}
                className="text-[10px] px-1.5 py-0.5 rounded font-black border uppercase tracking-wider"
              >
                PRO
              </span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => {
              const linkProps = {
                style: { 
                  color: isDark ? '#FFFFFF' : '#0E235C', 
                  transition: 'color 0.15s ease' 
                },
                className:
                  'text-sm font-semibold hover:!text-[#EBA546] transition-colors cursor-pointer',
                onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
                  e.currentTarget.style.color = '#EBA546';
                },
                onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
                  e.currentTarget.style.color = isDark ? '#FFFFFF' : '#0E235C';
                },
              };

              return link.path.startsWith('/#') ? (
                <a key={link.name} href={link.path} {...linkProps}>
                  {link.name}
                </a>
              ) : (
                <Link key={link.name} to={link.path} {...linkProps}>
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
              style={{
                backgroundColor: isDark ? 'rgba(235, 165, 70, 0.12)' : 'rgba(235, 165, 70, 0.15)',
                borderColor: 'rgba(235, 165, 70, 0.35)',
                color: '#EBA546',
              }}
              className="p-2 rounded-lg border hover:bg-[#EBA546]/20 transition-colors cursor-pointer"
              title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
            >
              {isDark ? (
                <Moon className="w-4 h-4" style={{ color: '#EBA546' }} />
              ) : (
                <Sun className="w-4 h-4" style={{ color: '#EBA546' }} />
              )}
            </button>

            {/* Log in Button */}
            <Link
              to="/login"
              style={{
                color: isDark ? '#FFFFFF' : '#0E235C',
                borderColor: isDark ? 'rgba(235, 165, 70, 0.35)' : 'rgba(14, 35, 92, 0.25)',
                backgroundColor: isDark ? 'transparent' : '#FFFFFF',
              }}
              className="text-sm font-bold px-3.5 py-1.5 rounded-lg border hover:border-[#EBA546] hover:text-[#EBA546] transition-all cursor-pointer"
            >
              Log in
            </Link>

            {/* Get Started Button */}
            <Link
              to="/register"
              style={{
                backgroundColor: '#EBA546',
                color: '#0E235C',
                borderColor: '#EBA546',
              }}
              className="text-sm font-black px-4 py-1.5 rounded-lg border shadow-sm hover:!bg-[#FFFFFF] hover:!text-[#0E235C] transition-all active:scale-95 cursor-pointer"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              style={{
                backgroundColor: isDark ? 'rgba(235, 165, 70, 0.12)' : 'rgba(235, 165, 70, 0.15)',
                borderColor: 'rgba(235, 165, 70, 0.35)',
                color: '#EBA546',
              }}
              className="p-2 rounded-lg border transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {isDark ? (
                <Moon className="w-4 h-4" style={{ color: '#EBA546' }} />
              ) : (
                <Sun className="w-4 h-4" style={{ color: '#EBA546' }} />
              )}
            </button>

            <button
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(14, 35, 92, 0.06)',
                color: isDark ? '#FFFFFF' : '#0E235C',
              }}
              className="p-2 rounded-lg hover:text-[#EBA546] focus:outline-none cursor-pointer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" style={{ color: '#EBA546' }} />
              ) : (
                <Menu className="w-6 h-6" style={{ color: isDark ? '#FFFFFF' : '#0E235C' }} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              backgroundColor: isDark ? '#0E235C' : '#FFFFFF',
              borderBottom: isDark ? '1px solid rgba(235, 165, 70, 0.35)' : '1px solid rgba(14, 35, 92, 0.12)',
            }}
            className="md:hidden overflow-hidden shadow-2xl"
          >
            <div className="px-4 py-5 space-y-3 flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ color: isDark ? '#FFFFFF' : '#0E235C' }}
                  className="block text-base font-semibold hover:!text-[#EBA546] transition-colors py-1"
                >
                  {link.name}
                </Link>
              ))}

              <hr
                style={{ borderColor: isDark ? 'rgba(235, 165, 70, 0.25)' : 'rgba(14, 35, 92, 0.12)' }}
                className="my-2"
              />

              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  color: isDark ? '#FFFFFF' : '#0E235C',
                  borderColor: isDark ? 'rgba(235, 165, 70, 0.35)' : 'rgba(14, 35, 92, 0.25)',
                  backgroundColor: 'transparent',
                }}
                className="block text-center text-base font-bold py-2 rounded-lg border hover:text-[#EBA546] hover:border-[#EBA546] transition-colors"
              >
                Log in
              </Link>

              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  backgroundColor: '#EBA546',
                  color: '#0E235C',
                }}
                className="block text-center text-base font-black py-2 rounded-lg hover:!bg-[#FFFFFF] hover:!text-[#0E235C] transition-colors"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
