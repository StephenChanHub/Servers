CREATE DATABASE IF NOT EXISTS servers_universe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE servers_universe;

CREATE TABLE IF NOT EXISTS accounts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(10) NOT NULL UNIQUE,
  password_hash CHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nodes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_id BIGINT NOT NULL,
  name VARCHAR(10) NOT NULL,
  ip_address VARCHAR(64) NOT NULL,
  target_input VARCHAR(255) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  ports VARCHAR(255) DEFAULT '',
  remark VARCHAR(512) DEFAULT '',
  ssh_password VARCHAR(255) DEFAULT '',
  status ENUM('online', 'warning', 'offline') DEFAULT 'online',
  cpu INT DEFAULT 0,
  ram INT DEFAULT 0,
  disk INT DEFAULT 0,
  uptime VARCHAR(64) DEFAULT '0m',
  port_statuses JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_account_ip (account_id, ip_address),
  KEY idx_nodes_account_id (account_id),
  KEY idx_nodes_order (account_id, sort_order, id),
  CONSTRAINT fk_nodes_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- default account: stephen / 666666 (sha256)
INSERT INTO accounts (username, password_hash)
VALUES ('stephen', '94edf28c6d6da38fd35d7ad53e485307f89fbeaf120485c8d17a43f323deee71')
ON DUPLICATE KEY UPDATE username = VALUES(username), password_hash = VALUES(password_hash);

INSERT INTO nodes (
  account_id, name, ip_address, target_input, sort_order, ports, remark, ssh_password, status, cpu, ram, disk, uptime, port_statuses
)
VALUES (
  (SELECT id FROM accounts WHERE username = 'stephen' LIMIT 1),
  'Mac Mini M4',
  '192.168.1.102',
  '192.168.1.102',
  1,
  '22,80,5432',
  'Local Powerhouse',
  '',
  'online',
  24,
  62,
  45,
  '12d 4h',
  JSON_ARRAY(
    JSON_OBJECT('port', '22', 'status', 'up', 'message', 'reachable'),
    JSON_OBJECT('port', '80', 'status', 'degraded', 'message', 'connection timeout'),
    JSON_OBJECT('port', '5432', 'status', 'down', 'message', 'connect ECONNREFUSED')
  )
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  account_id = VALUES(account_id),
  target_input = VALUES(target_input),
  sort_order = VALUES(sort_order);
