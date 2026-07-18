import React, { useMemo } from 'react';
import { X, Printer, Share2, FileText } from 'lucide-react';
import { Sale, db } from '../database/db';
import { LanguageMode } from '../utils/translations';
import { jsPDF } from 'jspdf';

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

  // 4. Calculate Cart Totals & GST breakouts (Exclusive GST)
  const invoiceTotals = useMemo(() => {
    let grandTotal = 0;
    let totalTax = 0;
    
    // We lookup each product dynamically to grab their units and GST rates
    const shopProducts = db.getProducts(sale.shop_id);
    const itemDetails = invoiceItems.map(item => {
      const prod = shopProducts.find(p => p.id === item.product_id);
      const unit = prod?.unit || 'units';
      const gstRate = prod?.gst_rate || 0;
      
      const singleBase = item.sale_price; // Selling price is exclusive of GST
      const baseTotal = item.quantity * singleBase;
      const tax = baseTotal * (gstRate / 100);
      const total = baseTotal + tax;

      grandTotal += total;
      totalTax += tax;

      return {
        ...item,
        unit,
        gstRate,
        total,
        tax,
        singleBase
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
      itemsText += `- ${item.product_name}\n  ${item.quantity} ${item.unit} x ₹${item.singleBase.toFixed(2)} (Ex. GST) + ₹${item.tax.toFixed(2)} (GST ${item.gstRate}%) = *₹${item.total.toFixed(2)}*\n`;
    });

    const customerDetails = `*Customer:* ${sale.customer_name || 'Walk-in Customer'}
${sale.customer_mobile ? `*Mobile:* ${sale.customer_mobile}\n` : ''}${sale.customer_address ? `*Address:* ${sale.customer_address}\n` : ''}`;

    const textMsg = `*${shopProfile?.shop_name.toUpperCase() || 'INVOICE BILL'}*
---------------------------------------
*INVOICE BILL / બીલ*
*Invoice No:* ${sale.invoice_number}
*Date:* ${new Date(sale.sale_date).toLocaleDateString('en-IN')}
${customerDetails}---------------------------------------
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

  // WhatsApp PDF Share Generator
  const handleWhatsAppPDFShare = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Header branding
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(shopProfile?.shop_name.toUpperCase() || 'UMIYA INVENTORY SYSTEM', 105, 20, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(shopProfile?.owner_name || 'Wholesale & General Store', 105, 26, { align: 'center' });
    doc.text(`${shopProfile?.address || 'Gujarat, India'}`, 105, 31, { align: 'center' });
    
    let headerY = 36;
    if (shopProfile?.gst_number) {
      doc.text(`GSTIN: ${shopProfile.gst_number}`, 105, headerY, { align: 'center' });
      headerY += 5;
    }
    if (shopProfile?.fssai_number) {
      doc.text(`FSSAI No: ${shopProfile.fssai_number}`, 105, headerY, { align: 'center' });
      headerY += 5;
    }
    doc.text(`Mobile: +91 ${shopProfile?.mobile}`, 105, headerY, { align: 'center' });
    headerY += 8;

    // Draw line
    doc.line(15, headerY, 195, headerY);
    headerY += 8;

    // Invoice details
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Invoice No: ${sale.invoice_number}`, 15, headerY);
    doc.text(`Customer Details:`, 120, headerY);
    headerY += 5;
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Date/Time: ${formattedDate}`, 15, headerY);
    doc.text(`Name: ${sale.customer_name || 'Walk-in Customer'}`, 120, headerY);
    headerY += 5;
    if (sale.customer_mobile) {
      doc.text(`Mobile: +91 ${sale.customer_mobile}`, 120, headerY);
      headerY += 5;
    }
    if (sale.customer_address) {
      doc.text(`Address: ${sale.customer_address}`, 120, headerY);
      headerY += 5;
    }
    if (sale.payment_mode) {
      doc.text(`Payment Mode: ${sale.payment_mode}`, 15, headerY);
      headerY += 5;
    }
    headerY += 5;

    // Draw line
    doc.line(15, headerY, 195, headerY);
    headerY += 8;

    // Table columns
    doc.setFont('Helvetica', 'bold');
    doc.text('Item Details', 15, headerY);
    doc.text('Qty', 85, headerY, { align: 'center' });
    doc.text('Rate (Ex. GST)', 115, headerY, { align: 'right' });
    doc.text('GST Rate', 145, headerY, { align: 'center' });
    doc.text('Total (Inc. GST)', 195, headerY, { align: 'right' });
    headerY += 3;
    doc.line(15, headerY, 195, headerY);
    headerY += 6;

    // Table rows
    doc.setFont('Helvetica', 'normal');
    invoiceTotals.items.forEach(item => {
      // Clean product name to remove non-ascii characters
      const cleanProdName = item.product_name.replace(/[^\x00-\x7F]/g, '');
      doc.text(cleanProdName || item.product_name, 15, headerY);
      doc.text(`${item.quantity} ${item.unit}`, 85, headerY, { align: 'center' });
      doc.text(`Rs. ${item.singleBase.toFixed(2)}`, 115, headerY, { align: 'right' });
      doc.text(`${item.gstRate}%`, 145, headerY, { align: 'center' });
      doc.text(`Rs. ${item.total.toFixed(2)}`, 195, headerY, { align: 'right' });
      headerY += 6;
    });

    headerY += 2;
    doc.line(15, headerY, 195, headerY);
    headerY += 6;

    // Totals breakout
    doc.text('Central GST (CGST):', 120, headerY);
    doc.text(`Rs. ${invoiceTotals.cgst.toFixed(2)}`, 195, headerY, { align: 'right' });
    headerY += 5;
    
    doc.text('State GST (SGST):', 120, headerY);
    doc.text(`Rs. ${invoiceTotals.sgst.toFixed(2)}`, 195, headerY, { align: 'right' });
    headerY += 7;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Grand Total:', 120, headerY);
    doc.text(`Rs. ${invoiceTotals.grandTotal.toFixed(2)}`, 195, headerY, { align: 'right' });
    headerY += 15;

    // Terms & footer
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Thank you for your business!', 105, headerY, { align: 'center' });
    headerY += 4;
    doc.text('Subject to local jurisdiction. Goods once sold will not be returned.', 105, headerY, { align: 'center' });
    headerY += 4;
    doc.text('Powered by Umiya SaaS Software', 105, headerY, { align: 'center' });

    // Download/Save PDF
    doc.save(`Invoice_${sale.invoice_number}.pdf`);

    // WhatsApp Direct routing
    const messageText = `*${shopProfile?.shop_name.toUpperCase() || 'UMIYA INVENTORY'}*
*INVOICE BILL / બીલ*
*Invoice No:* ${sale.invoice_number}
*Grand Total:* *₹${invoiceTotals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}*

Hello! We have shared your Invoice Bill. Please attach and send the downloaded PDF file on your device. Thank you! 🙏`;
    
    const mobileNo = sale.customer_mobile ? sale.customer_mobile.trim() : '';
    const cleanMobile = mobileNo.startsWith('+') ? mobileNo.replace(/\D/g, '') : `91${mobileNo.replace(/\D/g, '')}`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanMobile}&text=${encodeURIComponent(messageText)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <style>{`
        #printable-invoice-content {
          position: relative;
        }
        #printable-invoice-content::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url('/codivra_logo.png');
          background-repeat: no-repeat;
          background-position: center;
          background-size: 70% auto;
          opacity: 0.04;
          pointer-events: none;
          z-index: 0;
        }
        @media print {
          #printable-invoice-content::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('/codivra_logo.png') !important;
            background-repeat: no-repeat !important;
            background-position: center !important;
            background-size: 70% auto !important;
            opacity: 0.04 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-slate-100 overflow-hidden transform transition-all">
        
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
        <div id="printable-invoice-content" className="p-6 space-y-5 max-h-[70vh] overflow-y-auto print:max-h-none print:overflow-visible relative">
          
          {/* Print-safe Watermark Logo */}
          <img 
            src="/codivra_logo.png" 
            alt="Watermark Logo" 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 opacity-[0.03] pointer-events-none select-none z-0" 
          />

          {/* Invoice Header */}
          <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-200 relative z-10">
            {shopProfile?.logo_url && (
              <img src={shopProfile.logo_url} alt="Logo" className="w-12 h-12 rounded object-cover mx-auto mb-2 border shadow-sm" />
            )}
            <h2 className="text-base font-black text-slate-850 tracking-tight uppercase">
              {shopProfile?.shop_name || 'UMIYA INVENTORY SYSTEM'}
            </h2>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">
              {shopProfile?.owner_name || 'Wholesale & General Store'}
            </p>
            <p className="text-[10px] text-slate-400">
              {shopProfile?.address || 'Gujarat, India'} {shopProfile?.gst_number ? `• GSTIN: ${shopProfile.gst_number}` : ''}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold">
              Mobile: +91 {shopProfile?.mobile} {shopProfile?.fssai_number ? `• FSSAI No: ${shopProfile.fssai_number}` : ''}
            </p>
          </div>

          {/* Invoice Metadata */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-650 leading-relaxed border-b border-slate-100 pb-3 relative z-10">
            <div className="space-y-0.5">
              <p><span className="font-bold text-slate-450">Invoice No:</span> <span className="font-bold text-slate-800">{sale.invoice_number}</span></p>
              <p><span className="font-bold text-slate-450">Date/Time:</span> <span className="font-semibold text-slate-850">{formattedDate}</span></p>
              {sale.payment_mode && (
                <p className="flex items-center gap-1.5 mt-1">
                  <span className="font-bold text-slate-450">Payment:</span>
                  <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-extrabold uppercase leading-none tracking-wider ${
                    sale.payment_mode === 'Udhaar'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {sale.payment_mode === 'Cash' ? 'Cash / રોકડ' : sale.payment_mode === 'UPI' ? 'UPI / ઓનલાઇન' : 'Udhaar / ઉધાર'}
                  </span>
                </p>
              )}
            </div>
            <div className="text-right space-y-0.5">
              <p><span className="font-bold text-slate-450">Customer / ગ્રાહક:</span></p>
              <p className="font-bold text-slate-800">{sale.customer_name || 'Walk-in Customer / છૂટક ગ્રાહક'}</p>
              {sale.customer_mobile && <p className="font-bold text-slate-700">M: +91 {sale.customer_mobile}</p>}
              {sale.customer_address && <p className="text-[10px] text-slate-500 font-medium">{sale.customer_address}</p>}
            </div>
          </div>

          {/* Invoice Items Table */}
          <table className="w-full text-[11px] border-collapse relative z-10">
            <thead>
              <tr className="border-b-2 border-slate-800 font-bold text-slate-700 bg-slate-50/50 text-[9px] uppercase tracking-wide">
                <th className="py-2 text-left">Item Details / વિગત</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Rate (Ex. GST)</th>
                <th className="py-2 text-right">GST Rate & Amt</th>
                <th className="py-2 text-right">Total (Inc. GST)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-750">
              {invoiceTotals.items.map((item, idx) => (
                <tr key={idx} className="align-middle">
                  <td className="py-2.5">
                    <p className="font-bold text-slate-900">{item.product_name}</p>
                  </td>
                  <td className="py-2.5 text-center font-bold text-slate-800">{item.quantity} {item.unit}</td>
                  <td className="py-2.5 text-right text-slate-550">₹{item.singleBase.toFixed(2)}</td>
                  <td className="py-2.5 text-right font-semibold text-slate-650">
                    <div>{item.gstRate}%</div>
                    <div className="text-[9px] text-slate-450 font-normal">₹{item.tax.toFixed(2)}</div>
                  </td>
                  <td className="py-2.5 text-right font-black text-slate-800">₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {/* GST CGST breakout */}
              <tr className="border-t border-slate-200 text-slate-500 text-[10px]">
                <td colSpan={4} className="py-1.5 text-right font-semibold">Central GST (CGST):</td>
                <td className="py-1.5 text-right font-bold text-slate-750">₹{invoiceTotals.cgst.toFixed(2)}</td>
              </tr>
              {/* GST SGST breakout */}
              <tr className="text-slate-500 text-[10px]">
                <td colSpan={4} className="py-1.5 text-right font-semibold">State GST (SGST):</td>
                <td className="py-1.5 text-right font-bold text-slate-750">₹{invoiceTotals.sgst.toFixed(2)}</td>
              </tr>
              {/* Grand Total */}
              <tr className="border-t-2 border-slate-800 font-bold text-slate-800">
                <td colSpan={3} className="py-3 text-xs uppercase tracking-wide">Grand Total / કુલ રકમ:</td>
                <td colSpan={2} className="py-3 text-right text-sm text-emerald-650 font-black">
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
            onClick={handleWhatsAppPDFShare}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-200"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp PDF / વોટ્સએપ PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-250"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Bill / પ્રિન્ટ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
