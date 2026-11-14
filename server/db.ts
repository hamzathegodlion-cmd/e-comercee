import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function resolveDataDir(): string {
  const localDir = path.resolve(process.cwd(), 'data');
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.join(os.tmpdir(), 'aeterna-data');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    fs.accessSync(localDir, fs.constants.W_OK);
    return localDir;
  } catch {
    const tmpDir = path.join(os.tmpdir(), 'aeterna-data');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
}

const DATA_DIR = resolveDataDir();
const DB_PATH = path.join(DATA_DIR, 'store.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(process.cwd() + '_aeterna_secret_key').digest('hex');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export interface TokenPayload {
  userId: number;
  role: 'customer' | 'manager';
  exp: number;
}

export function createSessionToken(userId: number, role: 'customer' | 'manager'): string {
  const payload: TokenPayload = {
    userId,
    role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifySessionToken(token: string | undefined): TokenPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

let dbInitialized = false;

export function initDatabase() {
  if (dbInitialized) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      store_name TEXT NOT NULL,
      tagline TEXT NOT NULL,
      logo_url TEXT NOT NULL DEFAULT '',
      hero_title TEXT NOT NULL,
      hero_subtitle TEXT NOT NULL,
      hero_image_url TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      low_stock_threshold INTEGER NOT NULL DEFAULT 8,
      free_shipping_threshold REAL NOT NULL DEFAULT 150,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('customer', 'manager')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      is_open INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      cost_price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT NOT NULL DEFAULT '',
      featured INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      views INTEGER NOT NULL DEFAULT 0,
      favorites INTEGER NOT NULL DEFAULT 0,
      specs_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      shipping_city TEXT NOT NULL,
      shipping_postal_code TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Card / Online',
      payment_screenshot TEXT NOT NULL DEFAULT '',
      subtotal REAL NOT NULL,
      shipping_fee REAL NOT NULL,
      total_amount REAL NOT NULL,
      total_profit REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      product_name TEXT NOT NULL,
      product_image TEXT NOT NULL DEFAULT '',
      unit_price REAL NOT NULL,
      unit_cost REAL NOT NULL,
      quantity INTEGER NOT NULL,
      line_total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS browsing_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      viewed_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, product_id)
    );
  `);

  const orderCols = db.prepare('PRAGMA table_info(orders)').all() as Array<{ name: string }>;
  if (!orderCols.some((c) => c.name === 'payment_screenshot')) {
    db.exec("ALTER TABLE orders ADD COLUMN payment_screenshot TEXT NOT NULL DEFAULT ''");
  }

  seedInitialData();
  dbInitialized = true;
}

function seedInitialData() {
  // 1. Store settings
  const settingsRow = db.prepare('SELECT id FROM settings WHERE id = 1').get();
  if (!settingsRow) {
    db.prepare(`
      INSERT INTO settings (
        id, store_name, tagline, logo_url, hero_title, hero_subtitle, hero_image_url,
        currency, low_stock_threshold, free_shipping_threshold
      ) VALUES (1, ?, ?, ?, ?, ?, ?, 'USD', 8, 150)
    `).run(
      'Aeterna',
      'Curated technology, tailored apparel, artisan homeware, and fresh market goods.',
      '',
      'Designed for every part of daily life.',
      'From anodized workstations and tailored merino layers to precision espresso hardware and fresh orchard crates.',
      '/src/assets/images/hero_flagship_showcase_1794591590470.jpg'
    );
  }

  // 2. Single Manager Account (only one manager exists)
  const managerRow = db
    .prepare("SELECT id, password_hash FROM users WHERE role = 'manager'")
    .get() as { id: number; password_hash: string } | undefined;
  if (!managerRow) {
    db.prepare(`
      INSERT INTO users (name, username, email, password_hash, role)
      VALUES (?, ?, ?, ?, 'manager')
    `).run('Store Manager', 'manager', 'manager@aeterna.store', hashPassword('Manager@2026'));
  } else if (!managerRow.password_hash || !managerRow.password_hash.includes(':')) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
      hashPassword('Manager@2026'),
      managerRow.id
    );
  }

  // Demo customer account (so Hamza can test immediately or register his own)
  const demoCustomer = db.prepare("SELECT id FROM users WHERE username = 'hamza'").get();
  if (!demoCustomer) {
    db.prepare(`
      INSERT INTO users (name, username, email, password_hash, role)
      VALUES (?, ?, ?, ?, 'customer')
    `).run('Hamza', 'hamza', 'hamza@example.com', hashPassword('Hamza@2026'));
  }

  // 3. Multi-thing Categories
  const categoryCount = db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number };
  if (categoryCount.c === 0) {
    const insertCat = db.prepare(
      'INSERT INTO categories (name, slug, description, is_open) VALUES (?, ?, ?, 1)'
    );
    insertCat.run('Electronics', 'electronics', 'Flagship laptops, studio audio, and precision computing hardware.');
    insertCat.run('Apparel', 'apparel', 'Minimalist architectural tailoring, merino wool, and everyday layers.');
    insertCat.run('Fresh Market', 'fresh-market', 'Seasonal orchard fruit crates, organic produce, and gourmet provisions.');
    insertCat.run('Home & Living', 'home-living', 'Espresso machines, ceramic tableware, and studio desk essentials.');
  }

  // 4. Products across categories
  const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number };
  if (productCount.c === 0) {
    const cats = db.prepare('SELECT id, slug FROM categories').all() as Array<{ id: number; slug: string }>;
    const catMap = new Map(cats.map((c) => [c.slug, c.id]));

    const insertProd = db.prepare(`
      INSERT INTO products (
        name, sku, category_id, description, price, cost_price, stock, image_url,
        featured, is_active, views, favorites, specs_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `);

    insertProd.run(
      'Aeterna Book Pro 14"',
      'EL-PRO-14',
      catMap.get('electronics'),
      'Milled from solid recycled aluminum with a 120Hz reference display, silent thermal architecture, and all-day 18-hour battery life.',
      1699,
      1180,
      18,
      '/src/assets/images/product_laptop_pro_1794591590610.jpg',
      1,
      428,
      94,
      JSON.stringify({ Display: '14.2" Liquid Reference', Memory: '24GB Unified', Storage: '1TB NVMe', Weight: '1.48 kg' })
    );

    insertProd.run(
      'Sonus Reference Wireless',
      'EL-SND-09',
      catMap.get('electronics'),
      'Precision-machined brushed titanium acoustic cups, studio-grade lossless Bluetooth, and adaptive noise isolation.',
      449,
      245,
      5, // Low stock!
      '/src/assets/images/product_studio_headphones_1794591590448.jpg',
      1,
      362,
      81,
      JSON.stringify({ Drivers: '45mm Beryllium', Battery: '42 Hours', Connectivity: 'USB-C & Lossless BT', Material: 'Brushed Titanium' })
    );

    insertProd.run(
      'Merino Architectural Overshirt',
      'AP-MER-22',
      catMap.get('apparel'),
      'Double-faced 420gsm Italian merino wool overshirt with horn buttons, concealed side pockets, and structured collar.',
      285,
      135,
      24,
      '/src/assets/images/product_merino_jacket_1794591591053.jpg',
      1,
      295,
      67,
      JSON.stringify({ Fabric: '100% Virgin Merino', Weight: '420 GSM', Fit: 'Relaxed Tailored', Origin: 'Milan Loom' })
    );

    insertProd.run(
      'Seasonal Orchard Reserve Crate',
      'FM-ORC-04',
      catMap.get('fresh-market'),
      'Hand-picked organic Honeycrisp apples, Sicilian blood oranges, and Anjou pears packed fresh every morning in reusable pale oak.',
      64,
      31,
      6, // Low stock!
      '/src/assets/images/product_organic_fruits_1794591591530.jpg',
      0,
      312,
      78,
      JSON.stringify({ Weight: '4.5 kg Assorted', Harvest: '24h Farm-to-Door', Certification: 'Certified Organic', Packaging: 'Pale Oak Crate' })
    );

    insertProd.run(
      'Barista Studio Dual-Boiler',
      'HL-ESP-01',
      catMap.get('home-living'),
      'PID temperature-stabilized brushed steel espresso workstation with walnut portafilter and commercial 9-bar pressure gauge.',
      890,
      510,
      11,
      '/src/assets/images/product_ceramic_espresso_1794591592000.jpg',
      1,
      274,
      63,
      JSON.stringify({ Boiler: 'Dual PID Stainless', Pressure: '9-Bar Rotary', Portafilter: '58mm Walnut', Tank: '2.2L Removable' })
    );

    insertProd.run(
      'Aeterna Studio Desk Bundle',
      'EL-DSK-07',
      catMap.get('electronics'),
      'Complete minimalist creator setup pairing the anodized workstation, titanium acoustics, and ceramic espresso service.',
      2890,
      1920,
      4, // Low stock!
      '/src/assets/images/hero_flagship_showcase_1794591590470.jpg',
      0,
      198,
      52,
      JSON.stringify({ Includes: 'Laptop + Headphones + Mug', Warranty: '3-Year Care', Finish: 'Anodized Silver' })
    );
  }

  // 5. Realistic Historical Orders (across today, current month, and past months)
  const orderCount = db.prepare('SELECT COUNT(*) as c FROM orders').get() as { c: number };
  if (orderCount.c === 0) {
    const prods = db.prepare('SELECT id, name, image_url, price, cost_price FROM products').all() as Array<{
      id: number;
      name: string;
      image_url: string;
      price: number;
      cost_price: number;
    }>;
    const hamza = db.prepare("SELECT id FROM users WHERE username = 'hamza'").get() as { id: number } | undefined;

    const now = new Date();
    const fmtDate = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);

    const sampleOrders = [
      {
        orderNumber: 'ORD-1041',
        userId: hamza?.id ?? null,
        name: 'Hamza',
        email: 'hamza@example.com',
        phone: '+1 555-0142',
        address: '420 Cupertino Way',
        city: 'San Jose',
        postal: '95129',
        status: 'Delivered',
        daysAgo: 0,
        hoursAgo: 3,
        items: [{ prod: prods[0], qty: 1 }, { prod: prods[1], qty: 1 }],
      },
      {
        orderNumber: 'ORD-1042',
        userId: null,
        name: 'Elena Rostova',
        email: 'elena.r@example.com',
        phone: '+1 555-0199',
        address: '88 Mercer Street',
        city: 'New York',
        postal: '10012',
        status: 'Processing',
        daysAgo: 0,
        hoursAgo: 1,
        items: [{ prod: prods[4], qty: 1 }, { prod: prods[3], qty: 2 }],
      },
      {
        orderNumber: 'ORD-1038',
        userId: hamza?.id ?? null,
        name: 'Hamza',
        email: 'hamza@example.com',
        phone: '+1 555-0142',
        address: '420 Cupertino Way',
        city: 'San Jose',
        postal: '95129',
        status: 'Delivered',
        daysAgo: 4,
        hoursAgo: 0,
        items: [{ prod: prods[2], qty: 2 }],
      },
      {
        orderNumber: 'ORD-1034',
        userId: null,
        name: 'Marcus Vance',
        email: 'mvance@example.com',
        phone: '+1 555-0177',
        address: '712 Abbott Kinney',
        city: 'Los Angeles',
        postal: '90291',
        status: 'Shipped',
        daysAgo: 9,
        hoursAgo: 0,
        items: [{ prod: prods[5], qty: 1 }],
      },
      {
        orderNumber: 'ORD-1029',
        userId: null,
        name: 'Sora Takahashi',
        email: 'sora@example.com',
        phone: '+1 555-0165',
        address: '1520 Pine St',
        city: 'Seattle',
        postal: '98101',
        status: 'Delivered',
        daysAgo: 18,
        hoursAgo: 0,
        items: [{ prod: prods[1], qty: 2 }, { prod: prods[2], qty: 1 }],
      },
      {
        orderNumber: 'ORD-1019',
        userId: null,
        name: 'Clara Lindqvist',
        email: 'clara@example.com',
        phone: '+1 555-0118',
        address: '305 Newbury St',
        city: 'Boston',
        postal: '02115',
        status: 'Delivered',
        daysAgo: 45,
        hoursAgo: 0,
        items: [{ prod: prods[0], qty: 1 }, { prod: prods[4], qty: 1 }],
      },
      {
        orderNumber: 'ORD-1012',
        userId: null,
        name: 'Daniel Okafor',
        email: 'dokafor@example.com',
        phone: '+1 555-0134',
        address: '900 Michigan Ave',
        city: 'Chicago',
        postal: '60611',
        status: 'Delivered',
        daysAgo: 82,
        hoursAgo: 0,
        items: [{ prod: prods[3], qty: 3 }, { prod: prods[2], qty: 2 }],
      },
      {
        orderNumber: 'ORD-1005',
        userId: null,
        name: 'Nadia Al-Mansoor',
        email: 'nadia@example.com',
        phone: '+1 555-0181',
        address: '2100 Ross Ave',
        city: 'Dallas',
        postal: '75201',
        status: 'Delivered',
        daysAgo: 130,
        hoursAgo: 0,
        items: [{ prod: prods[5], qty: 1 }, { prod: prods[1], qty: 1 }],
      },
    ];

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        order_number, user_id, customer_name, customer_email, customer_phone,
        shipping_address, shipping_city, shipping_postal_code, payment_method,
        subtotal, shipping_fee, total_amount, total_profit, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Card / Online', ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO order_items (
        order_id, product_id, product_name, product_image, unit_price, unit_cost, quantity, line_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedTx = db.transaction(() => {
      for (const o of sampleOrders) {
        const d = new Date(now.getTime() - o.daysAgo * 86400000 - o.hoursAgo * 3600000);
        let subtotal = 0;
        let profit = 0;
        for (const item of o.items) {
          subtotal += item.prod.price * item.qty;
          profit += (item.prod.price - item.prod.cost_price) * item.qty;
        }
        const shippingFee = subtotal >= 150 ? 0 : 12;
        const total = subtotal + shippingFee;

        const info = insertOrder.run(
          o.orderNumber,
          o.userId,
          o.name,
          o.email,
          o.phone,
          o.address,
          o.city,
          o.postal,
          subtotal,
          shippingFee,
          total,
          profit,
          o.status,
          fmtDate(d)
        );
        const orderId = Number(info.lastInsertRowid);
        for (const item of o.items) {
          insertItem.run(
            orderId,
            item.prod.id,
            item.prod.name,
            item.prod.image_url,
            item.prod.price,
            item.prod.cost_price,
            item.qty,
            item.prod.price * item.qty
          );
        }
      }

      if (hamza) {
        const insertHist = db.prepare(
          'INSERT OR IGNORE INTO browsing_history (user_id, product_id, viewed_at) VALUES (?, ?, ?)'
        );
        insertHist.run(hamza.id, prods[0].id, fmtDate(new Date(now.getTime() - 3600000)));
        insertHist.run(hamza.id, prods[1].id, fmtDate(new Date(now.getTime() - 7200000)));
        insertHist.run(hamza.id, prods[4].id, fmtDate(new Date(now.getTime() - 18000000)));
      }
    });

    seedTx();
  }
}
