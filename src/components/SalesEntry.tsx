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
  Trash2,
  Lock,
  Plus,
  History,
  Phone,
  MapPin,
  Edit3
} from 'lucide-react';
import { Product, Sale, db, User as UserType } from '../database/db';
import { LanguageMode, t } from '../utils/translations';
import { InvoiceModal } from './InvoiceModal';

interface SalesEntryProps {
  langMode: LanguageMode;
  currentUser: UserType;
}

interface CartItem {
  product: Product;
  quantity: number;
  sellingPrice: number;
}

export const SalesEntry: React.FC<SalesEntryProps> = ({ langMode, currentUser }) => {
  const [products, setProducts] = useState<Product[]>(() => db.getProducts(currentUser.id));
  const [sales, setSales] = useState<Sale[]>(() => db.getSales(currentUser.id));
  
  // Tab control for the right pane: 'cart' or 'history'
  const [activeRightTab, setActiveRightTab] = useState<'cart' | 'history'>('cart');

  // Search query for history
  const [historySearch, setHistorySearch] = useState('');

  // Form Input States
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Udhaar'>('Cash');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // POS Shopping Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Editing Mode state
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState<string | null>(null);

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

  // Add Item to POS Cart
  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) return;
    setErrorMsg('');
    setSuccessMsg('');

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

    // Check stock availability (considering items already in the cart)
    const existingCartIndex = cart.findIndex(item => item.product.id === selectedProductId);
    const inCartQty = existingCartIndex > -1 ? cart[existingCartIndex].quantity : 0;
    const totalNeeded = inCartQty + qty;

    if (selectedProduct.stock_quantity < totalNeeded) {
      setErrorMsg(
        langMode === 'gu' 
          ? `અપૂરતો સ્ટોક! ઉપલબ્ધ: ${selectedProduct.stock_quantity}, કાર્ટમાં: ${inCartQty}` 
          : `Insufficient stock! Available: ${selectedProduct.stock_quantity}, in Cart: ${inCartQty}`
      );
      return;
    }

    // Add to cart state
    if (existingCartIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingCartIndex].quantity += qty;
      updatedCart[existingCartIndex].sellingPrice = price; // update to latest custom price if changed
      setCart(updatedCart);
    } else {
      setCart([...cart, { product: selectedProduct, quantity: qty, sellingPrice: price }]);
    }

    // Reset selection fields
    setSelectedProductId('');
    setProductSearch('');
    setQuantity('');
    setSellingPrice('');
    
    // Automatically switch to cart tab to show updates
    setActiveRightTab('cart');
  };

  // Remove Item from Cart
  const handleRemoveFromCart = (index: number) => {
    const updated = cart.filter((_, idx) => idx !== index);
    setCart(updated);
  };

  // POS Checkout (Batch save to database)
  const handleCheckout = () => {
    if (isExpired) return;
    if (cart.length === 0) {
      setErrorMsg(langMode === 'gu' ? 'કાર્ટ ખાલી છે!' : 'Your shopping cart is empty!');
      return;
    }

    if (!customerName.trim()) {
      setErrorMsg(langMode === 'gu' ? 'કૃપા કરીને ગ્રાહકનું નામ દાખલ કરો' : 'Customer Name is required / ગ્રાહકનું નામ જરૂરી છે');
      return;
    }

    if (customerMobile.trim() && customerMobile.trim().length !== 10) {
      setErrorMsg(langMode === 'gu' ? 'કૃપા કરીને ૧૦ અંકનો અમાન્ય મોબાઇલ નંબર દાખલ કરો' : 'Mobile number must be exactly 10 digits');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Determine Invoice Number (new or editing)
      let invNumber = editingInvoiceNumber;
      if (invNumber) {
        // Revert old inventory levels and delete old records first
        db.deleteInvoiceSales(invNumber, currentUser.id);
      } else {
        const allSales = db.getSales(currentUser.id);
        const uniqueInvoiceNumbers = new Set(allSales.map(s => s.invoice_number));
        const tenantSalesCount = uniqueInvoiceNumbers.size + 1;
        invNumber = `INV-${new Date().getFullYear()}-${String(tenantSalesCount).padStart(4, '0')}`;
      }

      // 2. Loop over cart and write each sale record
      let firstRecordedSale: Sale | null = null;
      for (const item of cart) {
        const payload: Omit<Sale, 'id' | 'shop_id' | 'profit' | 'invoice_number'> & { invoice_number: string } = {
          sale_date: new Date(saleDate).toISOString(),
          product_id: item.product.id,
          product_name: item.product.product_name,
          quantity: item.quantity,
          sale_price: item.sellingPrice,
          customer_name: customerName.trim(),
          customer_mobile: customerMobile.trim() || undefined,
          customer_address: customerAddress.trim() || undefined,
          invoice_number: invNumber,
          payment_mode: paymentMode
        };

        const recorded = db.addSale(payload, currentUser.id);
        if (!firstRecordedSale) {
          firstRecordedSale = recorded;
        }
      }

      // 3. Clear cart and inputs
      setCart([]);
      setCustomerName('');
      setCustomerMobile('');
      setCustomerAddress('');
      setPaymentMode('Cash');
      setEditingInvoiceNumber(null);
      
      // Refresh database lists
      setProducts(db.getProducts(currentUser.id));
      setSales(db.getSales(currentUser.id));

      // 4. Open grouped Invoice PDF modal
      if (firstRecordedSale) {
        setActiveInvoiceSale(firstRecordedSale);
        setIsInvoiceOpen(true);
      }

      setSuccessMsg(langMode === 'gu' ? 'બિલ સફળતાપૂર્વક ચૂકવાઈ ગયું છે!' : 'Checkout successful! Invoice generated.');
      setTimeout(() => setSuccessMsg(''), 4500);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error checking out POS cart');
    }
  };

  // Start Editing Past Invoice
  const handleStartEditInvoice = (invoiceNumber: string) => {
    const allSales = db.getSales(currentUser.id);
    const invoiceSales = allSales.filter(s => s.invoice_number === invoiceNumber && s.shop_id === currentUser.id);
    if (invoiceSales.length === 0) return;

    const cartItems: CartItem[] = [];
    const shopProducts = db.getProducts(currentUser.id);
    for (const saleItem of invoiceSales) {
      const prod = shopProducts.find(p => p.id === saleItem.product_id);
      if (prod) {
        cartItems.push({
          product: prod,
          quantity: saleItem.quantity,
          sellingPrice: saleItem.sale_price
        });
      }
    }

    setCart(cartItems);
    setCustomerName(invoiceSales[0].customer_name || '');
    setCustomerMobile(invoiceSales[0].customer_mobile || '');
    setCustomerAddress(invoiceSales[0].customer_address || '');
    setSaleDate(invoiceSales[0].sale_date.substring(0, 10));
    setPaymentMode(invoiceSales[0].payment_mode || 'Cash');
    setEditingInvoiceNumber(invoiceNumber);
    
    // Switch to active cart tab
    setActiveRightTab('cart');
  };

  // Cart Calculations (Exclusive of GST)
  const cartTotals = useMemo(() => {
    // Subtotal represents the base price total excluding GST
    const subtotal = cart.reduce((acc, item) => acc + (item.quantity * item.sellingPrice), 0);
    
    // CGST & SGST Calculations (Based on exclusive prices)
    const totalGst = cart.reduce((acc, item) => {
      const baseTotal = item.quantity * item.sellingPrice;
      const gstRate = item.product.gst_rate || 0;
      return acc + (baseTotal * (gstRate / 100));
    }, 0);

    return {
      subtotal,
      cgst: totalGst / 2,
      sgst: totalGst / 2,
      grandTotal: subtotal + totalGst
    };
  }, [cart]);

  // Open past receipt
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
      {/* Top Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-emerald-600" />
          <span>Point of Sale (POS) Cashier Cart / વેચાણ બિલિંગ</span>
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {langMode === 'gu' 
            ? 'કાર્ટમાં બધી વસ્તુઓ ઉમેરો, જીએસટી જુઓ અને ગ્રાહક માટે સિંગલ બિલ ચૂકવો.' 
            : 'Add multiple items to checkout cart, calculate CGST/SGST taxes, and print invoice receipt.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Column: Product Searcher & Add Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit">
          <h3 className="font-bold text-slate-700 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <Plus className="w-4 h-4" />
            </span>
            <span>{langMode === 'gu' ? 'કાર્ટમાં આઇટમ ઉમેરો' : 'Add Item to Cart'}</span>
          </h3>

          <form onSubmit={handleAddToCart} className="space-y-4">
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs font-bold text-red-700 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
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
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Customer Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Customer Name * / ગ્રાહકનું નામ *</span>
              </label>
              <input
                type="text"
                disabled={isExpired}
                placeholder={langMode === 'gu' ? 'કૃપા કરીને ગ્રાહકનું નામ દાખલ કરો' : 'Enter Customer Name (Required)'}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Customer Mobile & Address */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mobile / મોબાઇલ</span>
                </label>
                <input
                  type="text"
                  disabled={isExpired}
                  placeholder="98765xxxxx"
                  maxLength={10}
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Address / સરનામું</span>
                </label>
                <input
                  type="text"
                  disabled={isExpired}
                  placeholder="City, Gujarat"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-slate-400" />
                <span>Payment Mode / ચુકવણી પદ્ધતિ</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Cash', 'UPI', 'Udhaar'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-2 px-3 border text-xs font-bold rounded-xl transition-all ${
                      paymentMode === mode
                        ? mode === 'Udhaar'
                          ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                          : 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {mode === 'Cash' ? 'Cash / રોકડ' : mode === 'UPI' ? 'UPI / ઓનલાઇન' : 'Udhaar / ઉધાર'}
                  </button>
                ))}
              </div>
            </div>

            {/* Searchable Product Dropdown */}
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
                    setSelectedProductId(''); 
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 text-xs font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Dropdown menu */}
              {isProductDropdownOpen && !isExpired && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsProductDropdownOpen(false)} 
                  />
                  
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {filteredProductsForSelect.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center font-semibold">
                        No products match
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
                          className="w-full text-left p-3 hover:bg-slate-50 flex justify-between items-center text-xs font-semibold disabled:opacity-50"
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
            </div>

            {/* Selected Product Specs */}
            {selectedProduct && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-[11px] font-semibold text-slate-500">
                <div className="flex justify-between">
                  <span>Available Stock:</span>
                  <span className={`${selectedProduct.stock_quantity <= selectedProduct.minimum_stock ? 'text-amber-500' : 'text-slate-700'}`}>
                    {selectedProduct.stock_quantity} {selectedProduct.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Standard Cost Price:</span>
                  <span>₹{selectedProduct.purchase_price}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Slab Tax:</span>
                  <span>{selectedProduct.gst_rate || 0}% GST</span>
                </div>
              </div>
            )}

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
                  disabled={isExpired || !selectedProductId}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-60"
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
                  disabled={isExpired || !selectedProductId}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Cart Insert Button */}
            {!isExpired ? (
              <button
                type="submit"
                disabled={!selectedProductId}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Cart / કાર્ટમાં ઉમેરો
              </button>
            ) : (
              <div className="w-full py-2.5 bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs rounded-xl text-center select-none flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Locked</span>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Dynamic Cart List OR Sales History */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[500px]">
          
          {/* Tab Selection Header */}
          <div className="flex border-b border-slate-100 pb-3 mb-4 justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveRightTab('cart')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeRightTab === 'cart' 
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Active Checkout Cart ({cart.length})</span>
              </button>
              
              <button
                onClick={() => setActiveRightTab('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeRightTab === 'history' 
                    ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Sales Logs</span>
              </button>
            </div>

            {activeRightTab === 'history' && (
              <div className="relative w-36">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-[10px] focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* ACTIVE CART VIEW */}
          {activeRightTab === 'cart' && (
            <div className="flex-1 flex flex-col space-y-4">
              {editingInvoiceNumber && (
                <div className="bg-amber-50 border border-amber-250 p-3.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                      <Edit3 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-amber-800 font-bold text-xs uppercase leading-none">Editing Bill Mode</p>
                      <p className="text-amber-600 text-[10px] font-semibold mt-1">{editingInvoiceNumber}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingInvoiceNumber(null);
                      setCart([]);
                      setCustomerName('');
                      setCustomerMobile('');
                      setCustomerAddress('');
                    }}
                    className="text-[10px] font-bold text-amber-700 bg-white border border-amber-200 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 transition-colors shadow-sm"
                  >
                    Cancel Edit / કેન્સલ
                  </button>
                </div>
              )}
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center py-12">
                  <ShoppingCart className="w-12 h-12 text-slate-200 stroke-1 mb-2 animate-bounce" />
                  <p className="text-xs font-bold text-slate-450">Checkout cart is empty.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Scan barcodes or search products to begin billing.</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="overflow-x-auto max-h-[300px]">
                    <table className="w-full text-left border-collapse text-xs text-slate-600">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400 uppercase text-[9px] tracking-wider">
                          <th className="px-3 py-2">Item Details</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Price</th>
                          <th className="px-3 py-2 text-right">GST %</th>
                          <th className="px-3 py-2 text-right">Total</th>
                          <th className="px-3 py-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-medium">
                        {cart.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/20">
                            <td className="px-3 py-2.5">
                              <p className="font-bold text-slate-800 line-clamp-1">{item.product.product_name}</p>
                              <span className="text-[10px] text-slate-400 font-normal">{item.product.product_name_gu}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold">{item.quantity} {item.product.unit}</td>
                            <td className="px-3 py-2.5 text-right text-slate-500">₹{item.sellingPrice.toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-400">{item.product.gst_rate || 0}%</td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                              ₹{(item.quantity * item.sellingPrice * (1 + (item.product.gst_rate || 0) / 100)).toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                onClick={() => handleRemoveFromCart(idx)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations & Checkout */}
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 bg-slate-50/50 p-4 rounded-2xl">
                    <div className="space-y-1.5 text-xs text-slate-500 font-semibold">
                      <div className="flex justify-between">
                        <span>Items Subtotal (Inclusive of GST):</span>
                        <span className="text-slate-850">₹{cartTotals.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-normal">
                        <span>CGST Breakout (Central GST):</span>
                        <span>₹{cartTotals.cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-normal">
                        <span>SGST Breakout (State GST):</span>
                        <span>₹{cartTotals.sgst.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 uppercase">Grand Total (કુલ રકમ):</span>
                      <span className="text-xl font-black text-emerald-700">₹{cartTotals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    {!isExpired ? (
                      <button
                        onClick={handleCheckout}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-100"
                      >
                        Checkout & Print Invoice / બિલ બનાવો
                      </button>
                    ) : (
                      <div className="w-full py-3 bg-slate-100 border border-slate-200 text-slate-400 font-bold text-sm rounded-xl text-center select-none flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4" />
                        <span>Checkout (Locked)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HISTORICAL SALES LOG */}
          {activeRightTab === 'history' && (
            <div className="flex-1 overflow-x-auto max-h-[420px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-100 tracking-wider">
                    <th className="px-3 py-2">Invoice No</th>
                    <th className="px-3 py-2">Product Sold</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Total Bill</th>
                    <th className="px-3 py-2 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-650">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No transactions matches query.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/30">
                        <td className="px-3 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{s.invoice_number}</span>
                            <span className="text-[9px] text-slate-400 font-normal">
                              {new Date(s.sale_date).toLocaleDateString()}
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
                          {s.quantity}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-emerald-600">
                          ₹{(s.quantity * s.sale_price).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleOpenPastInvoice(s)}
                            className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg border border-emerald-100 transition-colors inline-flex items-center gap-0.5 text-[9px] font-bold"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>View</span>
                          </button>
                          
                          {!isExpired && (
                            <button
                              onClick={() => handleStartEditInvoice(s.invoice_number)}
                              className="p-1 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg border border-amber-100 transition-colors inline-flex items-center gap-0.5 text-[9px] font-bold ml-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

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
    </div>
  );
};
