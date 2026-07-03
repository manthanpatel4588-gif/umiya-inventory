// Multi-Tenant Database & LocalStorage Management for Umiya SaaS
import { isSupabaseConfigured } from './supabase';

export interface User {
  id: string; // matches shop_id
  email: string;
  password_hash: string;
  shop_name: string;
  owner_name: string;
  mobile: string;
  address: string;
  role: 'SuperAdmin' | 'ShopOwner';
  plan_type: 'Trial' | 'Monthly' | 'Quarterly' | 'Yearly';
  plan_start: string;
  plan_expiry: string;
  status: 'Active' | 'Inactive' | 'Blocked';
  gst_number?: string;
  logo_url?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user_email: string;
  action: string;
  shop_id?: string;
}

export interface Product {
  id: string;
  shop_id: string; // Tenant isolation key
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
  shop_id: string; // Tenant isolation key
  supplier_name: string;
  mobile: string;
  address: string;
  gst_number: string;
  outstanding_payment: number;
}

export interface Purchase {
  id: string;
  shop_id: string; // Tenant isolation key
  purchase_date: string;
  supplier_name: string;
  product_id: string;
  product_name: string;
  quantity: number;
  purchase_price: number;
  total_amount: number;
}

export interface Sale {
  id: string;
  shop_id: string; // Tenant isolation key
  sale_date: string;
  product_id: string;
  product_name: string;
  quantity: number;
  sale_price: number;
  profit: number;
  customer_name?: string;
  invoice_number: string;
}

// LocalStorage Keys
const KEYS = {
  USERS: 'umiya_saas_users',
  AUDIT_LOGS: 'umiya_saas_audit_logs',
  PRODUCTS: 'umiya_products',
  SUPPLIERS: 'umiya_suppliers',
  PURCHASES: 'umiya_purchases',
  SALES: 'umiya_sales',
  SUPABASE_CONFIG: 'umiya_supabase_config'
};

// Seed Users List
const SEED_USERS: User[] = [
  {
    id: 'admin',
    email: 'admin@umiya.com',
    password_hash: 'adminpassword', // In production, use standard crypto-pbkdf2 or Auth helper
    shop_name: 'Umiya Super Admin Panel',
    owner_name: 'Super Admin',
    mobile: '9999999999',
    address: 'Umiya Wholesale SaaS HQ, Gujarat',
    role: 'SuperAdmin',
    plan_type: 'Yearly',
    plan_start: new Date().toISOString(),
    plan_expiry: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    status: 'Active'
  },
  {
    id: 'shop-1',
    email: 'owner@umiya.com',
    password_hash: 'ownerpassword',
    shop_name: 'Umiya Wholesale Shop',
    owner_name: 'Manthan Patel',
    mobile: '9876543210',
    address: 'APMC Market, Unjha, Gujarat',
    role: 'ShopOwner',
    plan_type: 'Monthly',
    plan_start: new Date().toISOString(),
    plan_expiry: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(), // 1 year active
    status: 'Active',
    gst_number: '24UMIYA1234F1Z1'
  },
  {
    id: 'shop-2',
    email: 'expired@umiya.com',
    password_hash: 'expiredpassword',
    shop_name: 'Expired Trial Mukhwas',
    owner_name: 'Ketan Shah',
    mobile: '9001002003',
    address: 'Kalupur Market, Ahmedabad',
    role: 'ShopOwner',
    plan_type: 'Trial',
    plan_start: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(), // started 10 days ago
    plan_expiry: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), // expired 3 days ago
    status: 'Active',
    gst_number: '24EXPIRED5678X9X'
  },
  {
    id: 'shop-3',
    email: 'blocked@umiya.com',
    password_hash: 'blockedpassword',
    shop_name: 'Blocked Pan Masala Agency',
    owner_name: 'Hitesh Thakkar',
    mobile: '9428500000',
    address: 'Ring Road, Surat',
    role: 'ShopOwner',
    plan_type: 'Yearly',
    plan_start: new Date().toISOString(),
    plan_expiry: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    status: 'Blocked',
    gst_number: '24BLOCKED0000C1Z1'
  }
];

// Seed initial products tagged with 'shop-1' (the active test owner)
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    shop_id: 'shop-1',
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
    shop_id: 'shop-1',
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
    shop_id: 'shop-1',
    product_name: 'Tulsi Mix Mukhwas',
    product_name_gu: 'તુલસી મિક્સ મુખવાસ',
    category: 'Mukhwas',
    brand: 'Tulsi',
    purchase_price: 45,
    selling_price: 60,
    stock_quantity: 15,
    unit: 'Packet',
    minimum_stock: 30,
    barcode: '8901234567892'
  },
  {
    id: 'prod-4',
    shop_id: 'shop-1',
    product_name: 'Cadbury Dairy Milk Silk',
    product_name_gu: 'ડેરી મિલ્ક સિલ્ક',
    category: 'Chocolate',
    brand: 'Cadbury',
    purchase_price: 70,
    selling_price: 80,
    stock_quantity: 9,
    unit: 'Piece',
    minimum_stock: 15,
    barcode: '8901234567893'
  },
  {
    id: 'prod-5',
    shop_id: 'shop-1',
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
  }
];

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    shop_id: 'shop-1',
    supplier_name: 'Mahalaxmi Agency (મહાલક્ષ્મી એજન્સી)',
    mobile: '9876543210',
    address: 'APMC Market, Unjha, Gujarat',
    gst_number: '24AAAAM1234A1Z1',
    outstanding_payment: 25000
  },
  {
    id: 'sup-2',
    shop_id: 'shop-1',
    supplier_name: 'Vardhman Distributors (વર્ધમાન ડિસ્ટ્રીબ્યુટર્સ)',
    mobile: '9428512345',
    address: 'Ring Road, Surat, Gujarat',
    gst_number: '24BBBBM5678B2Z2',
    outstanding_payment: 0
  }
];

