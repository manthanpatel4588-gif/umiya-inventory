import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Mail, Phone, AlertTriangle, ShieldCheck, Store, User as UserIcon, MapPin } from 'lucide-react';
import { db, User } from '../database/db';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  // Login Form States
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Registration Form States
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regShopName, setRegShopName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

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
    const user = users.find(u => 
      u.email.toLowerCase() === emailOrMobile.trim().toLowerCase() || 
      u.mobile === emailOrMobile.trim()
    );

    if (!user || user.password_hash !== password) {
      setErrorMsg('Invalid email/mobile or password.');
      return;
    }

    if (user.status === 'Blocked') {
      setErrorMsg('Your account has been disabled. Please contact administrator.');
      return;
    }

    if (rememberMe) {
      localStorage.setItem('umiya_remembered_user', JSON.stringify({
        username: emailOrMobile,
        password: password
      }));
    } else {
      localStorage.removeItem('umiya_remembered_user');
    }

    db.addAuditLog(user.email, 'User logged in', user.role === 'SuperAdmin' ? undefined : user.id);
    onLoginSuccess(user);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regEmail.trim()) {
      setErrorMsg('Email address is required.');
      return;
    }
    if (!regPassword.trim() || regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (!regShopName.trim()) {
      setErrorMsg('Shop Name is required.');
      return;
    }
    if (!regOwnerName.trim()) {
      setErrorMsg('Owner Name is required.');
      return;
    }
    if (!regMobile.trim() || regMobile.length < 10) {
      setErrorMsg('Valid 10-digit Mobile number is required.');
      return;
    }

    const users = db.getUsers();
    const emailExists = users.some(u => u.email.toLowerCase() === regEmail.trim().toLowerCase());
    if (emailExists) {
      setErrorMsg('Email address is already registered.');
      return;
    }

    const newUser: User = {
      id: `shop-${Date.now()}`,
      email: regEmail.trim().toLowerCase(),
      password_hash: regPassword.trim(),
      shop_name: regShopName.trim(),
      owner_name: regOwnerName.trim(),
      mobile: regMobile.trim(),
      address: regAddress.trim() || 'Gujarat, India',
      role: 'ShopOwner',
      plan_type: 'Trial',
      plan_start: new Date().toISOString(),
      plan_expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14-day trial
      status: 'Active'
    };

    db.saveUser(newUser);
    db.addAuditLog(newUser.email, 'New Store Auto Self-Registration SignUp', newUser.id);
    onLoginSuccess(newUser);
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

      {/* Main Card */}
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
            {isRegisterMode ? 'Create 14-day Free Trial Shop' : 'Inventory & Shop Management Portal'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 text-xs font-bold text-red-700 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* LOGIN MODE */}
        {!isRegisterMode ? (
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

            {/* Switch to Register */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsRegisterMode(true)}
                className="text-xs text-slate-500 hover:text-emerald-700 font-bold transition-colors animate-pulse"
              >
                New Wholesaler? <span className="text-emerald-600 underline">Start Free 14-day Trial</span>
              </button>
            </div>
          </form>
        ) : (
          /* REGISTRATION MODE */
          <form onSubmit={handleRegister} className="space-y-3">
            {/* Shop Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-slate-400" />
                <span>Shop Name / દુકાનનું નામ</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Mahalaxmi Grocery Store"
                value={regShopName}
                onChange={(e) => setRegShopName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Owner Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Owner Name / માલિકનું નામ</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Manthan Patel"
                value={regOwnerName}
                onChange={(e) => setRegOwnerName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Mobile Number */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Mobile Number / મોબાઇલ નંબર</span>
              </label>
              <input
                type="text"
                maxLength={10}
                placeholder="10 digit mobile number"
                value={regMobile}
                onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Email Address / ઈમેલ</span>
              </label>
              <input
                type="email"
                placeholder="e.g. owner@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Password / પાસવર્ડ</span>
              </label>
              <div className="relative">
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Shop Address */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Address / સરનામું</span>
              </label>
              <input
                type="text"
                placeholder="APMC Market, Mehsana..."
                value={regAddress}
                onChange={(e) => setRegAddress(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Register Action button */}
            <button
              type="submit"
              className="w-full py-2.5 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-100"
            >
              Start Free 14-Day Trial / રજીસ્ટ્રેશન કરો
            </button>

            {/* Switch to Login */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsRegisterMode(false)}
                className="text-xs text-slate-500 hover:text-emerald-700 font-bold transition-colors underline"
              >
                Already registered? Login here / લોગિન કરો
              </button>
            </div>
          </form>
        )}

        {/* Demo Credentials Panel */}
        {!isRegisterMode && (
          <div className="mt-6 pt-5 border-t border-slate-100 text-slate-400 text-[10px] space-y-1.5 bg-slate-50 p-4 rounded-2xl">
            <p className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Demo Logins for Testing:</span>
            </p>
            <ul className="list-disc pl-3.5 space-y-1">
              <li><strong>Admin:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-[9px]">admin@umiya.com</code> (pass: <code className="bg-slate-100 px-1 py-0.5 rounded text-[9px]">adminpassword</code>)</li>
              <li><strong>Owner:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-[9px]">owner@umiya.com</code> (pass: <code className="bg-slate-100 px-1 py-0.5 rounded text-[9px]">ownerpassword</code>)</li>
            </ul>
          </div>
        )}
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
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
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
