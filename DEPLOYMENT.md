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