const getPastDates = (days: number): string[] => {
  const list = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    list.push(`${yyyy}-${mm}-${dd}`);
  }
  return list;
};

const getSeedPurchases = (): Purchase[] => {
  const dates = getPastDates(5);
  return [
    {
      id: 'pur-1',
      shop_id: 'shop-1',
      purchase_date: `${dates[3]}T10:30:00Z`,
      supplier_name: 'Mahalaxmi Agency (મહાલક્ષ્મી એજન્સી)',
      product_id: 'prod-1',
      product_name: 'Vimal Shaheed Pan Masala',
      quantity: 100,
      purchase_price: 120,
      total_amount: 12000
    }
  ];
};

const getSeedSales = (): Sale[] => {
  const dates = getPastDates(5);
  return [
    {
      id: 'sale-1',
      shop_id: 'shop-1',
      sale_date: `${dates[2]}T11:20:00Z`,
      product_id: 'prod-1',
      product_name: 'Vimal Shaheed Pan Masala',
      quantity: 20,
      sale_price: 140,
      profit: 400,
      customer_name: 'Ramesh Patel',
      invoice_number: 'INV-2026-0001'
    },
    {
      id: 'sale-2',
      shop_id: 'shop-1',
      sale_date: `${dates[0]}T12:00:00Z`, // Today
      product_id: 'prod-2',
      product_name: 'Rajnigandha Pan Masala',
      quantity: 5,
      sale_price: 390,
      profit: 200,
      customer_name: 'Dilip General Store',
      invoice_number: 'INV-2026-0002'
    }
  ];
};

// Database Init
export const initializeDB = () => {
  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(SEED_USERS));
  }
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
  if (!localStorage.getItem(KEYS.AUDIT_LOGS)) {
    // Seed initial login audit log
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify([
      {
        id: 'log-1',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        user_email: 'owner@umiya.com',
        action: 'System Seed Initialized',
        shop_id: 'shop-1'
      }
    ]));
  }
};

