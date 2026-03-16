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
  name VARCHAR(10) NOT NULL,
  ip_address VARCHAR(64) NOT NULL,
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
  UNIQUE KEY uniq_ip (ip_address)
);

-- default account: stephen / 666666 (sha256)
INSERT INTO accounts (username, password_hash)
VALUES ('stephen', '8d969eef6ecad3c29a3a629280e686cff8fab7f5f95b2f76bb1e7f56e8e9b7a0')
ON DUPLICATE KEY UPDATE username = VALUES(username);

INSERT INTO nodes (
  name, ip_address, ports, remark, ssh_password, status, cpu, ram, disk, uptime, port_statuses
)
VALUES (
  'Mac Mini M4',
  '192.168.1.102',
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
ON DUPLICATE KEY UPDATE name = VALUES(name);
