import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  ShieldAlert, 
  Database,
  ClipboardList
} from 'lucide-react';
import { User } from '../database/db';

interface AdminSidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  currentUser: User;
  onLogout: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentView,
  setCurrentView,
  currentUser,
  onLogout
}) => {
  const menuItems = [
    { id: 'admin_dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    { id: 'admin_users', label: 'User & Shop Manager', icon: Users },
    { id: 'admin_audit', label: 'System Audit Logs', icon: ClipboardList },
    { id: 'admin_settings', label: 'Database Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-100 h-screen sticky top-0 shrink-0">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-amber-500 flex items-center justify-center text-white font-black text-lg shadow-md">
              U
            </span>
            <h1 className="font-extrabold text-sm tracking-tight text-white leading-tight">
              Umiya SaaS Portal
            </h1>
          </div>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full mt-2 w-fit">
            <ShieldAlert className="w-2.5 h-2.5" />
            <span>SUPER ADMIN</span>
          </span>
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
                    ? 'bg-slate-800 text-white shadow-sm border-l-4 border-emerald-500' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-emerald-500' : 'text-slate-500 group-hover:text-slate-400'}`} />
                <span className="leading-snug truncate">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Footer Admin User details & logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-emerald-400">
              SA
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser.owner_name}</p>
              <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-950 hover:bg-red-900 border border-red-900/30 text-red-400 hover:text-red-300 font-bold text-xs rounded-xl transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout Panel</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Navigation Helper for Admin */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-850 z-50 flex justify-around items-center py-2 px-1 shadow-lg text-slate-400">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-emerald-500 font-semibold' : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 truncate text-center max-w-[65px]">
                {item.id === 'admin_dashboard' ? 'Dash' : 
                 item.id === 'admin_users' ? 'Shops' : 
                 item.id === 'admin_audit' ? 'Logs' : 'Database'}
              </span>
            </button>
          );
        })}
        {/* Mobile logout */}
        <button
          onClick={onLogout}
          className="flex flex-col items-center justify-center py-1 px-3 text-red-400"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[9px] mt-0.5 truncate">Logout</span>
        </button>
      </nav>
    </>
  );
};
