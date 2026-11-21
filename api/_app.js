// server/app.ts
import express from "express";
import fs2 from "node:fs";
import path2 from "node:path";

// server/db.ts
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
var require2 = createRequire(import.meta.url);
var IS_SERVERLESS = Boolean(
  process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT
);
function normalizeParams(params) {
  return params.map((p) => {
    if (p === void 0 || p === null) return null;
    if (typeof p === "boolean") return p ? 1 : 0;
    if (typeof p === "string" || typeof p === "number" || typeof p === "bigint" || p instanceof Uint8Array) {
      return p;
    }
    return String(p);
  });
}
function normalizeRow(row) {
  if (!row || typeof row !== "object") return void 0;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === "bigint" ? Number(v) : v;
  }
  return out;
}
function getCandidateDbPaths() {
  const candidates = [];
  if (process.env.DATA_DIR) {
    candidates.push(path.join(path.resolve(process.env.DATA_DIR), "store.db"));
  }
  if (!IS_SERVERLESS) {
    candidates.push(path.join(path.resolve(process.cwd(), "data"), "store.db"));
  }
  candidates.push(path.join(os.tmpdir(), "aeterna-data", "store.db"));
  candidates.push(":memory:");
  return candidates;
}
function ensureParentDir(dbFile) {
  if (dbFile === ":memory:") return;
  const dir = path.dirname(dbFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.accessSync(dir, fs.constants.W_OK);
}
function tryBetterSqlite3(dbFile) {
  if (process.env.FORCE_NODE_SQLITE === "1") {
    throw new Error("Forced node:sqlite mode");
  }
  const BetterSqlite3 = require2("better-sqlite3");
  const rawDb = new BetterSqlite3(dbFile);
  rawDb.prepare("SELECT 1").get();
  return {
    engine: "better-sqlite3",
    dbPath: dbFile,
    exec: (sql) => rawDb.exec(sql),
    prepare: (sql) => {
      const stmt = rawDb.prepare(sql);
      return {
        get: (...params) => normalizeRow(stmt.get(...normalizeParams(params))),
        all: (...params) => stmt.all(...normalizeParams(params)).map((r) => normalizeRow(r)).filter(Boolean),
        run: (...params) => {
          const info = stmt.run(...normalizeParams(params));
          return {
            changes: Number(info.changes),
            lastInsertRowid: Number(info.lastInsertRowid)
          };
        }
      };
    },
    transaction: (fn) => rawDb.transaction(fn)
  };
}
function tryNodeSqlite(dbFile) {
  const { DatabaseSync } = require2("node:sqlite");
  const rawDb = new DatabaseSync(dbFile);
  rawDb.prepare("SELECT 1").get();
  let txDepth = 0;
  return {
    engine: "node:sqlite",
    dbPath: dbFile,
    exec: (sql) => rawDb.exec(sql),
    prepare: (sql) => {
      const stmt = rawDb.prepare(sql);
      return {
        get: (...params) => normalizeRow(stmt.get(...normalizeParams(params))),
        all: (...params) => stmt.all(...normalizeParams(params)).map((r) => normalizeRow(r)).filter(Boolean),
        run: (...params) => {
          const info = stmt.run(...normalizeParams(params));
          return {
            changes: Number(info.changes),
            lastInsertRowid: Number(info.lastInsertRowid)
          };
        }
      };
    },
    transaction: (fn) => {
      return () => {
        const sp = `sp_${txDepth}`;
        if (txDepth === 0) rawDb.exec("BEGIN IMMEDIATE");
        else rawDb.exec(`SAVEPOINT ${sp}`);
        txDepth++;
        try {
          const result = fn();
          txDepth--;
          if (txDepth === 0) rawDb.exec("COMMIT");
          else rawDb.exec(`RELEASE SAVEPOINT ${sp}`);
          return result;
        } catch (err) {
          txDepth--;
          try {
            if (txDepth === 0) rawDb.exec("ROLLBACK");
            else rawDb.exec(`ROLLBACK TO SAVEPOINT ${sp}; RELEASE SAVEPOINT ${sp}`);
          } catch {
          }
          throw err;
        }
      };
    }
  };
}
function tryBunSqlite(dbFile) {
  const { Database: BunDatabase } = require2("bun:sqlite");
  const rawDb = new BunDatabase(dbFile);
  rawDb.query("SELECT 1").get();
  return {
    engine: "bun:sqlite",
    dbPath: dbFile,
    exec: (sql) => rawDb.exec(sql),
    prepare: (sql) => {
      const stmt = rawDb.query(sql);
      return {
        get: (...params) => normalizeRow(stmt.get(...normalizeParams(params))),
        all: (...params) => stmt.all(...normalizeParams(params)).map((r) => normalizeRow(r)).filter(Boolean),
        run: (...params) => {
          const info = stmt.run(...normalizeParams(params));
          return {
            changes: Number(info.changes),
            lastInsertRowid: Number(info.lastInsertRowid)
          };
        }
      };
    },
    transaction: (fn) => rawDb.transaction(fn)
  };
}
function openDatabase() {
  const errors = [];
  for (const candidatePath of getCandidateDbPaths()) {
    try {
      ensureParentDir(candidatePath);
    } catch (err) {
      errors.push(`dir(${candidatePath}): ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    for (const loader of [tryBetterSqlite3, tryNodeSqlite, tryBunSqlite]) {
      try {
        const adapter = loader(candidatePath);
        adapter.exec("PRAGMA foreign_keys = ON;");
        try {
          adapter.exec("PRAGMA busy_timeout = 5000;");
        } catch {
        }
        if (!IS_SERVERLESS && candidatePath !== ":memory:") {
          try {
            adapter.exec("PRAGMA journal_mode = WAL;");
          } catch {
            adapter.exec("PRAGMA journal_mode = DELETE;");
          }
        }
        return adapter;
      } catch (err) {
        errors.push(
          `${loader.name}(${candidatePath}): ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }
  throw new Error(`Unable to initialize SQLite database: ${errors.join(" | ")}`);
}
var db = openDatabase();
var SESSION_SECRET = crypto.createHash("sha256").update(
  process.env.SESSION_SECRET || process.env.VERCEL_PROJECT_ID || "aeterna_commerce_persistent_session_secret_v1"
).digest("hex");
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}
function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, "hex");
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}
function createSessionToken(userOrId, roleArg) {
  const payload = typeof userOrId === "number" ? {
    userId: userOrId,
    role: roleArg || "customer",
    exp: Date.now() + 1e3 * 60 * 60 * 24 * 7
    // 7 days
  } : {
    userId: userOrId.id,
    role: userOrId.role,
    username: userOrId.username,
    name: userOrId.name,
    email: userOrId.email,
    createdAt: userOrId.createdAt,
    exp: Date.now() + 1e3 * 60 * 60 * 24 * 7
    // 7 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}
function verifySessionToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
var dbInitialized = false;
function initDatabase() {
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
  const orderCols = db.prepare("PRAGMA table_info(orders)").all();
  if (!orderCols.some((c) => c.name === "payment_screenshot")) {
    db.exec("ALTER TABLE orders ADD COLUMN payment_screenshot TEXT NOT NULL DEFAULT ''");
  }
  seedInitialData();
  dbInitialized = true;
}
function seedInitialData() {
  const settingsRow = db.prepare("SELECT id FROM settings WHERE id = 1").get();
  if (!settingsRow) {
    db.prepare(`
      INSERT INTO settings (
        id, store_name, tagline, logo_url, hero_title, hero_subtitle, hero_image_url,
        currency, low_stock_threshold, free_shipping_threshold
      ) VALUES (1, ?, ?, ?, ?, ?, ?, 'USD', 8, 150)
    `).run(
      "Aeterna",
      "Curated technology, tailored apparel, artisan homeware, and fresh market goods.",
      "",
      "Designed for every part of daily life.",
      "From anodized workstations and tailored merino layers to precision espresso hardware and fresh orchard crates.",
      "/src/assets/images/hero_flagship_showcase_1794591590470.jpg"
    );
  }
  const managerRow = db.prepare("SELECT id, password_hash FROM users WHERE role = 'manager'").get();
  if (!managerRow) {
    db.prepare(`
      INSERT INTO users (name, username, email, password_hash, role)
      VALUES (?, ?, ?, ?, 'manager')
    `).run("Store Manager", "manager", "manager@aeterna.store", hashPassword("Manager@2026"));
  } else if (!managerRow.password_hash || !managerRow.password_hash.includes(":")) {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
      hashPassword("Manager@2026"),
      managerRow.id
    );
  }
  const demoCustomer = db.prepare("SELECT id FROM users WHERE username = 'hamza'").get();
  if (!demoCustomer) {
    db.prepare(`
      INSERT INTO users (name, username, email, password_hash, role)
      VALUES (?, ?, ?, ?, 'customer')
    `).run("Hamza", "hamza", "hamza@example.com", hashPassword("Hamza@2026"));
  }
  const categoryCount = db.prepare("SELECT COUNT(*) as c FROM categories").get();
  if (categoryCount.c === 0) {
    const insertCat = db.prepare(
      "INSERT INTO categories (name, slug, description, is_open) VALUES (?, ?, ?, 1)"
    );
    insertCat.run("Electronics", "electronics", "Flagship laptops, studio audio, and precision computing hardware.");
    insertCat.run("Apparel", "apparel", "Minimalist architectural tailoring, merino wool, and everyday layers.");
    insertCat.run("Fresh Market", "fresh-market", "Seasonal orchard fruit crates, organic produce, and gourmet provisions.");
    insertCat.run("Home & Living", "home-living", "Espresso machines, ceramic tableware, and studio desk essentials.");
  }
  const productCount = db.prepare("SELECT COUNT(*) as c FROM products").get();
  if (productCount.c === 0) {
    const cats = db.prepare("SELECT id, slug FROM categories").all();
    const catMap = new Map(cats.map((c) => [c.slug, c.id]));
    const insertProd = db.prepare(`
      INSERT INTO products (
        name, sku, category_id, description, price, cost_price, stock, image_url,
        featured, is_active, views, favorites, specs_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `);
    insertProd.run(
      'Aeterna Book Pro 14"',
      "EL-PRO-14",
      catMap.get("electronics"),
      "Milled from solid recycled aluminum with a 120Hz reference display, silent thermal architecture, and all-day 18-hour battery life.",
      1699,
      1180,
      18,
      "/src/assets/images/product_laptop_pro_1794591590610.jpg",
      1,
      428,
      94,
      JSON.stringify({ Display: '14.2" Liquid Reference', Memory: "24GB Unified", Storage: "1TB NVMe", Weight: "1.48 kg" })
    );
    insertProd.run(
      "Sonus Reference Wireless",
      "EL-SND-09",
      catMap.get("electronics"),
      "Precision-machined brushed titanium acoustic cups, studio-grade lossless Bluetooth, and adaptive noise isolation.",
      449,
      245,
      5,
      // Low stock!
      "/src/assets/images/product_studio_headphones_1794591590448.jpg",
      1,
      362,
      81,
      JSON.stringify({ Drivers: "45mm Beryllium", Battery: "42 Hours", Connectivity: "USB-C & Lossless BT", Material: "Brushed Titanium" })
    );
    insertProd.run(
      "Merino Architectural Overshirt",
      "AP-MER-22",
      catMap.get("apparel"),
      "Double-faced 420gsm Italian merino wool overshirt with horn buttons, concealed side pockets, and structured collar.",
      285,
      135,
      24,
      "/src/assets/images/product_merino_jacket_1794591591053.jpg",
      1,
      295,
      67,
      JSON.stringify({ Fabric: "100% Virgin Merino", Weight: "420 GSM", Fit: "Relaxed Tailored", Origin: "Milan Loom" })
    );
    insertProd.run(
      "Seasonal Orchard Reserve Crate",
      "FM-ORC-04",
      catMap.get("fresh-market"),
      "Hand-picked organic Honeycrisp apples, Sicilian blood oranges, and Anjou pears packed fresh every morning in reusable pale oak.",
      64,
      31,
      6,
      // Low stock!
      "/src/assets/images/product_organic_fruits_1794591591530.jpg",
      0,
      312,
      78,
      JSON.stringify({ Weight: "4.5 kg Assorted", Harvest: "24h Farm-to-Door", Certification: "Certified Organic", Packaging: "Pale Oak Crate" })
    );
    insertProd.run(
      "Barista Studio Dual-Boiler",
      "HL-ESP-01",
      catMap.get("home-living"),
      "PID temperature-stabilized brushed steel espresso workstation with walnut portafilter and commercial 9-bar pressure gauge.",
      890,
      510,
      11,
      "/src/assets/images/product_ceramic_espresso_1794591592000.jpg",
      1,
      274,
      63,
      JSON.stringify({ Boiler: "Dual PID Stainless", Pressure: "9-Bar Rotary", Portafilter: "58mm Walnut", Tank: "2.2L Removable" })
    );
    insertProd.run(
      "Aeterna Studio Desk Bundle",
      "EL-DSK-07",
      catMap.get("electronics"),
      "Complete minimalist creator setup pairing the anodized workstation, titanium acoustics, and ceramic espresso service.",
      2890,
      1920,
      4,
      // Low stock!
      "/src/assets/images/hero_flagship_showcase_1794591590470.jpg",
      0,
      198,
      52,
      JSON.stringify({ Includes: "Laptop + Headphones + Mug", Warranty: "3-Year Care", Finish: "Anodized Silver" })
    );
  }
  const orderCount = db.prepare("SELECT COUNT(*) as c FROM orders").get();
  if (orderCount.c === 0) {
    const prods = db.prepare("SELECT id, name, image_url, price, cost_price FROM products").all();
    const hamza = db.prepare("SELECT id FROM users WHERE username = 'hamza'").get();
    const now = /* @__PURE__ */ new Date();
    const fmtDate = (d) => d.toISOString().replace("T", " ").slice(0, 19);
    const sampleOrders = [
      {
        orderNumber: "ORD-1041",
        userId: hamza?.id ?? null,
        name: "Hamza",
        email: "hamza@example.com",
        phone: "+1 555-0142",
        address: "420 Cupertino Way",
        city: "San Jose",
        postal: "95129",
        status: "Delivered",
        daysAgo: 0,
        hoursAgo: 3,
        items: [{ prod: prods[0], qty: 1 }, { prod: prods[1], qty: 1 }]
      },
      {
        orderNumber: "ORD-1042",
        userId: null,
        name: "Elena Rostova",
        email: "elena.r@example.com",
        phone: "+1 555-0199",
        address: "88 Mercer Street",
        city: "New York",
        postal: "10012",
        status: "Processing",
        daysAgo: 0,
        hoursAgo: 1,
        items: [{ prod: prods[4], qty: 1 }, { prod: prods[3], qty: 2 }]
      },
      {
        orderNumber: "ORD-1038",
        userId: hamza?.id ?? null,
        name: "Hamza",
        email: "hamza@example.com",
        phone: "+1 555-0142",
        address: "420 Cupertino Way",
        city: "San Jose",
        postal: "95129",
        status: "Delivered",
        daysAgo: 4,
        hoursAgo: 0,
        items: [{ prod: prods[2], qty: 2 }]
      },
      {
        orderNumber: "ORD-1034",
        userId: null,
        name: "Marcus Vance",
        email: "mvance@example.com",
        phone: "+1 555-0177",
        address: "712 Abbott Kinney",
        city: "Los Angeles",
        postal: "90291",
        status: "Shipped",
        daysAgo: 9,
        hoursAgo: 0,
        items: [{ prod: prods[5], qty: 1 }]
      },
      {
        orderNumber: "ORD-1029",
        userId: null,
        name: "Sora Takahashi",
        email: "sora@example.com",
        phone: "+1 555-0165",
        address: "1520 Pine St",
        city: "Seattle",
        postal: "98101",
        status: "Delivered",
        daysAgo: 18,
        hoursAgo: 0,
        items: [{ prod: prods[1], qty: 2 }, { prod: prods[2], qty: 1 }]
      },
      {
        orderNumber: "ORD-1019",
        userId: null,
        name: "Clara Lindqvist",
        email: "clara@example.com",
        phone: "+1 555-0118",
        address: "305 Newbury St",
        city: "Boston",
        postal: "02115",
        status: "Delivered",
        daysAgo: 45,
        hoursAgo: 0,
        items: [{ prod: prods[0], qty: 1 }, { prod: prods[4], qty: 1 }]
      },
      {
        orderNumber: "ORD-1012",
        userId: null,
        name: "Daniel Okafor",
        email: "dokafor@example.com",
        phone: "+1 555-0134",
        address: "900 Michigan Ave",
        city: "Chicago",
        postal: "60611",
        status: "Delivered",
        daysAgo: 82,
        hoursAgo: 0,
        items: [{ prod: prods[3], qty: 3 }, { prod: prods[2], qty: 2 }]
      },
      {
        orderNumber: "ORD-1005",
        userId: null,
        name: "Nadia Al-Mansoor",
        email: "nadia@example.com",
        phone: "+1 555-0181",
        address: "2100 Ross Ave",
        city: "Dallas",
        postal: "75201",
        status: "Delivered",
        daysAgo: 130,
        hoursAgo: 0,
        items: [{ prod: prods[5], qty: 1 }, { prod: prods[1], qty: 1 }]
      }
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
        const d = new Date(now.getTime() - o.daysAgo * 864e5 - o.hoursAgo * 36e5);
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
          "INSERT OR IGNORE INTO browsing_history (user_id, product_id, viewed_at) VALUES (?, ?, ?)"
        );
        insertHist.run(hamza.id, prods[0].id, fmtDate(new Date(now.getTime() - 36e5)));
        insertHist.run(hamza.id, prods[1].id, fmtDate(new Date(now.getTime() - 72e5)));
        insertHist.run(hamza.id, prods[4].id, fmtDate(new Date(now.getTime() - 18e6)));
      }
    });
    seedTx();
  }
}

