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
  Receipt,
  Lock
} from 'lucide-react';
import { Product, Sale, db, User as UserType } from '../database/db';
import { LanguageMode, t } from '../utils/translations';
import { InvoiceModal } from './InvoiceModal';

interface SalesEntryProps {
  langMode: LanguageMode;
  currentUser: UserType;
}

export const SalesEntry: React.FC<SalesEntryProps> = ({ langMode, currentUser }) => {
  const [products, setProducts] = useState<Product[]>(() => db.getProducts(currentUser.id));
  const [sales, setSales] = useState<Sale[]>(() => db.getSales(currentUser.id));
  
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

  // Product Search State inside Form
  const [productSearch, setProductSearch] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  // Filter products for search
  const filteredProductsForSelect = useMemo(() => {
    if (!productSearch) return products;
    return products.filter(p => 
      p.product_name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.product_name_gu.includes(productSearch) ||
      (p.barcode && p.barcode.includes(productSearch)) ||
      p.brand.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  // Expiry check
  const isExpired = useMemo(() => {
    return new Date(currentUser.plan_expiry) < new Date();
  }, [currentUser.plan_expiry]);

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
    if (isExpired) return; // Guard
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
      const newSale: Omit<Sale, 'id' | 'shop_id' | 'profit' | 'invoice_number'> = {
        sale_date: new Date(saleDate).toISOString(),
        product_id: selectedProductId,
        product_name: selectedProduct.product_name,
        quantity: qty,
        sale_price: price,
        customer_name: customerName.trim() || undefined
      };

      const recorded = db.addSale(newSale, currentUser.id);
      
      // Update local state
      setProducts(db.getProducts(currentUser.id));
      setSales(db.getSales(currentUser.id));
      
      setActiveInvoiceSale(recorded);
      setIsInvoiceOpen(true);

      setSelectedProductId('');
      setQuantity('');
      setSellingPrice('');
      setCustomerName('');
      setProductSearch('');

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

            {isExpired && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 animate-pulse" />
                <span>Subscription Expired! Read-Only Mode Active.</span>
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
                disabled={isExpired}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                disabled={isExpired}
                placeholder={langMode === 'gu' ? 'ગ્રાહકનું નામ (વૈકલ્પિક)' : 'Customer Name (Optional)'}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Product Selector */}
            <div className="space-y-1 relative">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                <span>{langMode === 'gu' ? 'ઉત્પાદન શોધો/પસંદ કરો' : 'Search/Select Product'}</span>
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder={langMode === 'gu' ? 'નામ લખો અથવા બારકોડ સ્કેન કરો...' : 'Type name or scan barcode...'}
                  value={productSearch}
                  disabled={isExpired}
                  onFocus={() => setIsProductDropdownOpen(true)}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setSelectedProductId(''); // Reset until clicked
                    setIsProductDropdownOpen(true);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {selectedProductId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductId('');
                      setProductSearch('');
                      setSellingPrice('');
                      setQuantity('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Dropdown suggestions list */}
              {isProductDropdownOpen && !isExpired && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsProductDropdownOpen(false)} 
                  />
                  
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {filteredProductsForSelect.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center font-semibold">
                        No products found / કોઈ ઉત્પાદન મળ્યું નથી
                      </div>
                    ) : (
                      filteredProductsForSelect.map(p => (
                        <button
                          type="button"
                          key={p.id}
                          disabled={p.stock_quantity === 0}
                          onClick={() => {
                            setSelectedProductId(p.id);
                            setProductSearch(`${p.product_name} / ${p.product_name_gu}`);
                            setSellingPrice(p.selling_price.toString());
                            setQuantity('');
                            setIsProductDropdownOpen(false);
                          }}
                          className="w-full text-left p-3 hover:bg-slate-50 flex justify-between items-center text-xs font-semibold disabled:opacity-50 disabled:bg-slate-50"
                        >
                          <div className="flex flex-col">
                            <span className="text-slate-800">{p.product_name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{p.product_name_gu}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            p.stock_quantity === 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {p.stock_quantity === 0 ? 'Out of stock' : `${p.stock_quantity} ${p.unit}`}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}

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
                  disabled={isExpired}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                  disabled={isExpired}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Profit margin */}
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
            {!isExpired ? (
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-100"
              >
                {t('recordSale', langMode)}
              </button>
            ) : (
              <div className="w-full py-3 bg-slate-100 border border-slate-200 text-slate-400 font-bold text-sm rounded-xl text-center select-none flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                <span>{t('recordSale', langMode)} (Locked)</span>
              </div>
            )}
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
            
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={langMode === 'gu' ? 'બીલ નંબર અથવા નામ...' : 'Search invoice / customer...'}
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* History List Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
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
                          <span className="text-[9px] text-slate-400 font-normal">
                            {new Date(s.sale_date).toLocaleDateString(langMode === 'gu' ? 'gu-IN' : 'en-US')}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 line-clamp-1">{s.product_name}</span>
                          <span className="text-[9px] text-slate-450 font-normal">To: {s.customer_name || 'Walk-in'}</span>
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
