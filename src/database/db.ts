// Database interfaces & LocalStorage Management for Umiya Inventory Management System

export interface Product {
  id: string;
  product_name: string;
  product_name_gu: string;
  category: string;
  brand: string;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  unit: 'Packet' | 'Box' | 'Bundle' | 'Piece';
  minimum_stock: number;
  barcode?: string;
}

export interface Supplier {
  id: string;
  supplier_name: string;
  mobile: string;
  address: string;
  gst_number: string;
  outstanding_payment: number;
}

export interface Purchase {
  id: string;
  purchase_date: string; // ISO date string
  supplier_name: string;
  product_id: string;
  product_name: string; // snapshot for easy display
  quantity: number;
  purchase_price: number;
  total_amount: number;
}

export interface Sale {
  id: string;
  sale_date: string; // ISO date string
  product_id: string;
  product_name: string; // snapshot
  quantity: number;
  sale_price: number;
  profit: number;
  customer_name?: string;
  invoice_number: string;
}

// Key names for local storage
const KEYS = {
  PRODUCTS: 'umiya_products',
  SUPPLIERS: 'umiya_suppliers',
  PURCHASES: 'umiya_purchases',
  SALES: 'umiya_sales',
  SUPABASE_CONFIG: 'umiya_supabase_config'
};

// Initial Seed Data
const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    supplier_name: 'Mahalaxmi Agency (મહાલક્ષ્મી એજન્સી)',
    mobile: '9876543210',
    address: 'APMC Market, Unjha, Gujarat',
    gst_number: '24AAAAM1234A1Z1',
    outstanding_payment: 25000
  },
  {
    id: 'sup-2',
    supplier_name: 'Vardhman Distributors (વર્ધમાન ડિસ્ટ્રીબ્યુટર્સ)',
    mobile: '9428512345',
    address: 'Ring Road, Surat, Gujarat',
    gst_number: '24BBBBM5678B2Z2',
    outstanding_payment: 0
  },
  {
    id: 'sup-3',
    supplier_name: 'Shreeji FMCG Supplier (શ્રીજી એફએમસીજી સપ્લાયર)',
    mobile: '9909988776',
    address: 'Kalupur, Ahmedabad, Gujarat',
    gst_number: '24CCCCM9012C3Z3',
    outstanding_payment: 12500
  }
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    product_name: 'Vimal Shaheed Pan Masala',
    product_name_gu: 'વિમલ પાન મસાલા',
    category: 'Pan Masala',
    brand: 'Vimal',
    purchase_price: 120,
    selling_price: 140,
    stock_quantity: 180,
    unit: 'Box',
    minimum_stock: 30,
    barcode: '8901234567890'
  },
  {
    id: 'prod-2',
    product_name: 'Rajnigandha Pan Masala',
    product_name_gu: 'રજનીગંધા પાન મસાલા',
    category: 'Pan Masala',
    brand: 'Dharampal Satyapal',
    purchase_price: 350,
    selling_price: 390,
    stock_quantity: 45,
    unit: 'Box',
    minimum_stock: 15,
    barcode: '8901234567891'
  },
  {
    id: 'prod-3',
    product_name: 'Tulsi Mix Mukhwas',
    product_name_gu: 'તુલસી મિક્સ મુખવાસ',
    category: 'Mukhwas',
    brand: 'Tulsi',
    purchase_price: 45,
    selling_price: 60,
    stock_quantity: 15, // Low stock!
    unit: 'Packet',
    minimum_stock: 30,
    barcode: '8901234567892'
  },
  {
    id: 'prod-4',
    product_name: 'Cadbury Dairy Milk Silk',
    product_name_gu: 'ડેરી મિલ્ક સિલ્ક',
    category: 'Chocolate',
    brand: 'Cadbury',
    purchase_price: 70,
    selling_price: 80,
    stock_quantity: 9, // Low stock!
    unit: 'Piece',
    minimum_stock: 15,
    barcode: '8901234567893'
  },
  {
    id: 'prod-5',
    product_name: 'Classic Gold Flake Cigarette',
    product_name_gu: 'ક્લાસિક ગોલ્ડ ફ્લેક સિગારેટ',
    category: 'Cigarettes',
    brand: 'ITC',
    purchase_price: 320,
    selling_price: 360,
    stock_quantity: 85,
    unit: 'Bundle',
    minimum_stock: 20,
    barcode: '8901234567894'
  },
  {
    id: 'prod-6',
    product_name: 'Parle-G Gold Biscuits',
    product_name_gu: 'પાર્લે-જી ગોલ્ડ બિસ્કીટ',
    category: 'General FMCG',
    brand: 'Parle',
    purchase_price: 90,
    selling_price: 100,
    stock_quantity: 220,
    unit: 'Box',
    minimum_stock: 50,
    barcode: '8901234567895'
  },
  {
    id: 'prod-7',
    product_name: 'Jeera Goli Premium Mukhwas',
    product_name_gu: 'જીરા ગોળી મુખવાસ',
    category: 'Mukhwas',
    brand: 'Local',
    purchase_price: 25,
    selling_price: 35,
    stock_quantity: 150,
    unit: 'Packet',
    minimum_stock: 20,
    barcode: '8901234567896'
  }
];

