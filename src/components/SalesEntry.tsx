import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, 
  Calendar, 
  User, 
  Package, 
  Coins, 
  Hash, 
  Clock, 
  Search,
  CheckCircle,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import { Product, Sale, db } from '../database/db';
import { LanguageMode, t } from '../utils/translations';
import { InvoiceModal } from './InvoiceModal';

interface SalesEntryProps {
  langMode: LanguageMode;
}

export const SalesEntry: React.FC<SalesEntryProps> = ({ langMode }) => {
  const [products, setProducts] = useState<Product[]>(() => db.getProducts());
  const [sales, setSales] = useState<Sale[]>(() => db.getSales());
  
  // Search query for history
  const [historySearch, setHistorySearch] = useState('');

  // Form State
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [customerName, setCustomerName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Invoice Modal state
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [activeInvoiceSale, setActiveInvoiceSale] = useState<Sale | null>(null);

  // Selected Product details
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Auto calculate total sale amount
  const totalAmount = useMemo(() => {
    const qty = parseFloat(quantity);
    const price = parseFloat(sellingPrice);
    if (!isNaN(qty) && !isNaN(price)) {
      return (qty * price).toFixed(2);
    }
    return '0.00';
  }, [quantity, sellingPrice]);

  // Handle product selection to auto-fill pricing and clear quantities
  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setSellingPrice(prod.selling_price.toString());
      setQuantity('');
    } else {
      setSellingPrice('');
      setQuantity('');
    }
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!selectedProductId || !selectedProduct) {
      setErrorMsg(langMode === 'gu' ? 'કૃપા કરીને એક ઉત્પાદન પસંદ કરો' : 'Please select a Product');
      return;
    }

    const qty = parseInt(quantity);
    const price = parseFloat(sellingPrice);

    if (isNaN(qty) || qty <= 0) {
      setErrorMsg(langMode === 'gu' ? 'કૃપા કરીને અમાન્ય જથ્થો દાખલ કરો' : 'Please enter a valid quantity');
      return;
    }
    if (isNaN(price) || price < 0) {
      setErrorMsg(langMode === 'gu' ? 'કૃપા કરીને અમાન્ય વેચાણ કિંમત દાખલ કરો' : 'Please enter a valid selling price');
      return;
    }

    if (selectedProduct.stock_quantity < qty) {
      setErrorMsg(
        langMode === 'gu' 
          ? `અપૂરતો સ્ટોક! હાલમાં માત્ર ${selectedProduct.stock_quantity} એકમો ઉપલબ્ધ છે.` 
          : `Insufficient stock! Only ${selectedProduct.stock_quantity} units available.`
      );
      return;
    }

    try {
      const newSale: Omit<Sale, 'id' | 'profit' | 'invoice_number'> = {
        sale_date: new Date(saleDate).toISOString(),
        product_id: selectedProductId,
        product_name: selectedProduct.product_name,
        quantity: qty,
        sale_price: price,
        customer_name: customerName.trim() || undefined
      };

      const recorded = db.addSale(newSale);
      
      // Update local state collections
      setProducts(db.getProducts());
      setSales(db.getSales());
      
      // Save recorded sale to show in invoice modal
      setActiveInvoiceSale(recorded);
      setIsInvoiceOpen(true);

      // Reset form fields
      setSelectedProductId('');
      setQuantity('');
      setSellingPrice('');
      setCustomerName('');

      setSuccessMsg(langMode === 'gu' ? 'વેચાણ સફળતાપૂર્વક નોંધાયું છે!' : 'Sale successfully recorded!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error recording sale');
    }
  };

  const handleOpenPastInvoice = (sale: Sale) => {
    setActiveInvoiceSale(sale);
    setIsInvoiceOpen(true);
  };

  // Filtered History
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      return (
        s.product_name.toLowerCase().includes(historySearch.toLowerCase()) ||
        s.invoice_number.toLowerCase().includes(historySearch.toLowerCase()) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(historySearch.toLowerCase()))
      );
    });
  }, [sales, historySearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">
          {t('sales', langMode)}
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {langMode === 'gu' 
            ? 'નવી વેચાણની નોંધણી કરો જે સ્ટોક ઓછો કરશે, નફો ગણશે અને બીલ જનરેટ કરશે.' 
            : 'Register a wholesale sale. Submitting will deduct stock, calculate profits, and generate an invoice.'}
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Sales Entry Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit">
          <h3 className="font-bold text-slate-700 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <ShoppingCart className="w-4 h-4" />
            </span>
            <span>{langMode === 'gu' ? 'નવું બીલ નોંધણી' : 'New Sales Bill Entry'}</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 rounded-xl flex items-center gap-2">
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

            {/* Date Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('saleDate', langMode)}</span>
              </label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Customer Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('customerName', langMode)}</span>
              </label>
              <input
                type="text"
                placeholder={langMode === 'gu' ? 'ગ્રાહકનું નામ (વૈકલ્પિક)' : 'Customer Name (Optional)'}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Product Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                <span>{langMode === 'gu' ? 'ઉત્પાદન પસંદ કરો' : 'Select Product'}</span>
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="">{langMode === 'gu' ? '-- પસંદ કરો --' : '-- Choose Product --'}</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} disabled={p.stock_quantity === 0}>
                    {p.product_name} / {p.product_name_gu} ({p.stock_quantity} {p.unit} in stock)
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <div className="mt-1 flex items-center justify-between text-[11px] font-semibold">
                  <span className={`${selectedProduct.stock_quantity <= selectedProduct.minimum_stock ? 'text-amber-500' : 'text-slate-400'}`}>
                    {langMode === 'gu' ? `સ્ટોક ઉપલબ્ધ: ${selectedProduct.stock_quantity} ${selectedProduct.unit}` : `Stock Available: ${selectedProduct.stock_quantity} ${selectedProduct.unit}`}
                  </span>
                  <span className="text-slate-400">
                    Cost Price: ₹{selectedProduct.purchase_price}
                  </span>
                </div>
              )}
            </div>

            {/* Qty & Selling Rate */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('quantitySold', langMode)}</span>
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('sellingPrice', langMode)} (₹)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Profit estimation banner */}
            {selectedProduct && quantity && sellingPrice && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 flex justify-between items-center font-medium">
                <span>Profit Margin:</span>
                <span className="font-bold text-emerald-600">
                  ₹{((parseFloat(sellingPrice) - selectedProduct.purchase_price) * parseInt(quantity)).toFixed(2)} Profit
                </span>
              </div>
            )}

            {/* Grand Total */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">{t('totalAmount', langMode)}:</span>
              <span className="text-xl font-black text-emerald-700">₹{parseFloat(totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-100"
            >
              {t('recordSale', langMode)}
            </button>
          </form>
        </div>

        {/* History Column */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-500 rounded-lg">
                <Clock className="w-4 h-4" />
              </span>
              <span>{t('salesHistory', langMode)}</span>
            </h3>
            {/* Search bar */}
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={langMode === 'gu' ? 'બીલ નંબર અથવા નામ...' : 'Search invoice / customer...'}
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* History List Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-3 py-2">{t('invoiceNumber', langMode)}</th>
                  <th className="px-3 py-2">{langMode === 'gu' ? 'ઉત્પાદન' : 'Product'}</th>
                  <th className="px-3 py-2 text-right">{t('quantity', langMode)}</th>
                  <th className="px-3 py-2 text-right">{t('totalAmount', langMode)}</th>
                  <th className="px-3 py-2 text-right">{t('profit', langMode)}</th>
                  <th className="px-4 py-2 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      {langMode === 'gu' ? 'કોઈ વેચાણ મળ્યું નથી.' : 'No sales records found.'}
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/30">
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{s.invoice_number}</span>
                          <span className="text-[9px] text-slate-400">
                            {new Date(s.sale_date).toLocaleDateString(langMode === 'gu' ? 'gu-IN' : 'en-US')}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 line-clamp-1">{s.product_name}</span>
                          <span className="text-[9px] text-slate-400">To: {s.customer_name || 'Walk-in'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-slate-700">
                        {s.quantity} units
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-emerald-600">
                        ₹{(s.quantity * s.sale_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-amber-600">
                        ₹{s.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleOpenPastInvoice(s)}
                          className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg border border-emerald-100 transition-colors inline-flex items-center gap-1 text-[10px] font-bold"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Invoice Receipt Modal Dialog */}
      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => {
          setIsInvoiceOpen(false);
          setActiveInvoiceSale(null);
        }}
        sale={activeInvoiceSale}
        product={products.find(p => p.id === activeInvoiceSale?.product_id) || null}
        langMode={langMode}
      />
    </div>
  );
};
