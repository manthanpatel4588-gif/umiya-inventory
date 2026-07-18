import React, { useState, useMemo } from 'react';
import { Coins, Plus, Trash2, Download, DollarSign, Calendar, Tag, FileText, Search, CreditCard, CheckCircle, AlertTriangle, Lock } from 'lucide-react';
import { db, User as UserType, Expense } from '../database/db';
import { LanguageMode } from '../utils/translations';

interface ExpenseManagerProps {
  langMode: LanguageMode;
  currentUser: UserType;
}

const EXPENSE_CATEGORIES = [
  'Shop Rent / દુકાન ભાડું',
  'Staff Salary / પગાર',
  'Electricity / લાઇટ બિલ',
  'Tea & Refreshments / ચા-નાસ્તો',
  'Transport & Freight / પરિવહન ખર્ચ',
  'Miscellaneous / અન્ય ખર્ચ'
] as const;

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({ langMode, currentUser }) => {
  const [expenses, setExpenses] = useState<Expense[]>(() => db.getExpenses(currentUser.id));

  // Form input states
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI'>('Cash');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Subscription check
  const isExpired = new Date(currentUser.plan_expiry) < new Date();

  // Add new expense entry
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) return;
    setSuccessMsg('');
    setErrorMsg('');

    const amt = parseFloat(amount);
    if (!description.trim()) {
      setErrorMsg(langMode === 'gu' ? 'કૃપા કરીને ખર્ચની વિગત દાખલ કરો' : 'Please enter expense description');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg(langMode === 'gu' ? 'કૃપા કરીને માન્ય રકમ દાખલ કરો' : 'Please enter a valid amount');
      return;
    }

    try {
      const payload: Expense = {
        id: '', // database will generate
        shop_id: currentUser.id,
        expense_date: new Date(expenseDate).toISOString(),
        description: description.trim(),
        category,
        amount: amt,
        payment_mode: paymentMode
      };

      db.saveExpense(payload, currentUser.id);
      
      // Reset inputs
      setDescription('');
      setAmount('');
      setCategory(EXPENSE_CATEGORIES[0]);
      setPaymentMode('Cash');

      setSuccessMsg(langMode === 'gu' ? 'ખર્ચ સફળતાપૂર્વક ઉમેરવામાં આવ્યો છે!' : 'Expense saved successfully!');
      setExpenses(db.getExpenses(currentUser.id));
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving expense');
    }
  };

  // Delete expense entry
  const handleDeleteExpense = (id: string) => {
    if (isExpired) return;
    if (window.confirm(langMode === 'gu' ? 'શું તમે આ ખર્ચ કાઢી નાખવા માંગો છો?' : 'Are you sure you want to delete this expense?')) {
      db.deleteExpense(id, currentUser.id);
      setExpenses(db.getExpenses(currentUser.id));
    }
  };

  // Filtered Expense list
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchQuery.toLowerCase()) || e.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'All' || e.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, filterCategory]);

  // Total Expenses sum
  const totalExpensesSum = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Export Expenses to CSV for CA
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert(langMode === 'gu' ? 'નિકાસ કરવા માટે કોઈ ડેટા નથી!' : 'No data available to export!');
      return;
    }

    const headers = ['Date', 'Category', 'Description', 'Amount (INR)', 'Payment Mode'];
    const rows = filteredExpenses.map(e => [
      new Date(e.expense_date).toLocaleDateString(),
      e.category,
      e.description,
      e.amount.toString(),
      e.payment_mode
    ]);

    const csvContent = 
      'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expenses_Report_${currentUser.shop_name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-600" />
            <span>Expense Manager / દુકાન ખર્ચ રજીસ્ટર</span>
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {langMode === 'gu' 
              ? 'તમારી દુકાનમાં થતા દૈનિક ખર્ચાઓ જેવા કે ભાડું, સ્ટાફ પગાર, લાઇટ બિલ વગેરે રેકોર્ડ કરો.' 
              : 'Record, manage and monitor operational shop expenses. Export logs to CSV sheets for CA tax filing.'}
          </p>
        </div>

        {filteredExpenses.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-100"
          >
            <Download className="w-4 h-4" />
            <span>Export Expenses (CSV) / નિકાસ કરો</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Form: Add Expense */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit">
          <h3 className="font-bold text-slate-700 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <Plus className="w-4 h-4" />
            </span>
            <span>Record New Expense / નવો ખર્ચ ઉમેરો</span>
          </h3>

          <form onSubmit={handleAddExpense} className="space-y-4">
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-250 text-xs font-bold text-emerald-700 rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs font-bold text-red-700 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {isExpired && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Subscription Expired! Read-Only Mode.</span>
              </div>
            )}

            {/* Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Expense Date / તારીખ</span>
              </label>
              <input
                type="date"
                value={expenseDate}
                disabled={isExpired}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-60"
              />
            </div>

            {/* Category Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Category / ખર્ચનો પ્રકાર</span>
              </label>
              <select
                value={category}
                disabled={isExpired}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Description Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Description / વિગત</span>
              </label>
              <input
                type="text"
                disabled={isExpired}
                placeholder="e.g. June Shop Rent, Staff tea bill..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>Amount / ખર્ચ રકમ (₹)</span>
              </label>
              <input
                type="number"
                step="0.01"
                disabled={isExpired}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Payment Mode */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-slate-400" />
                <span>Payment Mode / ચુકવણી પ્રકાર</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isExpired}
                  onClick={() => setPaymentMode('Cash')}
                  className={`py-2 px-3 border text-xs font-bold rounded-xl transition-all ${
                    paymentMode === 'Cash'
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cash / રોકડ
                </button>
                <button
                  type="button"
                  disabled={isExpired}
                  onClick={() => setPaymentMode('UPI')}
                  className={`py-2 px-3 border text-xs font-bold rounded-xl transition-all ${
                    paymentMode === 'UPI'
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  UPI / ઓનલાઇન
                </button>
              </div>
            </div>

            {/* Submit Button */}
            {!isExpired ? (
              <button
                type="submit"
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
              >
                Record Expense / ખર્ચ સાચવો
              </button>
            ) : (
              <div className="w-full py-2.5 bg-slate-100 text-slate-400 text-center font-bold text-xs rounded-xl border border-slate-200">
                Locked
              </div>
            )}
          </form>
        </div>

        {/* Right Table: Expenses Log */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[400px]">
          
          <div className="space-y-4">
            {/* Header Filters */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pb-3 border-b border-slate-100">
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">Filter:</span>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full sm:w-auto p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                >
                  <option value="All">All Categories</option>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Expenses Table */}
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-left border-collapse text-xs text-slate-600">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400 uppercase text-[9px] tracking-wider">
                    <th className="px-3 py-2">Date / Type</th>
                    <th className="px-3 py-2">Description / વિગત</th>
                    <th className="px-3 py-2 text-right">Amount (₹)</th>
                    <th className="px-3 py-2 text-center">Paid Via</th>
                    <th className="px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No expenses matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50/20">
                        <td className="px-3 py-2.5">
                          <p className="font-bold text-slate-800">{new Date(e.expense_date).toLocaleDateString()}</p>
                          <span className="text-[9px] text-slate-400 font-normal block truncate max-w-[120px]">{e.category.split('/')[0]}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-slate-700 line-clamp-1">{e.description}</p>
                        </td>
                        <td className="px-3 py-2.5 text-right font-black text-slate-800">
                          ₹{e.amount.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                            e.payment_mode === 'UPI' 
                              ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {e.payment_mode}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => handleDeleteExpense(e.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sum Summary footer */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Expenses / કુલ ખર્ચ:</span>
            <span className="text-sm font-black text-red-600">₹{totalExpensesSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

        </div>

      </div>
    </div>
  );
};
