import React, { useState } from 'react';
import { Settings as SettingsIcon, Database, Save, RefreshCw, CheckCircle, AlertTriangle, Coins } from 'lucide-react';
import { db, User } from '../database/db';
import { LanguageMode, t } from '../utils/translations';
import { isSupabaseConfigured } from '../database/supabase';

interface SettingsProps {
  langMode: LanguageMode;
  currentUser?: User;
}

export const Settings: React.FC<SettingsProps> = ({ langMode, currentUser }) => {
  const [supabaseUrl, setSupabaseUrl] = useState(() => db.getSupabaseConfig().url);
  const [supabaseKey, setSupabaseKey] = useState(() => db.getSupabaseConfig().key);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Super Admin subscription configuration pricing states
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';
  const [monthlyPrice, setMonthlyPrice] = useState(() => db.getSaasConfig().monthly_price.toString());
  const [quarterlyPrice, setQuarterlyPrice] = useState(() => db.getSaasConfig().quarterly_price.toString());
  const [yearlyPrice, setYearlyPrice] = useState(() => db.getSaasConfig().yearly_price.toString());
  const [priceSuccess, setPriceSuccess] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    // If both empty, we allow resetting to local storage
    if (!supabaseUrl.trim() && !supabaseKey.trim()) {
      db.saveSupabaseConfig('', '');
      setSuccess(langMode === 'gu' ? 'કન્ફિગરેશન રીસેટ થયું. લોકલ સ્ટોરેજ સક્રિય છે.' : 'Configuration reset. Local storage mode active.');
      setTimeout(() => window.location.reload(), 1500); // Reload to re-initialize supabase connection status
      return;
    }

    // Basic validation
    if (!supabaseUrl.trim().startsWith('http')) {
      setError(langMode === 'gu' ? 'અમાન્ય સુપબેઝ URL' : 'Invalid Supabase URL. Must start with http/https.');
      return;
    }

    if (!supabaseKey.trim()) {
      setError(langMode === 'gu' ? 'અમાન્ય Anon કી' : 'Please enter your Supabase Anon Key.');
      return;
    }

    try {
      db.saveSupabaseConfig(supabaseUrl.trim(), supabaseKey.trim());
      setSuccess(langMode === 'gu' ? 'સુપબેઝ ગોઠવણી સાચવી લીધી છે! સિંક્રનાઇઝેશન સક્ષમ કરવા માટે રીલોડ કરી રહ્યું છે...' : 'Supabase configuration saved! Reloading to establish connection...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setError('Error saving settings');
    }
  };

  const handleSavePrices = (e: React.FormEvent) => {
    e.preventDefault();
    setPriceSuccess('');

    const m = parseFloat(monthlyPrice);
    const q = parseFloat(quarterlyPrice);
    const y = parseFloat(yearlyPrice);

    if (isNaN(m) || m < 0 || isNaN(q) || q < 0 || isNaN(y) || y < 0) {
      alert('Please enter valid positive numbers for plan rates.');
      return;
    }

    db.saveSaasConfig({
      monthly_price: m,
      quarterly_price: q,
      yearly_price: y
    });

    setPriceSuccess('SaaS pricing subscription tiers successfully updated and saved!');
    setTimeout(() => setPriceSuccess(''), 3000);
  };

  const handleResetLocal = () => {
    if (confirm(langMode === 'gu' ? 'શું તમે ખરેખર કન્ફિગરેશન સાફ કરવા માંગો છો?' : 'Reset connection to Local Storage?')) {
      db.saveSupabaseConfig('', '');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      {/* Header Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-slate-600" />
          <span>{t('settings', langMode)}</span>
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {langMode === 'gu' 
            ? 'લોકલ ડેટા સ્ટોરેજ અથવા સુપબેઝ ક્લાઉડ સિંક્રનાઇઝેશન સેટ કરો.' 
            : 'Configure your active database connection or modify platform configurations.'}
        </p>
      </div>

      {/* Super Admin SaaS pricing config card */}
      {isSuperAdmin && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm border-b border-slate-100 pb-3">
            <Coins className="w-4 h-4 text-indigo-600" />
            <span>SaaS Plan Subscription Pricing (₹)</span>
          </h3>

          <form onSubmit={handleSavePrices} className="space-y-4 pt-2">
            {priceSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 rounded-xl">
                {priceSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Monthly Price</label>
                <input
                  type="number"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">3-Month Price</label>
                <input
                  type="number"
                  value={quarterlyPrice}
                  onChange={(e) => setQuarterlyPrice(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">12-Month Price</label>
                <input
                  type="number"
                  value={yearlyPrice}
                  onChange={(e) => setYearlyPrice(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-semibold"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="submit"
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-100"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Prices</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Database Mode Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm border-b border-slate-100 pb-3">
          <Database className="w-4 h-4 text-emerald-600" />
          <span>{langMode === 'gu' ? 'ડેટાબેઝ સિંક જોડાણ' : 'Database Connection Status'}</span>
        </h3>

        {/* Status display */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          isSupabaseConfigured() 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <div className="text-xs space-y-0.5">
            <p className="font-bold uppercase tracking-wider">
              {langMode === 'gu' ? 'વર્તમાન મોડ' : 'Current Driver Mode'}
            </p>
            <p className="text-sm font-semibold">
              {isSupabaseConfigured() 
                ? (langMode === 'gu' ? 'સુપબેઝ ક્લાઉડ સક્રિય' : 'Supabase Cloud Storage Active') 
                : (langMode === 'gu' ? 'ઓફલાઇન (લોકલ સ્ટોરેજ) સક્રિય' : 'Offline Mode (Local Storage)')}
            </p>
          </div>
          <span className={`w-3.5 h-3.5 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-xs font-bold text-red-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Supabase URL */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              {t('supabaseUrl', langMode)}
            </label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://your-project-id.supabase.co"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Supabase Key */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              {t('supabaseKey', langMode)}
            </label>
            <input
              type="password"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {isSupabaseConfigured() ? (
              <button
                type="button"
                onClick={handleResetLocal}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-bold hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset to Local Storage</span>
              </button>
            ) : <div />}

            <button
              type="submit"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-100"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t('saveSettings', langMode)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
