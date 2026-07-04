import React, { useState, useMemo } from 'react';
import { 
  PlusCircle, 
  Calendar, 
  User, 
  Package, 
  Coins, 
  Hash, 
  Clock, 
  Search,
  CheckCircle,
  AlertCircle,
  Lock
} from 'lucide-react';
import { Product, Supplier, Purchase, db, User as UserType } from '../database/db';
import { LanguageMode, t } from '../utils/translations';

interface PurchaseEntryProps {
  langMode: LanguageMode;
  currentUser: UserType;
}

export const PurchaseEntry: React.FC<PurchaseEntryProps> = ({ langMode, currentUser }) => {
  const [products] = useState<Product[]>(() => db.getProducts(currentUser.id));
  const [suppliers] = useState<Supplier[]>(() => db.getSuppliers(currentUser.id));
  const [purchases, setPurchases] = useState<Purchase[]>(() => db.getPurchases(currentUser.id));
  
  // Search query for history
  const [historySearch, setHistorySearch] = useState('');

  // Form State
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [supplierName, setSupplierName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchaseRate, setPurchaseRate] = useState('');
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

  // Auto calculate total amount
  const totalAmount = useMemo(() => {
    const qty = parseFloat(quantity);
    const rate = parseFloat(purchaseRate);
    if (!isNaN(qty) && !isNaN(rate)) {
      return (qty * rate).toFixed(2);
    }
    return '0.00';
  }, [quantity, purchaseRate]);

  // Handle product selection to auto-fill purchase rate
  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setPurchaseRate(prod.purchase_price.toString());
    } else {
      setPurchaseRate('');
    }
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) return; // Guard
    setSuccessMsg('');
    setErrorMsg('');

    // Validations
    if (!supplierName.trim()) {
      setErrorMsg(langMode === 'gu' ? 'કૃપા કરીને સપ્લાયરનું નામ દાખલ કરો' : 'Please select or enter Supplier Name');
      return;
    }
    if (!selectedProductId) {
      setErrorMsg(langMode === 'gu' ? 'કૃપા કરીને એક ઉત્પાદન પસંદ કરો' : 'Please select a Product');
      return;
    }

    const qty = parseFloat(quantity);
    const rate = parseFloat(purchaseRate);

    if (isNaN(qty) || qty <= 0) {
      setErrorMsg(langMode === 'gu' ? 'કૃપા કરીને સરેરાશ જથ્થો દાખલ કરો' : 'Please enter a valid quantity');
      return;
    }
    if (isNaN(rate) || rate < 0) {
      setErrorMsg(langMode === 'gu' ? 'કૃપા કરીને અમાન્ય ખરીદી દર દાખલ કરો' : 'Please enter a valid purchase rate');
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    try {
      const newPurchase: Omit<Purchase, 'id' | 'shop_id'> = {
        purchase_date: new Date(purchaseDate).toISOString(),
        supplier_name: supplierName.trim(),
        product_id: selectedProductId,
        product_name: product.product_name,
        quantity: qty,
        purchase_price: rate,
        total_amount: parseFloat(totalAmount)
      };

      db.addPurchase(newPurchase, currentUser.id);
      
      // Update local state list
      setPurchases(db.getPurchases(currentUser.id));
      
      setSelectedProductId('');
      setQuantity('');
      setPurchaseRate('');
      setProductSearch('');
      
      setSuccessMsg(langMode === 'gu' ? 'ખરીદી સફળતાપૂર્વક નોંધાઈ ગઈ છે.' : 'Purchase successfully recorded and stock quantity incremented!');
      
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error recording purchase');
    }
  };

  // Filtered History
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      return (
        p.product_name.toLowerCase().includes(historySearch.toLowerCase()) ||
        p.supplier_name.toLowerCase().includes(historySearch.toLowerCase())
      );
    });
  }, [purchases, historySearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">
          {t('purchases', langMode)}
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {langMode === 'gu' 
            ? 'નવી હોલસેલ ખરીદીની નોંધણી કરો જે ઓટોમેટીક સ્ટોક વધારશે.' 
            : 'Record incoming wholesale shipments. Submitting will instantly increment current product stock.'}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit">
          <h3 className="font-bold text-slate-700 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <PlusCircle className="w-4 h-4" />
            </span>
            <span>{langMode === 'gu' ? 'નવી ખરીદી નોંધણી' : 'New Purchase Entry'}</span>
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
                <AlertCircle className="w-4 h-4 shrink-0" />
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
                <span>{t('purchaseDate', langMode)}</span>
              </label>
              <input
                type="date"
                value={purchaseDate}
                disabled={isExpired}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Supplier Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('supplierName', langMode)}</span>
              </label>
              <input
                type="text"
                list="suppliers-list"
                value={supplierName}
                disabled={isExpired}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder={langMode === 'gu' ? 'સપ્લાયર પસંદ કરો અથવા લખો' : 'Select or type supplier name'}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <datalist id="suppliers-list">
                {suppliers.map(s => (
                  <option key={s.id} value={s.supplier_name} />
                ))}
              </datalist>
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
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {selectedProductId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductId('');
                      setProductSearch('');
                      setPurchaseRate('');
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
                          onClick={() => {
                            setSelectedProductId(p.id);
                            setProductSearch(`${p.product_name} / ${p.product_name_gu}`);
                            setPurchaseRate(p.purchase_price.toString());
                            setIsProductDropdownOpen(false);
                          }}
                          className="w-full text-left p-3 hover:bg-slate-50 flex justify-between items-center text-xs font-semibold"
                        >
                          <div className="flex flex-col">
                            <span className="text-slate-800">{p.product_name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{p.product_name_gu}</span>
                          </div>
                          <span className="text-[10px] bg-slate-100 text-slate-650 px-2 py-0.5 rounded-full font-bold">
                            {p.stock_quantity} {p.unit}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Qty & Rate Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('quantity', langMode)}</span>
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={quantity}
                  disabled={isExpired}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('purchaseRate', langMode)} (₹)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={purchaseRate}
                  disabled={isExpired}
                  onChange={(e) => setPurchaseRate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Total Display */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center justify-between animate-pulse">
              <span className="text-xs font-bold text-slate-500 uppercase">{t('totalAmount', langMode)}:</span>
              <span className="text-xl font-black text-emerald-700">₹{parseFloat(totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Submit */}
            {!isExpired ? (
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-100"
              >
                {t('recordPurchase', langMode)}
              </button>
            ) : (
              <div className="w-full py-3 bg-slate-100 border border-slate-200 text-slate-400 font-bold text-sm rounded-xl text-center select-none flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                <span>{t('recordPurchase', langMode)} (Locked)</span>
              </div>
            )}
          </form>
        </div>

        {/* History Column */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-500 rounded-lg">
                <Clock className="w-4 h-4" />
              </span>
              <span>{t('purchaseHistory', langMode)}</span>
            </h3>
            
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={langMode === 'gu' ? 'શોધો...' : 'Search logs...'}
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <th className="px-4 py-2">{t('purchaseDate', langMode)}</th>
                  <th className="px-4 py-2">{langMode === 'gu' ? 'ઉત્પાદન' : 'Product'}</th>
                  <th className="px-4 py-2">{t('supplierName', langMode)}</th>
                  <th className="px-4 py-2 text-right">{t('quantity', langMode)}</th>
                  <th className="px-4 py-2 text-right">{t('totalAmount', langMode)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      {langMode === 'gu' ? 'કોઈ ખરીદી મળી નથી.' : 'No purchase records found.'}
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/30">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(p.purchase_date).toLocaleDateString(langMode === 'gu' ? 'gu-IN' : 'en-US')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{p.product_name}</td>
                      <td className="px-4 py-3 text-slate-500">{p.supplier_name}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        {p.quantity} units
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">
                        ₹{p.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
