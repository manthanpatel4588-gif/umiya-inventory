import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ProductManager } from './components/ProductManager';
import { PurchaseEntry } from './components/PurchaseEntry';
import { SalesEntry } from './components/SalesEntry';
import { SupplierManager } from './components/SupplierManager';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { LanguageMode } from './utils/translations';
import { initializeDB } from './database/db';
import { isSupabaseConfigured } from './database/supabase';
import { Database, AlertTriangle } from 'lucide-react';

function App() {
  // Navigation State
  const [currentView, setCurrentView] = useState<string>('dashboard');
  
  // Multilingual State: Default to 'dual' (displays both English & Gujarati)
  const [langMode, setLangMode] = useState<LanguageMode>('dual');

  // Initialize DB collections on mount
  useEffect(() => {
    initializeDB();
  }, []);

  // View Router
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard langMode={langMode} onNavigate={setCurrentView} />;
      case 'products':
        return <ProductManager langMode={langMode} />;
      case 'purchases':
        return <PurchaseEntry langMode={langMode} />;
      case 'sales':
        return <SalesEntry langMode={langMode} />;
      case 'suppliers':
        return <SupplierManager langMode={langMode} />;
      case 'reports':
        return <Reports langMode={langMode} />;
      case 'settings':
        return <Settings langMode={langMode} />;
      default:
        return <Dashboard langMode={langMode} onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop and Mobile Bottom Nav */}
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        langMode={langMode} 
        setLangMode={setLangMode} 
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        
        {/* Top Navigation / Header Bar */}
        <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm md:shadow-none">
          <div className="flex items-center gap-3">
            {/* Logo placeholder for mobile */}
            <span className="md:hidden w-7 h-7 rounded bg-gradient-to-tr from-emerald-500 to-amber-500 flex items-center justify-center text-white font-black text-sm shadow">
              U
            </span>
            <span className="font-extrabold text-sm text-slate-700 tracking-tight block md:hidden">
              Umiya Wholesale
            </span>
            <span className="hidden md:block text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              {langMode === 'en' ? 'English Interface' : langMode === 'gu' ? 'ગુજરાતી ઇન્ટરફેસ' : 'Bilingual Mode / દ્વિભાષી મોડ'}
            </span>
          </div>

          {/* Quick status details */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            {/* Supabase status display */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
              isSupabaseConfigured() 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                : 'bg-amber-50 border-amber-100 text-amber-700'
            }`}>
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isSupabaseConfigured() ? 'Cloud Synced' : 'Offline Mode'}
              </span>
            </div>

            {/* Quick date display */}
            <span className="text-slate-500 hidden sm:block">
              {new Date().toLocaleDateString(langMode === 'gu' ? 'gu-IN' : 'en-US', { weekday: 'short', day: '2-digit', month: 'short' })}
            </span>
          </div>
        </header>

        {/* Dynamic Panels Page Contents */}
        <div className="p-4 md:p-6 max-w-7xl w-full mx-auto flex-1">
          {renderView()}
        </div>
      </main>
    </div>
  );
}

export default App;
