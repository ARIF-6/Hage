import { Link } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-[#0B0E14] border-t border-gray-200 dark:border-slate-800 pt-16 pb-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Brand & Mission */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="bg-primary text-white p-1.5 rounded-md">
                <BarChart2 className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight text-gray-900 dark:text-white">
                HAGE
              </span>
            </Link>
            <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
              Track Every Trade. Master Every Decision. The professional trading journal for serious traders.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-colors text-sm font-medium">
                Twitter
              </a>
              <a href="#" className="text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-colors text-sm font-medium">
                GitHub
              </a>
              <a href="#" className="text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-colors text-sm font-medium">
                LinkedIn
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Product</h4>
            <ul className="space-y-3">
              <li><Link to="/#features" className="text-sm text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400">Features</Link></li>
              <li><Link to="/#pricing" className="text-sm text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400">Pricing</Link></li>
              <li><Link to="/about" className="text-sm text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400">About Us</Link></li>
              <li><Link to="/contact" className="text-sm text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><Link to="/privacy" className="text-sm text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400">Terms of Service</Link></li>
            </ul>
          </div>
          
          {/* Support */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Support</h4>
            <ul className="space-y-3">
              <li><Link to="/#faq" className="text-sm text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400">FAQ</Link></li>
              <li><Link to="/contact" className="text-sm text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400">Help Center</Link></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-gray-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            &copy; {currentYear} HAGE Trading Journal. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
