// src/database.js
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '../data/bot.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT,
    price       REAL    NOT NULL,
    type        TEXT    NOT NULL DEFAULT 'group',
    delivery    TEXT    NOT NULL,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id              TEXT    PRIMARY KEY,
    user_id         INTEGER NOT NULL,
    username        TEXT,
    product_id      INTEGER NOT NULL,
    amount          REAL    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'pending',
    checkout_url    TEXT,
    ip_transaction  TEXT,
    ip_slug         TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    paid_at         TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS deliveries (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     TEXT    NOT NULL UNIQUE,
    user_id      INTEGER NOT NULL,
    product_id   INTEGER NOT NULL,
    delivered    INTEGER NOT NULL DEFAULT 0,
    delivered_at TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );
`);

export const productDB = {
  getAll: () => db.prepare('SELECT * FROM products WHERE active = 1').all(),
  getById: (id) => db.prepare('SELECT * FROM products WHERE id = ?').get(id),
  create: ({ name, description, price, type, delivery }) =>
    db.prepare('INSERT INTO products (name, description, price, type, delivery) VALUES (?, ?, ?, ?, ?)')
      .run(name, description ?? '', price, type, delivery),
  deactivate: (id) => db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(id),
};

export const orderDB = {
  create: ({ id, userId, username, productId, amount, checkoutUrl }) =>
    db.prepare(`
      INSERT INTO orders (id, user_id, username, product_id, amount, checkout_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, username ?? null, productId, amount, checkoutUrl ?? null),

  getById: (id) => db.prepare('SELECT * FROM orders WHERE id = ?').get(id),

  // transactionNsu e slug vêm do payload do webhook da InfinitePay
  updatePayment: (orderId, transactionNsu, slug) =>
    db.prepare('UPDATE orders SET ip_transaction = ?, ip_slug = ? WHERE id = ?')
      .run(transactionNsu, slug, orderId),

  approve: (orderId) =>
    db.prepare("UPDATE orders SET status = 'approved', paid_at = datetime('now') WHERE id = ?")
      .run(orderId),

  getPendingByUser: (userId) =>
    db.prepare(`
      SELECT o.*, p.name as product_name
      FROM orders o JOIN products p ON o.product_id = p.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC LIMIT 5
    `).all(userId),
};

export const deliveryDB = {
  create: ({ orderId, userId, productId }) =>
    db.prepare('INSERT OR IGNORE INTO deliveries (order_id, user_id, product_id) VALUES (?, ?, ?)')
      .run(orderId, userId, productId),

  markDelivered: (orderId) =>
    db.prepare("UPDATE deliveries SET delivered = 1, delivered_at = datetime('now') WHERE order_id = ?")
      .run(orderId),

  wasDelivered: (orderId) => {
    const row = db.prepare('SELECT delivered FROM deliveries WHERE order_id = ?').get(orderId);
    return row?.delivered === 1;
  },
};

export default db;