// Seed purchases and sales for the past few days to make analytics charts look real
const getSeedPurchases = (): Purchase[] => {
  const dates = getPastDates(7);
  return [
    {
      id: 'pur-1',
      purchase_date: `${dates[5]}T10:30:00Z`,
      supplier_name: 'Mahalaxmi Agency (મહાલક્ષ્મી એજન્સી)',
      product_id: 'prod-1',
      product_name: 'Vimal Shaheed Pan Masala',
      quantity: 100,
      purchase_price: 120,
      total_amount: 12000
    },
    {
      id: 'pur-2',
      purchase_date: `${dates[3]}T11:15:00Z`,
      supplier_name: 'Vardhman Distributors (વર્ધમાન ડિસ્ટ્રીબ્યુટર્સ)',
      product_id: 'prod-5',
      product_name: 'Classic Gold Flake Cigarette',
      quantity: 50,
      purchase_price: 320,
      total_amount: 16000
    },
    {
      id: 'pur-3',
      purchase_date: `${dates[1]}T15:45:00Z`,
      supplier_name: 'Shreeji FMCG Supplier (શ્રીજી એફએમસીજી સપ્લાયર)',
      product_id: 'prod-6',
      product_name: 'Parle-G Gold Biscuits',
      quantity: 150,
      purchase_price: 90,
      total_amount: 13500
    }
  ];
};

const getSeedSales = (): Sale[] => {
  const dates = getPastDates(7);
  return [
    {
      id: 'sale-1',
      sale_date: `${dates[6]}T11:20:00Z`,
      product_id: 'prod-1',
      product_name: 'Vimal Shaheed Pan Masala',
      quantity: 20,
      sale_price: 140,
      profit: (140 - 120) * 20, // 400
      customer_name: 'Ramesh Patel',
      invoice_number: 'INV-2026-0001'
    },
    {
      id: 'sale-2',
      sale_date: `${dates[5]}T14:40:00Z`,
      product_id: 'prod-2',
      product_name: 'Rajnigandha Pan Masala',
      quantity: 10,
      sale_price: 390,
      profit: (390 - 350) * 10, // 400
      customer_name: 'Hitesh Kirana Store',
      invoice_number: 'INV-2026-0002'
    },
    {
      id: 'sale-3',
      sale_date: `${dates[4]}T10:15:00Z`,
      product_id: 'prod-6',
      product_name: 'Parle-G Gold Biscuits',
      quantity: 50,
      sale_price: 100,
      profit: (100 - 90) * 50, // 500
      customer_name: 'Krishna Provision Store',
      invoice_number: 'INV-2026-0003'
    },
    {
      id: 'sale-4',
      sale_date: `${dates[3]}T16:30:00Z`,
      product_id: 'prod-5',
      product_name: 'Classic Gold Flake Cigarette',
      quantity: 15,
      sale_price: 360,
      profit: (360 - 320) * 15, // 600
      customer_name: 'Jay Ambe Pan House',
      invoice_number: 'INV-2026-0004'
    },
    {
      id: 'sale-5',
      sale_date: `${dates[2]}T09:10:00Z`,
      product_id: 'prod-3',
      product_name: 'Tulsi Mix Mukhwas',
      quantity: 40,
      sale_price: 60,
      profit: (60 - 45) * 40, // 600
      customer_name: 'Ketan Pan Corner',
      invoice_number: 'INV-2026-0005'
    },
    {
      id: 'sale-6',
      sale_date: `${dates[1]}T17:00:00Z`,
      product_id: 'prod-1',
      product_name: 'Vimal Shaheed Pan Masala',
      quantity: 35,
      sale_price: 140,
      profit: (140 - 120) * 35, // 700
      customer_name: 'Shreeji Pan & Mukhwas',
      invoice_number: 'INV-2026-0006'
    },
    {
      id: 'sale-7',
      sale_date: `${dates[0]}T12:00:00Z`, // Today
      product_id: 'prod-2',
      product_name: 'Rajnigandha Pan Masala',
      quantity: 5,
      sale_price: 390,
      profit: (390 - 350) * 5, // 200
      customer_name: 'Dilip General Store',
      invoice_number: 'INV-2026-0007'
    },
    {
      id: 'sale-8',
      sale_date: `${dates[0]}T14:30:00Z`, // Today
      product_id: 'prod-7',
      product_name: 'Jeera Goli Premium Mukhwas',
      quantity: 30,
      sale_price: 35,
      profit: (35 - 25) * 30, // 300
      customer_name: 'Gaurav Traders',
      invoice_number: 'INV-2026-0008'
    }
  ];
};

