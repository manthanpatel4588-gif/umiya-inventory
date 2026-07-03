import React, { useMemo } from 'react';
import { 
  Users, 
  Store, 
  Lock, 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  Coins, 
  AlertTriangle,
  Award
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { db, User } from '../database/db';

export const AdminDashboard: React.FC = () => {
  // Load global data
  const users = useMemo(() => db.getUsers(), []);
  
  // All products & sales across local storage (unscoped)
  const allProductsRaw = useMemo(() => {
    return JSON.parse(localStorage.getItem('umiya_products') || '[]');
  }, []);

  const allSalesRaw = useMemo(() => {
    return JSON.parse(localStorage.getItem('umiya_sales') || '[]');
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    const shopOwners = users.filter(u => u.role === 'ShopOwner');
    const totalShops = shopOwners.length;
    const activeShops = shopOwners.filter(u => u.status === 'Active').length;
    const blockedShops = shopOwners.filter(u => u.status === 'Blocked').length;
    const totalUsers = users.length;
    
    const totalProducts = allProductsRaw.length;
    const totalSalesCount = allSalesRaw.length;

    // Estimate MRR (Monthly Recurring Revenue)
    // Trial: ₹0, Monthly: ₹1,500/mo, Quarterly: ₹4,000 (₹1,333/mo), Yearly: ₹12,000 (₹1,000/mo)
    const rates: Record<string, number> = {
      Trial: 0,
      Monthly: 1500,
      Quarterly: 1333,
      Yearly: 1000
    };

    const monthlyRevenue = shopOwners
      .filter(u => u.status === 'Active')
      .reduce((sum, u) => sum + (rates[u.plan_type] || 0), 0);

    // Filter expiring shops (within next 7 days)
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);

    const expiringShops = shopOwners.filter(u => {
      const expiry = new Date(u.plan_expiry);
      return u.status === 'Active' && expiry > today && expiry <= sevenDaysLater;
    });

    return {
      totalShops,
      activeShops,
      blockedShops,
      totalUsers,
      totalProducts,
      totalSalesCount,
      monthlyRevenue,
      expiringShops,
      shopOwners
    };
  }, [users, allProductsRaw, allSalesRaw]);

  // Chart 1: Plan Distribution
  const planChartData = useMemo(() => {
    const planCounts: Record<string, number> = { Trial: 0, Monthly: 0, Quarterly: 0, Yearly: 0 };
    stats.shopOwners.forEach(u => {
      if (planCounts[u.plan_type] !== undefined) {
        planCounts[u.plan_type]++;
      }
    });

    return Object.entries(planCounts).map(([name, value]) => ({
      name,
      value
    }));
  }, [stats.shopOwners]);

  // Chart 2: Revenue contribution by Plan Type
  const revenueChartData = useMemo(() => {
    const rates: Record<string, number> = { Trial: 0, Monthly: 1500, Quarterly: 1333, Yearly: 1000 };
    const revCounts: Record<string, number> = { Trial: 0, Monthly: 0, Quarterly: 0, Yearly: 0 };
    
    stats.shopOwners.filter(u => u.status === 'Active').forEach(u => {
      revCounts[u.plan_type] += rates[u.plan_type];
    });

    return Object.entries(revCounts).map(([name, Revenue]) => ({
      name,
      Revenue
    }));
  }, [stats.shopOwners]);

  const COLORS = ['#94a3b8', '#10b981', '#3b82f6', '#f97316'];

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
        <h2 className="text-xl font-bold">SaaS Administrator Dashboard</h2>
        <p className="text-xs text-slate-400 mt-1">
          Monitor shop registrations, subscription plans health, billing MRR, and platform metrics.
        </p>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Shops */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between group hover:border-slate-200 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Shops</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalShops}</p>
          </div>
          <span className="p-2.5 rounded-xl bg-slate-50 text-slate-600 group-hover:scale-110 transition-transform">
            <Store className="w-5 h-5" />
          </span>
        </div>

        {/* Active Shops */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between group hover:border-emerald-100 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Active Shops</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.activeShops}</p>
          </div>
          <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </span>
        </div>

        {/* Blocked Shops */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between group hover:border-red-100 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Blocked Shops</p>
            <p className="text-2xl font-bold text-red-600">{stats.blockedShops}</p>
          </div>
          <span className="p-2.5 rounded-xl bg-red-50 text-red-600 group-hover:scale-110 transition-transform">
            <Lock className="w-5 h-5" />
          </span>
        </div>

        {/* Est Monthly Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between group hover:border-indigo-100 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Monthly Revenue (MRR)</p>
            <p className="text-2xl font-bold text-indigo-600">₹{stats.monthlyRevenue.toLocaleString()}</p>
          </div>
          <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
            <Coins className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Expiry alerts banner */}
      {stats.expiringShops.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
            <AlertTriangle className="w-5 h-5 shrink-0" />
          </span>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-800">
              Expiring Subscriptions Alert ({stats.expiringShops.length})
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {stats.expiringShops.map(shop => (
                <span 
                  key={shop.id} 
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-amber-200 text-xs font-semibold text-amber-700 rounded-lg shadow-sm"
                >
                  {shop.shop_name}
                  <span className="text-slate-400">
                    (Expires {new Date(shop.plan_expiry).toLocaleDateString()})
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Plan Distribution Pie Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Subscription Plan Split</h3>
          <div className="h-60 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planChartData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {planChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue contribution by Plan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Monthly Revenue by Plan (₹)</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform database counts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>Platform Database Statistics</span>
          </h3>
          
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Users className="w-4 h-4 text-slate-400" />
                <span>Global User Registrations</span>
              </div>
              <span className="text-sm font-bold text-slate-800">{stats.totalUsers}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Package className="w-4 h-4 text-slate-400" />
                <span>Global Products Cataloged</span>
              </div>
              <span className="text-sm font-bold text-slate-800">{stats.totalProducts}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <ShoppingCart className="w-4 h-4 text-slate-400" />
                <span>Global Sales Invoiced</span>
              </div>
              <span className="text-sm font-bold text-slate-800">{stats.totalSalesCount}</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-400 font-medium">
              SaaS rates calculated dynamically based on Active monthly plan averages.
            </div>
          </div>
        </div>

      </div>

      {/* Recent Shops List */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-700 text-sm mb-4">Recent Shop Signups</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-600">
            <thead>
              <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                <th className="px-6 py-3">Shop Name</th>
                <th className="px-6 py-3">Owner Details</th>
                <th className="px-6 py-3">Plan Type</th>
                <th className="px-6 py-3">Expiry Date</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.shopOwners.slice(-3).reverse().map((shop) => (
                <tr key={shop.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 font-bold text-slate-800">{shop.shop_name}</td>
                  <td className="px-6 py-3">
                    <p className="font-semibold">{shop.owner_name}</p>
                    <p className="text-[10px] text-slate-400">{shop.email} • {shop.mobile}</p>
                  </td>
                  <td className="px-6 py-3 font-semibold text-slate-500">{shop.plan_type}</td>
                  <td className="px-6 py-3">{new Date(shop.plan_expiry).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full font-bold ${
                      shop.status === 'Active' ? 'bg-emerald-50 text-emerald-700' :
                      shop.status === 'Blocked' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {shop.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
