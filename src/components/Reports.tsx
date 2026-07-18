import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Printer, 
  DollarSign, 
  Layers, 
  TrendingUp, 
  PieChart as PieIcon
} from 'lucide-react';
import { Product, Purchase, Sale, db, User as UserType } from '../database/db';
import { LanguageMode, t } from '../utils/translations';

interface ReportsProps {
  langMode: LanguageMode;
  currentUser: UserType;
}

type ReportType = 'sales' | 'purchases' | 'profit' | 'stock' | 'category';

export const Reports: React.FC<ReportsProps> = ({ langMode, currentUser }) => {
  const [products] = useState<Product[]>(() => db.getProducts(currentUser.id));
  const [purchases] = useState<Purchase[]>(() => db.getPurchases(currentUser.id));
  const [sales] = useState<Sale[]>(() => db.getSales(currentUser.id));

  const [reportType, setReportType] = useState<ReportType>('sales');
  
  // Date Filters
  const [dateRangeType, setDateRangeType] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Default to start of month
    return d.toISOString().substring(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().substring(0, 10));

  // Compute date range limits
  const dateLimits = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    if (dateRangeType === 'today') {
      return { start: today, end: today };
    }
    if (dateRangeType === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return { start: d.toISOString().split('T')[0], end: today };
    }
    if (dateRangeType === 'month') {
      const d = new Date();
      d.setDate(1);
      return { start: d.toISOString().split('T')[0], end: today };
    }
    return { start: startDate, end: endDate };
  }, [dateRangeType, startDate, endDate]);

  // SALES REPORT DATA
  const salesReportData = useMemo(() => {
    return sales.filter(s => {
      const sDate = s.sale_date.split('T')[0];
      return sDate >= dateLimits.start && sDate <= dateLimits.end;
    });
  }, [sales, dateLimits]);

  // PURCHASES REPORT DATA
  const purchasesReportData = useMemo(() => {
    return purchases.filter(p => {
      const pDate = p.purchase_date.split('T')[0];
      return pDate >= dateLimits.start && pDate <= dateLimits.end;
    });
  }, [purchases, dateLimits]);

  // STOCK REPORT DATA (always current state)
  const stockReportData = useMemo(() => {
    return products.map(p => {
      const isLowStock = p.stock_quantity <= p.minimum_stock;
      return {
        ...p,
        stock_value_cost: p.stock_quantity * p.purchase_price,
        stock_value_retail: p.stock_quantity * p.selling_price,
        isLowStock
      };
    });
  }, [products]);

  // CATEGORY REPORT DATA
  const categoryReportData = useMemo(() => {
    const map: Record<string, { totalProducts: number; totalStock: number; stockValue: number; salesVal: number; profitVal: number }> = {};
    
    products.forEach(p => {
      if (!map[p.category]) {
        map[p.category] = { totalProducts: 0, totalStock: 0, stockValue: 0, salesVal: 0, profitVal: 0 };
      }
      map[p.category].totalProducts += 1;
      map[p.category].totalStock += p.stock_quantity;
      map[p.category].stockValue += p.stock_quantity * p.purchase_price;
    });

    salesReportData.forEach(s => {
      const p = products.find(prod => prod.id === s.product_id);
      const cat = p ? p.category : 'General FMCG';
      if (!map[cat]) {
        map[cat] = { totalProducts: 0, totalStock: 0, stockValue: 0, salesVal: 0, profitVal: 0 };
      }
      map[cat].salesVal += s.quantity * s.sale_price;
      map[cat].profitVal += s.profit;
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      ...data
    }));
  }, [products, salesReportData]);

  // Summary Totals
  const summary = useMemo(() => {
    if (reportType === 'sales') {
      const totalSalesAmt = salesReportData.reduce((acc, s) => acc + (s.quantity * s.sale_price), 0);
      const totalProfit = salesReportData.reduce((acc, s) => acc + s.profit, 0);
      return {
        primaryLabel: langMode === 'gu' ? 'કુલ વેચાણ કિંમત' : 'Total Revenue',
        primaryVal: `₹${totalSalesAmt.toLocaleString()}`,
        secondaryLabel: langMode === 'gu' ? 'કુલ નફો' : 'Total Net Profit',
        secondaryVal: `₹${totalProfit.toLocaleString()}`,
        accentColor: 'text-emerald-600',
        accentBg: 'bg-emerald-50'
      };
    }
    if (reportType === 'purchases') {
      const totalPurchasesAmt = purchasesReportData.reduce((acc, p) => acc + p.total_amount, 0);
      const totalVolume = purchasesReportData.reduce((acc, p) => acc + p.quantity, 0);
      return {
        primaryLabel: langMode === 'gu' ? 'કુલ ખરીદી રકમ' : 'Total Purchases Cost',
        primaryVal: `₹${totalPurchasesAmt.toLocaleString()}`,
        secondaryLabel: langMode === 'gu' ? 'કુલ જથ્થો ખરીદ્યો' : 'Total Units Purchased',
        secondaryVal: `${totalVolume} units`,
        accentColor: 'text-amber-600',
        accentBg: 'bg-amber-50'
      };
    }
    if (reportType === 'profit') {
      const totalSalesAmt = salesReportData.reduce((acc, s) => acc + (s.quantity * s.sale_price), 0);
      const totalProfit = salesReportData.reduce((acc, s) => acc + s.profit, 0);
      const profitMargin = totalSalesAmt > 0 ? (totalProfit / totalSalesAmt) * 100 : 0;
      return {
        primaryLabel: langMode === 'gu' ? 'કુલ ચોખ્ખો નફો' : 'Net Margin Profit',
        primaryVal: `₹${totalProfit.toLocaleString()}`,
        secondaryLabel: langMode === 'gu' ? 'નફાની સરેરાશ ટકાવારી' : 'Average Net Margin',
        secondaryVal: `${profitMargin.toFixed(1)}%`,
        accentColor: 'text-emerald-600',
        accentBg: 'bg-emerald-50'
      };
    }
    const totalQty = stockReportData.reduce((acc, p) => acc + p.stock_quantity, 0);
    const totalCost = stockReportData.reduce((acc, p) => acc + p.stock_value_cost, 0);
    return {
      primaryLabel: langMode === 'gu' ? 'કુલ સ્ટોક એસેટ કિંમત' : 'Inventory Asset Cost',
      primaryVal: `₹${totalCost.toLocaleString()}`,
      secondaryLabel: langMode === 'gu' ? 'કુલ આઇટમ્સ જથ્થો' : 'Total Available Units',
      secondaryVal: `${totalQty} units`,
      accentColor: 'text-blue-600',
      accentBg: 'bg-blue-50'
    };
  }, [reportType, salesReportData, purchasesReportData, stockReportData, langMode]);

  // CSV EXPORT
  const handleExport = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let fileName = `Umiya_${reportType}_report`;

    if (reportType === 'sales' || reportType === 'profit') {
      headers = ['Invoice No', 'Sale Date', 'Product Name', 'Quantity Sold', 'Sale Rate (₹)', 'Total Amount (₹)', 'Net Profit (₹)', 'Customer Name'];
      rows = salesReportData.map(s => [
        s.invoice_number,
        new Date(s.sale_date).toLocaleDateString(),
        s.product_name,
        s.quantity,
        s.sale_price,
        s.quantity * s.sale_price,
        s.profit,
        s.customer_name || 'Walk-in'
      ]);
    } else if (reportType === 'purchases') {
      headers = ['Purchase ID', 'Purchase Date', 'Product Name', 'Supplier Name', 'Quantity', 'Purchase Rate (₹)', 'Total Bill (₹)'];
      rows = purchasesReportData.map(p => [
        p.id,
        new Date(p.purchase_date).toLocaleDateString(),
        p.product_name,
        p.supplier_name,
        p.quantity,
        p.purchase_price,
        p.total_amount
      ]);
    } else if (reportType === 'stock') {
      headers = ['Product ID', 'Product Name', 'Category', 'Purchase Price (₹)', 'Selling Price (₹)', 'Stock Quantity', 'Unit', 'Stock Value Cost (₹)', 'Stock Value Retail (₹)'];
      rows = stockReportData.map(p => [
        p.id,
        p.product_name,
        p.category,
        p.purchase_price,
        p.selling_price,
        p.stock_quantity,
        p.unit,
        p.stock_value_cost,
        p.stock_value_retail
      ]);
    } else if (reportType === 'category') {
      headers = ['Category Name', 'Total Product Variations', 'Total Stock Qty', 'Stock Value Cost (₹)', 'Period Revenue (₹)', 'Period Profit (₹)'];
      rows = categoryReportData.map(c => [
        c.name,
        c.totalProducts,
        c.totalStock,
        c.stockValue,
        c.salesVal,
        c.profitVal
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${dateLimits.start}_to_${dateLimits.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printRoot = document.createElement('div');
    printRoot.id = 'print-root';
    printRoot.innerHTML = `
      <div class="p-8 space-y-4">
        <div class="text-center pb-4 border-b">
          <h2 class="text-xl font-bold">${currentUser.shop_name.toUpperCase()}</h2>
          <p class="text-sm">Reports Dashboard</p>
          <p class="text-xs text-slate-500">Report: ${reportType.toUpperCase()} | Date: ${dateLimits.start} to ${dateLimits.end}</p>
        </div>
        ${document.getElementById('report-table-printable')?.innerHTML || ''}
      </div>
    `;
    document.body.appendChild(printRoot);
    window.print();
    document.body.removeChild(printRoot);
  };

  // Export Customer Contacts list
  const handleExportCustomerContacts = () => {
    const customersMap: Record<string, { name: string; mobile: string; address: string; totalSpent: number; totalBills: number; invoiceNumbers: Set<string> }> = {};
    
    sales.forEach(sale => {
      const mob = sale.customer_mobile ? sale.customer_mobile.trim() : '';
      const nm = sale.customer_name ? sale.customer_name.trim() : '';
      const key = mob || nm || 'Walk-in';
      if (key === 'Walk-in' || (!mob && !nm)) return;

      const prod = products.find(p => p.id === sale.product_id);
      const gstRate = prod?.gst_rate || 0;
      const base = sale.quantity * sale.sale_price;
      const totalAmt = base + (base * (gstRate / 100));

      if (!customersMap[key]) {
        customersMap[key] = {
          name: sale.customer_name || 'Customer',
          mobile: sale.customer_mobile || '',
          address: sale.customer_address || 'Not Provided',
          totalSpent: 0,
          totalBills: 0,
          invoiceNumbers: new Set()
        };
      }

      if (sale.product_name !== 'Udhaar Payment Settle / ઉધાર જમા') {
        customersMap[key].totalSpent += totalAmt;
      }
      customersMap[key].invoiceNumbers.add(sale.invoice_number);
    });

    const uniqueCustomers = Object.values(customersMap).map(c => ({
      ...c,
      totalBills: c.invoiceNumbers.size
    }));

    if (uniqueCustomers.length === 0) {
      alert(langMode === 'gu' ? 'નિકાસ કરવા માટે કોઈ ગ્રાહક રેકોર્ડ નથી!' : 'No customer records available to export!');
      return;
    }

    const headers = ['Customer Name', 'Mobile Number', 'Address', 'Total Purchases (INR)', 'Total Invoices Count'];
    const rows = uniqueCustomers.map(c => [
      c.name,
      c.mobile,
      c.address,
      c.totalSpent.toFixed(2),
      c.totalBills.toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Customer_Contacts_${currentUser.shop_name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {t('reports', langMode)}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {langMode === 'gu' 
              ? 'નાણાકીય રિપોર્ટ, વેચાણ નફો અને સ્ટોક અહેવાલ ડાઉનલોડ કે પ્રિન્ટ કરો.' 
              : 'Generate comprehensive reports on sales, purchase logs, net profits, and current stock.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>{t('print', langMode)}</span>
          </button>
          
          <button 
            onClick={handleExportCustomerContacts}
            className="flex items-center gap-1.5 bg-blue-650 hover:bg-blue-750 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Export Contacts (CSV) / ગ્રાહકો એક્સપોર્ટ</span>
          </button>

          <button 
            onClick={handleExport}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>{t('exportExcel', langMode)}</span>
          </button>
        </div>
      </div>

      {/* FILTERS DASHBOARD */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        {/* Report Type selector Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-4">
          {[
            { id: 'sales', label: langMode === 'gu' ? 'દૈનિક/માસિક વેચાણ' : 'Sales Report', icon: TrendingUp },
            { id: 'purchases', label: langMode === 'gu' ? 'ખરીદી અહેવાલ' : 'Purchase Report', icon: Layers },
            { id: 'profit', label: langMode === 'gu' ? 'નફાકારકતા અહેવાલ' : 'Profit Report', icon: DollarSign },
            { id: 'stock', label: langMode === 'gu' ? 'સ્ટોક ઇન્વેન્ટરી' : 'Stock Inventory', icon: BarChart3 },
            { id: 'category', label: langMode === 'gu' ? 'કેટેગરી રિપોર્ટ' : 'Category Sales', icon: PieIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = reportType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id as ReportType)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  isActive 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date Ranges Filters */}
        {reportType !== 'stock' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Quick Ranges / તારીખ પ્રીસેટ
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 border border-slate-200 rounded-lg text-xs">
                {[
                  { id: 'today', label: langMode === 'gu' ? 'આજે' : 'Today' },
                  { id: 'week', label: langMode === 'gu' ? 'અઠવાડિયું' : '7 Days' },
                  { id: 'month', label: langMode === 'gu' ? 'આ મહિનો' : 'Month' }
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => setDateRangeType(r.id as any)}
                    className={`py-1 rounded-md font-semibold text-center ${
                      dateRangeType === r.id 
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center md:text-left mt-4 md:mt-0">
              <button 
                onClick={() => setDateRangeType('custom')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                  dateRangeType === 'custom' 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                Custom Date Range / કસ્ટમ તારીખ
              </button>
            </div>

            {dateRangeType === 'custom' && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Start Date / શરૂઆત</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>End Date / અંતિમ</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* SUMMARY TOTALS BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-5 border border-slate-100 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <span className={`p-3 rounded-2xl ${summary.accentBg} ${summary.accentColor}`}>
            <BarChart3 className="w-6 h-6" />
          </span>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              {summary.primaryLabel}
            </span>
            <p className={`text-2xl font-black ${summary.accentColor} mt-0.5`}>
              {summary.primaryVal}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              {summary.secondaryLabel}
            </span>
            <p className="text-xl font-bold text-slate-700 mt-0.5">
              {summary.secondaryVal}
            </p>
          </div>
        </div>
      </div>

      {/* REPORT DATA TABLE */}
      <div id="report-table-printable" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {reportType === 'sales' && (
            <table className="w-full text-left border-collapse text-xs text-slate-650">
              <thead>
                <tr className="bg-slate-50 border-b font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Invoice No</th>
                  <th className="px-6 py-4">Sale Date</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4 text-right">Qty</th>
                  <th className="px-6 py-4 text-right">Rate</th>
                  <th className="px-6 py-4 text-right">Total amount</th>
                  <th className="px-6 py-4">Customer Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesReportData.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">No sales recorded.</td></tr>
                ) : (
                  salesReportData.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/20">
                      <td className="px-6 py-3 font-bold text-slate-800">{s.invoice_number}</td>
                      <td className="px-6 py-3">{new Date(s.sale_date).toLocaleDateString()}</td>
                      <td className="px-6 py-3 font-semibold text-slate-800">{s.product_name}</td>
                      <td className="px-6 py-3 text-right">{s.quantity} units</td>
                      <td className="px-6 py-3 text-right">₹{s.sale_price.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-600">₹{(s.quantity * s.sale_price).toFixed(2)}</td>
                      <td className="px-6 py-3 text-slate-500">{s.customer_name || 'Walk-in'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {reportType === 'purchases' && (
            <table className="w-full text-left border-collapse text-xs text-slate-650">
              <thead>
                <tr className="bg-slate-50 border-b font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Purchase Date</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">Supplier Name</th>
                  <th className="px-6 py-4 text-right">Qty</th>
                  <th className="px-6 py-4 text-right">Rate</th>
                  <th className="px-6 py-4 text-right">Total bill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchasesReportData.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No purchases recorded.</td></tr>
                ) : (
                  purchasesReportData.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/20">
                      <td className="px-6 py-3">{new Date(p.purchase_date).toLocaleDateString()}</td>
                      <td className="px-6 py-3 font-semibold text-slate-800">{p.product_name}</td>
                      <td className="px-6 py-3 text-slate-500">{p.supplier_name}</td>
                      <td className="px-6 py-3 text-right">{p.quantity} units</td>
                      <td className="px-6 py-3 text-right">₹{p.purchase_price.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-600">₹{p.total_amount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {reportType === 'profit' && (
            <table className="w-full text-left border-collapse text-xs text-slate-655">
              <thead>
                <tr className="bg-slate-50 border-b font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Invoice No</th>
                  <th className="px-6 py-4">Sale Date</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4 text-right">Qty Sold</th>
                  <th className="px-6 py-4 text-right">Sale Price</th>
                  <th className="px-6 py-4 text-right">Revenue</th>
                  <th className="px-6 py-4 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesReportData.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">No profit records available.</td></tr>
                ) : (
                  salesReportData.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/20">
                      <td className="px-6 py-3 font-bold text-slate-800">{s.invoice_number}</td>
                      <td className="px-6 py-3">{new Date(s.sale_date).toLocaleDateString()}</td>
                      <td className="px-6 py-3 font-semibold text-slate-800">{s.product_name}</td>
                      <td className="px-6 py-3 text-right">{s.quantity} units</td>
                      <td className="px-6 py-3 text-right">₹{s.sale_price.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-medium">₹{(s.quantity * s.sale_price).toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-600">₹{s.profit.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {reportType === 'stock' && (
            <table className="w-full text-left border-collapse text-xs text-slate-650">
              <thead>
                <tr className="bg-slate-50 border-b font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-right">Cost Price</th>
                  <th className="px-6 py-4 text-right">Selling Price</th>
                  <th className="px-6 py-4 text-center">Available Stock</th>
                  <th className="px-6 py-4 text-right">Stock Value (Cost)</th>
                  <th className="px-6 py-4 text-right">Stock Value (Market)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockReportData.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/20">
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{p.product_name}</span>
                        <span className="text-[10px] text-slate-400">{p.product_name_gu}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-500 font-medium">{p.category}</td>
                    <td className="px-6 py-3 text-right">₹{p.purchase_price.toFixed(2)}</td>
                    <td className="px-6 py-3 text-right text-emerald-600">₹{p.selling_price.toFixed(2)}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${p.isLowStock ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {p.stock_quantity} {p.unit}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-medium">₹{p.stock_value_cost.toFixed(2)}</td>
                    <td className="px-6 py-3 text-right font-bold text-emerald-600">₹{p.stock_value_retail.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'category' && (
            <table className="w-full text-left border-collapse text-xs text-slate-650">
              <thead>
                <tr className="bg-slate-50 border-b font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Category Name</th>
                  <th className="px-6 py-4 text-center">Product Variations</th>
                  <th className="px-6 py-4 text-center">Total Stock Quantity</th>
                  <th className="px-6 py-4 text-right">Stock Valuation (Cost)</th>
                  <th className="px-6 py-4 text-right">Period Sales Revenue</th>
                  <th className="px-6 py-4 text-right">Period Sales Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categoryReportData.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/20">
                    <td className="px-6 py-3 font-bold text-slate-800">{c.name}</td>
                    <td className="px-6 py-3 text-center font-medium">{c.totalProducts} types</td>
                    <td className="px-6 py-3 text-center font-medium">{c.totalStock} units</td>
                    <td className="px-6 py-3 text-right">₹{c.stockValue.toFixed(2)}</td>
                    <td className="px-6 py-3 text-right font-bold text-emerald-600">₹{c.salesVal.toFixed(2)}</td>
                    <td className="px-6 py-3 text-right font-bold text-amber-600">₹{c.profitVal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
