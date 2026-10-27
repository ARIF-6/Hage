import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Contact from './pages/Contact';
import About from './pages/About';
import ResetPassword from './pages/ResetPassword';
import { Layout } from './components/layout/Layout';

import Dashboard from './pages/Dashboard';
import Campaigns from './pages/dashboard/Campaigns';
import Journal from './pages/dashboard/Journal';
import Trades from './pages/dashboard/Trades';
import Analytics from './pages/dashboard/Analytics';
import Calendar from './pages/dashboard/Calendar';
import Certificates from './pages/dashboard/Certificates';
import Profile from './pages/dashboard/Profile';
import Subscription from './pages/dashboard/Subscription';
import Support from './pages/dashboard/Support';
import Settings from './pages/dashboard/Settings';
import Payouts from './pages/dashboard/Payouts';
import Community from './pages/dashboard/Community';

import { DashboardRoute } from './components/auth/DashboardRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ThemeProvider } from './context/ThemeContext';

// Admin imports
import { AdminRoute } from './components/auth/AdminRoute';
import { AdminLayout } from './components/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAccounts from './pages/admin/AdminAccounts';
import AdminIssues from './pages/admin/AdminIssues';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';
import AdminPayouts from './pages/admin/AdminPayouts';
import AdminReports from './pages/admin/AdminReports';
import AdminSystemErrors from './pages/admin/AdminSystemErrors';
import AdminActivity from './pages/admin/AdminActivity';
import AdminSettings from './pages/admin/AdminSettings';
import AdminPortal from './pages/admin/AdminPortal';
import AdminEmailNotifications from './pages/admin/AdminEmailNotifications';
import AdminCommunityGroups from './pages/admin/AdminCommunityGroups';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="contact" element={<Contact />} />
            <Route path="about" element={<About />} />
          </Route>
          
          {/* Dashboard Routes wrapped in DashboardRoute and DashboardLayout */}
          <Route path="/dashboard" element={
            <DashboardRoute>
              <DashboardLayout />
            </DashboardRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="journal" element={<Journal />} />
            <Route path="trades" element={<Trades />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="payouts" element={<Payouts />} />
            <Route path="profile" element={<Profile />} />
            <Route path="subscription" element={<Subscription />} />
            <Route path="support" element={<Support />} />
            <Route path="settings" element={<Settings />} />
            <Route path="community" element={<Community />} />
            <Route path="*" element={<Dashboard />} />
          </Route>

          {/* Admin Choice Portal (Selection between User Dashboard & Admin Dashboard) */}
          <Route path="/portal" element={
            <AdminRoute>
              <AdminPortal />
            </AdminRoute>
          } />

          {/* Admin Routes wrapped in AdminRoute and AdminLayout */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="accounts" element={<AdminAccounts />} />
            <Route path="issues" element={<AdminIssues />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="payouts" element={<AdminPayouts />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="errors" element={<AdminSystemErrors />} />
            <Route path="activity" element={<AdminActivity />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="email" element={<AdminEmailNotifications />} />
            <Route path="community-groups" element={<AdminCommunityGroups />} />
            <Route path="*" element={<AdminOverview />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
