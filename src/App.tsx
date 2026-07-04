import { useState, useEffect, useMemo } from 'react';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { AdminSidebar } from './components/AdminSidebar';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminUserPanel } from './components/AdminUserPanel';
import { AdminAuditPanel } from './components/AdminAuditPanel';
import { Dashboard } from './components/Dashboard';
import { ProductManager } from './components/ProductManager';
import { PurchaseEntry } from './components/PurchaseEntry';
import { SalesEntry } from './components/SalesEntry';
import { SupplierManager } from './components/SupplierManager';
import { Reports } from './components/Reports';
import { ProfileSettings } from './components/ProfileSettings';
import { Settings } from './components/Settings';
import { LanguageMode } from './utils/translations';
import { initializeDB, db, User } from './database/db';
import { isSupabaseConfigured } from './database/supabase';
import { Database, AlertTriangle, UserCheck, Lock } from 'lucide-react';

function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Active Navigation Panel
  const [currentView, setCurrentView] = useState<string>('dashboard');

  // Bilingual State: English & Gujarati
  const [langMode, setLangMode] = useState<LanguageMode>('dual');

  // Initialize DB and load active session
  useEffect(() => {
    initializeDB();
    
    // Check session
    const activeSession = sessionStorage.getItem('umiya_active_user');
    if (activeSession) {
      setCurrentUser(JSON.parse(activeSession));
    } else {
      // Check remember me auto-login
      const remembered = localStorage.getItem('umiya_remembered_user');
      if (remembered) {
        const parsed = JSON.parse(remembered);
        const usersList = db.getUsers();
        const matched = usersList.find(u => u.email === parsed.username && u.password_hash === parsed.password);
        if (matched && matched.status !== 'Blocked') {
          setCurrentUser(matched);
          sessionStorage.setItem('umiya_active_user', JSON.stringify(matched));
          db.addAuditLog(matched.email, 'Auto-login via Remember Me', matched.role === 'SuperAdmin' ? undefined : matched.id);
        }
      }
    }

    // Sync from Supabase in background
    const syncCloud = async () => {
      const synced = await db.syncFromSupabase();
      if (synced) {
        const session = sessionStorage.getItem('umiya_active_user');
        if (session) {
          const parsed = JSON.parse(session);
          const usersList = db.getUsers();
          const dbUser = usersList.find(u => u.id === parsed.id);
          if (dbUser) {
            setCurrentUser(dbUser);
            sessionStorage.setItem('umiya_active_user', JSON.stringify(dbUser));
          }
        }
      }
    };

    syncCloud();
  }, []);

  // Update default view based on user role
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'SuperAdmin') {
        setCurrentView('admin_dashboard');
      } else {
        setCurrentView('dashboard');
      }
    }
  }, [currentUser]);

  // Expiry check for Shop Owners
  const isSubscriptionExpired = useMemo(() => {
    if (!currentUser || currentUser.role !== 'ShopOwner') return false;
    return new Date(currentUser.plan_expiry) < new Date();
  }, [currentUser]);

  // Handle successful login
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('umiya_active_user', JSON.stringify(user));
  };

  // Handle Logout
  const handleLogout = () => {
    if (currentUser) {
      db.addAuditLog(currentUser.email, 'User logged out', currentUser.role === 'SuperAdmin' ? undefined : currentUser.id);
    }
    setCurrentUser(null);
    sessionStorage.removeItem('umiya_active_user');
  };

  // Periodic check of user status in database to handle instant block/deactivation
  useEffect(() => {
    if (!currentUser) return;
    
    const checkStatus = () => {
      // Super admin is always allowed
      if (currentUser.role === 'SuperAdmin') return;

      const usersList = db.getUsers();
      const dbUser = usersList.find(u => u.id === currentUser.id);
      if (!dbUser || dbUser.status === 'Blocked' || dbUser.status === 'Inactive') {
        handleLogout();
        alert('Your account has been disabled or paused. Please contact administrator.');
      }
    };
    
    checkStatus();
    
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Login view guard
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Double check blocked status at runtime
  if (currentUser.status === 'Blocked') {
    handleLogout();
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // RENDER SUPER ADMIN ROLE VIEWS
  if (currentUser.role === 'SuperAdmin') {
    const renderAdminView = () => {
      switch (currentView) {
        case 'admin_dashboard':
          return <AdminDashboard />;
        case 'admin_users':
          return <AdminUserPanel />;
        case 'admin_audit':
          return <AdminAuditPanel />;
        case 'admin_settings':
          return <Settings langMode={langMode} />;
        default:
          return <AdminDashboard />;
      }
    };

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
        <AdminSidebar 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          currentUser={currentUser} 
          onLogout={handleLogout} 
        />
        
        <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
          <header className="bg-slate-900 border-b border-slate-800 h-16 px-6 flex items-center justify-between sticky top-0 z-40 text-slate-100 shadow-sm">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <span className="font-extrabold text-sm tracking-tight hidden sm:inline">
                SaaS Administrator Control Panel
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-emerald-400">
                Cloud Controller
              </span>
              <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })}</span>
            </div>
          </header>

          <div className="p-4 md:p-6 max-w-7xl w-full mx-auto flex-1 animate-fade-in">
            {renderAdminView()}
          </div>
        </main>
      </div>
    );
  }

  // RENDER SHOP OWNER ROLE VIEWS (Tenant views)
  const renderOwnerView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard langMode={langMode} onNavigate={setCurrentView} currentUser={currentUser} />;
      case 'products':
        return <ProductManager langMode={langMode} currentUser={currentUser} />;
      case 'purchases':
        return <PurchaseEntry langMode={langMode} currentUser={currentUser} />;
      case 'sales':
        return <SalesEntry langMode={langMode} currentUser={currentUser} />;
      case 'suppliers':
        return <SupplierManager langMode={langMode} currentUser={currentUser} />;
      case 'reports':
        return <Reports langMode={langMode} currentUser={currentUser} />;
      case 'profile':
        return <ProfileSettings currentUser={currentUser} setCurrentUser={setCurrentUser} langMode={langMode} />;
      case 'settings':
        return <Settings langMode={langMode} />;
      default:
        return <Dashboard langMode={langMode} onNavigate={setCurrentView} currentUser={currentUser} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        langMode={langMode} 
        setLangMode={setLangMode}
        currentUser={currentUser}
        onLogout={handleLogout} 
      />

      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        {/* Banner Warning if subscription is expired */}
        {isSubscriptionExpired && (
          <div className="bg-red-650 text-white font-extrabold text-center px-4 py-2 text-xs flex items-center justify-center gap-2 shadow-sm animate-pulse z-50">
            <Lock className="w-4 h-4 shrink-0" />
            <span>
              {langMode === 'gu'
                ? 'ચેતવણી: તમારું સબ્સ્ક્રિપ્શન સમાપ્ત થઈ ગયું છે! નવો ડેટા ઉમેરી શકાશે નહીં (ફક્ત વાંચવા માટે).'
                : '⚠️ SUBSCRIPTION EXPIRED: Read-Only Mode Active. Please contact administrator to renew your plan.'}
            </span>
          </div>
        )}

        <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm md:shadow-none">
          <div className="flex items-center gap-3">
            {currentUser.logo_url ? (
              <img src={currentUser.logo_url} alt="Logo" className="w-7 h-7 rounded object-cover border" />
            ) : (
              <span className="w-7 h-7 rounded bg-gradient-to-tr from-emerald-500 to-amber-500 flex items-center justify-center text-white font-black text-sm">
                U
              </span>
            )}
            <span className="font-extrabold text-sm text-slate-700 tracking-tight">
              {currentUser.shop_name}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            {/* Mobile-Friendly Language Selector */}
            <div className="flex bg-slate-105 p-0.5 rounded-lg border border-slate-200 text-[10px] sm:text-xs">
              {(['en', 'gu', 'dual'] as LanguageMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setLangMode(mode)}
                  className={`px-2 py-0.5 rounded font-bold text-center transition-all ${
                    langMode === mode 
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {mode === 'en' ? 'EN' : mode === 'gu' ? 'ગુજ' : 'DUAL'}
                </button>
              ))}
            </div>

            {/* Database status */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
              isSupabaseConfigured() 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                : 'bg-amber-50 border-amber-100 text-amber-700'
            }`}>
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isSupabaseConfigured() ? 'Cloud Synced' : 'Offline Storage'}
              </span>
            </div>

            <span className="text-slate-500 hidden sm:block">
              {new Date().toLocaleDateString(langMode === 'gu' ? 'gu-IN' : 'en-US', { weekday: 'short', day: '2-digit', month: 'short' })}
            </span>
          </div>
        </header>

        <div className="p-4 md:p-6 max-w-7xl w-full mx-auto flex-1">
          {renderOwnerView()}
        </div>
      </main>
    </div>
  );
}

export default App;
