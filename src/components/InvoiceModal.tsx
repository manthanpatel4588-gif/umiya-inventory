import React, { useMemo } from 'react';
import { X, Printer, Share2, FileText } from 'lucide-react';
import { Sale, db } from '../database/db';
import { LanguageMode } from '../utils/translations';

interface InvoiceModalProps {
  sale: Sale | null;
  product: any | null; // unused fallback
  isOpen: boolean;
  onClose: () => void;
  langMode: LanguageMode;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  sale,
  isOpen,
  onClose,
  langMode
}) => {
  if (!isOpen || !sale) return null;

  // 1. Fetch all items (sales) associated with this invoice number for the shop
  const invoiceItems = useMemo(() => {
    const allSales = db.getSales(sale.shop_id);
    return allSales.filter(s => s.invoice_number === sale.invoice_number);
  }, [sale]);

  // 2. Fetch the active Tenant User info for billing header parameters
  const shopProfile = useMemo(() => {
    const users = db.getUsers();
    return users.find(u => u.id === sale.shop_id) || null;
  }, [sale]);

  // 3. Format Date/Time
  const formattedDate = new Date(sale.sale_date).toLocaleDateString(
    langMode === 'gu' ? 'gu-IN' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  );

  // 4. Calculate Cart Totals & GST breakouts
  const invoiceTotals = useMemo(() => {
    let grandTotal = 0;
    let totalTax = 0;
    
    // We lookup each product dynamically to grab their units and GST rates
    const shopProducts = db.getProducts(sale.shop_id);
    const itemDetails = invoiceItems.map(item => {
      const prod = shopProducts.find(p => p.id === item.product_id);
      const unit = prod?.unit || 'units';
      const gstRate = prod?.gst_rate || 0;
      
      const total = item.quantity * item.sale_price;
      const base = total / (1 + gstRate / 100);
      const tax = total - base;

      grandTotal += total;
      totalTax += tax;

      return {
        ...item,
        unit,
        gstRate,
        total,
        tax
      };
    });

    return {
      items: itemDetails,
      grandTotal,
      cgst: totalTax / 2,
      sgst: totalTax / 2
    };
  }, [invoiceItems, sale]);

  // Print Action
  const handlePrint = () => {
    const printRoot = document.createElement('div');
    printRoot.id = 'print-root';
    printRoot.innerHTML = document.getElementById('printable-invoice-content')?.innerHTML || '';
    document.body.appendChild(printRoot);
    
    window.print();
    document.body.removeChild(printRoot);
  };

  // WhatsApp Share Builder
  const handleWhatsAppShare = () => {
    let itemsText = '';
    invoiceTotals.items.forEach(item => {
      itemsText += `- ${item.product_name}\n  ${item.quantity} ${item.unit} x ₹${item.sale_price.toFixed(2)} = *₹${item.total.toFixed(2)}*\n`;
    });

    const textMsg = `*${shopProfile?.shop_name.toUpperCase() || 'INVOICE BILL'}*
---------------------------------------
*INVOICE BILL / બીલ*
*Invoice No:* ${sale.invoice_number}
*Date:* ${new Date(sale.sale_date).toLocaleDateString('en-IN')}
*Customer:* ${sale.customer_name || 'Walk-in Customer'}
---------------------------------------
*Items / વિગતો:*
${itemsText}---------------------------------------
*GST CGST (9%):* ₹${invoiceTotals.cgst.toFixed(2)}
*GST SGST (9%):* ₹${invoiceTotals.sgst.toFixed(2)}
*GRAND TOTAL:* *₹${invoiceTotals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}*
---------------------------------------
Thank you for your business!
પધારવા બદલ આભાર! 🙏`;

    const encodedMsg = encodeURIComponent(textMsg);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMsg}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden transform transition-all">
        
        {/* Navigation Action bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 no-print">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
            <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <FileText className="w-4 h-4" />
            </span>
            <span>
              {langMode === 'gu' ? 'બીલ ઇન્વોઇસ' : 'Invoice Bill'}
            </span>
          </h3>
          <button 
            onClick={onClose}
            className="p-1 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-655 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PRINT CONTAINER (Grouped multi-item receipt) */}
        <div id="printable-invoice-content" className="p-8 space-y-6 max-h-[70vh] overflow-y-auto print:max-h-none print:overflow-visible">
          
          {/* Invoice Header */}
          <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-200">
            {shopProfile?.logo_url && (
              <img src={shopProfile.logo_url} alt="Logo" className="w-12 h-12 rounded object-cover mx-auto mb-2 border shadow-sm" />
            )}
            <h2 className="text-lg font-black text-slate-800 tracking-tight">
              {shopProfile?.shop_name || 'UMIYA INVENTORY SYSTEM'}
            </h2>
            <p className="text-xs text-slate-500 font-semibold uppercase">
              {shopProfile?.owner_name || 'Wholesale & General Store'}
            </p>
            <p className="text-[10px] text-slate-400">
              {shopProfile?.address || 'Gujarat, India'} {shopProfile?.gst_number ? `• GSTIN: ${shopProfile.gst_number}` : ''}
            </p>
            <p className="text-[10px] text-slate-400">
              Mobile: +91 {shopProfile?.mobile}
            </p>
          </div>

          {/* Invoice Metadata */}
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div>
              <p><span className="font-bold text-slate-400">Invoice No:</span> <span className="font-semibold text-slate-800">{sale.invoice_number}</span></p>
              <p><span className="font-bold text-slate-400">Date/Time:</span> <span className="font-medium text-slate-800">{formattedDate}</span></p>
            </div>
            <div className="text-right">
              <p><span className="font-bold text-slate-400">Customer:</span></p>
              <p className="font-bold text-slate-800">{sale.customer_name || 'Walk-in Customer / છૂટક ગ્રાહક'}</p>
            </div>
          </div>

          {/* Invoice Items Table */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 font-bold text-slate-700 bg-slate-50/50 text-[10px] uppercase">
                <th className="py-2 text-left">Item Details / વિગત</th>
                <th className="py-2 text-center">Qty / જથ્થો</th>
                <th className="py-2 text-right">Rate / દર</th>
                <th className="py-2 text-right">GST %</th>
                <th className="py-2 text-right">Total / રકમ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
              {invoiceTotals.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2.5">
                    <p className="font-bold text-slate-850">{item.product_name}</p>
                  </td>
                  <td className="py-2.5 text-center">{item.quantity} {item.unit}</td>
                  <td className="py-2.5 text-right">₹{item.sale_price.toFixed(2)}</td>
                  <td className="py-2.5 text-right font-bold text-slate-400">{item.gstRate}%</td>
                  <td className="py-2.5 text-right font-bold text-slate-800">₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {/* GST CGST breakout */}
              <tr className="border-t border-slate-200 text-slate-500 text-[11px]">
                <td colSpan={4} className="py-1.5 text-right font-semibold">Central GST (CGST):</td>
                <td className="py-1.5 text-right font-bold">₹{invoiceTotals.cgst.toFixed(2)}</td>
              </tr>
              {/* GST SGST breakout */}
              <tr className="text-slate-500 text-[11px]">
                <td colSpan={4} className="py-1.5 text-right font-semibold">State GST (SGST):</td>
                <td className="py-1.5 text-right font-bold">₹{invoiceTotals.sgst.toFixed(2)}</td>
              </tr>
              {/* Grand Total */}
              <tr className="border-t-2 border-slate-800 font-bold">
                <td colSpan={3} className="py-3 text-xs text-slate-700 uppercase tracking-wide">Grand Total / કુલ રકમ:</td>
                <td colSpan={2} className="py-3 text-right text-base text-emerald-600 font-black">
                  ₹{invoiceTotals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Invoice Footer */}
          <div className="text-center pt-4 border-t border-dashed border-slate-200 text-[9px] text-slate-450 font-medium space-y-0.5">
            <p>Thank you for your business! / પધારવા બદલ આભાર!</p>
            <p>Subject to local jurisdiction. Goods once sold will not be returned.</p>
            <p className="text-[8px] text-slate-300">Powered by Umiya SaaS Software</p>
          </div>
        </div>

        {/* Buttons Action Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-all"
          >
            Close
          </button>
          
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-100"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp / વોટ્સએપ</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-200"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Bill / પ્રિન્ટ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
