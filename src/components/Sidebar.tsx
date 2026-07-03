import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  PlusCircle, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Settings, 
  Languages, 
  Database 
} from 'lucide-react';
import { LanguageMode, t } from '../utils/translations';
import { getDatabaseMode } from '../database/supabase';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  langMode: LanguageMode;
  setLangMode: (mode: LanguageMode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  langMode,
  setLangMode
}) => {
  const dbMode = getDatabaseMode();

  const menuItems = [
    { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
    { id: 'products', labelKey: 'products', icon: Package },
    { id: 'purchases', labelKey: 'purchases', icon: PlusCircle },
    { id: 'sales', labelKey: 'sales', icon: ShoppingCart },
    { id: 'suppliers', labelKey: 'suppliers', icon: Users },
    { id: 'reports', labelKey: 'reports', icon: BarChart3 },
    { id: 'settings', labelKey: 'settings', icon: Settings },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR - Hidden on Mobile */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 shrink-0">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-amber-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-emerald-200">
              U
            </span>
            <h1 className="font-extrabold text-lg text-slate-800 tracking-tight leading-tight">
              Umiya Wholesale
            </h1>
          </div>
          <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-1">
            Inventory Management
          </p>
        </div>

        {/* Database Status Badge */}
        <div className="px-4 py-2 mt-3 mx-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate max-w-[120px]">
              {langMode === 'gu' ? dbMode.labelGu : dbMode.label}
            </span>
          </div>
          <span className={`w-2.5 h-2.5 rounded-full ${dbMode.type === 'supabase' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all duration-200 group ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm border-l-4 border-emerald-500' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="leading-snug truncate">
                  {t(item.labelKey, langMode)}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Language Selection footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <Languages className="w-3.5 h-3.5 text-slate-400" />
            <span>Language / ભાષા</span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
            {(['en', 'gu', 'dual'] as LanguageMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setLangMode(mode)}
                className={`py-1 rounded-md font-medium text-center transition-all ${
                  langMode === mode 
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {mode === 'en' ? 'EN' : mode === 'gu' ? 'ગુજ' : 'DUAL'}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION - Hidden on Desktop */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around items-center py-2 px-1 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        {menuItems.filter(item => ['dashboard', 'products', 'purchases', 'sales', 'reports'].includes(item.id)).map((item) => {
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
                 (langMode === 'gu' ? 'રિપોર્ટ' : 'Report')}
              </span>
            </button>
          );
        })}
        {/* Mobile translation toggle helper */}
        <button
          onClick={() => {
            const nextMode: Record<LanguageMode, LanguageMode> = { en: 'gu', gu: 'dual', dual: 'en' };
            setLangMode(nextMode[langMode]);
          }}
          className="flex flex-col items-center justify-center py-1 px-3 text-slate-500"
        >
          <Languages className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] mt-0.5 tracking-tight font-medium uppercase text-emerald-600 font-bold">
            {langMode.toUpperCase()}
          </span>
        </button>
      </nav>
    </>
  );
};
