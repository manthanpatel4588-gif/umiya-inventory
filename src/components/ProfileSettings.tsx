import React, { useState } from 'react';
import { Store, User as UserIcon, Phone, MapPin, FileCheck, Image, Save, CheckCircle } from 'lucide-react';
import { User, db } from '../database/db';
import { LanguageMode, t } from '../utils/translations';

interface ProfileSettingsProps {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  langMode: LanguageMode;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  currentUser,
  setCurrentUser,
  langMode
}) => {
  const [shopName, setShopName] = useState(currentUser.shop_name);
  const [ownerName, setOwnerName] = useState(currentUser.owner_name);
  const [mobile, setMobile] = useState(currentUser.mobile);
  const [address, setAddress] = useState(currentUser.address);
  const [gstNumber, setGstNumber] = useState(currentUser.gst_number || '');
  const [logoUrl, setLogoUrl] = useState(currentUser.logo_url || '');
  const [fssaiNumber, setFssaiNumber] = useState(currentUser.fssai_number || '');
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!shopName.trim()) {
      setErrorMsg(langMode === 'gu' ? 'કૃપા કરીને પેઢીનું નામ દાખલ કરો' : 'Shop Name is required.');
      return;
    }
    if (!ownerName.trim()) {
      setErrorMsg(langMode === 'gu' ? 'કૃપા કરીને માલિકનું નામ દાખલ કરો' : 'Owner Name is required.');
      return;
    }
    if (!mobile.trim() || mobile.length < 10) {
      setErrorMsg(langMode === 'gu' ? 'કૃપા કરીને અમાન્ય મોબાઇલ નંબર દાખલ કરો' : 'Valid mobile number is required.');
      return;
    }

    const payload: User = {
      ...currentUser,
      shop_name: shopName.trim(),
      owner_name: ownerName.trim(),
      mobile: mobile.trim(),
      address: address.trim(),
      gst_number: gstNumber.trim() || undefined,
      logo_url: logoUrl.trim() || undefined,
      fssai_number: fssaiNumber.trim() || undefined
    };

    const updated = db.saveUser(payload);
    // Update active context user and session storage
    setCurrentUser(payload);
    sessionStorage.setItem('umiya_active_user', JSON.stringify(payload));
    
    db.addAuditLog(currentUser.email, 'Shop Profile Settings Updated', currentUser.id);
    setSuccessMsg(langMode === 'gu' ? 'પ્રોફાઇલ વિગતો સફળતાપૂર્વક સાચવી લેવામાં આવી છે!' : 'Shop Profile updated successfully!');
    
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Simulate Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate file reading and local data URL representation
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setLogoUrl(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Store className="w-5 h-5 text-emerald-600" />
          <span>Shop Profile Settings / પ્રોફાઇલ સેટિંગ્સ</span>
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {langMode === 'gu' 
            ? 'તમારી દુકાનનું નામ, સરનામું, જીએસટી નંબર અને લોગો બદલો.' 
            : 'Configure your company details, address, billing details, and upload storefront logo.'}
        </p>
      </div>

      {/* Settings Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <form onSubmit={handleSave} className="space-y-5">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-xs font-bold text-red-700 rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Logo Upload Section */}
          <div className="space-y-2 border-b border-slate-100 pb-5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Image className="w-3.5 h-3.5 text-slate-400" />
              <span>Shop Logo / પેઢીનો લોગો</span>
            </label>
            
            <div className="flex items-center gap-4 mt-2">
              <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Shop Logo" className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <div className="space-y-1">
                <input
                  type="file"
                  id="shop-logo-input"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <label
                  htmlFor="shop-logo-input"
                  className="inline-flex cursor-pointer px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-bold rounded-xl shadow-sm"
                >
                  Upload Image
                </label>
                <p className="text-[10px] text-slate-400">Supported formats: JPG, PNG. Max size 1MB.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Shop Name */}
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-slate-400" />
                <span>Shop Name / દુકાનનું નામ</span>
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Owner Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Owner Name / માલિકનું નામ</span>
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Mobile */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Mobile Number / મોબાઇલ નંબર</span>
              </label>
              <input
                type="text"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* GSTIN */}
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>GSTIN Number / GST નંબર</span>
              </label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="24XXXXXXXXXXXXX"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* FSSAI */}
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>FSSAI License Number / FSSAI લાયસન્સ નંબર</span>
              </label>
              <input
                type="text"
                maxLength={14}
                value={fssaiNumber}
                onChange={(e) => setFssaiNumber(e.target.value.replace(/\D/g, '').slice(0, 14))}
                placeholder="e.g. 12345678901234 (14 digits)"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Address */}
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Address / સરનામું</span>
              </label>
              <textarea
                rows={2.5}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

          </div>

          {/* Save trigger */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-100"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t('save', langMode)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
