import React, { useMemo } from 'react';
import { 
  Package, 
  Layers, 
  TrendingUp, 
  DollarSign, 
  AlertTriangle, 
  Award, 
  ListOrdered,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  CartesianGrid,
  Legend
} from 'recharts';
import { db, User } from '../database/db';
import { LanguageMode, t } from '../utils/translations';

interface DashboardProps {
  langMode: LanguageMode;
  onNavigate: (view: string) => void;
  currentUser: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ langMode, onNavigate, currentUser }) => {
  // Load data reactively filtered by current tenant shop_id
  const products = useMemo(() => db.getProducts(currentUser.id), [currentUser.id]);
  const sales = useMemo(() => db.getSales(currentUser.id), [currentUser.id]);
  const purchases = useMemo(() => db.getPurchases(currentUser.id), [currentUser.id]);

  // Helpers for calculations
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM

    // 1. Total Products
    const totalProducts = products.length;

    // 2. Total Stock Quantity
    const totalStockQty = products.reduce((acc, p) => acc + p.stock_quantity, 0);

    // 3. Total Stock Value (Valued at Purchase Price)
    const totalStockValueCost = products.reduce((acc, p) => acc + (p.stock_quantity * p.purchase_price), 0);
    const totalStockValueRetail = products.reduce((acc, p) => acc + (p.stock_quantity * p.selling_price), 0);

    // 4. Today's Sales & Today's Profit
    let todaySalesVal = 0;
    let todayProfitVal = 0;
    sales.forEach(s => {
      if (s.sale_date.startsWith(todayStr)) {
        todaySalesVal += (s.sale_price * s.quantity);
        todayProfitVal += s.profit;
      }
    });

    // 5. Monthly Sales & Monthly Profit
    let monthlySalesVal = 0;
    let monthlyProfitVal = 0;
    sales.forEach(s => {
      if (s.sale_date.startsWith(currentMonthStr)) {
        monthlySalesVal += (s.sale_price * s.quantity);
        monthlyProfitVal += s.profit;
      }
    });

    // 6. Low stock products
    const lowStockItems = products.filter(p => p.stock_quantity <= p.minimum_stock);

    return {
      totalProducts,
      totalStockQty,
      totalStockValueCost,
      totalStockValueRetail,
      todaySales: todaySalesVal,
      todayProfit: todayProfitVal,
      monthlySales: monthlySalesVal,
      monthlyProfit: monthlyProfitVal,
      lowStockItems
    };
  }, [products, sales]);

  // Top Selling Products Calculations (Grouped by product_id)
  const topSelling = useMemo(() => {
    const qtyMap: Record<string, { name: string; category: string; qty: number; salesVal: number }> = {};
    sales.forEach(s => {
      if (!qtyMap[s.product_id]) {
        qtyMap[s.product_id] = { name: s.product_name, category: '', qty: 0, salesVal: 0 };
        // lookup category
        const p = products.find(prod => prod.id === s.product_id);
        if (p) qtyMap[s.product_id].category = p.category;
      }
      qtyMap[s.product_id].qty += s.quantity;
      qtyMap[s.product_id].salesVal += s.quantity * s.sale_price;
    });

    return Object.values(qtyMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5); // top 5
  }, [sales, products]);

  // Recent Transactions combining purchases and sales
  const recentTransactions = useMemo(() => {
    const formattedSales = sales.map(s => ({
      id: s.id,
      date: s.sale_date,
      type: 'sale' as const,
      description: `${s.product_name} (${s.quantity} units)`,
      party: s.customer_name || 'Walk-in Customer / છૂટક ગ્રાહક',
      amount: s.quantity * s.sale_price,
      profit: s.profit
    }));

    const formattedPurchases = purchases.map(p => ({
      id: p.id,
      date: p.purchase_date,
      type: 'purchase' as const,
      description: `${p.product_name} (${p.quantity} units)`,
      party: p.supplier_name,
      amount: p.total_amount,
      profit: 0
    }));

    return [...formattedSales, ...formattedPurchases]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5); // top 5
  }, [sales, purchases]);

  // Chart Data: Last 7 Days Daily Sales
  const dailyChartData = useMemo(() => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    return dates.map(dt => {
      let totalSales = 0;
      sales.forEach(s => {
        if (s.sale_date.startsWith(dt)) {
          totalSales += (s.sale_price * s.quantity);
        }
      });
      const dObj = new Date(dt);
      const label = dObj.toLocaleDateString(langMode === 'gu' ? 'gu-IN' : 'en-US', { day: '2-digit', month: 'short' });
      return {
        date: label,
        amount: totalSales
      };
    });
  }, [sales, langMode]);

  // Chart Data: Last 6 Months Profit
  const monthlyChartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(d.toISOString().substring(0, 7)); // YYYY-MM
    }

    return months.map(m => {
      let profit = 0;
      sales.forEach(s => {
        if (s.sale_date.startsWith(m)) {
          profit += s.profit;
        }
      });
      const dObj = new Date(m + "-02");
      const label = dObj.toLocaleDateString(langMode === 'gu' ? 'gu-IN' : 'en-US', { month: 'short', year: '2-digit' });
      return {
        month: label,
        Profit: profit
      };
    });
  }, [sales, langMode]);

  // Chart Data: Category-wise Sales
  const categoryChartData = useMemo(() => {
    const catSales: Record<string, number> = {};
    sales.forEach(s => {
      const p = products.find(prod => prod.id === s.product_id);
      const cat = p ? p.category : 'General FMCG';
      catSales[cat] = (catSales[cat] || 0) + (s.sale_price * s.quantity);
    });

    return Object.entries(catSales).map(([name, value]) => ({
      name,
      value
    }));
  }, [sales, products]);

  const COLORS = ['#10b981', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {t('dashboard', langMode)}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {langMode === 'gu' 
              ? 'ઉમિયા ઇન્વેન્ટરી મેનેજમેન્ટ સિસ્ટમમાં આપનું સ્વાગત છે.' 
              : 'Welcome back to Umiya Inventory Management System dashboard.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onNavigate('sales')} 
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md hover:scale-102"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{t('recordSale', langMode)}</span>
          </button>
          <button 
            onClick={() => onNavigate('purchases')} 
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md hover:scale-102"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>{t('recordPurchase', langMode)}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between group hover:border-indigo-100 transition-all animate-fade-in">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {t('totalProducts', langMode)}
            </p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalProducts}</p>
          </div>
          <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
            <Package className="w-5 h-5" />
          </span>
        </div>

        {/* Total Stock Qty */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between group hover:border-blue-100 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {t('totalStockQuantity', langMode)}
            </p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalStockQty}</p>
          </div>
          <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
            <Layers className="w-5 h-5" />
          </span>
        </div>

        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between group hover:border-emerald-100 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {t('todaySales', langMode)}
            </p>
            <p className="text-2xl font-bold text-emerald-600">₹{stats.todaySales.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 font-medium">
              {langMode === 'gu' ? `આ મહિને: ₹${stats.monthlySales.toLocaleString()}` : `This Month: ₹${stats.monthlySales.toLocaleString()}`}
            </p>
          </div>
          <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </span>
        </div>

        {/* Today's Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between group hover:border-amber-100 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {t('todayProfit', langMode)}
            </p>
            <p className="text-2xl font-bold text-amber-600">₹{stats.todayProfit.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 font-medium">
              {langMode === 'gu' ? `આ મહિને: ₹${stats.monthlyProfit.toLocaleString()}` : `This Month: ₹${stats.monthlyProfit.toLocaleString()}`}
            </p>
          </div>
          <span className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
            <DollarSign className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Stock Value valuation banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {langMode === 'gu' ? 'કુલ સ્ટોક મૂલ્યાંકન' : 'Total Stock Asset Valuation'}
            </p>
            <p className="text-sm text-slate-400">
              {langMode === 'gu' ? 'ખરીદી કિંમત (ખર્ચ) અને વેચાણ કિંમત (બજાર કિંમત) અનુસાર સ્ટોકનું મૂલ્ય' : 'Valuation based on Purchase Price (Cost) vs Selling Price (Market Value)'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 divide-x divide-slate-200">
          <div className="pl-0 text-center md:text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cost Value (ખરીદી કિંમત)</span>
            <p className="text-lg font-bold text-slate-700">₹{stats.totalStockValueCost.toLocaleString()}</p>
          </div>
          <div className="pl-6 text-center md:text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Market Value (વેચાણ કિંમત)</span>
            <p className="text-lg font-bold text-emerald-600">₹{stats.totalStockValueRetail.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* LOW STOCK ALERTS PANEL */}
      {stats.lowStockItems.length > 0 && (
        <div className="bg-red-50/70 border border-red-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm animate-pulse">
          <span className="p-2 bg-red-100 text-red-600 rounded-xl">
            <AlertTriangle className="w-5 h-5 shrink-0" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-red-800">
              {t('lowStockAlert', langMode)} ({stats.lowStockItems.length})
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {stats.lowStockItems.map(item => (
                <span 
                  key={item.id} 
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-red-200 text-xs font-semibold text-red-700 rounded-lg shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {langMode === 'gu' ? item.product_name_gu : item.product_name}
                  <span className="text-slate-400">({item.stock_quantity} {item.unit})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">
              {langMode === 'gu' ? 'દૈનિક વેચાણ (છેલ્લા ૭ દિવસ)' : 'Daily Sales Trend (Last 7 Days)'}
            </h3>
            <span className="text-xs text-slate-400 font-medium">₹ (INR)</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  formatter={(value) => [`₹${value}`, langMode === 'gu' ? 'વેચાણ' : 'Sales']} 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category-wise Sales Pie Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">
              {langMode === 'gu' ? 'કેટેગરી મુજબ વેચાણ' : 'Category-wise Sales Split'}
            </h3>
          </div>
          <div className="h-64 relative flex items-center justify-center">
            {categoryChartData.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No sales recorded yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`₹${value}`, 'Sales']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', bottom: 5 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Profit Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">
              {langMode === 'gu' ? 'માસિક નફો (છેલ્લા ૬ મહિના)' : 'Monthly Net Profit (Last 6 Months)'}
            </h3>
            <span className="text-xs text-slate-400 font-medium">₹ (INR)</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  formatter={(value) => [`₹${value}`, langMode === 'gu' ? 'નફો' : 'Profit']} 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="Profit" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <Award className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-700">
              {t('topSellingProducts', langMode)}
            </h3>
          </div>
          <div className="space-y-3">
            {topSelling.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center font-medium">No sales transactions available.</p>
            ) : (
              topSelling.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-700 line-clamp-1">{item.name}</p>
                      <span className="text-[10px] text-slate-400 font-medium">{item.category}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-700">{item.qty} units</p>
                    <p className="text-[10px] text-slate-400 font-semibold">₹{item.salesVal.toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <ListOrdered className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-700">
              {t('recentTransactions', langMode)}
            </h3>
          </div>
          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center font-medium">No transactions recorded yet.</p>
            ) : (
              recentTransactions.map((tx, idx) => (
                <div key={idx} className="flex items-start justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className={`p-1.5 rounded-lg text-[9px] font-bold shrink-0 ${
                      tx.type === 'sale' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {tx.type === 'sale' ? 'SL' : 'PR'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 line-clamp-1">{tx.description}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{tx.party}</p>
                      <p className="text-[9px] text-slate-305 font-medium">
                        {new Date(tx.date).toLocaleDateString(langMode === 'gu' ? 'gu-IN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-bold ${tx.type === 'sale' ? 'text-slate-800' : 'text-slate-600'}`}>
                      {tx.type === 'sale' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                    </p>
                    {tx.type === 'sale' && (
                      <span className="text-[9px] font-bold text-emerald-600 block">
                        +₹{tx.profit.toLocaleString()} Profit
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
