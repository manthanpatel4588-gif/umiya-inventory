import React from 'react';
import { X, Printer, Share2, FileText } from 'lucide-react';
import { Sale, Product } from '../database/db';
import { LanguageMode } from '../utils/translations';

interface InvoiceModalProps {
  sale: Sale | null;
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  langMode: LanguageMode;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  sale,
  product,
  isOpen,
  onClose,
  langMode
}) => {
  if (!isOpen || !sale) return null;

  // Invoice Date formatting
  const formattedDate = new Date(sale.sale_date).toLocaleDateString(
    langMode === 'gu' ? 'gu-IN' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  );

  const itemTotal = sale.quantity * sale.sale_price;

  // Print Action
  const handlePrint = () => {
    // We create a temporary element or use the media query print setup
    // For React SPA, the easiest way to print a specific component is to copy it to a print div, 
    // trigger print, and clean up. 
    // In index.css, we configured '#print-root' to be visible, while body > * is hidden.
    const printRoot = document.createElement('div');
    printRoot.id = 'print-root';
    printRoot.innerHTML = document.getElementById('printable-invoice-content')?.innerHTML || '';
    document.body.appendChild(printRoot);
    
    window.print();
    
    document.body.removeChild(printRoot);
  };

  // WhatsApp Share Builder
  const handleWhatsAppShare = () => {
    const textMsg = `*UMIYA INVENTORY MANAGEMENT SYSTEM*
---------------------------------------
*INVOICE BILL / બિલ*
*Invoice No:* ${sale.invoice_number}
*Date:* ${new Date(sale.sale_date).toLocaleDateString('en-IN')}
*Customer:* ${sale.customer_name || 'Walk-in Customer'}
---------------------------------------
*Items / વિગતો:*
- ${sale.product_name}
  ${sale.quantity} ${product?.unit || 'units'} x ₹${sale.sale_price.toFixed(2)} = *₹${itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}*
---------------------------------------
*GRAND TOTAL:* *₹${itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}*
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
            className="p-1 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PRINT CONTAINER (Hidden in web, displayed when print triggers) */}
        <div id="printable-invoice-content" className="p-8 space-y-6">
          
          {/* Invoice Header */}
          <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-200">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              UMIYA INVENTORY MANAGEMENT SYSTEM
            </h2>
            <p className="text-xs text-slate-500 font-semibold uppercase">
              Pan Masala, Mukhwas & General FMCG Wholesale Shop
            </p>
            <p className="text-[10px] text-slate-400">
              APMC Market, Gujarat, India • GSTIN: 24UMIYA1234F1Z1
            </p>
            <p className="text-[10px] text-slate-400">
              Mobile: +91 98765 43210
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

          {/* Invoice Table */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 font-bold text-slate-700 bg-slate-50/50">
                <th className="py-2 text-left">Item Details / વિગત</th>
                <th className="py-2 text-center">Qty / જથ્થો</th>
                <th className="py-2 text-right">Rate / દર</th>
                <th className="py-2 text-right">Total / રકમ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
              <tr>
                <td className="py-3">
                  <p className="font-bold text-slate-800">{sale.product_name}</p>
                  <p className="text-[10px] text-slate-400 font-normal">{product?.category || ''} • {product?.brand || ''}</p>
                </td>
                <td className="py-3 text-center">{sale.quantity} {product?.unit || 'units'}</td>
                <td className="py-3 text-right">₹{sale.sale_price.toFixed(2)}</td>
                <td className="py-3 text-right font-bold text-slate-800">₹{itemTotal.toFixed(2)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-800 font-bold">
                <td colSpan={2} className="py-3 text-sm text-slate-700 uppercase tracking-wide">Grand Total / કુલ રકમ:</td>
                <td colSpan={2} className="py-3 text-right text-lg text-emerald-600 font-black">
                  ₹{itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Invoice Footer */}
          <div className="text-center pt-6 border-t border-dashed border-slate-200 text-[10px] text-slate-400 font-medium space-y-1">
            <p>Thank you for your business! / પધારવા બદલ આભાર!</p>
            <p>Subject to local jurisdiction. Goods once sold will not be returned.</p>
            <p className="text-[8px] text-slate-300">Powered by Umiya Wholesale Software</p>
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