// server/app.ts
function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx > -1) {
      const k = part.slice(0, idx).trim();
      const rawVal = part.slice(idx + 1).trim();
      try {
        out[k] = decodeURIComponent(rawVal);
      } catch {
        out[k] = rawVal;
      }
    }
  }
  return out;
}
function extractToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies["aeterna_session"];
}
function slugifyCategory(name) {
  const slug = name.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/(^-|-$)/g, "");
  return slug || `dept-${Date.now().toString(36)}`;
}
function attachUser(req, _res, next) {
  try {
    const token = extractToken(req);
    const payload = verifySessionToken(token);
    if (payload) {
      let row;
      if (payload.username) {
        row = db.prepare(
          "SELECT id, name, username, email, role, created_at as createdAt FROM users WHERE lower(username) = lower(?)"
        ).get(payload.username);
      } else {
        row = db.prepare(
          "SELECT id, name, username, email, role, created_at as createdAt FROM users WHERE id = ?"
        ).get(payload.userId);
      }
      if (!row && payload.role === "customer" && payload.username && payload.email) {
        db.prepare(
          `INSERT OR IGNORE INTO users (name, username, email, password_hash, role)
           VALUES (?, ?, ?, ?, 'customer')`
        ).run(
          payload.name || payload.username,
          payload.username.toLowerCase(),
          payload.email.toLowerCase(),
          hashPassword(`session_sync_${payload.username}`)
        );
        row = db.prepare(
          "SELECT id, name, username, email, role, created_at as createdAt FROM users WHERE lower(username) = lower(?)"
        ).get(payload.username);
      }
      if (row && row.role === payload.role) {
        req.authUser = {
          id: Number(row.id),
          name: String(row.name),
          username: String(row.username),
          email: String(row.email),
          role: row.role,
          createdAt: String(row.createdAt)
        };
      }
    }
  } catch {
  }
  next();
}
function requireAuth(req, res, next) {
  if (!req.authUser) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  next();
}
function requireManager(req, res, next) {
  if (!req.authUser || req.authUser.role !== "manager") {
    res.status(403).json({ error: "Manager access required." });
    return;
  }
  next();
}
function mapProductRow(row) {
  let specs = {};
  try {
    specs = JSON.parse(String(row.specs_json || "{}"));
  } catch {
    specs = {};
  }
  return {
    id: Number(row.id),
    name: String(row.name),
    sku: String(row.sku),
    categoryId: Number(row.category_id),
    categoryName: row.category_name ? String(row.category_name) : void 0,
    categorySlug: row.category_slug ? String(row.category_slug) : void 0,
    categoryOpen: row.category_open !== void 0 ? Boolean(row.category_open) : void 0,
    description: String(row.description),
    price: Number(row.price),
    costPrice: Number(row.cost_price),
    stock: Number(row.stock),
    imageUrl: String(row.image_url || ""),
    featured: Boolean(row.featured),
    isActive: Boolean(row.is_active),
    views: Number(row.views),
    favorites: Number(row.favorites),
    specs,
    createdAt: String(row.created_at)
  };
}
function mapSettingsRow(row) {
  return {
    id: Number(row.id),
    storeName: String(row.store_name),
    tagline: String(row.tagline),
    logoUrl: String(row.logo_url || ""),
    heroTitle: String(row.hero_title),
    heroSubtitle: String(row.hero_subtitle),
    heroImageUrl: String(row.hero_image_url),
    currency: String(row.currency),
    lowStockThreshold: Number(row.low_stock_threshold),
    freeShippingThreshold: Number(row.free_shipping_threshold),
    updatedAt: String(row.updated_at)
  };
}
function getOrdersWithItems(whereClause = "", params = []) {
  const orders = db.prepare(
    `SELECT id, order_number as orderNumber, user_id as userId, customer_name as customerName,
              customer_email as customerEmail, customer_phone as customerPhone,
              shipping_address as shippingAddress, shipping_city as shippingCity,
              shipping_postal_code as shippingPostalCode, payment_method as paymentMethod,
              payment_screenshot as paymentScreenshot,
              subtotal, shipping_fee as shippingFee, total_amount as totalAmount,
              total_profit as totalProfit, status, created_at as createdAt
       FROM orders ${whereClause}
       ORDER BY datetime(created_at) DESC, id DESC`
  ).all(...params);
  const itemStmt = db.prepare(
    `SELECT id, order_id as orderId, product_id as productId, product_name as productName,
            product_image as productImage, unit_price as unitPrice, unit_cost as unitCost,
            quantity, line_total as lineTotal
     FROM order_items WHERE order_id = ?`
  );
  return orders.map((o) => ({
    ...o,
    id: Number(o.id),
    userId: o.userId !== null && o.userId !== void 0 ? Number(o.userId) : null,
    subtotal: Number(o.subtotal),
    shippingFee: Number(o.shippingFee),
    totalAmount: Number(o.totalAmount),
    totalProfit: Number(o.totalProfit),
    items: itemStmt.all(o.id).map((it) => ({
      ...it,
      id: Number(it.id),
      orderId: Number(it.orderId),
      productId: Number(it.productId),
      unitPrice: Number(it.unitPrice),
      unitCost: Number(it.unitCost),
      quantity: Number(it.quantity),
      lineTotal: Number(it.lineTotal)
    }))
  }));
}
function generateUniqueOrderNumber() {
  const checkStmt = db.prepare("SELECT 1 FROM orders WHERE order_number = ?");
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = `ORD-${1050 + Math.floor(Math.random() * 8900)}`;
    if (!checkStmt.get(candidate)) {
      return candidate;
    }
  }
  return `ORD-${Date.now().toString().slice(-6)}`;
}
function createApiApp() {
  initDatabase();
  const app = express();
  app.set("trust proxy", 1);
  const allowedOrigins = (process.env.ALLOWED_ORIGIN || "").split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const normalizedOrigin = origin ? origin.replace(/\/+$/, "") : "";
    const allowAny = allowedOrigins.length === 0 || allowedOrigins.includes("*");
    if (origin && (allowAny || allowedOrigins.includes(normalizedOrigin))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use((req, _res, next) => {
    const r = req;
    if (r.body !== void 0 && !r._body) {
      if (Buffer.isBuffer(r.body)) {
        const text = r.body.toString("utf8");
        if (text.trim()) {
          try {
            r.body = JSON.parse(text);
          } catch {
          }
        } else {
          r.body = {};
        }
        r._body = true;
      } else if (typeof r.body === "string") {
        if (r.body.trim()) {
          try {
            r.body = JSON.parse(r.body);
          } catch {
          }
        } else {
          r.body = {};
        }
        r._body = true;
      } else if (typeof r.body === "object" && r.body !== null) {
        r._body = true;
      }
    }
    next();
  });
  app.use(express.json({ limit: "12mb" }));
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(attachUser);
  const imagesDir = path2.resolve(process.cwd(), "src/assets/images");
  if (fs2.existsSync(imagesDir)) {
    app.use("/src/assets/images", express.static(imagesDir));
    app.use("/assets/images", express.static(imagesDir));
  }
  app.get("/api", (_req, res) => {
    res.json({ ok: true, service: "Aeterna Commerce API", engine: db.engine });
  });
  app.get("/api/health", (_req, res) => {
    const countRow = db.prepare("SELECT COUNT(*) as c FROM products").get();
    res.json({
      ok: true,
      db: db.engine,
      products: Number(countRow?.c ?? 0),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.post("/api/auth/register", (req, res) => {
    const { name, username, email, password } = req.body ?? {};
    if (!name || !username || !email || !password) {
      res.status(400).json({ error: "Name, username, email, and password are required." });
      return;
    }
    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();
    if (cleanUsername === "manager" || cleanUsername === "admin") {
      res.status(400).json({ error: "This username is reserved." });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters." });
      return;
    }
    const existing = db.prepare("SELECT id FROM users WHERE lower(username) = ? OR lower(email) = ?").get(cleanUsername, cleanEmail);
    if (existing) {
      res.status(409).json({ error: "An account with that username or email already exists." });
      return;
    }
    const info = db.prepare(
      `INSERT INTO users (name, username, email, password_hash, role)
         VALUES (?, ?, ?, ?, 'customer')`
    ).run(String(name).trim(), cleanUsername, cleanEmail, hashPassword(String(password)));
    const userRow = db.prepare(
      "SELECT id, name, username, email, role, created_at as createdAt FROM users WHERE id = ?"
    ).get(info.lastInsertRowid);
    const user = {
      id: Number(userRow.id),
      name: String(userRow.name),
      username: String(userRow.username),
      email: String(userRow.email),
      role: userRow.role,
      createdAt: String(userRow.createdAt)
    };
    const token = createSessionToken(user);
    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.cookie("aeterna_session", token, {
      httpOnly: true,
      sameSite: isHttps ? "none" : "lax",
      secure: isHttps,
      maxAge: 7 * 24 * 60 * 60 * 1e3
    });
    res.status(201).json({ user, token });
  });
  app.post("/api/auth/login", (req, res) => {
    const { identifier, password, expectedRole } = req.body ?? {};
    if (!identifier || !password) {
      res.status(400).json({ error: "Username/email and password are required." });
      return;
    }
    const clean = String(identifier).trim().toLowerCase();
    const managerAliases = /* @__PURE__ */ new Set(["admin", "admin@aeterna.store", "store manager", "storemanager"]);
    const lookup = managerAliases.has(clean) ? "manager" : clean;
    const userRow = db.prepare(
      `SELECT id, name, username, email, password_hash, role, created_at as createdAt
         FROM users WHERE lower(username) = ? OR lower(email) = ?`
    ).get(lookup, lookup);
    const rawPassword = String(password);
    const trimmedPassword = rawPassword.trim();
    const passwordMatches = !!userRow && (verifyPassword(rawPassword, userRow.password_hash) || trimmedPassword !== rawPassword && verifyPassword(trimmedPassword, userRow.password_hash));
    if (!userRow || !passwordMatches) {
      res.status(401).json({ error: "Invalid credentials. Please check your username and password." });
      return;
    }
    if (expectedRole && userRow.role !== expectedRole) {
      res.status(403).json({
        error: expectedRole === "manager" ? "This portal is restricted to the Store Manager." : "Use the Manager button in the top navigation bar to sign in as Store Manager."
      });
      return;
    }
    const safeUser = {
      id: Number(userRow.id),
      name: String(userRow.name),
      username: String(userRow.username),
      email: String(userRow.email),
      role: userRow.role,
      createdAt: String(userRow.createdAt)
    };
    const token = createSessionToken(safeUser);
    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.cookie("aeterna_session", token, {
      httpOnly: true,
      sameSite: isHttps ? "none" : "lax",
      secure: isHttps,
      maxAge: 7 * 24 * 60 * 60 * 1e3
    });
    res.json({ user: safeUser, token });
  });
  app.post("/api/auth/logout", (req, res) => {
    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.clearCookie("aeterna_session", {
      httpOnly: true,
      sameSite: isHttps ? "none" : "lax",
      secure: isHttps
    });
    res.json({ ok: true });
  });
  app.get("/api/auth/me", (req, res) => {
    res.json({ user: req.authUser || null });
  });
  app.post("/api/auth/manager/change-password", requireManager, (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    const nextPassword = String(newPassword ?? "").trim();
    if (!currentPassword || !nextPassword) {
      res.status(400).json({ error: "Current password and new password are required." });
      return;
    }
    if (nextPassword.length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters." });
      return;
    }
    const row = db.prepare("SELECT id, password_hash FROM users WHERE id = ?").get(req.authUser.id);
    if (!row) {
      res.status(404).json({ error: "Manager account not found." });
      return;
    }
    const rawCurrent = String(currentPassword);
    const currentMatches = verifyPassword(rawCurrent, row.password_hash) || rawCurrent.trim() !== rawCurrent && verifyPassword(rawCurrent.trim(), row.password_hash);
    if (!currentMatches) {
      res.status(400).json({ error: "Current password is incorrect." });
      return;
    }
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
      hashPassword(nextPassword),
      row.id
    );
    res.json({ ok: true, message: "Manager password updated successfully." });
  });
  app.get("/api/storefront", (_req, res) => {
    const settingsRow = db.prepare("SELECT * FROM settings WHERE id = 1").get();
    const categories = db.prepare(
      `SELECT c.id, c.name, c.slug, c.description, c.is_open as isOpen, c.created_at as createdAt,
                COUNT(p.id) as productCount
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
         WHERE c.is_open = 1
         GROUP BY c.id
         ORDER BY c.id ASC`
    ).all().map((row) => ({
      ...row,
      id: Number(row.id),
      isOpen: Boolean(row.isOpen),
      productCount: Number(row.productCount)
    }));
    const products = db.prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug, c.is_open as category_open
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE p.is_active = 1 AND c.is_open = 1
         ORDER BY p.featured DESC, p.id DESC`
    ).all().map((r) => mapProductRow(r));
    res.json({
      settings: mapSettingsRow(settingsRow),
      categories,
      products
    });
  });
  app.get("/api/products", (req, res) => {
    const search = String(req.query.search || "").trim().toLowerCase();
    const category = String(req.query.category || "all").trim().toLowerCase();
    const sort = String(req.query.sort || "featured");
    const conditions = ["p.is_active = 1", "c.is_open = 1"];
    const params = [];
    if (category && category !== "all") {
      conditions.push("lower(c.slug) = ?");
      params.push(category);
    }
    if (search) {
      conditions.push("(lower(p.name) LIKE ? OR lower(p.description) LIKE ? OR lower(c.name) LIKE ?)");
      const pat = `%${search}%`;
      params.push(pat, pat, pat);
    }
    let orderBy = "p.featured DESC, p.id DESC";
    if (sort === "price_asc") orderBy = "p.price ASC";
    else if (sort === "price_desc") orderBy = "p.price DESC";
    else if (sort === "popular") orderBy = "p.favorites DESC, p.views DESC";
    else if (sort === "newest") orderBy = "p.id DESC";
    const rows = db.prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug, c.is_open as category_open
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY ${orderBy}`
    ).all(...params);
    res.json({ products: rows.map(mapProductRow) });
  });
  app.get("/api/products/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    const row = db.prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug, c.is_open as category_open
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE p.id = ? AND p.is_active = 1 AND c.is_open = 1`
    ).get(id);
    if (!row) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    db.prepare("UPDATE products SET views = views + 1 WHERE id = ?").run(id);
    if (req.authUser && req.authUser.role === "customer") {
      db.prepare(
        `INSERT INTO browsing_history (user_id, product_id, viewed_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(user_id, product_id) DO UPDATE SET viewed_at = datetime('now')`
      ).run(req.authUser.id, id);
    }
    res.json({ product: mapProductRow({ ...row, views: Number(row.views) + 1 }) });
  });
  app.post("/api/products/:id/favorite", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    const info = db.prepare("UPDATE products SET favorites = favorites + 1 WHERE id = ?").run(id);
    if (info.changes === 0) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    const updated = db.prepare("SELECT favorites FROM products WHERE id = ?").get(id);
    res.json({ favorites: Number(updated.favorites) });
  });
  app.get("/api/history", requireAuth, (req, res) => {
    const rows = db.prepare(
      `SELECT bh.id as hist_id, bh.viewed_at as viewedAt, p.*, c.name as category_name, c.slug as category_slug, c.is_open as category_open
         FROM browsing_history bh
         JOIN products p ON p.id = bh.product_id
         JOIN categories c ON c.id = p.category_id
         WHERE bh.user_id = ? AND p.is_active = 1 AND c.is_open = 1
         ORDER BY datetime(bh.viewed_at) DESC
         LIMIT 12`
    ).all(req.authUser.id);
    const history = rows.map((r) => ({
      id: Number(r.hist_id),
      productId: Number(r.id),
      viewedAt: String(r.viewedAt),
      product: mapProductRow(r)
    }));
    res.json({ history });
  });
  app.post("/api/history", requireAuth, (req, res) => {
    const pid = Number(req.body?.productId);
    if (!Number.isInteger(pid) || pid <= 0) {
      res.status(400).json({ error: "Valid productId is required." });
      return;
    }
    const prodExists = db.prepare("SELECT id FROM products WHERE id = ?").get(pid);
    if (!prodExists) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    db.prepare(
      `INSERT INTO browsing_history (user_id, product_id, viewed_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(user_id, product_id) DO UPDATE SET viewed_at = datetime('now')`
    ).run(req.authUser.id, pid);
    res.json({ ok: true });
  });
  app.get("/api/customer/orders", requireAuth, (req, res) => {
    const orders = getOrdersWithItems("WHERE user_id = ?", [req.authUser.id]);
    res.json({ orders });
  });
  app.post("/api/orders", (req, res) => {
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      shippingCity,
      shippingPostalCode,
      paymentMethod,
      paymentScreenshot,
      items
    } = req.body ?? {};
    if (!customerName || !customerEmail || !customerPhone || !shippingAddress || !shippingCity || !shippingPostalCode || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Please complete all shipping fields and add at least one item." });
      return;
    }
    if (!paymentScreenshot || typeof paymentScreenshot !== "string" || !paymentScreenshot.trim()) {
      res.status(400).json({ error: "Please upload a screenshot of your payment to place the order." });
      return;
    }
    const settingsRow = db.prepare("SELECT free_shipping_threshold FROM settings WHERE id = 1").get();
    try {
      const createdOrder = db.transaction(() => {
        let subtotal = 0;
        let totalProfit = 0;
        const resolvedItems = [];
        for (const reqItem of items) {
          const pid = Number(reqItem.productId);
          const qty = Math.floor(Number(reqItem.quantity));
          if (!Number.isInteger(pid) || pid <= 0 || qty <= 0) {
            throw new Error("Invalid cart item quantity.");
          }
          const prod = db.prepare(
            `SELECT p.*, c.is_open as category_open
               FROM products p
               JOIN categories c ON c.id = p.category_id
               WHERE p.id = ?`
          ).get(pid);
          if (!prod || !prod.is_active || !prod.category_open) {
            throw new Error("One of the items in your bag is no longer available.");
          }
          const currentStock = Number(prod.stock);
          if (currentStock < qty) {
            throw new Error(`Insufficient stock for "${prod.name}". Only ${currentStock} left.`);
          }
          const unitPrice = Number(prod.price);
          const unitCost = Number(prod.cost_price);
          const lineTotal = unitPrice * qty;
          subtotal += lineTotal;
          totalProfit += (unitPrice - unitCost) * qty;
          db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(qty, pid);
          resolvedItems.push({
            productId: pid,
            name: String(prod.name),
            imageUrl: String(prod.image_url || ""),
            unitPrice,
            unitCost,
            quantity: qty,
            lineTotal
          });
        }
        const shippingFee = subtotal >= Number(settingsRow.free_shipping_threshold) ? 0 : 12;
        const totalAmount = subtotal + shippingFee;
        const orderNumber = generateUniqueOrderNumber();
        const info = db.prepare(
          `INSERT INTO orders (
               order_number, user_id, customer_name, customer_email, customer_phone,
               shipping_address, shipping_city, shipping_postal_code, payment_method, payment_screenshot,
               subtotal, shipping_fee, total_amount, total_profit, status
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`
        ).run(
          orderNumber,
          req.authUser ? req.authUser.id : null,
          String(customerName).trim(),
          String(customerEmail).trim(),
          String(customerPhone).trim(),
          String(shippingAddress).trim(),
          String(shippingCity).trim(),
          String(shippingPostalCode).trim(),
          String(paymentMethod || "Card / Online"),
          String(paymentScreenshot).trim(),
          subtotal,
          shippingFee,
          totalAmount,
          totalProfit
        );
        const orderId = Number(info.lastInsertRowid);
        const itemInsert = db.prepare(
          `INSERT INTO order_items (
             order_id, product_id, product_name, product_image, unit_price, unit_cost, quantity, line_total
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for (const item of resolvedItems) {
          itemInsert.run(
            orderId,
            item.productId,
            item.name,
            item.imageUrl,
            item.unitPrice,
            item.unitCost,
            item.quantity,
            item.lineTotal
          );
        }
        return getOrdersWithItems("WHERE id = ?", [orderId])[0];
      })();
      res.status(201).json({ order: createdOrder });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to place order.";
      res.status(400).json({ error: msg });
    }
  });
  app.get("/api/orders/track/:orderNumber", (req, res) => {
    const orderNumber = String(req.params.orderNumber || "").trim().toUpperCase();
    const matches = getOrdersWithItems("WHERE upper(order_number) = ?", [orderNumber]);
    if (matches.length === 0) {
      res.status(404).json({ error: `No order found matching ${orderNumber}.` });
      return;
    }
    res.json({ order: matches[0] });
  });
  app.get("/api/manager/analytics", requireManager, (req, res) => {
    const periodParam = String(req.query.period || "monthly");
    const period = ["daily", "monthly", "yearly"].includes(periodParam) ? periodParam : "monthly";
    const settings = db.prepare("SELECT low_stock_threshold FROM settings WHERE id = 1").get();
    let dateFilter = "datetime(created_at) >= datetime('now', '-30 days')";
    let groupExpr = "strftime('%m-%d', created_at)";
    if (period === "daily") {
      dateFilter = "date(created_at) = date('now')";
      groupExpr = "strftime('%H:00', created_at)";
    } else if (period === "yearly") {
      dateFilter = "strftime('%Y', created_at) = strftime('%Y', 'now')";
      groupExpr = "strftime('%Y-%m', created_at)";
    }
    const kpiRow = db.prepare(
      `SELECT
           COUNT(*) as ordersCount,
           COALESCE(SUM(total_amount), 0) as revenue,
           COALESCE(SUM(total_profit), 0) as income
         FROM orders
         WHERE status != 'Cancelled' AND ${dateFilter}`
    ).get();
    const unitsRow = db.prepare(
      `SELECT COALESCE(SUM(oi.quantity), 0) as unitsSold
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.status != 'Cancelled' AND ${dateFilter.replace(/created_at/g, "o.created_at")}`
    ).get();
    const lowStockProducts = db.prepare(
      `SELECT p.id, p.name, p.sku, c.name as categoryName, p.stock, p.price, p.image_url as imageUrl
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE p.stock <= ?
         ORDER BY p.stock ASC, p.id ASC`
    ).all(Number(settings.low_stock_threshold));
    const series = db.prepare(
      `SELECT ${groupExpr} as label,
                COUNT(*) as orders,
                COALESCE(SUM(total_amount), 0) as revenue,
                COALESCE(SUM(total_profit), 0) as income
         FROM orders
         WHERE status != 'Cancelled' AND ${dateFilter}
         GROUP BY label
         ORDER BY label ASC`
    ).all().map((s) => ({
      label: String(s.label),
      orders: Number(s.orders),
      revenue: Number(s.revenue),
      income: Number(s.income)
    }));
    const bestProducts = db.prepare(
      `SELECT p.id, p.name, c.name as categoryName, p.image_url as imageUrl, p.stock,
                COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.quantity ELSE 0 END), 0) as unitsSold,
                COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.line_total ELSE 0 END), 0) as revenue
         FROM products p
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN order_items oi ON oi.product_id = p.id
         LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'Cancelled'
         GROUP BY p.id
         ORDER BY unitsSold DESC, revenue DESC
         LIMIT 6`
    ).all();
    const favorableProducts = db.prepare(
      `SELECT p.id, p.name, c.name as categoryName, p.image_url as imageUrl, p.views, p.favorites, p.price
         FROM products p
         JOIN categories c ON c.id = p.category_id
         ORDER BY p.favorites DESC, p.views DESC
         LIMIT 6`
    ).all();
    const bestOrders = db.prepare(
      `SELECT o.id, o.order_number as orderNumber, o.customer_name as customerName,
                o.total_amount as totalAmount, o.status, o.created_at as createdAt,
                COALESCE(SUM(oi.quantity), 0) as itemCount
         FROM orders o
         LEFT JOIN order_items oi ON oi.order_id = o.id
         WHERE o.status != 'Cancelled'
         GROUP BY o.id
         ORDER BY o.total_amount DESC
         LIMIT 6`
    ).all();
    const categoryBreakdown = db.prepare(
      `SELECT c.name as categoryName,
                COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.line_total ELSE 0 END), 0) as revenue,
                COUNT(DISTINCT o.id) as ordersCount
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
         LEFT JOIN order_items oi ON oi.product_id = p.id
         LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'Cancelled'
         GROUP BY c.id
         ORDER BY revenue DESC`
    ).all();
    const ordersCount = Number(kpiRow.ordersCount);
    const revenue = Number(kpiRow.revenue);
    const avgOrderValue = ordersCount > 0 ? revenue / ordersCount : 0;
    res.json({
      period,
      kpis: {
        ordersCount,
        revenue,
        income: Number(kpiRow.income),
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
        unitsSold: Number(unitsRow.unitsSold),
        lowStockCount: lowStockProducts.length
      },
      series,
      bestProducts,
      favorableProducts,
      bestOrders,
      lowStockProducts,
      categoryBreakdown
    });
  });
  app.get("/api/manager/products", requireManager, (_req, res) => {
    const rows = db.prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug, c.is_open as category_open
         FROM products p
         JOIN categories c ON c.id = p.category_id
         ORDER BY p.id DESC`
    ).all();
    res.json({ products: rows.map(mapProductRow) });
  });
  app.post("/api/manager/products", requireManager, (req, res) => {
    const { name, sku, categoryId, description, price, costPrice, stock, imageUrl, featured, isActive, specs } = req.body ?? {};
    if (!name || !categoryId || price === void 0 || stock === void 0) {
      res.status(400).json({ error: "Name, category, price, and stock are required." });
      return;
    }
    const cleanSku = String(sku || `SKU-${Date.now().toString().slice(-6)}`).trim().toUpperCase();
    const numPrice = Number(price);
    const numCost = costPrice !== void 0 ? Number(costPrice) : Number((numPrice * 0.58).toFixed(2));
    const numStock = Math.max(0, Math.floor(Number(stock)));
    try {
      const info = db.prepare(
        `INSERT INTO products (
             name, sku, category_id, description, price, cost_price, stock, image_url,
             featured, is_active, specs_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        String(name).trim(),
        cleanSku,
        Number(categoryId),
        String(description || "Precision-crafted store addition."),
        numPrice,
        numCost,
        numStock,
        String(imageUrl || ""),
        featured ? 1 : 0,
        isActive === false ? 0 : 1,
        JSON.stringify(specs && typeof specs === "object" ? specs : {})
      );
      const created = db.prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug, c.is_open as category_open
           FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?`
      ).get(info.lastInsertRowid);
      res.status(201).json({ product: mapProductRow(created) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to create product.";
      res.status(400).json({ error: msg.includes("UNIQUE") ? "SKU already exists." : msg });
    }
  });
  app.put("/api/manager/products/:id", requireManager, (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    if (!existing) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    const b = req.body ?? {};
    try {
      db.prepare(
        `UPDATE products SET
           name = ?, sku = ?, category_id = ?, description = ?,
           price = ?, cost_price = ?, stock = ?, image_url = ?,
           featured = ?, is_active = ?, specs_json = ?
         WHERE id = ?`
      ).run(
        b.name !== void 0 ? String(b.name).trim() : existing.name,
        b.sku !== void 0 ? String(b.sku).trim().toUpperCase() : existing.sku,
        b.categoryId !== void 0 ? Number(b.categoryId) : existing.category_id,
        b.description !== void 0 ? String(b.description) : existing.description,
        b.price !== void 0 ? Number(b.price) : existing.price,
        b.costPrice !== void 0 ? Number(b.costPrice) : existing.cost_price,
        b.stock !== void 0 ? Math.max(0, Math.floor(Number(b.stock))) : existing.stock,
        b.imageUrl !== void 0 ? String(b.imageUrl) : existing.image_url,
        b.featured !== void 0 ? b.featured ? 1 : 0 : existing.featured,
        b.isActive !== void 0 ? b.isActive ? 1 : 0 : existing.is_active,
        b.specs !== void 0 ? JSON.stringify(b.specs) : existing.specs_json,
        id
      );
      const updated = db.prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug, c.is_open as category_open
           FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?`
      ).get(id);
      res.json({ product: mapProductRow(updated) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to update product.";
      res.status(400).json({ error: msg.includes("UNIQUE") ? "SKU already exists." : msg });
    }
  });
  app.delete("/api/manager/products/:id", requireManager, (req, res) => {
    const id = Number(req.params.id);
    const hasOrders = db.prepare("SELECT id FROM order_items WHERE product_id = ? LIMIT 1").get(id);
    if (hasOrders) {
      db.prepare("UPDATE products SET is_active = 0 WHERE id = ?").run(id);
      res.json({ ok: true, archived: true });
      return;
    }
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    res.json({ ok: true, archived: false });
  });
  app.get("/api/manager/categories", requireManager, (_req, res) => {
    const rows = db.prepare(
      `SELECT c.id, c.name, c.slug, c.description, c.is_open as isOpen, c.created_at as createdAt,
                COUNT(p.id) as productCount
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
         GROUP BY c.id
         ORDER BY c.id ASC`
    ).all().map((r) => ({
      ...r,
      id: Number(r.id),
      isOpen: Boolean(r.isOpen),
      productCount: Number(r.productCount)
    }));
    res.json({ categories: rows });
  });
  app.post("/api/manager/categories", requireManager, (req, res) => {
    const { name, description, isOpen } = req.body ?? {};
    if (!name || !String(name).trim()) {
      res.status(400).json({ error: "Category name is required." });
      return;
    }
    const cleanName = String(name).trim();
    const slug = slugifyCategory(cleanName);
    try {
      const info = db.prepare("INSERT INTO categories (name, slug, description, is_open) VALUES (?, ?, ?, ?)").run(cleanName, slug, String(description || ""), isOpen === false ? 0 : 1);
      const created = db.prepare(
        "SELECT id, name, slug, description, is_open as isOpen, created_at as createdAt FROM categories WHERE id = ?"
      ).get(info.lastInsertRowid);
      res.status(201).json({
        category: {
          ...created,
          id: Number(created.id),
          isOpen: Boolean(created.isOpen),
          productCount: 0
        }
      });
    } catch {
      res.status(409).json({ error: "Category already exists." });
    }
  });
  app.put("/api/manager/categories/:id", requireManager, (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare("SELECT * FROM categories WHERE id = ?").get(id);
    if (!existing) {
      res.status(404).json({ error: "Category not found." });
      return;
    }
    const b = req.body ?? {};
    const nextName = b.name !== void 0 ? String(b.name).trim() : String(existing.name);
    if (!nextName) {
      res.status(400).json({ error: "Category name cannot be empty." });
      return;
    }
    const nextSlug = slugifyCategory(nextName);
    try {
      db.prepare("UPDATE categories SET name = ?, slug = ?, description = ?, is_open = ? WHERE id = ?").run(
        nextName,
        nextSlug,
        b.description !== void 0 ? String(b.description) : existing.description,
        b.isOpen !== void 0 ? b.isOpen ? 1 : 0 : existing.is_open,
        id
      );
      const updated = db.prepare(
        "SELECT id, name, slug, description, is_open as isOpen, created_at as createdAt FROM categories WHERE id = ?"
      ).get(id);
      res.json({
        category: { ...updated, id: Number(updated.id), isOpen: Boolean(updated.isOpen) }
      });
    } catch {
      res.status(409).json({ error: "Another category with that name already exists." });
    }
  });
  app.delete("/api/manager/categories/:id", requireManager, (req, res) => {
    const id = Number(req.params.id);
    const hasProd = db.prepare("SELECT id FROM products WHERE category_id = ? LIMIT 1").get(id);
    if (hasProd) {
      res.status(400).json({
        error: "Cannot delete category with existing products. Close it or reassign products first."
      });
      return;
    }
    db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    res.json({ ok: true });
  });
  app.get("/api/manager/orders", requireManager, (_req, res) => {
    res.json({ orders: getOrdersWithItems() });
  });
  app.put("/api/manager/orders/:id/status", requireManager, (req, res) => {
    const id = Number(req.params.id);
    const nextStatus = String(req.body?.status || "");
    const valid = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
    if (!valid.includes(nextStatus)) {
      res.status(400).json({ error: "Invalid order status." });
      return;
    }
    const existing = db.prepare("SELECT id, status FROM orders WHERE id = ?").get(id);
    if (!existing) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    db.transaction(() => {
      if (existing.status !== "Cancelled" && nextStatus === "Cancelled") {
        const items = db.prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?").all(id);
        const restoreStmt = db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
        for (const item of items) {
          restoreStmt.run(Number(item.quantity), Number(item.product_id));
        }
      } else if (existing.status === "Cancelled" && nextStatus !== "Cancelled") {
        const items = db.prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?").all(id);
        const deductStmt = db.prepare(
          "UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?"
        );
        for (const item of items) {
          deductStmt.run(Number(item.quantity), Number(item.product_id));
        }
      }
      db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(nextStatus, id);
    })();
    res.json({ order: getOrdersWithItems("WHERE id = ?", [id])[0] });
  });
  app.put("/api/manager/settings", requireManager, (req, res) => {
    const current = db.prepare("SELECT * FROM settings WHERE id = 1").get();
    const b = req.body ?? {};
    db.prepare(
      `UPDATE settings SET
         store_name = ?, tagline = ?, logo_url = ?, hero_title = ?, hero_subtitle = ?,
         hero_image_url = ?, low_stock_threshold = ?, free_shipping_threshold = ?,
         updated_at = datetime('now')
       WHERE id = 1`
    ).run(
      b.storeName !== void 0 ? String(b.storeName).trim() || "Aeterna" : current.store_name,
      b.tagline !== void 0 ? String(b.tagline) : current.tagline,
      b.logoUrl !== void 0 ? String(b.logoUrl) : current.logo_url,
      b.heroTitle !== void 0 ? String(b.heroTitle) : current.hero_title,
      b.heroSubtitle !== void 0 ? String(b.heroSubtitle) : current.hero_subtitle,
      b.heroImageUrl !== void 0 ? String(b.heroImageUrl) : current.hero_image_url,
      b.lowStockThreshold !== void 0 ? Math.max(1, Number(b.lowStockThreshold)) : current.low_stock_threshold,
      b.freeShippingThreshold !== void 0 ? Math.max(0, Number(b.freeShippingThreshold)) : current.free_shipping_threshold
    );
    const updated = db.prepare("SELECT * FROM settings WHERE id = 1").get();
    res.json({ settings: mapSettingsRow(updated) });
  });
  app.all("/api/*", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
  });
  app.use((err, _req, res, _next) => {
    console.error("[API Error]", err);
    if (res.headersSent) return;
    const message = err instanceof Error ? err.message : "Internal server error.";
    res.status(500).json({ error: message });
  });
  return app;
}
export {
  createApiApp
};
