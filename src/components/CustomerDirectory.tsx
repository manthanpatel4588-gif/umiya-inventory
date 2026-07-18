import React, { useState, useMemo } from 'react';
import { Users, Search, Phone, MapPin, FileText, ShoppingBag, ArrowRight, Edit3, Coins, CreditCard, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { db, User as UserType, Sale, Product } from '../database/db';
import { LanguageMode } from '../utils/translations';
import { InvoiceModal } from './InvoiceModal';
import { supabase } from '../database/supabase';

interface CustomerDirectoryProps {
  langMode: LanguageMode;
  currentUser: UserType;
}

interface CustomerRecord {
  name: string;
  mobile: string;
  address: string;
  totalSpent: number;
  totalInvoices: number;
  udhaarBalance: number;
  salesList: Sale[];
}

export const CustomerDirectory: React.FC<CustomerDirectoryProps> = ({ langMode, currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);

  // States for Profile Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editError, setEditError] = useState('');

  // States for Udhaar Settle Modal
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settlePaymentMode, setSettlePaymentMode] = useState<'Cash' | 'UPI'>('Cash');
  const [settleError, setSettleError] = useState('');

  // Active invoice modal state
  const [activeInvoiceSale, setActiveInvoiceSale] = useState<Sale | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Local state trigger to reload data
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // 1. Fetch sales and products to calculate exclusive totals correctly
  const sales = useMemo(() => db.getSales(currentUser.id), [currentUser.id, reloadTrigger]);
  const products = useMemo(() => db.getProducts(currentUser.id), [currentUser.id]);

  // 2. Process sales list into unique customer cards
  const customersList = useMemo(() => {
    const map: Record<string, CustomerRecord> = {};

    sales.forEach(sale => {
      // Clean mobile or customer name to form unique keys
      const mobileKey = sale.customer_mobile ? sale.customer_mobile.trim() : '';
      const nameKey = sale.customer_name ? sale.customer_name.trim() : '';
      const key = mobileKey || nameKey || 'Walk-in';

      // Skip default empty walk-ins
      if (key === 'Walk-in' || (!mobileKey && !nameKey)) return;

      const prod = products.find(p => p.id === sale.product_id);
      const gstRate = prod?.gst_rate || 0;
      // Exclusive total price calculation
      const baseTotal = sale.quantity * sale.sale_price;
      const gstAmt = baseTotal * (gstRate / 100);
      const totalAmount = baseTotal + gstAmt;

      if (!map[key]) {
        map[key] = {
          name: sale.customer_name || 'Customer / ગ્રાહક',
          mobile: sale.customer_mobile || '',
          address: sale.customer_address || 'Not Provided / લખાયેલ નથી',
          totalSpent: 0,
          totalInvoices: 0,
          udhaarBalance: 0,
          salesList: []
        };
      }

      if (sale.product_name === 'Udhaar Payment Settle / ઉધાર જમા') {
        // Settle transaction reduces Udhaar balance
        map[key].udhaarBalance -= totalAmount;
      } else {
        // Normal purchases
        map[key].totalSpent += totalAmount;
        if (sale.payment_mode === 'Udhaar') {
          map[key].udhaarBalance += totalAmount;
        }
      }

      map[key].salesList.push(sale);
    });

    // Compute total invoice count by counting unique invoice numbers
    return Object.values(map).map(customer => {
      const invoiceNumbers = new Set(customer.salesList.map(s => s.invoice_number));
      return {
        ...customer,
        totalInvoices: invoiceNumbers.size,
        udhaarBalance: Math.max(0, customer.udhaarBalance)
      };
    });
  }, [sales, products]);

  // 3. Filter customers based on search query
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customersList;
    const query = searchQuery.toLowerCase();
    return customersList.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.mobile.includes(query) ||
      c.address.toLowerCase().includes(query)
    );
  }, [customersList, searchQuery]);

  // Find active customer record for details view
  const activeCustomer = useMemo(() => {
    if (!selectedCustomerKey) return null;
    return customersList.find(c => (c.mobile || c.name) === selectedCustomerKey) || null;
  }, [customersList, selectedCustomerKey]);

  // Group active customer sales list by invoice number for clean list
  const activeCustomerInvoices = useMemo(() => {
    if (!activeCustomer) return [];
    
    const invoicesMap: Record<string, { invoice_number: string, date: string, firstSaleItem: Sale, total: number }> = {};
    activeCustomer.salesList.forEach(sale => {
      const prod = products.find(p => p.id === sale.product_id);
      const gstRate = prod?.gst_rate || 0;
      const baseTotal = sale.quantity * sale.sale_price;
      const gstAmt = baseTotal * (gstRate / 100);
      const totalAmt = baseTotal + gstAmt;

      if (!invoicesMap[sale.invoice_number]) {
        invoicesMap[sale.invoice_number] = {
          invoice_number: sale.invoice_number,
          date: sale.sale_date,
          firstSaleItem: sale,
          total: 0
        };
      }
      invoicesMap[sale.invoice_number].total += totalAmt;
    });

    return Object.values(invoicesMap).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeCustomer, products]);

  // Global edit for customer records
  const handleOpenEdit = () => {
    if (!activeCustomer) return;
    setEditName(activeCustomer.name);
    setEditMobile(activeCustomer.mobile);
    setEditAddress(activeCustomer.address === 'Not Provided / લખાયેલ નથી' ? '' : activeCustomer.address);
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    if (!editName.trim()) {
      setEditError(langMode === 'gu' ? 'કૃપા કરીને ગ્રાહકનું નામ દાખલ કરો' : 'Customer Name is required');
      return;
    }
    if (editMobile.trim() && editMobile.trim().length !== 10) {
      setEditError(langMode === 'gu' ? 'મોબાઇલ નંબર ૧૦ અંકનો હોવો જોઈએ' : 'Mobile must be 10 digits');
      return;
    }

    try {
      const allSales = JSON.parse(localStorage.getItem('umiya_sales') || '[]');
      
      // Update matching sales logs
      const updatedSales = allSales.map((s: Sale) => {
        const isMatch = (activeCustomer?.mobile && s.customer_mobile === activeCustomer.mobile) ||
                        (!activeCustomer?.mobile && s.customer_name === activeCustomer?.name);
        
        if (isMatch) {
          return {
            ...s,
            customer_name: editName.trim(),
            customer_mobile: editMobile.trim() || undefined,
            customer_address: editAddress.trim() || undefined
          };
        }
        return s;
      });

      localStorage.setItem('umiya_sales', JSON.stringify(updatedSales));

      // Supabase Sync (Background)
      if (supabase) {
        const client = supabase;
        const modifiedList = updatedSales.filter((s: Sale) => {
          const m = s.customer_mobile || '';
          const n = s.customer_name || '';
          return (m === editMobile.trim()) || (n === editName.trim());
        });
        modifiedList.forEach((s: Sale) => {
          client.from('sales').upsert(s).then(({ error }) => {
            if (error) console.error('Supabase sync customer edit error:', error);
          });
        });
      }

      db.addAuditLog(currentUser.id, `Customer profile updated globally: ${editName}`, currentUser.id);
      
      // Update state key
      setSelectedCustomerKey(editMobile.trim() || editName.trim());
      setIsEditModalOpen(false);
      setReloadTrigger(prev => prev + 1);
    } catch (err: any) {
      setEditError(err.message || 'Error updating profile');
    }
  };

  // Udhaar payments settlements
  const handleOpenSettle = () => {
    setSettleAmount('');
    setSettlePaymentMode('Cash');
    setSettleError('');
    setIsSettleModalOpen(true);
  };

  const handleSaveSettle = (e: React.FormEvent) => {
    e.preventDefault();
    setSettleError('');

    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      setSettleError(langMode === 'gu' ? 'કૃપા કરીને માન્ય રકમ દાખલ કરો' : 'Please enter a valid amount');
      return;
    }
    if (activeCustomer && amt > activeCustomer.udhaarBalance) {
      setSettleError(langMode === 'gu' 
        ? `રકમ કુલ ઉધાર બાકી (₹${activeCustomer.udhaarBalance.toFixed(2)}) કરતાં વધારે ન હોઈ શકે` 
        : `Settlement amount cannot exceed outstanding Udhaar (₹${activeCustomer.udhaarBalance.toFixed(2)})`
      );
      return;
    }

    try {
      if (!activeCustomer) return;

      const newSettleSale: Sale = {
        id: `sale-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        shop_id: currentUser.id,
        sale_date: new Date().toISOString(),
        product_id: 'settlement-item',
        product_name: 'Udhaar Payment Settle / ઉધાર જમા',
        quantity: 1,
        sale_price: amt,
        profit: 0,
        customer_name: activeCustomer.name,
        customer_mobile: activeCustomer.mobile || undefined,
        customer_address: activeCustomer.address || undefined,
        invoice_number: `SETTLE-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        payment_mode: settlePaymentMode
      };

      // Write directly to local storage sales list
      const allSales = JSON.parse(localStorage.getItem('umiya_sales') || '[]');
      allSales.unshift(newSettleSale);
      localStorage.setItem('umiya_sales', JSON.stringify(allSales));

      // Sync to Supabase in background
      if (supabase) {
        supabase.from('sales').insert(newSettleSale).then(({ error }) => {
          if (error) console.error('Supabase sync settlement error:', error);
        });
      }

      db.addAuditLog(currentUser.id, `Udhaar Settle Payment: ${activeCustomer.name} (Rs. ${amt}) via ${settlePaymentMode}`, currentUser.id);

      setIsSettleModalOpen(false);
      setReloadTrigger(prev => prev + 1);
    } catch (err: any) {
      setSettleError(err.message || 'Error processing settlement');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>Customer Directory / ગ્રાહક ડાયરેક્ટરી</span>
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {langMode === 'gu' 
              ? 'તમારા રજીસ્ટર્ડ ગ્રાહકો, ખરીદીનો ઇતિહાસ, ઉધાર ખાતું અને કોન્ટેક્ટ વિગતો જુઓ.' 
              : 'Search unique clients, check credit (Udhaar) ledgers, collect outstanding amounts, and inspect sales bills.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Middle Column: Customer Directory List */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Search Header */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={langMode === 'gu' ? 'નામ અથવા મોબાઇલ નંબર થી શોધો...' : 'Search by customer name, mobile or city...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 shadow-sm transition-colors"
            />
          </div>

          {/* Cards List */}
          {filteredCustomers.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-150 text-center text-slate-400 font-medium">
              <Users className="w-12 h-12 text-slate-200 stroke-1 mx-auto mb-2" />
              <p className="text-xs">{langMode === 'gu' ? 'કોઈ ગ્રાહકો મળ્યા નથી.' : 'No registered customers found.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCustomers.map(c => {
                const customerKey = c.mobile || c.name;
                const isSelected = selectedCustomerKey === customerKey;
                return (
                  <div
                    key={customerKey}
                    onClick={() => setSelectedCustomerKey(customerKey)}
                    className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px] hover:border-emerald-500 hover:shadow-md ${
                      isSelected ? 'border-emerald-500 ring-2 ring-emerald-50' : 'border-slate-100'
                    }`}
                  >
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm truncate">{c.name}</h3>
                      
                      <div className="space-y-1.5 mt-3 text-[11px] text-slate-500">
                        {c.mobile && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold">+91 {c.mobile}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{c.address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-50 pt-3 mt-4 flex items-center justify-between text-[10px] text-slate-400">
                      <div>
                        <span className="font-semibold block text-[9px] uppercase">Bills Count</span>
                        <span className="font-bold text-slate-700">{c.totalInvoices} Invoices</span>
                      </div>
                      <div className="text-right">
                        {c.udhaarBalance > 0 ? (
                          <>
                            <span className="font-bold block text-[9px] text-amber-600 uppercase">Outstanding Udhaar</span>
                            <span className="font-extrabold text-amber-500 text-xs">₹{c.udhaarBalance.toFixed(2)}</span>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold block text-[9px] uppercase">Total Spent</span>
                            <span className="font-extrabold text-emerald-600 text-xs">₹{c.totalSpent.toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Customer Details & Past Bills Log */}
        <div className="lg:col-span-1">
          {activeCustomer ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 sticky top-24 min-h-[300px] flex flex-col justify-between">
              
              <div>
                <div className="border-b border-slate-100 pb-4 flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold uppercase tracking-wider">
                      Customer Account
                    </span>
                    <h3 className="font-black text-slate-800 text-base mt-1.5 leading-tight">{activeCustomer.name}</h3>
                    {activeCustomer.mobile && <p className="text-xs text-slate-500 mt-1 font-bold">M: +91 {activeCustomer.mobile}</p>}
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{activeCustomer.address}</span>
                    </p>
                  </div>
                  
                  <button
                    onClick={handleOpenEdit}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-lg hover:text-slate-800 transition-all shadow-sm"
                    title="Edit profile details"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                {/* Settle Up Udhaar Callout if Credit Balance is positive */}
                {activeCustomer.udhaarBalance > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider block leading-none">Credit Due / બાકી રકમ</span>
                      <span className="text-base font-black text-amber-700">₹{activeCustomer.udhaarBalance.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={handleOpenSettle}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-lg shadow-sm transition-all flex items-center gap-1"
                    >
                      <Coins className="w-3 h-3" />
                      <span>Settle / ચૂકવો</span>
                    </button>
                  </div>
                )}

                {/* Spent stats */}
                <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-100">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none">Total Purchases</span>
                    <span className="text-sm font-black text-slate-800 mt-1.5 block">₹{activeCustomer.totalSpent.toFixed(2)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none">Bills Count</span>
                    <span className="text-sm font-black text-slate-800 mt-1.5 block">{activeCustomer.totalInvoices} Receipts</span>
                  </div>
                </div>

                {/* Purchase logs */}
                <div className="pt-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Past Bills & Payments / લેવડ-દેવડ ઇતિહાસ</span>
                  </h4>
                  
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {activeCustomerInvoices.map(inv => (
                      <div
                        key={inv.invoice_number}
                        onClick={() => {
                          setActiveInvoiceSale(inv.firstSaleItem);
                          setIsInvoiceOpen(true);
                        }}
                        className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer group transition-all ${
                          inv.firstSaleItem.product_name === 'Udhaar Payment Settle / ઉધાર જમા'
                            ? 'border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50/50'
                            : 'border-slate-100 bg-slate-50/50 hover:bg-white hover:border-emerald-500'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-slate-800 text-[11px] group-hover:text-emerald-700">
                            {inv.invoice_number}
                          </p>
                          <span className="text-[9px] text-slate-400">
                            {new Date(inv.date).toLocaleDateString()} {inv.firstSaleItem.product_name === 'Udhaar Payment Settle / ઉધાર જમા' ? '• (Payment Settle)' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${
                            inv.firstSaleItem.product_name === 'Udhaar Payment Settle / ઉધાર જમા'
                              ? 'text-emerald-600'
                              : 'text-slate-800'
                          }`}>
                            {inv.firstSaleItem.product_name === 'Udhaar Payment Settle / ઉધાર જમા' ? '-' : ''}₹{inv.total.toFixed(2)}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 mt-6">
                <button
                  onClick={() => setSelectedCustomerKey(null)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold text-[11px] rounded-xl transition-all"
                >
                  Close Account Panel
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-8 text-center text-slate-400 font-medium py-16">
              <ShoppingBag className="w-10 h-10 text-slate-200 stroke-1 mx-auto mb-2 animate-pulse" />
              <p className="text-xs">Select any customer card from the list to view active transaction ledgers.</p>
            </div>
          )}
        </div>

      </div>

      {/* RENDER PROFILE EDIT MODAL */}
      {isEditModalOpen && activeCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <span>Edit Profile / ગ્રાહક સુધારો</span>
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Customer Name * / ગ્રાહકનું નામ *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Mobile / મોબાઇલ</label>
                <input
                  type="text"
                  maxLength={10}
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Address / સરનામું</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-100"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENDER UDHAAR SETTLE MODAL */}
      {isSettleModalOpen && activeCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-600" />
                <span>Settle credit / ઉધાર જમા કરો</span>
              </h3>
              <button 
                onClick={() => setIsSettleModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveSettle} className="p-6 space-y-4">
              {settleError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{settleError}</span>
                </div>
              )}

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800">Remaining Credit Due:</span>
                <span className="text-sm font-black text-amber-700">₹{activeCustomer.udhaarBalance.toFixed(2)}</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Settlement Amount / જમા રકમ (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Paid Via / જમા પ્રકાર</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettlePaymentMode('Cash')}
                    className={`py-2 px-3 border text-xs font-bold rounded-xl transition-all ${
                      settlePaymentMode === 'Cash'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Cash / રોકડ
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettlePaymentMode('UPI')}
                    className={`py-2 px-3 border text-xs font-bold rounded-xl transition-all ${
                      settlePaymentMode === 'UPI'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    UPI / ઓનલાઇન
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-100"
                >
                  Record Settle / જમા કરો
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENDER INVOICE MODAL ON TAP */}
      {isInvoiceOpen && activeInvoiceSale && (
        <InvoiceModal
          isOpen={isInvoiceOpen}
          onClose={() => {
            setIsInvoiceOpen(false);
            setActiveInvoiceSale(null);
          }}
          sale={activeInvoiceSale}
          product={null}
          langMode={langMode}
        />
      )}
    </div>
  );
};
