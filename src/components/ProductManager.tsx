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
  Barcode
} from 'lucide-react';
import { Product, db } from '../database/db';
import { LanguageMode, t } from '../utils/translations';

interface ProductManagerProps {
  langMode: LanguageMode;
}

export const ProductManager: React.FC<ProductManagerProps> = ({ langMode }) => {
  const [products, setProducts] = useState<Product[]>(() => db.getProducts());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formNameGu, setFormNameGu] = useState('');
  const [formCategory, setFormCategory] = useState('General FMCG');
  const [formBrand, setFormBrand] = useState('');
  const [formPurchasePrice, setFormPurchasePrice] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formStockQuantity, setFormStockQuantity] = useState('');
  const [formUnit, setFormUnit] = useState<'Packet' | 'Box' | 'Bundle' | 'Piece'>('Packet');
  const [formMinStock, setFormMinStock] = useState('10');
  const [formBarcode, setFormBarcode] = useState('');
  const [formError, setFormError] = useState('');

  // Categories list
  const categories = ['Pan Masala', 'Mukhwas', 'Chocolate', 'Cigarettes', 'General FMCG'];

  // Filtered Products
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
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
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
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Basic validation
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
      // Wholesalers sometimes sell at cost, but warn or validate
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
      product_name: formName.trim(),
      product_name_gu: formNameGu.trim(),
      category: formCategory,
      brand: formBrand.trim() || 'Generic / સામાન્ય',
      purchase_price: purchase,
      selling_price: selling,
      stock_quantity: stock,
      unit: formUnit,
      minimum_stock: minStock,
      barcode: formBarcode.trim() || undefined
    };

    const updated = db.saveProduct(payload);
    setProducts(updated);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    const confirmation = confirm(
      langMode === 'gu' 
        ? `શું તમે ખરેખર "${name}" કાઢી નાખવા માંગો છો?` 
        : `Are you sure you want to delete "${name}"?`
    );
    if (confirmation) {
      const updated = db.deleteProduct(id);
      setProducts(updated);
    }
  };

  // EXPORT EXCEL (Excel Compatible CSV Export with BOM)
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

    // Prepend UTF-8 BOM so MS Excel decodes Gujarati characters correctly
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Umiya_Inventory_Products_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>{t('exportExcel', langMode)}</span>
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-100 hover:shadow-emerald-200"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addProduct', langMode)}</span>
          </button>
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

        {/* Inventory Summary info */}
        <div className="flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
          {langMode === 'gu' ? `પરિણામો: ${filteredProducts.length} ઉત્પાદનો` : `Results: ${filteredProducts.length} Products`}
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
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
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    {langMode === 'gu' 
                      ? 'કોઈ ઉત્પાદનો મળ્યા નથી. નવું ઉત્પાદન ઉમેરવા માટે "+ ઉમેરો" પર ક્લિક કરો.' 
                      : 'No products found matching criteria. Click "+ Add Product" to create one.'}
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
                            <Barcode className="w-3.5 h-3.5 text-slate-400" />
                            <span>{p.barcode}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
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

      {/* ADD / EDIT MODAL DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden transform transition-all">
            {/* Header */}
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

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs font-bold text-red-700 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* English Name */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Product Name (English)
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Vimal Shaheed Box"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Gujarati Name */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    ઉત્પાદન નામ (ગુજરાતી)
                  </label>
                  <input
                    type="text"
                    value={formNameGu}
                    onChange={(e) => setFormNameGu(e.target.value)}
                    placeholder="દા.ત. વિમલ પાન મસાલા બોક્સ"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Category Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    {t('category', langMode)}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    {categories.map((c, idx) => (
                      <option key={idx} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Brand */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    {t('brand', langMode)}
                  </label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="e.g. ITC / Vimal"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Purchase Price */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    {t('purchasePrice', langMode)} (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPurchasePrice}
                    onChange={(e) => setFormPurchasePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Selling Price */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    {t('sellingPrice', langMode)} (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Stock Quantity */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    {t('currentStock', langMode)}
                  </label>
                  <input
                    type="number"
                    value={formStockQuantity}
                    disabled={!!editingProduct} // In wholesale, stock is adjusted via Purchase/Sales entry
                    onChange={(e) => setFormStockQuantity(e.target.value)}
                    placeholder="0"
                    className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors ${
                      editingProduct ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''
                    }`}
                  />
                  {editingProduct && (
                    <span className="text-[9px] text-slate-400 font-semibold">
                      * Stock edited via entries
                    </span>
                  )}
                </div>

                {/* Unit Type */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    {t('unitType', langMode)}
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="Packet">{t('packet', langMode)}</option>
                    <option value="Box">{t('box', langMode)}</option>
                    <option value="Bundle">{t('bundle', langMode)}</option>
                    <option value="Piece">{t('piece', langMode)}</option>
                  </select>
                </div>

                {/* Min Stock level */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    {t('minimumStock', langMode)}
                  </label>
                  <input
                    type="number"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    placeholder="10"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Barcode */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    {t('barcode', langMode)}
                  </label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="Scan barcode / optional"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-semibold rounded-xl transition-all"
                >
                  {t('cancel', langMode)}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-emerald-100"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{t('save', langMode)}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
