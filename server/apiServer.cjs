const http = require('node:http');
const { URL } = require('node:url');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const { handleNetworkApiRequest } = require('./networkDiagnostics.cjs');
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

const sessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(payload));
};

const hashPassword = (password) => crypto.createHash('sha256').update(password).digest('hex');

const createSession = (accountId) => {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { accountId, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
};

const getAccountIdFromRequest = (req) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session.accountId;
};

const queryWithTimeout = async (sql, params = []) =>
  Promise.race([
    pool.query(sql, params),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Database query timeout (${DB_QUERY_TIMEOUT_MS}ms)`)), DB_QUERY_TIMEOUT_MS);
    })
  ]);

const DEFAULT_DEMO_USER = { username: 'stephen', password: '666666' };

const ensureDemoAccount = async () => {
  const demoHash = hashPassword(DEFAULT_DEMO_USER.password);
  await queryWithTimeout(
    `INSERT INTO accounts (username, password_hash) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [DEFAULT_DEMO_USER.username, demoHash]
  );
};

const ensureNodeSchemaExtensions = async () => {
  const [targetInputRows] = await queryWithTimeout(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nodes' AND COLUMN_NAME = 'target_input'`
  );
  if (!targetInputRows.length) {
    await queryWithTimeout("ALTER TABLE nodes ADD COLUMN target_input VARCHAR(255) NOT NULL DEFAULT '' AFTER ip_address");
  }

  const [sortOrderRows] = await queryWithTimeout(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nodes' AND COLUMN_NAME = 'sort_order'`
  );
  if (!sortOrderRows.length) {
    await queryWithTimeout('ALTER TABLE nodes ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER target_input');
  }

  await queryWithTimeout("UPDATE nodes SET target_input = ip_address WHERE target_input = '' OR target_input IS NULL");
  await queryWithTimeout('UPDATE nodes SET sort_order = id WHERE sort_order = 0');

  const [orderIndexRows] = await queryWithTimeout(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nodes' AND INDEX_NAME = 'idx_nodes_order'`
  );
  if (!orderIndexRows.length) {
    await queryWithTimeout('CREATE INDEX idx_nodes_order ON nodes(account_id, sort_order, id)');
  }
};

const ensureNodeOwnershipSchema = async () => {
  const [columns] = await queryWithTimeout(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
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
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nodes' AND INDEX_NAME = 'idx_nodes_account_id'`
  );
  if (!accountIdIndexRows.length) {
    await queryWithTimeout('CREATE INDEX idx_nodes_account_id ON nodes(account_id)');
  }

  const [legacyIpIndexRows] = await queryWithTimeout(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nodes' AND INDEX_NAME = 'uniq_ip'`
  );
  if (legacyIpIndexRows.length) {
    await queryWithTimeout('ALTER TABLE nodes DROP INDEX uniq_ip');
  }

  const [accountIpIndexRows] = await queryWithTimeout(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nodes' AND INDEX_NAME = 'uniq_account_ip'`
  );
  if (!accountIpIndexRows.length) {
    await queryWithTimeout('CREATE UNIQUE INDEX uniq_account_ip ON nodes(account_id, ip_address)');
  }

  const [fkRows] = await queryWithTimeout(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nodes' AND CONSTRAINT_NAME = 'fk_nodes_account'`
  );
  if (!fkRows.length) {
    await queryWithTimeout('ALTER TABLE nodes ADD CONSTRAINT fk_nodes_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE');
  }

  await ensureNodeSchemaExtensions();
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
  if (!username || !password) return 'username/password required';
  if (username.length > MAX_CREDENTIAL_LENGTH || password.length > MAX_CREDENTIAL_LENGTH) {
    return `username/password must be <= ${MAX_CREDENTIAL_LENGTH} characters`;
  }
  return null;
};

const validateNodePayload = (name, ip) => {
  if (!ip) return 'ip is required';
  if (name && name.length > MAX_NODE_NAME_LENGTH) return `node name must be <= ${MAX_NODE_NAME_LENGTH} characters`;
  return null;
};

const mapNodeRow = (row) => ({
  id: row.id,
  name: row.name,
  ip: row.ip_address,
  targetInput: row.target_input || row.ip_address,
  ports: row.ports,
  remark: row.remark || '',
  status: row.status || 'online',
  metrics: { cpu: row.cpu ?? 0, ram: row.ram ?? 0, disk: row.disk ?? 0 },
  uptime: row.uptime || '0m',
  sortOrder: row.sort_order || 0,
  portStatuses: parsePortStatuses(row.port_statuses),
  activePorts: (row.ports || '').split(',').map((p) => p.trim()).filter(Boolean).length
});

