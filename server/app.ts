import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  db,
  initDatabase,
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
} from './db.ts';

interface AuthRequest extends Request {
  authUser?: {
    id: number;
    name: string;
    username: string;
    email: string;
    role: 'customer' | 'manager';
    createdAt: string;
  };
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const k = part.slice(0, idx).trim();
      const v = decodeURIComponent(part.slice(idx + 1).trim());
      out[k] = v;
    }
  }
  return out;
}

function extractToken(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies['aeterna_session'];
}

function attachUser(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  const payload = verifySessionToken(token);
  if (payload) {
    const row = db
      .prepare('SELECT id, name, username, email, role, created_at as createdAt FROM users WHERE id = ?')
      .get(payload.userId) as AuthRequest['authUser'] | undefined;
    if (row) {
      req.authUser = row;
    }
  }
  next();
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.authUser) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  next();
}

function requireManager(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.authUser || req.authUser.role !== 'manager') {
    res.status(403).json({ error: 'Manager access required.' });
    return;
  }
  next();
}

function mapProductRow(row: Record<string, unknown>) {
  let specs: Record<string, string> = {};
  try {
    specs = JSON.parse(String(row.specs_json || '{}'));
  } catch {
    specs = {};
  }
  return {
    id: Number(row.id),
    name: String(row.name),
    sku: String(row.sku),
    categoryId: Number(row.category_id),
    categoryName: row.category_name ? String(row.category_name) : undefined,
    categorySlug: row.category_slug ? String(row.category_slug) : undefined,
    categoryOpen: row.category_open !== undefined ? Boolean(row.category_open) : undefined,
    description: String(row.description),
    price: Number(row.price),
    costPrice: Number(row.cost_price),
    stock: Number(row.stock),
    imageUrl: String(row.image_url || ''),
    featured: Boolean(row.featured),
    isActive: Boolean(row.is_active),
    views: Number(row.views),
    favorites: Number(row.favorites),
    specs,
    createdAt: String(row.created_at),
  };
}

function mapSettingsRow(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    storeName: String(row.store_name),
    tagline: String(row.tagline),
    logoUrl: String(row.logo_url || ''),
    heroTitle: String(row.hero_title),
    heroSubtitle: String(row.hero_subtitle),
    heroImageUrl: String(row.hero_image_url),
    currency: String(row.currency),
    lowStockThreshold: Number(row.low_stock_threshold),
    freeShippingThreshold: Number(row.free_shipping_threshold),
    updatedAt: String(row.updated_at),
  };
}

function getOrdersWithItems(whereClause = '', params: unknown[] = []) {
  const orders = db
    .prepare(
      `SELECT id, order_number as orderNumber, user_id as userId, customer_name as customerName,
              customer_email as customerEmail, customer_phone as customerPhone,
              shipping_address as shippingAddress, shipping_city as shippingCity,
              shipping_postal_code as shippingPostalCode, payment_method as paymentMethod,
              payment_screenshot as paymentScreenshot,
              subtotal, shipping_fee as shippingFee, total_amount as totalAmount,
              total_profit as totalProfit, status, created_at as createdAt
       FROM orders ${whereClause}
       ORDER BY datetime(created_at) DESC, id DESC`
    )
    .all(...params) as Array<Record<string, unknown>>;

  const itemStmt = db.prepare(
    `SELECT id, order_id as orderId, product_id as productId, product_name as productName,
            product_image as productImage, unit_price as unitPrice, unit_cost as unitCost,
            quantity, line_total as lineTotal
     FROM order_items WHERE order_id = ?`
  );

  return orders.map((o) => ({
    ...o,
    items: itemStmt.all(o.id),
  }));
}

