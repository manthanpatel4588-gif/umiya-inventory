import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Lock, 
  Calendar, 
  X, 
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  AlertCircle
} from 'lucide-react';
import { User, db } from '../database/db';

export const AdminUserPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>(() => db.getUsers());
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form fields state
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [planType, setPlanType] = useState<'Trial' | 'Monthly' | 'Quarterly' | 'Yearly'>('Monthly');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Blocked'>('Active');
  const [gstNumber, setGstNumber] = useState('');
  const [formError, setFormError] = useState('');

  // Password reset modal state
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Subscription renew/extend modal state
  const [subUser, setSubUser] = useState<User | null>(null);
  const [extendMonths, setExtendMonths] = useState('1');
  const [upgradePlanType, setUpgradePlanType] = useState<'Trial' | 'Monthly' | 'Quarterly' | 'Yearly'>('Monthly');

  // Filtered list (exclude SuperAdmins to prevent self-deletion or self-edit here)
  const filteredShops = useMemo(() => {
    return users
      .filter(u => u.role === 'ShopOwner')
      .filter(u => 
        u.shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [users, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setShopName('');
    setOwnerName('');
    setMobile('');
    setEmail('');
    setPassword('');
    setAddress('');
    setPlanType('Monthly');
    setStatus('Active');
    setGstNumber('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setShopName(user.shop_name);
    setOwnerName(user.owner_name);
    setMobile(user.mobile);
    setEmail(user.email);
    setPassword(user.password_hash);
    setAddress(user.address);
    setPlanType(user.plan_type);
    setStatus(user.status);
    setGstNumber(user.gst_number || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!shopName.trim()) return setFormError('Enter Shop Name');
    if (!ownerName.trim()) return setFormError('Enter Owner Name');
    if (!mobile.trim() || mobile.length < 10) return setFormError('Enter a valid 10-digit mobile number');
    if (!email.trim() || !email.includes('@')) return setFormError('Enter a valid email address');
    if (!password.trim()) return setFormError('Enter password');

    // Calculate expiry dates
    let expiry = new Date();
    if (!editingUser) {
      if (planType === 'Trial') expiry.setDate(expiry.getDate() + 14); // 14 days trial
      else if (planType === 'Monthly') expiry.setMonth(expiry.getMonth() + 1);
      else if (planType === 'Quarterly') expiry.setMonth(expiry.getMonth() + 3);
      else if (planType === 'Yearly') expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry = new Date(editingUser.plan_expiry);
    }

    const payload: User = {
      id: editingUser ? editingUser.id : `shop-${Date.now()}`,
      email: email.trim().toLowerCase(),
      password_hash: password.trim(),
      shop_name: shopName.trim(),
      owner_name: ownerName.trim(),
      mobile: mobile.trim(),
      address: address.trim() || 'Gujarat, India',
      role: 'ShopOwner',
      plan_type: planType,
      plan_start: editingUser ? editingUser.plan_start : new Date().toISOString(),
      plan_expiry: expiry.toISOString(),
      status: status,
      gst_number: gstNumber.trim() || undefined
    };

    const updated = db.saveUser(payload);
    setUsers(updated);
    setIsModalOpen(false);

    db.addAuditLog('admin@umiya.com', `Shop ${editingUser ? 'Edited' : 'Registered'}: ${payload.shop_name}`, 'admin');
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete shop "${name}"? This deletes their user profile.`)) {
      const updated = db.deleteUser(id);
      setUsers(updated);
      db.addAuditLog('admin@umiya.com', `Shop Deleted: ${name}`, 'admin');
    }
  };

  const handleToggleStatus = (user: User, nextStatus: 'Active' | 'Inactive' | 'Blocked') => {
    const payload: User = { ...user, status: nextStatus };
    const updated = db.saveUser(payload);
    setUsers(updated);
    db.addAuditLog('admin@umiya.com', `Shop Status Updated: ${user.shop_name} set to ${nextStatus}`, 'admin');
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !newPassword.trim()) return;

    const payload: User = { ...resettingUser, password_hash: newPassword.trim() };
    const updated = db.saveUser(payload);
    setUsers(updated);
    setResettingUser(null);
    setNewPassword('');
    db.addAuditLog('admin@umiya.com', `Password Reset for Shop: ${resettingUser.shop_name}`, 'admin');
    alert('Password updated successfully!');
  };

  const handleRenewSubscriptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subUser) return;

    // Extend date from current expiry or from today (if already expired)
    let currentExpiry = new Date(subUser.plan_expiry);
    const today = new Date();
    if (currentExpiry < today) {
      currentExpiry = today; // extend from today
    }

    const months = parseInt(extendMonths);
    if (isNaN(months) || months <= 0) return;

    currentExpiry.setMonth(currentExpiry.getMonth() + months);

    const payload: User = {
      ...subUser,
      plan_type: upgradePlanType,
      plan_expiry: currentExpiry.toISOString()
    };

    const updated = db.saveUser(payload);
    setUsers(updated);
    setSubUser(null);
    setExtendMonths('1');
    db.addAuditLog('admin@umiya.com', `Subscription Renewed/Upgraded for: ${subUser.shop_name} (Extended by ${months} months)`, 'admin');
    alert('Subscription updated successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Shop & User Management</span>
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Register new wholesaler clients, configure statuses, extend plan subscriptions, and reset password credentials.
          </p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Shop</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by Shop name, Owner details, or email address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Main Shops Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-600">
            <thead>
              <tr className="bg-slate-50 font-bold text-slate-450 uppercase border-b border-slate-100">
                <th className="px-6 py-4">Shop Details</th>
                <th className="px-6 py-4">Plan Settings</th>
                <th className="px-6 py-4">Expiry Date</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Security</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredShops.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">
                    No shops found matching filter query.
                  </td>
                </tr>
              ) : (
                filteredShops.map((shop) => {
                  const isExpired = new Date(shop.plan_expiry) < new Date();
                  return (
                    <tr key={shop.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-800 text-sm">{shop.shop_name}</span>
                          <span className="text-slate-450">{shop.owner_name} • {shop.mobile}</span>
                          <span className="text-[10px] text-slate-400">{shop.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-lg w-fit">
                            {shop.plan_type}
                          </span>
                          <button
                            onClick={() => {
                              setSubUser(shop);
                              setUpgradePlanType(shop.plan_type);
                            }}
                            className="text-[10px] text-indigo-600 hover:text-indigo-700 hover:underline font-bold text-left"
                          >
                            Renew / Upgrade Plan
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={`${isExpired ? 'text-red-600 font-bold' : 'text-slate-750'}`}>
                            {new Date(shop.plan_expiry).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </span>
                          {isExpired && (
                            <span className="text-[9px] text-red-500 font-bold uppercase mt-0.5 flex items-center gap-0.5">
                              <AlertCircle className="w-3 h-3" />
                              <span>Expired</span>
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* Active / Inactive / Blocked buttons toggler */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            shop.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            shop.status === 'Inactive' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                            'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                            {shop.status}
                          </span>
                          
                          {/* Quick toggles */}
                          <div className="flex gap-1.5 text-[9px] font-bold">
                            {shop.status !== 'Active' && (
                              <button 
                                onClick={() => handleToggleStatus(shop, 'Active')}
                                className="text-emerald-600 hover:underline"
                              >
                                Activate
                              </button>
                            )}
                            {shop.status === 'Active' && (
                              <button 
                                onClick={() => handleToggleStatus(shop, 'Inactive')}
                                className="text-slate-500 hover:underline"
                              >
                                Pause
                              </button>
                            )}
                            {shop.status !== 'Blocked' && (
                              <button 
                                onClick={() => handleToggleStatus(shop, 'Blocked')}
                                className="text-red-500 hover:underline"
                              >
                                Block
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Reset Password */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setResettingUser(shop)}
                          className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg font-bold flex items-center gap-1 mx-auto text-[10px]"
                        >
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Reset pass</span>
                        </button>
                      </td>

                      {/* Edit Delete */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(shop)}
                            className="p-1.5 bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-100 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(shop.id, shop.shop_name)}
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

      {/* REGISTER / EDIT USER DIALOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Users className="w-4 h-4" />
                </span>
                <span>{editingUser ? 'Edit Shop Profile' : 'Register New Shop Tenant'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs font-bold text-red-700 rounded-xl flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                
                {/* Shop Name */}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Shop Name</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Umiya General Wholesale Store"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Owner Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Owner Name</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Manthan Patel"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Mobile Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Mobile Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="10 digit number"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address (Login ID)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. owner@umiya.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Login Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Plan Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Subscription Plan Type</label>
                  <select
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Trial">Trial Plan (14 Days)</option>
                    <option value="Monthly">Monthly Plan (1 Month)</option>
                    <option value="Quarterly">Quarterly Plan (3 Months)</option>
                    <option value="Yearly">Yearly Plan (1 Year)</option>
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Account Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive (Suspended)</option>
                    <option value="Blocked">Blocked (Disabled)</option>
                  </select>
                </div>

                {/* GSTIN */}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">GSTIN Number (Optional)</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    placeholder="e.g. 24UMIYA1234F1Z1"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Address */}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Shop Address / સરનામું</label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Address details..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 -mx-6 -mb-6 px-6 py-4">
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
                  Save Shop Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {resettingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-xs">Reset User Password</h3>
              <button onClick={() => setResettingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-xl text-xs font-semibold text-indigo-850">
                Resetting password for: {resettingUser.shop_name} ({resettingUser.email})
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENEW / EXTEND PLAN SUBSCRIPTION MODAL */}
      {subUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-xs">Renew / Upgrade Subscription</h3>
              <button onClick={() => setSubUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenewSubscriptionSubmit} className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-xs">
                <p><strong>Shop:</strong> {subUser.shop_name}</p>
                <p><strong>Current Plan:</strong> {subUser.plan_type}</p>
                <p><strong>Expiry:</strong> {new Date(subUser.plan_expiry).toLocaleDateString()}</p>
              </div>

              {/* Select Upgrade Plan */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Set Plan Type</label>
                <select
                  value={upgradePlanType}
                  onChange={(e) => setUpgradePlanType(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="Trial">Trial</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>

              {/* Extend Duration */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Extend Duration (Months)</label>
                <select
                  value={extendMonths}
                  onChange={(e) => setExtendMonths(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="1">1 Month Extension</option>
                  <option value="3">3 Months Extension</option>
                  <option value="6">6 Months Extension</option>
                  <option value="12">12 Months (1 Year) Extension</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubUser(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
                >
                  Apply Renewal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
