import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Mail, Phone, AlertTriangle, ShieldCheck } from 'lucide-react';
import { db, User } from '../database/db';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Forgot Password modal state
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Check for saved credentials on mount
  useEffect(() => {
    const saved = localStorage.getItem('umiya_remembered_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      setEmailOrMobile(parsed.username || '');
      setPassword(parsed.password || '');
      setRememberMe(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!emailOrMobile.trim()) {
      setErrorMsg('Please enter email or mobile number.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    const users = db.getUsers();
    // Search by email or mobile
    const user = users.find(u => 
      u.email.toLowerCase() === emailOrMobile.trim().toLowerCase() || 
      u.mobile === emailOrMobile.trim()
    );

    if (!user || user.password_hash !== password) {
      setErrorMsg('Invalid email/mobile or password.');
      return;
    }

    // Check status
    if (user.status === 'Blocked') {
      setErrorMsg('Your account has been disabled. Please contact administrator.');
      return;
    }

    // Handle Remember Me
    if (rememberMe) {
      localStorage.setItem('umiya_remembered_user', JSON.stringify({
        username: emailOrMobile,
        password: password
      }));
    } else {
      localStorage.removeItem('umiya_remembered_user');
    }

    // Session log
    db.addAuditLog(user.email, 'User logged in', user.role === 'SuperAdmin' ? undefined : user.id);

    // Trigger Success callback
    onLoginSuccess(user);
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSuccess('');
    
    const users = db.getUsers();
    const userExists = users.some(u => u.email.toLowerCase() === forgotEmail.trim().toLowerCase());
    
    if (userExists) {
      setForgotSuccess(`A password reset link has been simulated to: ${forgotEmail}. (Local pass is: '${users.find(u=>u.email===forgotEmail)?.password_hash}')`);
    } else {
      setForgotSuccess('Email address not found in system.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-60 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-100 rounded-full blur-3xl opacity-60 translate-x-1/2 translate-y-1/2" />

      {/* Main Login card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 z-10 transform transition-all">
        
        {/* Brand header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-amber-500 items-center justify-center text-white font-black text-2xl shadow-lg shadow-emerald-100">
            U
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Umiya Wholesale SaaS
          </h2>
          <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">
            Inventory & Shop Management Portal
          </p>
        </div>

        {/* Error notification banner */}
        {errorMsg && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 text-xs font-bold text-red-700 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Email/Mobile */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Email or Mobile Number / ઈમેલ અથવા મોબાઈલ
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. owner@umiya.com or 9876543210"
                value={emailOrMobile}
                onChange={(e) => setEmailOrMobile(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Password / પાસવર્ડ
              </label>
              <button
                type="button"
                onClick={() => setIsForgotOpen(true)}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between py-1 text-xs">
            <label className="flex items-center gap-2 text-slate-500 cursor-pointer font-medium select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
              />
              <span>Remember Me on this device</span>
            </label>
          </div>

          {/* Login button */}
          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-100 hover:shadow-emerald-200"
          >
            Login / લોગિન
          </button>
        </form>

        {/* Demo Credentials Info Panel */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-slate-400 text-[10px] space-y-1.5 bg-slate-50 p-4 rounded-2xl">
          <p className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pre-seeded Demo logins for testing:</span>
          </p>
          <ul className="list-disc pl-3.5 space-y-1">
            <li><strong>Super Admin:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded">admin@umiya.com</code> (pass: <code className="bg-slate-100 px-1 py-0.5 rounded">adminpassword</code>)</li>
            <li><strong>Active Shop Owner:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded">owner@umiya.com</code> (pass: <code className="bg-slate-100 px-1 py-0.5 rounded">ownerpassword</code>)</li>
            <li><strong>Expired Trial Owner:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded">expired@umiya.com</code> (pass: <code className="bg-slate-100 px-1 py-0.5 rounded">expiredpassword</code>)</li>
            <li><strong>Blocked Owner:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded">blocked@umiya.com</code> (pass: <code className="bg-slate-100 px-1 py-0.5 rounded">blockedpassword</code>)</li>
          </ul>
        </div>
      </div>

      {/* Forgot Password Dialog Modal */}
      {isForgotOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-xs uppercase">
                Forgot Password Request
              </h3>
              <button 
                onClick={() => {
                  setIsForgotOpen(false);
                  setForgotSuccess('');
                  setForgotEmail('');
                }} 
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleForgotPasswordSubmit} className="p-6 space-y-4">
              {forgotSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 rounded-xl">
                  {forgotSuccess}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Enter Account Email
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="e.g. owner@umiya.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
              >
                Retrieve Simulated Password
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
