import React, { useState, useMemo } from 'react';
import { ClipboardList, Search, RefreshCw, Clock } from 'lucide-react';
import { db, AuditLog } from '../database/db';

export const AdminAuditPanel: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>(() => db.getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');

  const handleRefresh = () => {
    setLogs(db.getAuditLogs());
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      log.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.shop_id && log.shop_id.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [logs, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <span>Platform Audit Trail Logs</span>
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit system actions including security logins, profile updates, product entries, and subscription renewals.
          </p>
        </div>
        
        <button 
          onClick={handleRefresh}
          className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter logs by operator email, action type, or shop id..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Logs Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-600">
            <thead>
              <tr className="bg-slate-50 font-bold text-slate-450 uppercase border-b border-slate-100">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Operator Email</th>
                <th className="px-6 py-4">Action Performed</th>
                <th className="px-6 py-4 text-center">Shop Link ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold">
                    No audit trail logs recorded yet.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 flex items-center gap-1.5 font-bold">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {new Date(log.timestamp).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{log.user_email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action.includes('Login') || log.action.includes('Success') ? 'bg-emerald-50 text-emerald-700' :
                        log.action.includes('Deleted') || log.action.includes('Reset') ? 'bg-red-50 text-red-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-400">
                      {log.shop_id ? (
                        <span className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded-md text-[10px]">
                          {log.shop_id}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
