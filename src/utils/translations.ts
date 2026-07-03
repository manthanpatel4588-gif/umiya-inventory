// Language translation helper for Umiya Inventory Management System

export type LanguageMode = 'en' | 'gu' | 'dual';

export interface TranslationItem {
  en: string;
  gu: string;
}

export const translations: Record<string, TranslationItem> = {
  // Navigation
  dashboard: { en: 'Dashboard', gu: 'ડેશબોર્ડ' },
  products: { en: 'Product Management', gu: 'ઉત્પાદન સંચાલન' },
  purchases: { en: 'Purchase Entry', gu: 'ખરીદી નોંધણી' },
  sales: { en: 'Sales Entry', gu: 'વેચાણ નોંધણી' },
  suppliers: { en: 'Supplier Management', gu: 'વિક્રેતા વ્યવસ્થાપન' },
  reports: { en: 'Reports & Analytics', gu: 'અહેવાલો અને વિશ્લેષણ' },
  settings: { en: 'Database Settings', gu: 'ડેટાબેઝ સેટિંગ્સ' },
  
  // Dashboard metrics
  totalProducts: { en: 'Total Products', gu: 'કુલ ઉત્પાદનો' },
  totalStockQuantity: { en: 'Total Stock Quantity', gu: 'કુલ સ્ટોક જથ્થો' },
  totalStockValue: { en: 'Total Stock Value', gu: 'કુલ સ્ટોક કિંમત' },
  todaySales: { en: "Today's Sales", gu: "આજનું વેચાણ" },
  todayProfit: { en: "Today's Profit", gu: "આજનો નફો" },
  monthlySales: { en: 'Monthly Sales', gu: 'માસિક વેચાણ' },
  monthlyProfit: { en: 'Monthly Profit', gu: 'માસિક નફો' },
  lowStockAlert: { en: 'Low Stock Alerts', gu: 'ઓછા સ્ટોકની ચેતવણી' },
  topSellingProducts: { en: 'Top Selling Products', gu: 'સૌથી વધુ વેચાતા ઉત્પાદનો' },
  recentTransactions: { en: 'Recent Transactions', gu: 'તાજેતરના વ્યવહારો' },
  
  // Product Fields
  productName: { en: 'Product Name', gu: 'ઉત્પાદનનું નામ' },
  category: { en: 'Category', gu: 'કેટેગરી' },
  brand: { en: 'Brand', gu: 'બ્રાન્ડ' },
  purchasePrice: { en: 'Purchase Price', gu: 'ખરીદી કિંમત' },
  sellingPrice: { en: 'Selling Price', gu: 'વેચાણ કિંમત' },
  currentStock: { en: 'Current Stock', gu: 'ચાલુ સ્ટોક' },
  unitType: { en: 'Unit Type', gu: 'એકમ પ્રકાર' },
  minimumStock: { en: 'Min Stock Level', gu: 'ન્યૂનતમ સ્ટોક લેવલ' },
  barcode: { en: 'Barcode (EAN)', gu: 'બારકોડ' },
  actions: { en: 'Actions', gu: 'ક્રિયાઓ' },
  
  // Units
  packet: { en: 'Packet', gu: 'પેકેટ' },
  box: { en: 'Box', gu: 'બોક્સ' },
  bundle: { en: 'Bundle', gu: 'બંડલ' },
  piece: { en: 'Piece', gu: 'નંગ' },

  // Forms / Buttons
  addProduct: { en: 'Add Product', gu: 'નવું ઉત્પાદન ઉમેરો' },
  editProduct: { en: 'Edit Product', gu: 'ઉત્પાદન સુધારો' },
  delete: { en: 'Delete', gu: 'કાઢી નાખો' },
  save: { en: 'Save', gu: 'સાચવો' },
  cancel: { en: 'Cancel', gu: 'રદ કરો' },
  search: { en: 'Search products...', gu: 'ઉત્પાદન શોધો...' },
  filterCategory: { en: 'Filter by Category', gu: 'કેટેગરી મુજબ ફિલ્ટર' },
  allCategories: { en: 'All Categories', gu: 'બધી કેટેગરીઓ' },
  exportExcel: { en: 'Export CSV (Excel)', gu: 'CSV (એક્સેલ) એક્સપોર્ટ' },
  
  // Purchases
  purchaseDate: { en: 'Purchase Date', gu: 'ખરીદી તારીખ' },
  supplierName: { en: 'Supplier Name', gu: 'વિક્રેતાનું નામ' },
  quantity: { en: 'Quantity', gu: 'જથ્થો' },
  purchaseRate: { en: 'Purchase Rate', gu: 'ખરીદી દર' },
  totalAmount: { en: 'Total Amount', gu: 'કુલ રકમ' },
  recordPurchase: { en: 'Record Purchase', gu: 'ખરીદી નોંધો' },
  purchaseHistory: { en: 'Purchase History', gu: 'ખરીદી ઇતિહાસ' },
  
  // Sales
  saleDate: { en: 'Sale Date', gu: 'વેચાણ તારીખ' },
  quantitySold: { en: 'Quantity Sold', gu: 'વેચેલ જથ્થો' },
  customerName: { en: 'Customer Name', gu: 'ગ્રાહકનું નામ' },
  recordSale: { en: 'Create Bill & Record Sale', gu: 'બીલ બનાવો અને વેચાણ નોંધો' },
  salesHistory: { en: 'Sales History', gu: 'વેચાણ ઇતિહાસ' },
  profit: { en: 'Net Profit', gu: 'ચોખ્ખો નફો' },
  
  // Invoices
  invoiceNumber: { en: 'Invoice Number', gu: 'બીલ નંબર' },
  generateInvoice: { en: 'Generate Invoice', gu: 'ઇન્વોઇસ બનાવો' },
  printInvoice: { en: 'Print Invoice / Bill', gu: 'બીલ પ્રિન્ટ કરો' },
  downloadPDF: { en: 'Download PDF', gu: 'PDF ડાઉનલોડ' },
  shareWhatsApp: { en: 'Share on WhatsApp', gu: 'વોટ્સએપ પર શેર કરો' },
  
  // Suppliers
  mobile: { en: 'Mobile Number', gu: 'મોબાઇલ નંબર' },
  address: { en: 'Address', gu: 'સરનામું' },
  gstNumber: { en: 'GST Number', gu: 'GST નંબર' },
  outstandingPayment: { en: 'Outstanding Payment', gu: 'બાકી ચૂકવણી' },
  addSupplier: { en: 'Add Supplier', gu: 'નવા સપ્લાયર ઉમેરો' },
  
  // Alerts / Reports
  outOfStock: { en: 'Out of Stock!', gu: 'સ્ટોક ખાલી છે!' },
  lowStock: { en: 'Low Stock!', gu: 'સ્ટોક ઓછો છે!' },
  fastSelling: { en: 'Fast Selling Product', gu: 'ઝડપથી વેચાતું ઉત્પાદન' },
  dailyReport: { en: 'Daily Sales Report', gu: 'દૈનિક વેચાણ અહેવાલ' },
  monthlyReport: { en: 'Monthly Sales Report', gu: 'માસિક વેચાણ અહેવાલ' },
  purchaseReport: { en: 'Purchase Report', gu: 'ખરીદી અહેવાલ' },
  profitReport: { en: 'Profitability Report', gu: 'નફાકારકતા અહેવાલ' },
  stockReport: { en: 'Stock Inventory Report', gu: 'સ્ટોક ઇન્વેન્ટરી અહેવાલ' },
  categoryReport: { en: 'Category Distribution Report', gu: 'કેટેગરી વિતરણ અહેવાલ' },
  print: { en: 'Print Report', gu: 'પ્રિન્ટ રીપોર્ટ' },
  selectDateRange: { en: 'Select Date Range', gu: 'તારીખ પસંદ કરો' },
  
  // Settings UI
  supabaseUrl: { en: 'Supabase URL', gu: 'સુપબેઝ URL' },
  supabaseKey: { en: 'Supabase Anon Key', gu: 'સુપબેઝ Anon કી' },
  saveSettings: { en: 'Save Configuration', gu: 'રૂપરેખાંકન સાચવો' }
};

/**
 * Translation helper function
 */
export const t = (key: string, mode: LanguageMode): string => {
  const item = translations[key];
  if (!item) return key;
  
  if (mode === 'en') return item.en;
  if (mode === 'gu') return item.gu;
  return `${item.en} / ${item.gu}`; // Bilingual mode
};
