import React, { useState, useMemo } from 'react';
import { Users, Search, Phone, MapPin, FileText, ShoppingBag, ArrowRight } from 'lucide-react';
import { db, User as UserType, Sale, Product } from '../database/db';
import { LanguageMode } from '../utils/translations';
import { InvoiceModal } from './InvoiceModal';

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
  salesList: Sale[];
}

export const CustomerDirectory: React.FC<CustomerDirectoryProps> = ({ langMode, currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);

  // Active invoice modal state
  const [activeInvoiceSale, setActiveInvoiceSale] = useState<Sale | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // 1. Fetch sales and products to calculate exclusive totals correctly
  const sales = useMemo(() => db.getSales(currentUser.id), [currentUser.id]);
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
          salesList: []
        };
      }

      map[key].totalSpent += totalAmount;
      map[key].salesList.push(sale);
    });

    // Compute total invoice count by counting unique invoice numbers
    return Object.values(map).map(customer => {
      const invoiceNumbers = new Set(customer.salesList.map(s => s.invoice_number));
      return {
        ...customer,
        totalInvoices: invoiceNumbers.size
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
              ? 'તમારા રજીસ્ટર્ડ ગ્રાહકો, ખરીદીનો ઇતિહાસ અને કોન્ટેક્ટ વિગતો જુઓ.' 
              : 'Search and manage unique clients, view total bills, total collection, and check past invoices.'}
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
                        <span className="font-semibold block text-[9px] uppercase">Bills</span>
                        <span className="font-bold text-slate-700">{c.totalInvoices} Invoices</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold block text-[9px] uppercase">Total Collection</span>
                        <span className="font-extrabold text-emerald-600 text-xs">₹{c.totalSpent.toFixed(2)}</span>
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
                <div className="border-b border-slate-100 pb-4">
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

                {/* Spent stats */}
                <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-100">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none">Total Spent</span>
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
                    <span>Past Bills / બિલ હિસ્ટરી</span>
                  </h4>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {activeCustomerInvoices.map(inv => (
                      <div
                        key={inv.invoice_number}
                        onClick={() => {
                          setActiveInvoiceSale(inv.firstSaleItem);
                          setIsInvoiceOpen(true);
                        }}
                        className="p-3 border border-slate-100 hover:border-emerald-500 rounded-xl flex items-center justify-between cursor-pointer group bg-slate-50/50 hover:bg-white transition-all"
                      >
                        <div>
                          <p className="font-bold text-slate-800 text-[11px] group-hover:text-emerald-700">{inv.invoice_number}</p>
                          <span className="text-[9px] text-slate-400">{new Date(inv.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">₹{inv.total.toFixed(2)}</span>
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
