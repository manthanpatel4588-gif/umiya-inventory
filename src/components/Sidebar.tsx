import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  PlusCircle, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Settings, 
  Database,
  Store,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { LanguageMode, t } from '../utils/translations';
import { getDatabaseMode } from '../database/supabase';
import { User } from '../database/db';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  langMode: LanguageMode;
  setLangMode: (mode: LanguageMode) => void;
  currentUser: User;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  langMode,
  setLangMode,
  currentUser,
  onLogout
}) => {
  const dbMode = getDatabaseMode();

  const menuItems = [
    { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
    { id: 'products', labelKey: 'products', icon: Package },
    { id: 'purchases', labelKey: 'purchases', icon: PlusCircle },
    { id: 'sales', labelKey: 'sales', icon: ShoppingCart },
    { id: 'suppliers', labelKey: 'suppliers', icon: Users },
    { id: 'reports', labelKey: 'reports', icon: BarChart3 },
    { id: 'profile', label: 'Shop Profile / પ્રોફાઇલ', labelKey: 'profile', icon: Store },
    { id: 'settings', labelKey: 'settings', icon: Settings },
  ];

  // Expiry check
  const isExpired = new Date(currentUser.plan_expiry) < new Date();

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 shrink-0">
        
        {/* Brand Logo Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {currentUser.logo_url ? (
              <img src={currentUser.logo_url} alt="Shop Logo" className="w-8 h-8 rounded-lg object-cover border shadow-sm" />
            ) : (
              <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-amber-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-emerald-200">
                U
              </span>
            )}
            <div>
              <h1 className="font-extrabold text-sm text-slate-800 tracking-tight leading-tight truncate max-w-[150px]">
                {currentUser.shop_name}
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">
                {currentUser.owner_name}
              </p>
            </div>
          </div>
        </div>

        {/* Database Status & Expiry Badges */}
        <div className="px-3 mt-3 flex flex-col gap-1.5">
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
            <div className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>{langMode === 'gu' ? dbMode.labelGu : dbMode.label}</span>
            </div>
            <span className={`w-2 h-2 rounded-full ${dbMode.type === 'supabase' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          </div>

          {/* Expiry alerts */}
          {isExpired ? (
            <div className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 flex items-center gap-1.5 text-[9px] font-black text-red-700 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>SUBSCRIPTION EXPIRED</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-between text-[9px] font-bold text-emerald-700">
              <span>Plan: {currentUser.plan_type}</span>
              <span className="text-[8px] text-slate-400 font-normal">Exp: {new Date(currentUser.plan_expiry).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-semibold tracking-wide transition-all group ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm border-l-4 border-emerald-500' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="truncate">
                  {item.label || t(item.labelKey || '', langMode)}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Session info & Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50">
          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-700 font-bold text-[11px] rounded-xl transition-all shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout / લોગઆઉટ</span>
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around items-center py-2 px-1 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        {menuItems.filter(item => ['dashboard', 'products', 'purchases', 'sales', 'profile'].includes(item.id)).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-emerald-600 font-semibold' : 'text-slate-500'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="text-[10px] mt-0.5 tracking-tight font-medium max-w-[65px] truncate text-center">
                {item.id === 'dashboard' ? (langMode === 'gu' ? 'ડેસ્ક' : 'Dashboard') : 
                 item.id === 'products' ? (langMode === 'gu' ? 'સ્ટોક' : 'Stock') :
                 item.id === 'purchases' ? (langMode === 'gu' ? 'ખરીદી' : 'Buy') :
                 item.id === 'sales' ? (langMode === 'gu' ? 'વેચાણ' : 'Sell') : 
                 (langMode === 'gu' ? 'પ્રોફાઇલ' : 'Profile')}
              </span>
            </button>
          );
        })}
        {/* Mobile translation and logout toggler */}
        <button
          onClick={onLogout}
          className="flex flex-col items-center justify-center py-1 px-3 text-red-500"
        >
          <LogOut className="w-5 h-5 text-red-400" />
          <span className="text-[10px] mt-0.5 tracking-tight font-semibold uppercase text-red-650">
            Out
          </span>
        </button>
      </nav>
    </>
  );
};
