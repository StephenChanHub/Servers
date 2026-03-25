# Local Deployment (Frontend -> Backend -> MySQL)

## 1) MySQL schema

```bash
mysql -u root -p < db/schema.sql
```

Tables:
- `accounts`: user account basics.
- `nodes`: owned nodes (`account_id`), `target_input`(raw domain/ip), `ip_address`(resolved ip), `sort_order`, runtime metrics, port checks.

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

## API

### Auth
- `POST /backend-api/auth/login`
- `POST /backend-api/auth/signup`
- `POST /backend-api/auth/logout`

### Nodes
- `GET /backend-api/nodes`
- `POST /backend-api/nodes`
- `PUT /backend-api/nodes/:id`
- `DELETE /backend-api/nodes/:id`
- `POST /backend-api/nodes/reorder` (persist server-side order)

### Network diagnostics
- `POST /backend-api/network/validate`
- `POST /backend-api/network/ssh-connect`

### Health
- `GET /backend-api/health`

## Notes for this local monitoring tool

- Password hashing remains SHA-256 for lightweight local deployment.
- Session token auth is added to avoid direct account-id spoofing.
- SSH password is still stored for convenience, but API responses no longer return it.
- Domain input is preserved (`target_input`) while resolved IP is stored in `ip_address`.

## Input constraints

- username <= 10 chars
- password <= 10 chars
- node name <= 10 chars
