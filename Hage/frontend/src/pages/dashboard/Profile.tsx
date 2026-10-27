import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function Profile() {
  const [firstName, setFirstName] = useState(() => localStorage.getItem('profile_firstName') || 'Trader');
  const [lastName, setLastName] = useState(() => localStorage.getItem('profile_lastName') || '');
  const [email, setEmail] = useState(() => localStorage.getItem('profile_email') || 'trader@example.com');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const storedFirst = localStorage.getItem('profile_firstName');
    const storedLast = localStorage.getItem('profile_lastName');
    const storedEmail = localStorage.getItem('profile_email');
    if (storedFirst !== null) setFirstName(storedFirst);
    if (storedLast !== null) setLastName(storedLast);
    if (storedEmail !== null) setEmail(storedEmail);
  }, []);

  const handleSave = () => {
    localStorage.setItem('profile_firstName', firstName);
    localStorage.setItem('profile_lastName', lastName);
    localStorage.setItem('profile_email', email);
    window.dispatchEvent(new CustomEvent('profileUpdated'));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const initials = `${firstName.charAt(0)}${lastName.charAt(0) || firstName.charAt(1) || ''}`.toUpperCase() || 'TR';

  return (
    <div className="max-w-[1600px] mx-auto w-full pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Profile</h1>
        <p className="text-gray-500 dark:text-slate-400 mb-8">Manage your personal information and avatar.</p>
        
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6 mb-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-blue-950/60 flex items-center justify-center text-primary dark:text-blue-400 text-2xl font-bold border border-primary/20 dark:border-blue-800/60">
                {initials}
              </div>
              <Button variant="outline">Change Avatar</Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">First Name</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Last Name</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email Address</label>
                <input 
                  type="email" 
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-end pt-4 items-center gap-4">
              {isSaved && <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">Changes saved!</span>}
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