const reorderNodesForAccount = async (accountId, ids = []) => {
  if (!Array.isArray(ids) || !ids.length) return;

  const uniqueIds = [...new Set(ids.map((id) => Number(id)).filter((n) => Number.isInteger(n) && n > 0))];
  if (!uniqueIds.length) return;

  const [rows] = await queryWithTimeout(
    `SELECT id FROM nodes WHERE account_id = ? AND id IN (${uniqueIds.map(() => '?').join(',')})`,
    [accountId, ...uniqueIds]
  );
  if (rows.length !== uniqueIds.length) {
    throw new Error('invalid node ids for reorder');
  }

  const caseSql = uniqueIds.map((id, idx) => `WHEN ${id} THEN ${idx + 1}`).join(' ');
  await queryWithTimeout(
    `UPDATE nodes
     SET sort_order = CASE id ${caseSql} ELSE sort_order END
     WHERE account_id = ? AND id IN (${uniqueIds.join(',')})`,
    [accountId]
  );
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 200, { ok: true });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (await handleNetworkApiRequest(req, res, url.pathname)) return;

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
      if (errorMessage) return send(res, 400, { success: false, message: errorMessage });

      const [rows] = await queryWithTimeout('SELECT id, username, password_hash FROM accounts WHERE username = ? LIMIT 1', [cleanUsername]);
      if (!rows.length || rows[0].password_hash !== hashPassword(cleanPassword)) {
        return send(res, 401, { success: false, message: 'invalid username or password' });
      }

      const token = createSession(rows[0].id);
      send(res, 200, { success: true, token, user: { id: rows[0].id, username: rows[0].username } });
      return;
    }

    if (url.pathname === '/backend-api/auth/signup' && req.method === 'POST') {
      const { username = '', password = '' } = await parseJsonBody(req);
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();
      const errorMessage = validateCredentials(cleanUsername, cleanPassword);
      if (errorMessage) return send(res, 400, { success: false, message: errorMessage });

      const [existsRows] = await queryWithTimeout('SELECT id FROM accounts WHERE username = ? LIMIT 1', [cleanUsername]);
      if (existsRows.length) return send(res, 409, { success: false, message: 'username already exists' });

      const [result] = await queryWithTimeout('INSERT INTO accounts (username, password_hash) VALUES (?, ?)', [cleanUsername, hashPassword(cleanPassword)]);
      const token = createSession(result.insertId);
      send(res, 200, { success: true, token, user: { id: result.insertId, username: cleanUsername } });
      return;
    }

    if (url.pathname === '/backend-api/auth/logout' && req.method === 'POST') {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (token) sessions.delete(token);
      send(res, 200, { success: true });
      return;
    }

    const accountId = getAccountIdFromRequest(req);
    if (url.pathname.startsWith('/backend-api/nodes') && !accountId) {
      send(res, 401, { success: false, message: 'auth required' });
      return;
    }

    if (url.pathname === '/backend-api/nodes' && req.method === 'GET') {
      const [rows] = await queryWithTimeout('SELECT * FROM nodes WHERE account_id = ? ORDER BY sort_order ASC, id DESC', [accountId]);
      send(res, 200, { success: true, data: rows.map(mapNodeRow) });
      return;
    }

    if (url.pathname === '/backend-api/nodes/reorder' && req.method === 'POST') {
      const { ids = [] } = await parseJsonBody(req);
      await reorderNodesForAccount(accountId, ids);
      send(res, 200, { success: true });
      return;
    }

    if (url.pathname === '/backend-api/nodes' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { name, ip, targetInput = ip, ports, remark, sshPassword, status = 'online', metrics = {}, uptime = '0m', portStatuses = [] } = body;
      const normalizedName = (name || '').trim() || String(targetInput || ip || '').trim();
      const errorMessage = validateNodePayload(normalizedName, ip);
      if (errorMessage) return send(res, 400, { success: false, message: errorMessage });

      const [[maxSortRow]] = await queryWithTimeout('SELECT COALESCE(MAX(sort_order), 0) AS maxSort FROM nodes WHERE account_id = ?', [accountId]);
      const nextSort = Number(maxSortRow?.maxSort || 0) + 1;

      const [result] = await queryWithTimeout(
        `INSERT INTO nodes (account_id, name, ip_address, target_input, sort_order, ports, remark, ssh_password, status, cpu, ram, disk, uptime, port_statuses)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          accountId,
          normalizedName,
          ip,
          String(targetInput || ip || ''),
          nextSort,
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
      const id = Number(url.pathname.split('/').pop());
      const body = await parseJsonBody(req);

      const [existingRows] = await queryWithTimeout('SELECT * FROM nodes WHERE id = ? AND account_id = ?', [id, accountId]);
      if (!existingRows.length) return send(res, 404, { success: false, message: 'node not found' });

      const current = mapNodeRow(existingRows[0]);
      const merged = {
        ...current,
        ...body,
        targetInput: String(body.targetInput || body.ip || current.targetInput || current.ip || '').trim(),
        name: (body.name || '').trim() || current.name || String(body.targetInput || body.ip || current.targetInput || current.ip || '').trim(),
        metrics: { ...current.metrics, ...(body.metrics || {}) }
      };

      const errorMessage = validateNodePayload(merged.name, merged.ip);
      if (errorMessage) return send(res, 400, { success: false, message: errorMessage });

      await queryWithTimeout(
        `UPDATE nodes
         SET name = ?, ip_address = ?, target_input = ?, ports = ?, remark = ?, ssh_password = ?, status = ?,
             cpu = ?, ram = ?, disk = ?, uptime = ?, port_statuses = ?
         WHERE id = ? AND account_id = ?`,
        [
          merged.name,
          merged.ip,
          merged.targetInput || merged.ip,
          merged.ports || '',
          merged.remark || '',
          body.sshPassword !== undefined ? body.sshPassword : existingRows[0].ssh_password,
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
