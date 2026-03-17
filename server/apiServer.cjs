const http = require('node:http');
const { URL } = require('node:url');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
require('dotenv').config();

const PORT = Number(process.env.API_PORT || 3001);
const MAX_CREDENTIAL_LENGTH = 10;
const MAX_NODE_NAME_LENGTH = 10;
const DB_QUERY_TIMEOUT_MS = 8000;

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'servers_universe',
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 10000
});

const parseJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const send = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(payload));
};

const hashPassword = (password) => crypto.createHash('sha256').update(password).digest('hex');

const queryWithTimeout = async (sql, params = []) => {
  return Promise.race([
    pool.query(sql, params),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Database query timeout (${DB_QUERY_TIMEOUT_MS}ms)`)), DB_QUERY_TIMEOUT_MS);
    })
  ]);
};

const DEFAULT_DEMO_USER = {
  username: 'stephen',
  password: '666666'
};

const ensureDemoAccount = async () => {
  const demoHash = hashPassword(DEFAULT_DEMO_USER.password);
  await queryWithTimeout(
    `INSERT INTO accounts (username, password_hash) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [DEFAULT_DEMO_USER.username, demoHash]
  );
};

const ensureNodeOwnershipSchema = async () => {
  const [columns] = await queryWithTimeout(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nodes' AND COLUMN_NAME = 'account_id'`
  );

  if (!columns.length) {
    await queryWithTimeout('ALTER TABLE nodes ADD COLUMN account_id BIGINT NULL AFTER id');
  }

  await queryWithTimeout(
    `UPDATE nodes n
     LEFT JOIN accounts a ON a.username = ?
     SET n.account_id = a.id
     WHERE n.account_id IS NULL`,
    [DEFAULT_DEMO_USER.username]
  );

  await queryWithTimeout('ALTER TABLE nodes MODIFY COLUMN account_id BIGINT NOT NULL');

  const [accountIdIndexRows] = await queryWithTimeout(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nodes' AND INDEX_NAME = 'idx_nodes_account_id'`
  );
  if (!accountIdIndexRows.length) {
    await queryWithTimeout('CREATE INDEX idx_nodes_account_id ON nodes(account_id)');
  }

  const [legacyIpIndexRows] = await queryWithTimeout(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nodes' AND INDEX_NAME = 'uniq_ip'`
  );
  if (legacyIpIndexRows.length) {
    await queryWithTimeout('ALTER TABLE nodes DROP INDEX uniq_ip');
  }

  const [accountIpIndexRows] = await queryWithTimeout(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nodes' AND INDEX_NAME = 'uniq_account_ip'`
  );
  if (!accountIpIndexRows.length) {
    await queryWithTimeout('CREATE UNIQUE INDEX uniq_account_ip ON nodes(account_id, ip_address)');
  }

  const [fkRows] = await queryWithTimeout(
    `SELECT CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nodes' AND CONSTRAINT_NAME = 'fk_nodes_account'`
  );
  if (!fkRows.length) {
    await queryWithTimeout('ALTER TABLE nodes ADD CONSTRAINT fk_nodes_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE');
  }
};

const parsePortStatuses = (rawValue) => {
  try {
    if (rawValue === null || rawValue === undefined) return [];
    if (Array.isArray(rawValue)) return rawValue;
    if (Buffer.isBuffer(rawValue)) {
      const text = rawValue.toString('utf8');
      if (!text) return [];
      return JSON.parse(text);
    }
    if (typeof rawValue === 'object') return [];
    if (typeof rawValue === 'string') {
      if (!rawValue.trim()) return [];
      return JSON.parse(rawValue);
    }
    return [];
  } catch {
    return [];
  }
};

const validateCredentials = (username, password) => {
  if (!username || !password) {
    return 'username/password required';
  }
  if (username.length > MAX_CREDENTIAL_LENGTH || password.length > MAX_CREDENTIAL_LENGTH) {
    return `username/password must be <= ${MAX_CREDENTIAL_LENGTH} characters`;
  }
  return null;
};

const validateNodePayload = (name, ip) => {
  if (!ip) {
    return 'ip is required';
  }
  if (name && name.length > MAX_NODE_NAME_LENGTH) {
    return `node name must be <= ${MAX_NODE_NAME_LENGTH} characters`;
  }
  return null;
};

const mapNodeRow = (row) => ({
  id: row.id,
  name: row.name,
  ip: row.ip_address,
  ports: row.ports,
  remark: row.remark || '',
  sshPassword: row.ssh_password || '',
  status: row.status || 'online',
  metrics: {
    cpu: row.cpu ?? 0,
    ram: row.ram ?? 0,
    disk: row.disk ?? 0
  },
  uptime: row.uptime || '0m',
  portStatuses: parsePortStatuses(row.port_statuses),
  activePorts: (row.ports || '').split(',').map((p) => p.trim()).filter(Boolean).length
});

const getAccountIdFromRequest = (req) => {
  const rawAccountId = req.headers['x-account-id'];
  const parsed = Number(rawAccountId);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 200, { ok: true });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname === '/backend-api/health' && req.method === 'GET') {
      const [dbPing] = await queryWithTimeout('SELECT 1 as ok');
      send(res, 200, { success: true, db: dbPing[0]?.ok === 1 });
      return;
    }

    if (url.pathname === '/backend-api/auth/login' && req.method === 'POST') {
      const { username = '', password = '' } = await parseJsonBody(req);
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();
      const errorMessage = validateCredentials(cleanUsername, cleanPassword);
      if (errorMessage) {
        send(res, 400, { success: false, message: errorMessage });
        return;
      }

      const [rows] = await queryWithTimeout('SELECT id, username, password_hash FROM accounts WHERE username = ? LIMIT 1', [cleanUsername]);
      if (!rows.length || rows[0].password_hash !== hashPassword(cleanPassword)) {
        send(res, 401, { success: false, message: 'invalid username or password' });
        return;
      }

      send(res, 200, {
        success: true,
        user: { id: rows[0].id, username: rows[0].username }
      });
      return;
    }

    if (url.pathname === '/backend-api/auth/signup' && req.method === 'POST') {
      const { username = '', password = '' } = await parseJsonBody(req);
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();
      const errorMessage = validateCredentials(cleanUsername, cleanPassword);
      if (errorMessage) {
        send(res, 400, { success: false, message: errorMessage });
        return;
      }

      const [existsRows] = await queryWithTimeout('SELECT id FROM accounts WHERE username = ? LIMIT 1', [cleanUsername]);
      if (existsRows.length) {
        send(res, 409, { success: false, message: 'username already exists' });
        return;
      }

      const [result] = await queryWithTimeout('INSERT INTO accounts (username, password_hash) VALUES (?, ?)', [cleanUsername, hashPassword(cleanPassword)]);
      send(res, 200, {
        success: true,
        user: { id: result.insertId, username: cleanUsername }
      });
      return;
    }

    if (url.pathname === '/backend-api/nodes' && req.method === 'GET') {
      const accountId = getAccountIdFromRequest(req);
      if (!accountId) {
        send(res, 401, { success: false, message: 'auth required' });
        return;
      }

      const [rows] = await queryWithTimeout('SELECT * FROM nodes WHERE account_id = ? ORDER BY id DESC', [accountId]);
      send(res, 200, { success: true, data: rows.map(mapNodeRow) });
      return;
    }

    if (url.pathname === '/backend-api/nodes' && req.method === 'POST') {
      const accountId = getAccountIdFromRequest(req);
      if (!accountId) {
        send(res, 401, { success: false, message: 'auth required' });
        return;
      }

      const body = await parseJsonBody(req);
      const { name, ip, ports, remark, sshPassword, status = 'online', metrics = {}, uptime = '0m', portStatuses = [] } = body;
      const normalizedName = (name || '').trim() || String(ip || '').trim();

      const errorMessage = validateNodePayload(normalizedName, ip);
      if (errorMessage) {
        send(res, 400, { success: false, message: errorMessage });
        return;
      }

      const [result] = await queryWithTimeout(
        `INSERT INTO nodes (account_id, name, ip_address, ports, remark, ssh_password, status, cpu, ram, disk, uptime, port_statuses)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          accountId,
          normalizedName,
          ip,
          ports || '',
          remark || '',
          sshPassword || '',
          status,
          Number(metrics.cpu || 0),
          Number(metrics.ram || 0),
          Number(metrics.disk || 0),
          uptime,
          JSON.stringify(portStatuses)
        ]
      );

      const [rows] = await queryWithTimeout('SELECT * FROM nodes WHERE id = ? AND account_id = ?', [result.insertId, accountId]);
      send(res, 200, { success: true, data: mapNodeRow(rows[0]) });
      return;
    }

    if (url.pathname.startsWith('/backend-api/nodes/') && req.method === 'PUT') {
      const accountId = getAccountIdFromRequest(req);
      if (!accountId) {
        send(res, 401, { success: false, message: 'auth required' });
        return;
      }

      const id = Number(url.pathname.split('/').pop());
      const body = await parseJsonBody(req);

      const [existingRows] = await queryWithTimeout('SELECT * FROM nodes WHERE id = ? AND account_id = ?', [id, accountId]);
      if (!existingRows.length) {
        send(res, 404, { success: false, message: 'node not found' });
        return;
      }

      const current = mapNodeRow(existingRows[0]);
      const merged = {
        ...current,
        ...body,
        name: (body.name || '').trim() || current.name || String(body.ip || current.ip || '').trim(),
        metrics: { ...current.metrics, ...(body.metrics || {}) }
      };

      const errorMessage = validateNodePayload(merged.name, merged.ip);
      if (errorMessage) {
        send(res, 400, { success: false, message: errorMessage });
        return;
      }

      await queryWithTimeout(
        `UPDATE nodes
         SET name = ?, ip_address = ?, ports = ?, remark = ?, ssh_password = ?, status = ?,
             cpu = ?, ram = ?, disk = ?, uptime = ?, port_statuses = ?
         WHERE id = ? AND account_id = ?`,
        [
          merged.name,
          merged.ip,
          merged.ports || '',
          merged.remark || '',
          merged.sshPassword || '',
          merged.status || 'online',
          Number(merged.metrics.cpu || 0),
          Number(merged.metrics.ram || 0),
          Number(merged.metrics.disk || 0),
          merged.uptime || '0m',
          JSON.stringify(merged.portStatuses || []),
          id,
          accountId
        ]
      );

      const [rows] = await queryWithTimeout('SELECT * FROM nodes WHERE id = ? AND account_id = ?', [id, accountId]);
      send(res, 200, { success: true, data: mapNodeRow(rows[0]) });
      return;
    }

    if (url.pathname.startsWith('/backend-api/nodes/') && req.method === 'DELETE') {
      const accountId = getAccountIdFromRequest(req);
      if (!accountId) {
        send(res, 401, { success: false, message: 'auth required' });
        return;
      }

      const id = Number(url.pathname.split('/').pop());
      await queryWithTimeout('DELETE FROM nodes WHERE id = ? AND account_id = ?', [id, accountId]);
      send(res, 200, { success: true });
      return;
    }

    send(res, 404, { success: false, message: 'not found' });
  } catch (error) {
    const isDbTimeout = String(error.message || '').includes('Database query timeout');
    send(res, isDbTimeout ? 503 : 500, { success: false, message: error.message || 'internal error' });
  }
});

server.requestTimeout = 15000;
server.headersTimeout = 16000;

const bootstrap = async () => {
  server.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
  });

  try {
    await ensureDemoAccount();
    await ensureNodeOwnershipSchema();
  } catch (error) {
    console.error('Demo account bootstrap warning:', error.message);
  }
};

bootstrap();