function getPastDates(days: number): string[] {
  const list = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Format YYYY-MM-DD
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    list.push(`${yyyy}-${mm}-${dd}`);
  }
  return list;
}

// Database Init function
export const initializeDB = () => {
  if (!localStorage.getItem(KEYS.PRODUCTS)) {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
  }
  if (!localStorage.getItem(KEYS.SUPPLIERS)) {
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(DEFAULT_SUPPLIERS));
  }
  if (!localStorage.getItem(KEYS.PURCHASES)) {
    localStorage.setItem(KEYS.PURCHASES, JSON.stringify(getSeedPurchases()));
  }
  if (!localStorage.getItem(KEYS.SALES)) {
    localStorage.setItem(KEYS.SALES, JSON.stringify(getSeedSales()));
  }
};

// Database Getter and Setter wrappers
export const db = {
  getProducts: (): Product[] => {
    initializeDB();
    return JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
  },
  
  saveProduct: (product: Product): Product[] => {
    const products = db.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index > -1) {
      products[index] = product;
    } else {
      products.push(product);
    }
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    return products;
  },

  deleteProduct: (id: string): Product[] => {
    const products = db.getProducts().filter(p => p.id !== id);
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    return products;
  },

  getSuppliers: (): Supplier[] => {
    initializeDB();
    return JSON.parse(localStorage.getItem(KEYS.SUPPLIERS) || '[]');
  },

  saveSupplier: (supplier: Supplier): Supplier[] => {
    const suppliers = db.getSuppliers();
    const index = suppliers.findIndex(s => s.id === supplier.id);
    if (index > -1) {
      suppliers[index] = supplier;
    } else {
      suppliers.push(supplier);
    }
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
    return suppliers;
  },

  deleteSupplier: (id: string): Supplier[] => {
    const suppliers = db.getSuppliers().filter(s => s.id !== id);
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
    return suppliers;
  },

  getPurchases: (): Purchase[] => {
    initializeDB();
    return JSON.parse(localStorage.getItem(KEYS.PURCHASES) || '[]');
  },

  addPurchase: (purchase: Omit<Purchase, 'id'>): Purchase => {
    const purchases = db.getPurchases();
    const newPurchase: Purchase = {
      ...purchase,
      id: `pur-${Date.now()}`
    };
    purchases.unshift(newPurchase); // newest first
    localStorage.setItem(KEYS.PURCHASES, JSON.stringify(purchases));

    // Update Product Stock
    const products = db.getProducts();
    const product = products.find(p => p.id === purchase.product_id);
    if (product) {
      product.stock_quantity += purchase.quantity;
      db.saveProduct(product);
    }
    
    return newPurchase;
  },

  getSales: (): Sale[] => {
    initializeDB();
    return JSON.parse(localStorage.getItem(KEYS.SALES) || '[]');
  },

  addSale: (sale: Omit<Sale, 'id' | 'profit' | 'invoice_number'>): Sale => {
    const sales = db.getSales();
    const products = db.getProducts();
    const product = products.find(p => p.id === sale.product_id);
    
    if (!product) {
      throw new Error("Product not found");
    }

    if (product.stock_quantity < sale.quantity) {
      throw new Error(`Insufficient stock. Available: ${product.stock_quantity}`);
    }

    // Profit = (selling_price - purchase_price) * quantity
    const unitProfit = sale.sale_price - product.purchase_price;
    const totalProfit = unitProfit * sale.quantity;

    // Generate Invoice Number
    const invCount = sales.length + 1;
    const invNumber = `INV-${new Date().getFullYear()}-${String(invCount).padStart(4, '0')}`;

    const newSale: Sale = {
      ...sale,
      id: `sale-${Date.now()}`,
      profit: totalProfit,
      invoice_number: invNumber
    };

    sales.unshift(newSale); // newest first
    localStorage.setItem(KEYS.SALES, JSON.stringify(sales));

    // Deduct Product Stock
    product.stock_quantity -= sale.quantity;
    db.saveProduct(product);

    return newSale;
  },

  // Configuration for real Supabase keys (allows entering them in Settings UI)
  getSupabaseConfig: () => {
    const config = localStorage.getItem(KEYS.SUPABASE_CONFIG);
    return config ? JSON.parse(config) : { url: '', key: '' };
  },

  saveSupabaseConfig: (url: string, key: string) => {
    localStorage.setItem(KEYS.SUPABASE_CONFIG, JSON.stringify({ url, key }));
  }
};