// Unified DB API
export const db = {
  // USER / PLAN MANAGEMENT (SaaS Super Admin)
  getUsers: (): User[] => {
    initializeDB();
    return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
  },

  saveUser: (user: User): User[] => {
    const users = db.getUsers();
    const index = users.findIndex(u => u.id === user.id || u.email === user.email);
    if (index > -1) {
      users[index] = { ...users[index], ...user };
    } else {
      users.push(user);
    }
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    return users;
  },

  deleteUser: (id: string): User[] => {
    const users = db.getUsers().filter(u => u.id !== id);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    return users;
  },

  // AUDIT LOG MANAGEMENT
  getAuditLogs: (): AuditLog[] => {
    initializeDB();
    return JSON.parse(localStorage.getItem(KEYS.AUDIT_LOGS) || '[]');
  },

  addAuditLog: (email: string, action: string, shop_id?: string) => {
    const logs = db.getAuditLogs();
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user_email: email,
      action,
      shop_id
    };
    logs.unshift(newLog); // Newest first
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(logs));
  },

  // PRODUCTS (Filtered by tenant)
  getProducts: (shop_id: string): Product[] => {
    initializeDB();
    const allProducts: Product[] = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
    return allProducts.filter(p => p.shop_id === shop_id);
  },

  saveProduct: (product: Product, shop_id: string): Product[] => {
    initializeDB();
    const allProducts: Product[] = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
    const index = allProducts.findIndex(p => p.id === product.id && p.shop_id === shop_id);
    
    const productPayload = { ...product, shop_id };
    if (index > -1) {
      allProducts[index] = productPayload;
      db.addAuditLog(product.shop_id, `Product Edited: ${product.product_name}`, shop_id);
    } else {
      allProducts.push(productPayload);
      db.addAuditLog(product.shop_id, `Product Added: ${product.product_name}`, shop_id);
    }
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(allProducts));
    return allProducts.filter(p => p.shop_id === shop_id);
  },

  deleteProduct: (id: string, shop_id: string): Product[] => {
    initializeDB();
    const allProducts: Product[] = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
    const target = allProducts.find(p => p.id === id && p.shop_id === shop_id);
    if (target) {
      db.addAuditLog(shop_id, `Product Deleted: ${target.product_name}`, shop_id);
    }
    const filtered = allProducts.filter(p => !(p.id === id && p.shop_id === shop_id));
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(filtered));
    return filtered.filter(p => p.shop_id === shop_id);
  },

  // SUPPLIERS (Filtered by tenant)
  getSuppliers: (shop_id: string): Supplier[] => {
    initializeDB();
    const allSuppliers: Supplier[] = JSON.parse(localStorage.getItem(KEYS.SUPPLIERS) || '[]');
    return allSuppliers.filter(s => s.shop_id === shop_id);
  },

  saveSupplier: (supplier: Supplier, shop_id: string): Supplier[] => {
    initializeDB();
    const allSuppliers: Supplier[] = JSON.parse(localStorage.getItem(KEYS.SUPPLIERS) || '[]');
    const index = allSuppliers.findIndex(s => s.id === supplier.id && s.shop_id === shop_id);
    
    const supplierPayload = { ...supplier, shop_id };
    if (index > -1) {
      allSuppliers[index] = supplierPayload;
    } else {
      allSuppliers.push(supplierPayload);
    }
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(allSuppliers));
    return allSuppliers.filter(s => s.shop_id === shop_id);
  },

  deleteSupplier: (id: string, shop_id: string): Supplier[] => {
    initializeDB();
    const allSuppliers: Supplier[] = JSON.parse(localStorage.getItem(KEYS.SUPPLIERS) || '[]');
    const filtered = allSuppliers.filter(s => !(s.id === id && s.shop_id === shop_id));
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(filtered));
    return filtered.filter(s => s.shop_id === shop_id);
  },

  // PURCHASES (Filtered by tenant)
  getPurchases: (shop_id: string): Purchase[] => {
    initializeDB();
    const allPurchases: Purchase[] = JSON.parse(localStorage.getItem(KEYS.PURCHASES) || '[]');
    return allPurchases.filter(p => p.shop_id === shop_id);
  },

  addPurchase: (purchase: Omit<Purchase, 'id' | 'shop_id'>, shop_id: string): Purchase => {
    initializeDB();
    const allPurchases: Purchase[] = JSON.parse(localStorage.getItem(KEYS.PURCHASES) || '[]');
    const newPurchase: Purchase = {
      ...purchase,
      id: `pur-${Date.now()}`,
      shop_id
    };
    allPurchases.unshift(newPurchase);
    localStorage.setItem(KEYS.PURCHASES, JSON.stringify(allPurchases));

    // Increment Stock
    const shopProducts = db.getProducts(shop_id);
    const prod = shopProducts.find(p => p.id === purchase.product_id);
    if (prod) {
      prod.stock_quantity += purchase.quantity;
      db.saveProduct(prod, shop_id);
    }

    db.addAuditLog(shop_id, `Purchase Created: ${purchase.product_name} (${purchase.quantity} units)`, shop_id);
    return newPurchase;
  },

  // SALES (Filtered by tenant)
  getSales: (shop_id: string): Sale[] => {
    initializeDB();
    const allSales: Sale[] = JSON.parse(localStorage.getItem(KEYS.SALES) || '[]');
    return allSales.filter(s => s.shop_id === shop_id);
  },

  addSale: (sale: Omit<Sale, 'id' | 'shop_id' | 'profit' | 'invoice_number'>, shop_id: string): Sale => {
    initializeDB();
    const allSales: Sale[] = JSON.parse(localStorage.getItem(KEYS.SALES) || '[]');
    const shopProducts = db.getProducts(shop_id);
    const prod = shopProducts.find(p => p.id === sale.product_id);

    if (!prod) throw new Error("Product not found");
    if (prod.stock_quantity < sale.quantity) {
      throw new Error(`Insufficient stock. Available: ${prod.stock_quantity}`);
    }

    // Profit = (selling - purchase) * qty
    const unitProfit = sale.sale_price - prod.purchase_price;
    const totalProfit = unitProfit * sale.quantity;

    // Invoice No
    const tenantSalesCount = allSales.filter(s => s.shop_id === shop_id).length + 1;
    const invNumber = `INV-${new Date().getFullYear()}-${String(tenantSalesCount).padStart(4, '0')}`;

    const newSale: Sale = {
      ...sale,
      id: `sale-${Date.now()}`,
      shop_id,
      profit: totalProfit,
      invoice_number: invNumber
    };

    allSales.unshift(newSale);
    localStorage.setItem(KEYS.SALES, JSON.stringify(allSales));

    // Deduct stock
    prod.stock_quantity -= sale.quantity;
    db.saveProduct(prod, shop_id);

    db.addAuditLog(shop_id, `Sale Bill Created: ${invNumber} (${sale.quantity} units)`, shop_id);
    return newSale;
  },

  // Supabase connection
  getSupabaseConfig: () => {
    const config = localStorage.getItem(KEYS.SUPABASE_CONFIG);
    return config ? JSON.parse(config) : { url: '', key: '' };
  },

  saveSupabaseConfig: (url: string, key: string) => {
    localStorage.setItem(KEYS.SUPABASE_CONFIG, JSON.stringify({ url, key }));
  }
};
