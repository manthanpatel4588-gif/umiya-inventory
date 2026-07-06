// Multi-Tenant Database & LocalStorage Management for Umiya SaaS
import { isSupabaseConfigured, supabase } from './supabase';

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

export interface SaaSConfig {
  monthly_price: number;
  quarterly_price: number;
  yearly_price: number;
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
  unit: 'Packet' | 'Box' | 'Bundle' | 'Piece' | 'Kg' | 'Gram' | 'Litre' | 'Dozen' | 'Bag' | 'Carton';
  minimum_stock: number;
  barcode?: string;
  gst_rate?: number; // GST rate percentage (e.g. 0, 5, 12, 18)
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
  SUPABASE_CONFIG: 'umiya_supabase_config',
  SAAS_CONFIG: 'umiya_saas_config'
};

// Seed Users List
const SEED_USERS: User[] = [
  {
    id: 'admin',
    email: 'admin@umiya.com',
    password_hash: 'adminpassword',
    shop_name: 'Umiya Super Admin Panel',
    owner_name: 'Super Admin',
    mobile: '9999999999',
    address: 'Umiya Wholesale SaaS HQ, Gujarat',
    role: 'SuperAdmin',
    plan_type: 'Yearly',
    plan_start: new Date().toISOString(),
    plan_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
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
    plan_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // active for 1 year
    status: 'Active'
  },
  {
    id: 'shop-2',
    email: 'expired@umiya.com',
    password_hash: 'expiredpassword',
    shop_name: 'Expired Trial Mukhwas',
    owner_name: 'Ketan Shah',
    mobile: '9001002003',
    address: 'Kalupur Market, Ahmedabad, Gujarat',
    role: 'ShopOwner',
    plan_type: 'Trial',
    plan_start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
    plan_expiry: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // expired 1 day ago
    status: 'Active'
  },
  {
    id: 'shop-3',
    email: 'blocked@umiya.com',
    password_hash: 'blockedpassword',
    shop_name: 'Blocked Pan Masala Agency',
    owner_name: 'Hitesh Thakkar',
    mobile: '9428500000',
    address: 'Mehsana Bypass, Gujarat',
    role: 'ShopOwner',
    plan_type: 'Yearly',
    plan_start: new Date().toISOString(),
    plan_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Blocked'
  }
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    shop_id: 'shop-1',
    product_name: 'Vimal Shaheed Pan Masala',
    product_name_gu: 'વિમલ શહીદ પાન મસાલા',
    category: 'Pan Masala',
    brand: 'Vimal',
    purchase_price: 120,
    selling_price: 140,
    stock_quantity: 80,
    unit: 'Packet',
    minimum_stock: 30,
    barcode: '8901234567890'
  },
  {
    id: 'prod-2',
    shop_id: 'shop-1',
    product_name: 'Rajnigandha Pan Masala',
    product_name_gu: 'રજનીગંધા પાન મસાલા',
    category: 'Pan Masala',
    brand: 'Rajnigandha',
    purchase_price: 350,
    selling_price: 390,
    stock_quantity: 45,
    unit: 'Packet',
    minimum_stock: 15,
    barcode: '8901234567891'
  },
  {
    id: 'prod-3',
    shop_id: 'shop-1',
    product_name: 'Umiya Special Mukhwas',
    product_name_gu: 'ઉમિયા સ્પેશિયલ મુખવાસ',
    category: 'Mukhwas',
    brand: 'Umiya Home',
    purchase_price: 180,
    selling_price: 240,
    stock_quantity: 12,
    unit: 'Box',
    minimum_stock: 15,
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
      sale_date: `${dates[0]}T12:00:00Z`,
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

    // Supabase Sync (Background)
    if (supabase) {
      supabase.from('users').upsert(user).then(({ error }) => {
        if (error) console.error('Supabase saveUser error:', error);
      });
    }

    return users;
  },

  deleteUser: (id: string): User[] => {
    const users = db.getUsers().filter(u => u.id !== id);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));

    // Supabase Sync (Background)
    if (supabase) {
      supabase.from('users').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase deleteUser error:', error);
      });
    }

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
    logs.unshift(newLog);
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(logs));

    // Supabase Sync (Background)
    if (supabase) {
      supabase.from('audit_logs').insert(newLog).then(({ error }) => {
        if (error) console.error('Supabase addAuditLog error:', error);
      });
    }
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

    // Supabase Sync (Background)
    if (supabase) {
      supabase.from('products').upsert(productPayload).then(({ error }) => {
        if (error) console.error('Supabase saveProduct error:', error);
      });
    }

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

    // Supabase Sync (Background)
    if (supabase) {
      supabase.from('products').delete().eq('id', id).eq('shop_id', shop_id).then(({ error }) => {
        if (error) console.error('Supabase deleteProduct error:', error);
      });
    }

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

    // Supabase Sync (Background)
    if (supabase) {
      supabase.from('suppliers').upsert(supplierPayload).then(({ error }) => {
        if (error) console.error('Supabase saveSupplier error:', error);
      });
    }

    return allSuppliers.filter(s => s.shop_id === shop_id);
  },

  deleteSupplier: (id: string, shop_id: string): Supplier[] => {
    initializeDB();
    const allSuppliers: Supplier[] = JSON.parse(localStorage.getItem(KEYS.SUPPLIERS) || '[]');
    const filtered = allSuppliers.filter(s => !(s.id === id && s.shop_id === shop_id));
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(filtered));

    // Supabase Sync (Background)
    if (supabase) {
      supabase.from('suppliers').delete().eq('id', id).eq('shop_id', shop_id).then(({ error }) => {
        if (error) console.error('Supabase deleteSupplier error:', error);
      });
    }

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

    // Supabase Sync (Background)
    if (supabase) {
      supabase.from('purchases').insert(newPurchase).then(({ error }) => {
        if (error) console.error('Supabase addPurchase error:', error);
      });
    }

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

  addSale: (sale: Omit<Sale, 'id' | 'shop_id' | 'profit' | 'invoice_number'> & { invoice_number?: string }, shop_id: string): Sale => {
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
    let invNumber = sale.invoice_number;
    if (!invNumber) {
      const uniqueInvoiceNumbers = new Set(allSales.filter(s => s.shop_id === shop_id).map(s => s.invoice_number));
      const tenantSalesCount = uniqueInvoiceNumbers.size + 1;
      invNumber = `INV-${new Date().getFullYear()}-${String(tenantSalesCount).padStart(4, '0')}`;
    }

    const newSale: Sale = {
      ...sale,
      id: `sale-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      shop_id,
      profit: totalProfit,
      invoice_number: invNumber
    };

    allSales.unshift(newSale);
    localStorage.setItem(KEYS.SALES, JSON.stringify(allSales));

    // Supabase Sync (Background)
    if (supabase) {
      supabase.from('sales').insert(newSale).then(({ error }) => {
        if (error) console.error('Supabase addSale error:', error);
      });
    }

    // Deduct stock
    prod.stock_quantity -= sale.quantity;
    db.saveProduct(prod, shop_id);

    db.addAuditLog(shop_id, `Sale Bill Created: ${invNumber} (${sale.quantity} units)`, shop_id);
    return newSale;
  },

  // Supabase connection config
  getSupabaseConfig: () => {
    const config = localStorage.getItem(KEYS.SUPABASE_CONFIG);
    return config ? JSON.parse(config) : { url: '', key: '' };
  },

  saveSupabaseConfig: (url: string, key: string) => {
    localStorage.setItem(KEYS.SUPABASE_CONFIG, JSON.stringify({ url, key }));
  },

  // Synchronize all tables from Supabase to LocalStorage
  syncFromSupabase: async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
      console.log('Starting Supabase sync...');
      
      // Fetch users first to see if database has been initialized
      const { data: users, error: uErr } = await supabase.from('users').select('*');
      if (uErr) throw uErr;

      // If remote database is completely empty, it means this is a newly connected Supabase project.
      // We should push our current LocalStorage (seed data + updates) to the cloud!
      if (!users || users.length === 0) {
        console.log('Supabase project is empty. Pushing current LocalStorage to the cloud...');
        
        const localUsers = db.getUsers();
        if (localUsers.length > 0) {
          const { error } = await supabase.from('users').insert(localUsers);
          if (error) console.error('Sync push users error:', error);
        }

        const localProducts = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
        if (localProducts.length > 0) {
          const { error } = await supabase.from('products').insert(localProducts);
          if (error) console.error('Sync push products error:', error);
        }

        const localSuppliers = JSON.parse(localStorage.getItem(KEYS.SUPPLIERS) || '[]');
        if (localSuppliers.length > 0) {
          const { error } = await supabase.from('suppliers').insert(localSuppliers);
          if (error) console.error('Sync push suppliers error:', error);
        }

        const localPurchases = JSON.parse(localStorage.getItem(KEYS.PURCHASES) || '[]');
        if (localPurchases.length > 0) {
          const { error } = await supabase.from('purchases').insert(localPurchases);
          if (error) console.error('Sync push purchases error:', error);
        }

        const localSales = JSON.parse(localStorage.getItem(KEYS.SALES) || '[]');
        if (localSales.length > 0) {
          const { error } = await supabase.from('sales').insert(localSales);
          if (error) console.error('Sync push sales error:', error);
        }

        const localLogs = db.getAuditLogs();
        if (localLogs.length > 0) {
          const { error } = await supabase.from('audit_logs').insert(localLogs);
          if (error) console.error('Sync push audit_logs error:', error);
        }
        
        console.log('Sync push finished!');
        return true;
      }

      // If remote database has data, pull and merge bi-directionally
      // This protects locally added data from being erased on page load sync!
      
      // 1. Sync USERS
      const localUsers = db.getUsers();
      const remoteUserIds = new Set(users.map((u: User) => u.id));
      const usersToPush = localUsers.filter((u: User) => !remoteUserIds.has(u.id));
      if (usersToPush.length > 0) {
        await supabase.from('users').upsert(usersToPush);
      }
      const mergedUsers = [...users];
      localUsers.forEach((lu: User) => {
        if (!remoteUserIds.has(lu.id)) mergedUsers.push(lu);
      });
      localStorage.setItem(KEYS.USERS, JSON.stringify(mergedUsers));

      // 2. Sync PRODUCTS
      const { data: products, error: pErr } = await supabase.from('products').select('*');
      if (pErr) throw pErr;
      if (products) {
        const localProducts = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
        const remoteProductIds = new Set(products.map((p: Product) => p.id));
        const productsToPush = localProducts.filter((p: Product) => !remoteProductIds.has(p.id));
        if (productsToPush.length > 0) {
          await supabase.from('products').upsert(productsToPush);
        }
        const mergedProducts = [...products];
        localProducts.forEach((lp: Product) => {
          if (!remoteProductIds.has(lp.id)) mergedProducts.push(lp);
        });
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(mergedProducts));
      }

      // 3. Sync SUPPLIERS
      const { data: suppliers, error: sErr } = await supabase.from('suppliers').select('*');
      if (sErr) throw sErr;
      if (suppliers) {
        const localSuppliers = JSON.parse(localStorage.getItem(KEYS.SUPPLIERS) || '[]');
        const remoteSupplierIds = new Set(suppliers.map((s: Supplier) => s.id));
        const suppliersToPush = localSuppliers.filter((s: Supplier) => !remoteSupplierIds.has(s.id));
        if (suppliersToPush.length > 0) {
          await supabase.from('suppliers').upsert(suppliersToPush);
        }
        const mergedSuppliers = [...suppliers];
        localSuppliers.forEach((ls: Supplier) => {
          if (!remoteSupplierIds.has(ls.id)) mergedSuppliers.push(ls);
        });
        localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(mergedSuppliers));
      }

      // 4. Sync PURCHASES
      const { data: purchases, error: purErr } = await supabase.from('purchases').select('*');
      if (purErr) throw purErr;
      if (purchases) {
        const localPurchases = JSON.parse(localStorage.getItem(KEYS.PURCHASES) || '[]');
        const remotePurchaseIds = new Set(purchases.map((p: Purchase) => p.id));
        const purchasesToPush = localPurchases.filter((p: Purchase) => !remotePurchaseIds.has(p.id));
        if (purchasesToPush.length > 0) {
          await supabase.from('purchases').upsert(purchasesToPush);
        }
        const mergedPurchases = [...purchases];
        localPurchases.forEach((lp: Purchase) => {
          if (!remotePurchaseIds.has(lp.id)) mergedPurchases.push(lp);
        });
        localStorage.setItem(KEYS.PURCHASES, JSON.stringify(mergedPurchases));
      }

      // 5. Sync SALES
      const { data: sales, error: saleErr } = await supabase.from('sales').select('*');
      if (saleErr) throw saleErr;
      if (sales) {
        const localSales = JSON.parse(localStorage.getItem(KEYS.SALES) || '[]');
        const remoteSaleIds = new Set(sales.map((s: Sale) => s.id));
        const salesToPush = localSales.filter((s: Sale) => !remoteSaleIds.has(s.id));
        if (salesToPush.length > 0) {
          await supabase.from('sales').upsert(salesToPush);
        }
        const mergedSales = [...sales];
        localSales.forEach((ls: Sale) => {
          if (!remoteSaleIds.has(ls.id)) mergedSales.push(ls);
        });
        localStorage.setItem(KEYS.SALES, JSON.stringify(mergedSales));
      }

      // 6. Sync AUDIT LOGS
      const { data: logs, error: lErr } = await supabase.from('audit_logs').select('*');
      if (lErr) throw lErr;
      if (logs) {
        const localLogs = db.getAuditLogs();
        const remoteLogIds = new Set(logs.map((l: AuditLog) => l.id));
        const logsToPush = localLogs.filter((l: AuditLog) => !remoteLogIds.has(l.id));
        if (logsToPush.length > 0) {
          await supabase.from('audit_logs').upsert(logsToPush);
        }
        const mergedLogs = [...logs];
        localLogs.forEach((ll: AuditLog) => {
          if (!remoteLogIds.has(ll.id)) mergedLogs.push(ll);
        });
        localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(mergedLogs));
      }

      // Pull SaaS Config if available
      try {
        const { data: configData } = await supabase.from('saas_config').select('*').eq('id', 1).maybeSingle();
        if (configData) {
          localStorage.setItem(KEYS.SAAS_CONFIG, JSON.stringify({
            monthly_price: configData.monthly_price,
            quarterly_price: configData.quarterly_price,
            yearly_price: configData.yearly_price
          }));
        }
      } catch (cfgErr) {
        console.warn('Sync SaaS Config skip/error:', cfgErr);
      }

      localStorage.removeItem('umiya_supabase_sync_error');
      console.log('Supabase sync completed successfully!');
      return true;
    } catch (err: any) {
      console.error('Error syncing from Supabase:', err);
      localStorage.setItem('umiya_supabase_sync_error', err.message || JSON.stringify(err));
      return false;
    }
  },

  getSaasConfig: (): SaaSConfig => {
    initializeDB();
    const configRaw = localStorage.getItem(KEYS.SAAS_CONFIG);
    if (configRaw) {
      try {
        return JSON.parse(configRaw);
      } catch (e) {
        // fallback
      }
    }
    return {
      monthly_price: 1000,
      quarterly_price: 2500,
      yearly_price: 9000
    };
  },

  saveSaasConfig: (config: SaaSConfig): void => {
    initializeDB();
    localStorage.setItem(KEYS.SAAS_CONFIG, JSON.stringify(config));
    
    // Supabase Sync (Background)
    if (supabase) {
      supabase.from('saas_config').upsert({
        id: 1,
        monthly_price: config.monthly_price,
        quarterly_price: config.quarterly_price,
        yearly_price: config.yearly_price
      }).then(({ error }) => {
        if (error) console.error('Supabase saveSaasConfig error:', error);
      });
    }
  }
};
