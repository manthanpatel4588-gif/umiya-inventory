import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit3, 
  Trash2, 
  AlertTriangle,
  X,
  CheckCircle,
  Barcode,
  Lock,
  Upload
} from 'lucide-react';
import { Product, db, User } from '../database/db';
import { LanguageMode, t } from '../utils/translations';

interface ProductManagerProps {
  langMode: LanguageMode;
  currentUser: User;
}

export const ProductManager: React.FC<ProductManagerProps> = ({ langMode, currentUser }) => {
  const [products, setProducts] = useState<Product[]>(() => db.getProducts(currentUser.id));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // CSV Importer States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  const [importError, setImportError] = useState('');

  // Form State
  const [formName, setFormName] = useState('');
  const [formNameGu, setFormNameGu] = useState('');
  const [formCategory, setFormCategory] = useState('General FMCG');
  const [formBrand, setFormBrand] = useState('');
  const [formPurchasePrice, setFormPurchasePrice] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formStockQuantity, setFormStockQuantity] = useState('');
  const [formUnit, setFormUnit] = useState<'Packet' | 'Box' | 'Bundle' | 'Piece' | 'Kg' | 'Gram' | 'Litre' | 'Dozen' | 'Bag' | 'Carton'>('Packet');
  const [formMinStock, setFormMinStock] = useState('10');
  const [formBarcode, setFormBarcode] = useState('');
  const [formGstRate, setFormGstRate] = useState('0');
  const [formError, setFormError] = useState('');

  // Subscription Expiry Check
  const isExpired = useMemo(() => {
    return new Date(currentUser.plan_expiry) < new Date();
  }, [currentUser.plan_expiry]);

  const categories = useMemo(() => {
    const list = new Set<string>();
    products.forEach(p => {
      if (p.category) list.add(p.category);
    });
    ['Pan Masala', 'Mukhwas', 'Chocolate', 'Cigarettes', 'General FMCG'].forEach(c => list.add(c));
    return Array.from(list);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.product_name_gu.includes(searchQuery) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery));
      
      const matchesCategory = selectedCategory === '' || p.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const handleOpenAddModal = () => {
    if (isExpired) return; // Guard
    setEditingProduct(null);
    setFormName('');
    setFormNameGu('');
    setFormCategory('General FMCG');
    setFormBrand('');
    setFormPurchasePrice('');
    setFormSellingPrice('');
    setFormStockQuantity('');
    setFormUnit('Packet');
    setFormMinStock('10');
    setFormBarcode('');
    setFormGstRate('0');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    if (isExpired) return; // Guard
    setEditingProduct(product);
    setFormName(product.product_name);
    setFormNameGu(product.product_name_gu);
    setFormCategory(product.category);
    setFormBrand(product.brand);
    setFormPurchasePrice(product.purchase_price.toString());
    setFormSellingPrice(product.selling_price.toString());
    setFormStockQuantity(product.stock_quantity.toString());
    setFormUnit(product.unit);
    setFormMinStock(product.minimum_stock.toString());
    setFormBarcode(product.barcode || '');
    setFormGstRate((product.gst_rate || 0).toString());
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) return; // Guard
    setFormError('');

    if (!formName.trim()) {
      setFormError(langMode === 'gu' ? 'કૃપા કરીને ઉત્પાદનનું નામ દાખલ કરો' : 'Please enter English product name');
      return;
    }
    if (!formNameGu.trim()) {
      setFormError(langMode === 'gu' ? 'કૃપા કરીને ગુજરાતી નામ દાખલ કરો' : 'Please enter Gujarati product name');
      return;
    }
    
    const purchase = parseFloat(formPurchasePrice);
    const selling = parseFloat(formSellingPrice);
    const stock = parseInt(formStockQuantity);
    const minStock = parseInt(formMinStock);

    if (isNaN(purchase) || purchase < 0) {
      setFormError(langMode === 'gu' ? 'અમાન્ય ખરીદી કિંમત' : 'Invalid purchase price');
      return;
    }
    if (isNaN(selling) || selling < 0) {
      setFormError(langMode === 'gu' ? 'અમાન્ય વેચાણ કિંમત' : 'Invalid selling price');
      return;
    }
    if (selling < purchase) {
      if (!confirm(langMode === 'gu' ? 'વેચાણ કિંમત ખરીદી કિંમત કરતા ઓછી છે. ચાલુ રાખવું છે?' : 'Selling price is less than purchase price. Continue?')) {
        return;
      }
    }
    if (isNaN(stock) || stock < 0) {
      setFormError(langMode === 'gu' ? 'અમાન્ય સ્ટોક જથ્થો' : 'Invalid stock quantity');
      return;
    }
    if (isNaN(minStock) || minStock < 0) {
      setFormError(langMode === 'gu' ? 'અમાન્ય ન્યૂનતમ સ્ટોક લેવલ' : 'Invalid minimum stock alert level');
      return;
    }

    const payload: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      shop_id: currentUser.id,
      product_name: formName.trim(),
      product_name_gu: formNameGu.trim(),
      category: formCategory,
      brand: formBrand.trim() || 'Generic / સામાન્ય',
      purchase_price: purchase,
      selling_price: selling,
      stock_quantity: stock,
      unit: formUnit,
      minimum_stock: minStock,
      barcode: formBarcode.trim() || undefined,
      gst_rate: parseInt(formGstRate)
    };

    const updated = db.saveProduct(payload, currentUser.id);
    setProducts(updated);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (isExpired) return; // Guard
    const confirmation = confirm(
      langMode === 'gu' 
        ? `શું તમે ખરેખર "${name}" કાઢી નાખવા માંગો છો?` 
        : `Are you sure you want to delete "${name}"?`
    );
    if (confirmation) {
      const updated = db.deleteProduct(id, currentUser.id);
      setProducts(updated);
    }
  };

  const handleExport = () => {
    const headers = [
      'Product ID', 
      'Product Name (EN)', 
      'Product Name (GU)', 
      'Category', 
      'Brand', 
      'Purchase Price (₹)', 
      'Selling Price (₹)', 
      'Current Stock', 
      'Unit', 
      'Minimum Stock Alert'
    ];

    const rows = products.map(p => [
      p.id,
      p.product_name,
      p.product_name_gu,
      p.category,
      p.brand,
      p.purchase_price,
      p.selling_price,
      p.stock_quantity,
      p.unit,
      p.minimum_stock
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Umiya_Products_${currentUser.shop_name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV file uploader handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Parse CSV rows safely
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length === 0) {
        setImportError('Spreadsheet file is empty');
        return;
      }

      // Safe CSV cell splits (ignores commas inside quotes)
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const parsedHeaders = parseCSVLine(lines[0]);
      const parsedRows = lines.slice(1).map(line => parseCSVLine(line));

      setCsvHeaders(parsedHeaders);
      setCsvRows(parsedRows);
      setImportError('');

      // Auto map columns based on keywords
      const initialMapping: Record<string, number> = {};
      const fields = [
        { key: 'product_name', keywords: ['name', 'product', 'item', 'નામ', 'title'] },
        { key: 'product_name_gu', keywords: ['gujarati', 'gu', 'ગુજરાતી'] },
        { key: 'category', keywords: ['category', 'group', 'વર્ગ', 'કેટેગરી'] },
        { key: 'brand', keywords: ['brand', 'company', 'બ્રાન્ડ', 'make'] },
        { key: 'purchase_price', keywords: ['purchase', 'cost', 'buy', 'ಖરીದಿ', 'costprice'] },
        { key: 'selling_price', keywords: ['selling', 'rate', 'price', 'વેચાણ', 'salesprice'] },
        { key: 'stock_quantity', keywords: ['stock', 'quantity', 'qty', 'જથ્થો', 'count'] },
        { key: 'unit', keywords: ['unit', 'measure', 'એકમ', 'size'] },
        { key: 'minimum_stock', keywords: ['minimum', 'alert', 'min'] },
        { key: 'barcode', keywords: ['barcode', 'code', 'ean', 'બારકોડ'] },
        { key: 'gst_rate', keywords: ['gst', 'tax', 'જીએસટી'] }
      ];

      fields.forEach(field => {
        const index = parsedHeaders.findIndex(header => 
          field.keywords.some(kw => header.toLowerCase().includes(kw))
        );
        if (index > -1) {
          initialMapping[field.key] = index;
        }
      });

      setColumnMapping(initialMapping);
    };

    reader.readAsText(file);
  };

  // Convert CSV rows to db entities and commit
  const handleConfirmImport = () => {
    try {
      const importedProducts: Product[] = [];
      
      // Ensure required field (product name) is mapped
      const nameColIndex = columnMapping['product_name'];
      if (nameColIndex === undefined || nameColIndex === -1) {
        setImportError('Please map the required field: Product Name');
        return;
      }

      csvRows.forEach((row, idx) => {
        const nameVal = row[nameColIndex];
        if (!nameVal || !nameVal.trim()) return;

        const purchasePrice = columnMapping['purchase_price'] !== undefined && columnMapping['purchase_price'] > -1 
          ? parseFloat(row[columnMapping['purchase_price']]) : 0;
        const sellingPrice = columnMapping['selling_price'] !== undefined && columnMapping['selling_price'] > -1 
          ? parseFloat(row[columnMapping['selling_price']]) : 0;
        const stockQty = columnMapping['stock_quantity'] !== undefined && columnMapping['stock_quantity'] > -1 
          ? parseFloat(row[columnMapping['stock_quantity']]) : 0;
        const minStock = columnMapping['minimum_stock'] !== undefined && columnMapping['minimum_stock'] > -1 
          ? parseInt(row[columnMapping['minimum_stock']]) : 10;
        const gstRate = columnMapping['gst_rate'] !== undefined && columnMapping['gst_rate'] > -1 
          ? parseInt(row[columnMapping['gst_rate']]) : 0;

        const product: Product = {
          id: `prod-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          shop_id: currentUser.id,
          product_name: nameVal.trim(),
          product_name_gu: (columnMapping['product_name_gu'] !== undefined && columnMapping['product_name_gu'] > -1 
            ? row[columnMapping['product_name_gu']] : '') || nameVal.trim(),
          category: (columnMapping['category'] !== undefined && columnMapping['category'] > -1 
            ? row[columnMapping['category']] : '') || 'General FMCG',
          brand: (columnMapping['brand'] !== undefined && columnMapping['brand'] > -1 
            ? row[columnMapping['brand']] : '') || 'Generic / સામાન્ય',
          purchase_price: isNaN(purchasePrice) ? 0 : purchasePrice,
          selling_price: isNaN(sellingPrice) ? 0 : sellingPrice,
          stock_quantity: isNaN(stockQty) ? 0 : stockQty,
          unit: ((columnMapping['unit'] !== undefined && columnMapping['unit'] > -1 
            ? row[columnMapping['unit']] : '') || 'Packet') as any,
          minimum_stock: isNaN(minStock) ? 10 : minStock,
          barcode: columnMapping['barcode'] !== undefined && columnMapping['barcode'] > -1 
            ? row[columnMapping['barcode']].trim() : undefined,
          gst_rate: isNaN(gstRate) ? 0 : gstRate
        };

        importedProducts.push(product);
      });

      if (importedProducts.length === 0) {
        setImportError('No valid rows found to import.');
        return;
      }

      // Save to database
      let updatedProducts = [...products];
      for (const p of importedProducts) {
        updatedProducts = db.saveProduct(p, currentUser.id);
      }

      setProducts(updatedProducts);
      setIsImportModalOpen(false);
      
      // Reset state variables
      setCsvHeaders([]);
      setCsvRows([]);
      setColumnMapping({});
      setImportError('');
      
      alert(`Import complete! Successfully saved ${importedProducts.length} products to database.`);
    } catch (err: any) {
      setImportError(err.message || 'Error processing imports.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {t('products', langMode)}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {langMode === 'gu' 
              ? 'તમારા સ્ટોક આઇટમોનું લિસ્ટ, કિંમતો અને ઉપલબ્ધતાનું સંચાલન કરો.' 
              : 'Manage your wholesale product master list, prices, barcodes, and current stock.'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>{t('exportExcel', langMode)}</span>
          </button>

          {!isExpired && (
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Import Stock / આયાત</span>
            </button>
          )}
          
          {!isExpired ? (
            <button 
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>{t('addProduct', langMode)}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-400 text-xs font-bold px-4 py-2.5 rounded-xl cursor-not-allowed select-none shadow-sm">
              <Lock className="w-3.5 h-3.5" />
              <span>{t('addProduct', langMode)} (Locked)</span>
            </div>
          )}
        </div>
      </div>

      {/* Filters Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        {/* Search */}
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('search', langMode)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 appearance-none transition-colors"
          >
            <option value="">{t('allCategories', langMode)}</option>
            {categories.map((c, idx) => (
              <option key={idx} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
          {langMode === 'gu' ? `પરિણામો: ${filteredProducts.length} ઉત્પાદનો` : `Results: ${filteredProducts.length} Products`}
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">{langMode === 'gu' ? 'ઉત્પાદન નામ' : 'Product Name'}</th>
                <th className="px-6 py-4">{t('category', langMode)}</th>
                <th className="px-6 py-4">{t('brand', langMode)}</th>
                <th className="px-4 py-4 text-right">{t('purchasePrice', langMode)}</th>
                <th className="px-4 py-4 text-right">{t('sellingPrice', langMode)}</th>
                <th className="px-6 py-4 text-center">{t('currentStock', langMode)}</th>
                <th className="px-6 py-4">{t('barcode', langMode)}</th>
                <th className="px-6 py-4 text-center">{t('actions', langMode)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">
                    {langMode === 'gu' 
                      ? 'કોઈ ઉત્પાદનો મળ્યા નથી.' 
                      : 'No products found matching criteria.'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLowStock = p.stock_quantity <= p.minimum_stock;
                  const isOutOfStock = p.stock_quantity === 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        <div className="flex flex-col">
                          <span>{p.product_name}</span>
                          <span className="text-xs text-slate-400 font-normal">{p.product_name_gu}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-lg">{p.category}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{p.brand}</td>
                      <td className="px-4 py-4 text-right font-medium">₹{p.purchase_price.toFixed(2)}</td>
                      <td className="px-4 py-4 text-right font-semibold text-emerald-600">₹{p.selling_price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center font-medium">
                        <div className="flex flex-col items-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            isOutOfStock 
                              ? 'bg-red-100 text-red-700' 
                              : isLowStock 
                              ? 'bg-amber-100 text-amber-700' 
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {p.stock_quantity} {p.unit}
                          </span>
                          {isOutOfStock && (
                            <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider mt-0.5">
                              {t('outOfStock', langMode)}
                            </span>
                          )}
                          {!isOutOfStock && isLowStock && (
                            <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider mt-0.5">
                              {t('lowStock', langMode)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {p.barcode ? (
                          <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-50 p-1.5 rounded-lg border border-slate-100 w-fit">
                            <Barcode className="w-3.5 h-3.5" />
                            <span>{p.barcode}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!isExpired ? (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(p)}
                                className="p-1.5 bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-100 rounded-lg transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(p.id, p.product_name)}
                                className="p-1.5 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-100 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-300 flex items-center gap-0.5 text-[10px] font-bold">
                              <Lock className="w-3 h-3" />
                              <span>Locked</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Plus className="w-4 h-4" />
                </span>
                <span>
                  {editingProduct ? t('editProduct', langMode) : t('addProduct', langMode)}
                </span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs font-bold text-red-700 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Product Name (English)</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">ઉત્પાદન નામ (ગુજરાતી)</label>
                  <input
                    type="text"
                    value={formNameGu}
                    onChange={(e) => setFormNameGu(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('category', langMode)}</label>
                  <input
                    type="text"
                    list="modal-categories-list"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Pan Masala, Snacks..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <datalist id="modal-categories-list">
                    {categories.map((c, idx) => (
                      <option key={idx} value={c} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('brand', langMode)}</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('purchasePrice', langMode)} (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPurchasePrice}
                    onChange={(e) => setFormPurchasePrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('sellingPrice', langMode)} (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('currentStock', langMode)}</label>
                  <input
                    type="number"
                    value={formStockQuantity}
                    disabled={!!editingProduct}
                    onChange={(e) => setFormStockQuantity(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm disabled:opacity-60 disabled:bg-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('unitType', langMode)}</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="Packet">{t('packet', langMode)}</option>
                    <option value="Box">{t('box', langMode)}</option>
                    <option value="Bundle">{t('bundle', langMode)}</option>
                    <option value="Piece">{t('piece', langMode)}</option>
                    <option value="Kg">Kg / કિલોગ્રામ</option>
                    <option value="Gram">Gram / ગ્રામ</option>
                    <option value="Litre">Litre / લિટર</option>
                    <option value="Dozen">Dozen / ડઝન</option>
                    <option value="Bag">Bag / ગુણ</option>
                    <option value="Carton">Carton / કાર્ટન</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('minimumStock', langMode)}</label>
                  <input
                    type="number"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('barcode', langMode)}</label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">GST Rate (%) / GST દર</label>
                  <select
                    value={formGstRate}
                    onChange={(e) => setFormGstRate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="0">0% (GST Exempt / કર મુક્ત)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold rounded-xl"
                >
                  {t('cancel', langMode)}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{t('save', langMode)}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV STOCK IMPORT MODAL */}
      {isImportModalOpen && !isExpired && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-100 overflow-hidden transform transition-all flex flex-col max-h-[90vh] no-print">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Import Product Stock from Excel/CSV / આયાત સ્ટોક</span>
              </h3>
              <button 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setCsvHeaders([]);
                  setCsvRows([]);
                  setColumnMapping({});
                  setImportError('');
                }}
                className="p-1 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-bold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Step 1: Upload File */}
              {csvHeaders.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col items-center justify-center space-y-3">
                  <Upload className="w-10 h-10 text-slate-350 stroke-1" />
                  <div>
                    <p className="font-bold text-slate-700 text-sm">Select CSV Stock List Sheet</p>
                    <p className="text-slate-450 text-[10px] mt-1">Export your Excel file as `.csv` format before selecting.</p>
                  </div>
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden" 
                    id="csv-file-selector"
                  />
                  <label 
                    htmlFor="csv-file-selector"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-sm cursor-pointer transition-colors"
                  >
                    Choose CSV File
                  </label>
                </div>
              ) : (
                /* Step 2: Column Mapping UI */
                <div className="space-y-5">
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                    <p className="font-semibold text-emerald-800">
                      Successfully loaded {csvRows.length} product rows! Map the spreadsheet columns below:
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'product_name', label: 'Product Name (EN) * / નામ *', required: true },
                      { key: 'product_name_gu', label: 'Product Name (Gujarati) / ગુજરાતી નામ', required: false },
                      { key: 'category', label: 'Category / કેટેગરી', required: false },
                      { key: 'brand', label: 'Brand / બ્રાન્ડ', required: false },
                      { key: 'purchase_price', label: 'Cost Rate (Excl. GST) / ખરીદી કિંમત', required: false },
                      { key: 'selling_price', label: 'Sales Rate (Incl. GST) / વેચાણ કિંમત', required: false },
                      { key: 'stock_quantity', label: 'Current Stock Qty / ચાલુ જથ્થો', required: false },
                      { key: 'unit', label: 'Unit (e.g. Kg, Packet) / એકમ', required: false },
                      { key: 'minimum_stock', label: 'Min Alert Qty / ન્યૂનતમ સ્ટોક', required: false },
                      { key: 'barcode', label: 'Barcode (EAN) / બારકોડ', required: false },
                      { key: 'gst_rate', label: 'GST Slab (%) / જીએસટી', required: false }
                    ].map(field => (
                      <div key={field.key} className="space-y-1">
                        <label className="font-bold text-slate-500 uppercase tracking-wide flex justify-between">
                          <span>{field.label}</span>
                          {field.required && <span className="text-red-500 font-black">* Required</span>}
                        </label>
                        <select
                          value={columnMapping[field.key] !== undefined ? columnMapping[field.key] : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setColumnMapping({
                              ...columnMapping,
                              [field.key]: val === '' ? -1 : parseInt(val)
                            });
                          }}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                        >
                          <option value="">-- Skip / None --</option>
                          {csvHeaders.map((hdr, idx) => (
                            <option key={idx} value={idx}>Column {idx + 1}: {hdr}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  {/* Preview of first 3 rows */}
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <p className="font-bold text-slate-650 uppercase">Preview of Loaded Data (First 3 Items):</p>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-40">
                      <table className="w-full text-left border-collapse bg-slate-50/50">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-250 font-bold text-slate-500 text-[10px]">
                            <th className="p-2">Name</th>
                            <th className="p-2 text-right">Cost</th>
                            <th className="p-2 text-right">Price</th>
                            <th className="p-2 text-right">Qty</th>
                            <th className="p-2">Unit</th>
                            <th className="p-2 text-right">GST %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {csvRows.slice(0, 3).map((row, idx) => {
                            const nameIdx = columnMapping['product_name'];
                            const name = nameIdx !== undefined && nameIdx > -1 ? row[nameIdx] : 'Skipped';
                            const purchaseIdx = columnMapping['purchase_price'];
                            const purchase = purchaseIdx !== undefined && purchaseIdx > -1 ? row[purchaseIdx] : '0';
                            const sellingIdx = columnMapping['selling_price'];
                            const selling = sellingIdx !== undefined && sellingIdx > -1 ? row[sellingIdx] : '0';
                            const qtyIdx = columnMapping['stock_quantity'];
                            const qty = qtyIdx !== undefined && qtyIdx > -1 ? row[qtyIdx] : '0';
                            const unitIdx = columnMapping['unit'];
                            const unit = unitIdx !== undefined && unitIdx > -1 ? row[unitIdx] : 'Packet';
                            const gstIdx = columnMapping['gst_rate'];
                            const gst = gstIdx !== undefined && gstIdx > -1 ? row[gstIdx] : '0';
                            return (
                              <tr key={idx} className="hover:bg-slate-100/50">
                                <td className="p-2 font-bold text-slate-800">{name}</td>
                                <td className="p-2 text-right">₹{purchase}</td>
                                <td className="p-2 text-right">₹{selling}</td>
                                <td className="p-2 text-right">{qty}</td>
                                <td className="p-2">{unit}</td>
                                <td className="p-2 text-right">{gst}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setCsvHeaders([]);
                  setCsvRows([]);
                  setColumnMapping({});
                  setImportError('');
                }}
                className="px-4 py-2 border border-slate-200 text-slate-550 hover:bg-slate-50 font-bold rounded-xl"
              >
                Cancel
              </button>

              {csvHeaders.length > 0 && (
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm Import ({csvRows.length} Rows)</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
