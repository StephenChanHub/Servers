-----

# Server Monitor (Servers) v1.0

一个基于 **Vue 3** 和 **Node.js** 构建的可视化服务器监控管理系统。该项目专为开发者和运维爱好者设计，旨在提供从基础网络探测自己的服务器或者某个网站SSH 指标采集的完整监控链路。
<img width="3840" height="2118" alt="Screenshot 2026-03-20 at 01 47 04" src="https://github.com/user-attachments/assets/a2cf9b28-3d51-4c2d-98a1-171c406455ca" />
<img width="3840" height="2118" alt="Screenshot 2026-03-20 at 01 46 34" src="https://github.com/user-attachments/assets/40a40601-580c-4f53-b241-68a16e91b30e" />


## 核心特性

### 1\. 多维监控链路

  * **基础探测**：系统支持通过 Ping 和 TCP 协议进行网络状态检测，快速反馈目标服务器的在线情况。
  * **深度采集 (SSH)**：通过 `sshpass` 驱动，系统可按需建立安全连接并执行指令（如 `top`, `free`, `df`），实时抓取 CPU、内存、磁盘及系统运行时间（Uptime）等深度指标。

### 2\. 视觉体验

  * **Servers 视图**：采用 **Glassmorphism (玻璃拟态)** 风格的卡片流布局，支持响应式屏幕适配。
  * **Space 视图**：将基础设施抽象为“数字星系”，服务器作为恒星，端口作为卫星。
  * **羽化过渡**：页面切换采用基于位移 + 高斯模糊的“羽化”动画，营造深邃的宇宙质感。

### 3\. 后端架构

  * **数据安全与隔离**：基于 **MySQL** 实现本地化数据存储，通过 `nodes.account_id` 外键与联合唯一索引实现严密的多账号节点数据隔离。
  * **挂死防护机制**：后端引入了数据库查询超时（DB Query Timeout）与 HTTP 请求超时（Request Timeout）双重保护，确保在网络异常时系统依然稳定可用。
  * **轻量化部署**：采用单文件数据库与中间件式 API 设计，极大降低了部署门槛。

##  技术栈

  * **前端**: Vue 3 (Composition API), Vite, Pinia (状态管理), Vue Router。
  * **后端**: Node.js, Express (API 中间件架构)。
  * **数据库**: MySQL。
  * **系统工具**: `sshpass` (用于非交互式 SSH 身份验证)。

##  快速开始

# Local Deployment (Frontend -> Backend -> MySQL)

## 1) MySQL schema

```bash
mysql -u root -p < db/schema.sql
```

Tables:
- `accounts`: `id`, `username`, `password_hash`, timestamps.
- `nodes`: `name`, `ip_address`, `ports`, `remark`, `ssh_password`, runtime status/metrics, `port_statuses` JSON.

## 2) Environment

```bash
cp .env.example .env
# edit DB_USER / DB_PASSWORD as needed
```

## 3) Install dependencies

```bash
npm install
```

## 4) Start backend API

```bash
npm run api:dev
```

Backend service: `http://localhost:3001`

## 5) Start frontend

```bash
npm run dev
```

Frontend service: `http://localhost:3000`

Vite proxies `/backend-api/*` to backend API.

## API Design (optimized)

- `POST /backend-api/auth/login`
- `POST /backend-api/auth/signup`
- `GET /backend-api/nodes`
- `POST /backend-api/nodes`
- `PUT /backend-api/nodes/:id`
- `DELETE /backend-api/nodes/:id`
- `GET /backend-api/health`

## Optimization suggestions

1. **Security**
   - Replace SHA-256 with `bcrypt` for account passwords.
   - Encrypt `nodes.ssh_password` at rest (KMS/Envelope encryption).
   - Add JWT + role checks to every node API.

2. **Data model**
   - Split `ports` into child table `node_ports` for queryability.
   - Add `owner_user_id` to `nodes` for multi-account isolation.

3. **Reliability**
   - Move diagnostics to async jobs with retry + last_check_at fields.
   - Add indexes on `nodes(status, updated_at)` and `nodes(ip_address)`.

4. **Observability**
   - Structured logs with request-id.
   - Add `/metrics` endpoint and basic health checks.


## Input constraints

- username <= 10 chars
- password <= 10 chars
- node name <= 10 chars