export function createApiApp() {
  initDatabase();

  const app = express();
  app.set('trust proxy', 1);

  // Support both same-origin and cross-origin (Vercel frontend -> Cloud Run backend)
  const allowedOrigins = (process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: '12mb' }));
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(attachUser);

  // Serve generated images cleanly in local/Node deployments
  const imagesDir = path.resolve(process.cwd(), 'src/assets/images');
  if (fs.existsSync(imagesDir)) {
    app.use('/src/assets/images', express.static(imagesDir));
    app.use('/assets/images', express.static(imagesDir));
  }

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, db: 'sqlite', timestamp: new Date().toISOString() });
  });

  // ==================== AUTH ROUTES ====================
  app.post('/api/auth/register', (req: AuthRequest, res: Response) => {
    const { name, username, email, password } = req.body ?? {};
    if (!name || !username || !email || !password) {
      res.status(400).json({ error: 'Name, username, email, and password are required.' });
      return;
    }
    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();
    if (cleanUsername === 'manager' || cleanUsername === 'admin') {
      res.status(400).json({ error: 'This username is reserved.' });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const existing = db
      .prepare('SELECT id FROM users WHERE lower(username) = ? OR lower(email) = ?')
      .get(cleanUsername, cleanEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with that username or email already exists.' });
      return;
    }

    const info = db
      .prepare(
        `INSERT INTO users (name, username, email, password_hash, role)
         VALUES (?, ?, ?, ?, 'customer')`
      )
      .run(String(name).trim(), cleanUsername, cleanEmail, hashPassword(String(password)));

    const user = db
      .prepare('SELECT id, name, username, email, role, created_at as createdAt FROM users WHERE id = ?')
      .get(info.lastInsertRowid) as NonNullable<AuthRequest['authUser']>;

    const token = createSessionToken(user.id, user.role);
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('aeterna_session', token, {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json({ user, token });
  });

  app.post('/api/auth/login', (req: AuthRequest, res: Response) => {
    const { identifier, password, expectedRole } = req.body ?? {};
    if (!identifier || !password) {
      res.status(400).json({ error: 'Username/email and password are required.' });
      return;
    }
    const clean = String(identifier).trim().toLowerCase();
    const managerAliases = new Set(['admin', 'admin@aeterna.store', 'store manager', 'storemanager']);
    const lookup = managerAliases.has(clean) ? 'manager' : clean;

    const userRow = db
      .prepare(
        `SELECT id, name, username, email, password_hash, role, created_at as createdAt
         FROM users WHERE lower(username) = ? OR lower(email) = ?`
      )
      .get(lookup, lookup) as
      | (NonNullable<AuthRequest['authUser']> & { password_hash: string })
      | undefined;

    const rawPassword = String(password);
    const trimmedPassword = rawPassword.trim();
    const passwordMatches =
      !!userRow &&
      (verifyPassword(rawPassword, userRow.password_hash) ||
        (trimmedPassword !== rawPassword && verifyPassword(trimmedPassword, userRow.password_hash)));

    if (!userRow || !passwordMatches) {
      res.status(401).json({ error: 'Invalid credentials. Please check your username and password.' });
      return;
    }

    if (expectedRole && userRow.role !== expectedRole) {
      res.status(403).json({
        error:
          expectedRole === 'manager'
            ? 'This portal is restricted to the Store Manager.'
            : 'Use the Manager button in the top navigation bar to sign in as Store Manager.',
      });
      return;
    }

    const token = createSessionToken(userRow.id, userRow.role);
    const { password_hash: _ignored, ...safeUser } = userRow;
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

    res.cookie('aeterna_session', token, {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ user: safeUser, token });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.clearCookie('aeterna_session', {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
    });
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req: AuthRequest, res: Response) => {
    res.json({ user: req.authUser || null });
  });

  app.post('/api/auth/manager/change-password', requireManager, (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body ?? {};
    const nextPassword = String(newPassword ?? '').trim();
    if (!currentPassword || !nextPassword) {
      res.status(400).json({ error: 'Current password and new password are required.' });
      return;
    }
    if (nextPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }
    const row = db
      .prepare('SELECT id, password_hash FROM users WHERE id = ?')
      .get(req.authUser!.id) as { id: number; password_hash: string };

    const rawCurrent = String(currentPassword);
    const currentMatches =
      verifyPassword(rawCurrent, row.password_hash) ||
      (rawCurrent.trim() !== rawCurrent && verifyPassword(rawCurrent.trim(), row.password_hash));

    if (!currentMatches) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
      hashPassword(nextPassword),
      row.id
    );
    res.json({ ok: true, message: 'Manager password updated successfully.' });
  });

  // ==================== PUBLIC STOREFRONT ====================
  app.get('/api/storefront', (_req: Request, res: Response) => {
    const settingsRow = db.prepare('SELECT * FROM settings WHERE id = 1').get() as Record<string, unknown>;
    const categories = db
      .prepare(
        `SELECT c.id, c.name, c.slug, c.description, c.is_open as isOpen, c.created_at as createdAt,
                COUNT(p.id) as productCount
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
         WHERE c.is_open = 1
         GROUP BY c.id
         ORDER BY c.id ASC`
      )
      .all()
      .map((c: unknown) => {
        const row = c as Record<string, unknown>;
        return {
          ...row,
          isOpen: Boolean(row.isOpen),
          productCount: Number(row.productCount),
        };
      });

    const products = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug, c.is_open as category_open
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE p.is_active = 1 AND c.is_open = 1
         ORDER BY p.featured DESC, p.id DESC`
      )
      .all()
      .map((r) => mapProductRow(r as Record<string, unknown>));

    res.json({
      settings: mapSettingsRow(settingsRow),
      categories,
      products,
    });
  });

  app.get('/api/products', (req: Request, res: Response) => {
    const search = String(req.query.search || '').trim().toLowerCase();
    const category = String(req.query.category || 'all').trim().toLowerCase();
    const sort = String(req.query.sort || 'featured');

    const conditions = ['p.is_active = 1', 'c.is_open = 1'];
    const params: unknown[] = [];

    if (category && category !== 'all') {
      conditions.push('lower(c.slug) = ?');
      params.push(category);
    }

    if (search) {
      conditions.push('(lower(p.name) LIKE ? OR lower(p.description) LIKE ? OR lower(c.name) LIKE ?)');
      const pat = `%${search}%`;
      params.push(pat, pat, pat);
    }

    let orderBy = 'p.featured DESC, p.id DESC';
    if (sort === 'price_asc') orderBy = 'p.price ASC';
    else if (sort === 'price_desc') orderBy = 'p.price DESC';
    else if (sort === 'popular') orderBy = 'p.favorites DESC, p.views DESC';
    else if (sort === 'newest') orderBy = 'p.id DESC';

    const rows = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug, c.is_open as category_open
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY ${orderBy}`
      )
      .all(...params) as Array<Record<string, unknown>>;

    res.json({ products: rows.map(mapProductRow) });
  });

  app.get('/api/products/:id', (req: AuthRequest, res: Response) => {
    const id = Number(req.params.id);
    const row = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug, c.is_open as category_open
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE p.id = ? AND p.is_active = 1 AND c.is_open = 1`
      )
      .get(id) as Record<string, unknown> | undefined;

    if (!row) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    db.prepare('UPDATE products SET views = views + 1 WHERE id = ?').run(id);
    if (req.authUser && req.authUser.role === 'customer') {
      db.prepare(
        `INSERT INTO browsing_history (user_id, product_id, viewed_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(user_id, product_id) DO UPDATE SET viewed_at = datetime('now')`
      ).run(req.authUser.id, id);
    }

    res.json({ product: mapProductRow({ ...row, views: Number(row.views) + 1 }) });
  });

  app.post('/api/products/:id/favorite', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const info = db.prepare('UPDATE products SET favorites = favorites + 1 WHERE id = ?').run(id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const updated = db.prepare('SELECT favorites FROM products WHERE id = ?').get(id) as { favorites: number };
    res.json({ favorites: updated.favorites });
  });

  // ==================== CUSTOMER HISTORY & ORDERS ====================
  app.get('/api/history', requireAuth, (req: AuthRequest, res: Response) => {
    const rows = db
      .prepare(
        `SELECT bh.id as hist_id, bh.viewed_at as viewedAt, p.*, c.name as category_name, c.slug as category_slug, c.is_open as category_open
         FROM browsing_history bh
         JOIN products p ON p.id = bh.product_id
         JOIN categories c ON c.id = p.category_id
         WHERE bh.user_id = ? AND p.is_active = 1 AND c.is_open = 1
         ORDER BY datetime(bh.viewed_at) DESC
         LIMIT 12`
      )
      .all(req.authUser!.id) as Array<Record<string, unknown>>;

    const history = rows.map((r) => ({
      id: Number(r.hist_id),
      productId: Number(r.id),
      viewedAt: String(r.viewedAt),
      product: mapProductRow(r),
    }));
    res.json({ history });
  });

  app.post('/api/history', requireAuth, (req: AuthRequest, res: Response) => {
    const { productId } = req.body ?? {};
    if (!productId) {
      res.status(400).json({ error: 'productId is required.' });
      return;
    }
    db.prepare(
      `INSERT INTO browsing_history (user_id, product_id, viewed_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(user_id, product_id) DO UPDATE SET viewed_at = datetime('now')`
    ).run(req.authUser!.id, Number(productId));
    res.json({ ok: true });
  });

  app.get('/api/customer/orders', requireAuth, (req: AuthRequest, res: Response) => {
    const orders = getOrdersWithItems('WHERE user_id = ?', [req.authUser!.id]);
    res.json({ orders });
  });

  app.post('/api/orders', (req: AuthRequest, res: Response) => {
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      shippingCity,
      shippingPostalCode,
      paymentMethod,
      paymentScreenshot,
      items,
    } = req.body ?? {};

    if (
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !shippingAddress ||
      !shippingCity ||
      !shippingPostalCode ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      res.status(400).json({ error: 'Please complete all shipping fields and add at least one item.' });
      return;
    }

    if (!paymentScreenshot || typeof paymentScreenshot !== 'string' || !paymentScreenshot.trim()) {
      res.status(400).json({ error: 'Please upload a screenshot of your payment to place the order.' });
      return;
    }

    const settingsRow = db
      .prepare('SELECT free_shipping_threshold FROM settings WHERE id = 1')
      .get() as { free_shipping_threshold: number };

    try {
      const createdOrder = db.transaction(() => {
        let subtotal = 0;
        let totalProfit = 0;
        const resolvedItems: Array<{
          productId: number;
          name: string;
          imageUrl: string;
          unitPrice: number;
          unitCost: number;
          quantity: number;
          lineTotal: number;
        }> = [];

        for (const reqItem of items) {
          const pid = Number(reqItem.productId);
          const qty = Math.floor(Number(reqItem.quantity));
          if (!pid || qty <= 0) {
            throw new Error('Invalid cart item quantity.');
          }
          const prod = db
            .prepare(
              `SELECT p.*, c.is_open as category_open
               FROM products p
               JOIN categories c ON c.id = p.category_id
               WHERE p.id = ?`
            )
            .get(pid) as Record<string, unknown> | undefined;

          if (!prod || !prod.is_active || !prod.category_open) {
            throw new Error(`One of the items in your bag is no longer available.`);
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

          db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(qty, pid);

          resolvedItems.push({
            productId: pid,
            name: String(prod.name),
            imageUrl: String(prod.image_url || ''),
            unitPrice,
            unitCost,
            quantity: qty,
            lineTotal,
          });
        }

        const shippingFee = subtotal >= settingsRow.free_shipping_threshold ? 0 : 12;
        const totalAmount = subtotal + shippingFee;
        const orderNumber = `ORD-${1050 + Math.floor(Math.random() * 8900)}`;

        const info = db
          .prepare(
            `INSERT INTO orders (
               order_number, user_id, customer_name, customer_email, customer_phone,
               shipping_address, shipping_city, shipping_postal_code, payment_method, payment_screenshot,
               subtotal, shipping_fee, total_amount, total_profit, status
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`
          )
          .run(
            orderNumber,
            req.authUser ? req.authUser.id : null,
            String(customerName).trim(),
            String(customerEmail).trim(),
            String(customerPhone).trim(),
            String(shippingAddress).trim(),
            String(shippingCity).trim(),
            String(shippingPostalCode).trim(),
            String(paymentMethod || 'Card / Online'),
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

        return getOrdersWithItems('WHERE id = ?', [orderId])[0];
      })();

      res.status(201).json({ order: createdOrder });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to place order.';
      res.status(400).json({ error: msg });
    }
  });

  app.get('/api/orders/track/:orderNumber', (req: Request, res: Response) => {
    const orderNumber = String(req.params.orderNumber || '').trim().toUpperCase();
    const matches = getOrdersWithItems('WHERE upper(order_number) = ?', [orderNumber]);
    if (matches.length === 0) {
      res.status(404).json({ error: `No order found matching ${orderNumber}.` });
      return;
    }
    res.json({ order: matches[0] });
  });

  // ==================== MANAGER PROTECTED ROUTES ====================
  app.get('/api/manager/analytics', requireManager, (req: Request, res: Response) => {
    const periodParam = String(req.query.period || 'monthly');
    const period = ['daily', 'monthly', 'yearly'].includes(periodParam)
      ? (periodParam as 'daily' | 'monthly' | 'yearly')
      : 'monthly';

    const settings = db
      .prepare('SELECT low_stock_threshold FROM settings WHERE id = 1')
      .get() as { low_stock_threshold: number };

    let dateFilter = "datetime(created_at) >= datetime('now', '-30 days')";
    let groupExpr = "strftime('%m-%d', created_at)";
    if (period === 'daily') {
      dateFilter = "date(created_at) = date('now')";
      groupExpr = "strftime('%H:00', created_at)";
    } else if (period === 'yearly') {
      dateFilter = "strftime('%Y', created_at) = strftime('%Y', 'now')";
      groupExpr = "strftime('%Y-%m', created_at)";
    }

    const kpiRow = db
      .prepare(
        `SELECT
           COUNT(*) as ordersCount,
           COALESCE(SUM(total_amount), 0) as revenue,
           COALESCE(SUM(total_profit), 0) as income
         FROM orders
         WHERE status != 'Cancelled' AND ${dateFilter}`
      )
      .get() as { ordersCount: number; revenue: number; income: number };

    const unitsRow = db
      .prepare(
        `SELECT COALESCE(SUM(oi.quantity), 0) as unitsSold
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.status != 'Cancelled' AND ${dateFilter.replace(/created_at/g, 'o.created_at')}`
      )
      .get() as { unitsSold: number };

    const lowStockProducts = db
      .prepare(
        `SELECT p.id, p.name, p.sku, c.name as categoryName, p.stock, p.price, p.image_url as imageUrl
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE p.stock <= ?
         ORDER BY p.stock ASC, p.id ASC`
      )
      .all(settings.low_stock_threshold) as Array<Record<string, unknown>>;

    const series = db
      .prepare(
        `SELECT ${groupExpr} as label,
                COUNT(*) as orders,
                COALESCE(SUM(total_amount), 0) as revenue,
                COALESCE(SUM(total_profit), 0) as income
         FROM orders
         WHERE status != 'Cancelled' AND ${dateFilter}
         GROUP BY label
         ORDER BY label ASC`
      )
      .all();

    const bestProducts = db
      .prepare(
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
      )
      .all();

    const favorableProducts = db
      .prepare(
        `SELECT p.id, p.name, c.name as categoryName, p.image_url as imageUrl, p.views, p.favorites, p.price
         FROM products p
         JOIN categories c ON c.id = p.category_id
         ORDER BY p.favorites DESC, p.views DESC
         LIMIT 6`
      )
      .all();

    const bestOrders = db
      .prepare(
        `SELECT o.id, o.order_number as orderNumber, o.customer_name as customerName,
                o.total_amount as totalAmount, o.status, o.created_at as createdAt,
                COALESCE(SUM(oi.quantity), 0) as itemCount
         FROM orders o
         LEFT JOIN order_items oi ON oi.order_id = o.id
         WHERE o.status != 'Cancelled'
         GROUP BY o.id
         ORDER BY o.total_amount DESC
         LIMIT 6`
      )
      .all();

    const categoryBreakdown = db
      .prepare(
        `SELECT c.name as categoryName,
                COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.line_total ELSE 0 END), 0) as revenue,
                COUNT(DISTINCT o.id) as ordersCount
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
         LEFT JOIN order_items oi ON oi.product_id = p.id
         LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'Cancelled'
         GROUP BY c.id
         ORDER BY revenue DESC`
      )
      .all();

    const avgOrderValue = kpiRow.ordersCount > 0 ? kpiRow.revenue / kpiRow.ordersCount : 0;

    res.json({
      period,
      kpis: {
        ordersCount: Number(kpiRow.ordersCount),
        revenue: Number(kpiRow.revenue),
        income: Number(kpiRow.income),
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
        unitsSold: Number(unitsRow.unitsSold),
        lowStockCount: lowStockProducts.length,
      },
      series,
      bestProducts,
      favorableProducts,
      bestOrders,
      lowStockProducts,
      categoryBreakdown,
    });
  });

  app.get('/api/manager/products', requireManager, (_req: Request, res: Response) => {
    const rows = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug, c.is_open as category_open
         FROM products p
         JOIN categories c ON c.id = p.category_id
         ORDER BY p.id DESC`
      )
      .all() as Array<Record<string, unknown>>;
    res.json({ products: rows.map(mapProductRow) });
  });

  app.post('/api/manager/products', requireManager, (req: Request, res: Response) => {
    const { name, sku, categoryId, description, price, costPrice, stock, imageUrl, featured, isActive, specs } =
      req.body ?? {};
    if (!name || !categoryId || price === undefined || stock === undefined) {
      res.status(400).json({ error: 'Name, category, price, and stock are required.' });
      return;
    }

    const cleanSku = String(sku || `SKU-${Date.now().toString().slice(-6)}`).trim().toUpperCase();
    const numPrice = Number(price);
    const numCost = costPrice !== undefined ? Number(costPrice) : Number((numPrice * 0.58).toFixed(2));
    const numStock = Math.max(0, Math.floor(Number(stock)));

    try {
      const info = db
        .prepare(
          `INSERT INTO products (
             name, sku, category_id, description, price, cost_price, stock, image_url,
             featured, is_active, specs_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          String(name).trim(),
          cleanSku,
          Number(categoryId),
          String(description || 'Precision-crafted store addition.'),
          numPrice,
          numCost,
          numStock,
          String(imageUrl || ''),
          featured ? 1 : 0,
          isActive === false ? 0 : 1,
          JSON.stringify(specs && typeof specs === 'object' ? specs : {})
        );

      const created = db
        .prepare(
          `SELECT p.*, c.name as category_name, c.slug as category_slug, c.is_open as category_open
           FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?`
        )
        .get(info.lastInsertRowid) as Record<string, unknown>;

      res.status(201).json({ product: mapProductRow(created) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to create product.';
      res.status(400).json({ error: msg.includes('UNIQUE') ? 'SKU already exists.' : msg });
    }
  });

  app.put('/api/manager/products/:id', requireManager, (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const b = req.body ?? {};
    db.prepare(
      `UPDATE products SET
         name = ?, sku = ?, category_id = ?, description = ?,
         price = ?, cost_price = ?, stock = ?, image_url = ?,
         featured = ?, is_active = ?, specs_json = ?
       WHERE id = ?`
    ).run(
      b.name !== undefined ? String(b.name).trim() : existing.name,
      b.sku !== undefined ? String(b.sku).trim().toUpperCase() : existing.sku,
      b.categoryId !== undefined ? Number(b.categoryId) : existing.category_id,
      b.description !== undefined ? String(b.description) : existing.description,
      b.price !== undefined ? Number(b.price) : existing.price,
      b.costPrice !== undefined ? Number(b.costPrice) : existing.cost_price,
      b.stock !== undefined ? Math.max(0, Math.floor(Number(b.stock))) : existing.stock,
      b.imageUrl !== undefined ? String(b.imageUrl) : existing.image_url,
      b.featured !== undefined ? (b.featured ? 1 : 0) : existing.featured,
      b.isActive !== undefined ? (b.isActive ? 1 : 0) : existing.is_active,
      b.specs !== undefined ? JSON.stringify(b.specs) : existing.specs_json,
      id
    );

    const updated = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug, c.is_open as category_open
         FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?`
      )
      .get(id) as Record<string, unknown>;

    res.json({ product: mapProductRow(updated) });
  });

  app.delete('/api/manager/products/:id', requireManager, (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const hasOrders = db.prepare('SELECT id FROM order_items WHERE product_id = ? LIMIT 1').get(id);
    if (hasOrders) {
      db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(id);
      res.json({ ok: true, archived: true });
      return;
    }
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ ok: true, archived: false });
  });

  app.get('/api/manager/categories', requireManager, (_req: Request, res: Response) => {
    const rows = db
      .prepare(
        `SELECT c.id, c.name, c.slug, c.description, c.is_open as isOpen, c.created_at as createdAt,
                COUNT(p.id) as productCount
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
         GROUP BY c.id
         ORDER BY c.id ASC`
      )
      .all()
      .map((c: unknown) => {
        const r = c as Record<string, unknown>;
        return { ...r, isOpen: Boolean(r.isOpen), productCount: Number(r.productCount) };
      });
    res.json({ categories: rows });
  });

  app.post('/api/manager/categories', requireManager, (req: Request, res: Response) => {
    const { name, description, isOpen } = req.body ?? {};
    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const cleanName = String(name).trim();
    const slug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    try {
      const info = db
        .prepare('INSERT INTO categories (name, slug, description, is_open) VALUES (?, ?, ?, ?)')
        .run(cleanName, slug, String(description || ''), isOpen === false ? 0 : 1);

      const created = db
        .prepare('SELECT id, name, slug, description, is_open as isOpen, created_at as createdAt FROM categories WHERE id = ?')
        .get(info.lastInsertRowid) as Record<string, unknown>;
      res.status(201).json({ category: { ...created, isOpen: Boolean(created.isOpen), productCount: 0 } });
    } catch {
      res.status(409).json({ error: 'Category already exists.' });
    }
  });

  app.put('/api/manager/categories/:id', requireManager, (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }
    const b = req.body ?? {};
    const nextName = b.name !== undefined ? String(b.name).trim() : String(existing.name);
    const nextSlug = nextName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    db.prepare('UPDATE categories SET name = ?, slug = ?, description = ?, is_open = ? WHERE id = ?').run(
      nextName,
      nextSlug,
      b.description !== undefined ? String(b.description) : existing.description,
      b.isOpen !== undefined ? (b.isOpen ? 1 : 0) : existing.is_open,
      id
    );

    const updated = db
      .prepare('SELECT id, name, slug, description, is_open as isOpen, created_at as createdAt FROM categories WHERE id = ?')
      .get(id) as Record<string, unknown>;
    res.json({ category: { ...updated, isOpen: Boolean(updated.isOpen) } });
  });

  app.delete('/api/manager/categories/:id', requireManager, (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const hasProd = db.prepare('SELECT id FROM products WHERE category_id = ? LIMIT 1').get(id);
    if (hasProd) {
      res.status(400).json({ error: 'Cannot delete category with existing products. Close it or reassign products first.' });
      return;
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  app.get('/api/manager/orders', requireManager, (_req: Request, res: Response) => {
    res.json({ orders: getOrdersWithItems() });
  });

  app.put('/api/manager/orders/:id/status', requireManager, (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { status } = req.body ?? {};
    const valid = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!valid.includes(String(status))) {
      res.status(400).json({ error: 'Invalid order status.' });
      return;
    }
    const info = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(String(status), id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    res.json({ order: getOrdersWithItems('WHERE id = ?', [id])[0] });
  });

  app.put('/api/manager/settings', requireManager, (req: Request, res: Response) => {
    const current = db.prepare('SELECT * FROM settings WHERE id = 1').get() as Record<string, unknown>;
    const b = req.body ?? {};
    db.prepare(
      `UPDATE settings SET
         store_name = ?, tagline = ?, logo_url = ?, hero_title = ?, hero_subtitle = ?,
         hero_image_url = ?, low_stock_threshold = ?, free_shipping_threshold = ?,
         updated_at = datetime('now')
       WHERE id = 1`
    ).run(
      b.storeName !== undefined ? String(b.storeName).trim() || 'Aeterna' : current.store_name,
      b.tagline !== undefined ? String(b.tagline) : current.tagline,
      b.logoUrl !== undefined ? String(b.logoUrl) : current.logo_url,
      b.heroTitle !== undefined ? String(b.heroTitle) : current.hero_title,
      b.heroSubtitle !== undefined ? String(b.heroSubtitle) : current.hero_subtitle,
      b.heroImageUrl !== undefined ? String(b.heroImageUrl) : current.hero_image_url,
      b.lowStockThreshold !== undefined ? Math.max(1, Number(b.lowStockThreshold)) : current.low_stock_threshold,
      b.freeShippingThreshold !== undefined
        ? Math.max(0, Number(b.freeShippingThreshold))
        : current.free_shipping_threshold
    );

    const updated = db.prepare('SELECT * FROM settings WHERE id = 1').get() as Record<string, unknown>;
    res.json({ settings: mapSettingsRow(updated) });
  });

  return app;
}
