import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Phone, 
  MapPin, 
  FileCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  CreditCard, 
  Clock, 
  History,
  X,
  CheckCircle,
  AlertCircle,
  Lock
} from 'lucide-react';
import { Supplier, Purchase, db, User as UserType } from '../database/db';
import { LanguageMode, t } from '../utils/translations';

interface SupplierManagerProps {
  langMode: LanguageMode;
  currentUser: UserType;
}

export const SupplierManager: React.FC<SupplierManagerProps> = ({ langMode, currentUser }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => db.getSuppliers(currentUser.id));
  const [purchases] = useState<Purchase[]>(() => db.getPurchases(currentUser.id));
  
  // Selected supplier for detail view
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(() => suppliers[0]?.id || '');
  
  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Settle Outstanding State
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');

  // Form Fields State
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formGst, setFormGst] = useState('');
  const [formOutstanding, setFormOutstanding] = useState('');
  const [formError, setFormError] = useState('');

  // Expiry check
  const isExpired = useMemo(() => {
    return new Date(currentUser.plan_expiry) < new Date();
  }, [currentUser.plan_expiry]);

  // Find active supplier details
  const activeSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  // Find active supplier purchase history
  const supplierPurchases = useMemo(() => {
    if (!activeSupplier) return [];
    return purchases.filter(p => 
      p.supplier_name.toLowerCase().includes(activeSupplier.supplier_name.split(' (')[0].toLowerCase())
    );
  }, [purchases, activeSupplier]);

  const handleOpenAddModal = () => {
    if (isExpired) return; // Guard
    setEditingSupplier(null);
    setFormName('');
    setFormMobile('');
    setFormAddress('');
    setFormGst('');
    setFormOutstanding('0');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (supplier: Supplier, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExpired) return; // Guard
    setEditingSupplier(supplier);
    setFormName(supplier.supplier_name);
    setFormMobile(supplier.mobile);
    setFormAddress(supplier.address);
    setFormGst(supplier.gst_number);
    setFormOutstanding(supplier.outstanding_payment.toString());
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) return; // Guard
    setFormError('');

    if (!formName.trim()) {
      setFormError(langMode === 'gu' ? 'કૃપા કરીને સપ્લાયરનું નામ લખો' : 'Please enter Supplier Name');
      return;
    }
    if (!formMobile.trim() || formMobile.length < 10) {
      setFormError(langMode === 'gu' ? 'અમાન્ય મોબાઇલ નંબર' : 'Invalid Mobile Number');
      return;
    }

    const outstanding = parseFloat(formOutstanding);
    if (isNaN(outstanding) || outstanding < 0) {
      setFormError(langMode === 'gu' ? 'અમાન્ય બાકી ચૂકવણી રકમ' : 'Invalid outstanding payment amount');
      return;
    }

    const payload: Supplier = {
      id: editingSupplier ? editingSupplier.id : `sup-${Date.now()}`,
      shop_id: currentUser.id,
      supplier_name: formName.trim(),
      mobile: formMobile.trim(),
      address: formAddress.trim() || 'Gujarat, India',
      gst_number: formGst.trim().toUpperCase() || 'URD (Unregistered)',
      outstanding_payment: outstanding
    };

    const updated = db.saveSupplier(payload, currentUser.id);
    setSuppliers(updated);
    
    if (!editingSupplier) {
      setSelectedSupplierId(payload.id);
    }
    
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExpired) return; // Guard
    const confirmation = confirm(
      langMode === 'gu' 
        ? `શું તમે ખરેખર "${name}" સપ્લાયરને કાઢી નાખવા માંગો છો?` 
        : `Are you sure you want to delete supplier "${name}"?`
    );
    if (confirmation) {
      const updated = db.deleteSupplier(id, currentUser.id);
      setSuppliers(updated);
      if (selectedSupplierId === id) {
        setSelectedSupplierId(updated[0]?.id || '');
      }
    }
  };

  const handleSettlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired || !activeSupplier) return; // Guard

    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0 || amt > activeSupplier.outstanding_payment) {
      alert(langMode === 'gu' ? 'અમાન્ય ચુકવણી રકમ' : 'Invalid settle amount');
      return;
    }

    const payload: Supplier = {
      ...activeSupplier,
      outstanding_payment: activeSupplier.outstanding_payment - amt
    };

    const updated = db.saveSupplier(payload, currentUser.id);
    setSuppliers(updated);
    setIsSettleOpen(false);
    setSettleAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {t('suppliers', langMode)}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {langMode === 'gu' 
              ? 'વિક્રેતાઓના ખાતા અને બાકી લેણાં ચૂકવણીઓનો ટ્રેક રાખો.' 
              : 'Manage wholesaler/supplier directory, outstanding balances, and purchase accounts.'}
          </p>
        </div>
        
        {!isExpired ? (
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addSupplier', langMode)}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-400 text-xs font-bold px-4 py-2.5 rounded-xl cursor-not-allowed select-none shadow-sm">
            <Lock className="w-3.5 h-3.5" />
            <span>{t('addSupplier', langMode)} (Locked)</span>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Suppliers List Pane */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
            {langMode === 'gu' ? 'સપ્લાયર્સ લિસ્ટ' : 'Supplier Directory'} ({suppliers.length})
          </h3>
          
          <div className="space-y-2 overflow-y-auto max-h-[600px] pr-1">
            {suppliers.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-100 font-medium">
                No suppliers registered.
              </div>
            ) : (
              suppliers.map((s) => {
                const isSelected = selectedSupplierId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSupplierId(s.id)}
                    className={`bg-white p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3 group relative ${
                      isSelected 
                        ? 'border-emerald-500 shadow-md shadow-emerald-50 bg-emerald-50/10' 
                        : 'border-slate-100 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                          {s.supplier_name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-semibold">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{s.mobile}</span>
                        </div>
                      </div>

                      {/* Edit Delete actions */}
                      {!isExpired && (
                        <div className="flex items-center gap-1.5 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleOpenEditModal(s, e)}
                            className="p-1 bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-100 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(s.id, s.supplier_name, e)}
                            className="p-1 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">GST: {s.gst_number}</span>
                      <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                        s.outstanding_payment > 0 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {s.outstanding_payment > 0 ? `₹${s.outstanding_payment} Outstanding` : 'Settled'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Supplier Detail Pane */}
        <div className="lg:col-span-3">
          {activeSupplier ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    {activeSupplier.supplier_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {activeSupplier.address}</span>
                    <span className="flex items-center gap-1"><FileCheck className="w-3.5 h-3.5 text-slate-400" /> GST: {activeSupplier.gst_number}</span>
                  </div>
                </div>

                {/* Settle outstanding balance button */}
                {activeSupplier.outstanding_payment > 0 && (
                  <>
                    {!isExpired ? (
                      <button 
                        onClick={() => setIsSettleOpen(true)}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{langMode === 'gu' ? 'ચુકવણી સેટલ કરો' : 'Settle Payment'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-400 text-xs font-bold px-3.5 py-2 rounded-xl cursor-not-allowed select-none shadow-sm">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Settle (Locked)</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-6 grid grid-cols-2 gap-4 border-b border-slate-100">
                <div className="bg-amber-50/50 p-4 border border-amber-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {t('outstandingPayment', langMode)}
                  </span>
                  <p className="text-xl font-black text-amber-600 mt-1">
                    ₹{activeSupplier.outstanding_payment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-emerald-50/30 p-4 border border-emerald-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {langMode === 'gu' ? 'કુલ ખરીદીઓ' : 'Total Purchases Valued'}
                  </span>
                  <p className="text-xl font-black text-emerald-600 mt-1">
                    ₹{supplierPurchases.reduce((acc, p) => acc + p.total_amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Purchase history */}
              <div className="p-6 flex-1 flex flex-col min-h-[300px]">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>{langMode === 'gu' ? 'ખરીદી ઇતિહાસ' : 'Supplier Purchase History Log'}</span>
                </h4>

                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-4 py-2">{t('purchaseDate', langMode)}</th>
                        <th className="px-4 py-2">{langMode === 'gu' ? 'ઉત્પાદન વિગત' : 'Item Details'}</th>
                        <th className="px-4 py-2 text-right">{t('quantity', langMode)}</th>
                        <th className="px-4 py-2 text-right">{t('purchaseRate', langMode)}</th>
                        <th className="px-4 py-2 text-right">{t('totalAmount', langMode)}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-medium">
                      {supplierPurchases.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                            {langMode === 'gu' 
                              ? 'આ સપ્લાયર તરફથી કોઈ ખરીદીનો ઇતિહાસ નોંધાયેલ નથી.' 
                              : 'No purchase records logged from this supplier.'}
                          </td>
                        </tr>
                      ) : (
                        supplierPurchases.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/20">
                            <td className="px-4 py-3 whitespace-nowrap">
                              {new Date(p.purchase_date).toLocaleDateString(langMode === 'gu' ? 'gu-IN' : 'en-US')}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{p.product_name}</td>
                            <td className="px-4 py-3 text-right">{p.quantity}</td>
                            <td className="px-4 py-3 text-right font-semibold">₹{p.purchase_price.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-black text-emerald-600">₹{p.total_amount.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 h-full flex flex-col justify-center font-bold">
              Please register or select a supplier to view account profiles.
            </div>
          )}
        </div>

      </div>

      {/* ADD / EDIT SUPPLIER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Users className="w-4 h-4" />
                </span>
                <span>
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs font-bold text-red-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Supplier Name / પેઢીનું નામ
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Mahalaxmi Agencies"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Mobile Number / મોબાઇલ નંબર
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10 digit mobile number"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Shop Address / સરનામું
                  </label>
                  <textarea
                    rows={2}
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="APMC Market, Unjha..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    GSTIN Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={formGst}
                    onChange={(e) => setFormGst(e.target.value)}
                    placeholder="24XXXXXXXXXXXXX"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Initial Outstanding Balance / શરૂઆતની બાકી રકમ (₹)
                  </label>
                  <input
                    type="number"
                    value={formOutstanding}
                    disabled={!!editingSupplier}
                    onChange={(e) => setFormOutstanding(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-60 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTLE OUTSTANDING MODAL */}
      {isSettleOpen && activeSupplier && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                Settle Outstanding Payment
              </h3>
              <button onClick={() => setIsSettleOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSettlePayment} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 text-amber-700 rounded-xl text-xs font-semibold">
                Outstanding Balance to Settle: ₹{activeSupplier.outstanding_payment.toFixed(2)}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Payment Settle Amount / જમા રકમ (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={activeSupplier.outstanding_payment}
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettleOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
                >
                  Confirm Settle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
