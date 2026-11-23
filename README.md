# HelpDesk-Central
Internal IT Help Desk and Asset Management System


## Project Description

HelpDesk Central is an internal IT help desk and asset management system designed to streamline IT support operations. The application will provide a centralized platform for submitting, tracking, and managing support tickets while helping IT staff organize and maintain company technology assets.

The goal is to improve communication between employees and IT personnel, increase visibility into support requests, and simplify IT asset management.

## Planned Technology Stack

- **Frontend:** React with Vite, initially using JavaScript, with CSS for styling
- **Backend:** Python with FastAPI
- **Database:** PostgreSQL
- **ORM and validation:** SQLAlchemy and Pydantic
- **Containerization:** Docker and Docker Compose
- **Testing:** Pytest for backend functionality; an appropriate frontend testing framework as needed
- **CI/CD:** GitHub Actions
- **Deployment target:** Google Cloud Run
- **Version control:** Git and GitHub

## MVP Scope

- Display ticket statistics on a dashboard.
- Create, list, and view support tickets.
- Update ticket status and assign ticket priorities.
- Browse the IT asset inventory and register assets.
- Persist application data in PostgreSQL.

The application is being developed incrementally. The ticket API persists tickets in PostgreSQL, and the dashboard displays live ticket data. Employee registration and the backend login API are available; asset management is not yet implemented.

## Run Locally with Docker Compose

1. Copy `.env.example` to `.env`, replace the sample PostgreSQL password, and set a random JWT secret.
   In PowerShell, run `Copy-Item .env.example .env`.
   Generate a secret with `py -c "import secrets; print(secrets.token_urlsafe(48))"` and assign its output to `JWT_SECRET_KEY` in `.env`. Do not commit `.env` or share the generated secret.
2. Start the services from the repository root:

   ```sh
   docker compose up --build
   ```

3. Open the frontend at <http://localhost:5173>. The backend health endpoint is at <http://localhost:8000/health>, and its interactive API documentation is at <http://localhost:8000/docs>.

The Compose setup starts the React/Vite frontend, FastAPI backend, and PostgreSQL database. The database uses a named Docker volume so its data remains across container restarts. Stop the services with `docker compose down`.

### Access from another device on your network

The default CORS allowlist supports `localhost` and `127.0.0.1`. To open the app from another device, use the host computer's LAN IPv4 address (not a Docker container IP such as `172.19.0.4`) and add it to `.env`. For example:

```env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://192.168.1.20:5173
VITE_API_URL=http://192.168.1.20:8000
```

Replace `192.168.1.20` with the host address shown by `ipconfig`. Recreate the frontend and backend so they load the updated values:

```sh
docker compose up -d --force-recreate backend frontend
```

The host firewall must also allow inbound connections on ports 5173 and 8000. Only add origins you control; the API does not use a wildcard CORS policy.

To run FastAPI directly on your host instead, install the packages from `backend/requirements.txt`, make sure PostgreSQL is reachable from the host, and set its URL before starting Uvicorn. For example, in PowerShell:

```powershell
Set-Location backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:DATABASE_URL = "postgresql+psycopg://<user>:<password>@localhost:5432/<database>"
uvicorn app.main:app --reload
```

Replace the URL placeholders with the values for your local PostgreSQL instance. The API fails at startup if `DATABASE_URL` is unset.

## Backend Tests

The backend tests use an isolated in-memory SQLite database and do not require the PostgreSQL service. Run them from the repository root:

```sh
docker compose run --build --rm --no-deps backend pytest
```

## Frontend Tests

Run the frontend login and registration tests in the frontend container:

```sh
docker compose run --build --rm --no-deps frontend npm test
```

## Ticket API

The API is available at `http://localhost:8000`; interactive Swagger documentation is available at <http://localhost:8000/docs>.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/tickets` | List tickets, newest first |
| `GET` | `/api/tickets/{ticket_id}` | Retrieve a ticket |
| `POST` | `/api/tickets` | Create a ticket |
| `PATCH` | `/api/tickets/{ticket_id}/status` | Change a ticket's status |
| `GET` | `/api/tickets/stats` | Get total and per-status counts |

Ticket creation requires `title`, `description`, and `requester`. `priority` is optional and defaults to `Medium`. Allowed priorities are `Low`, `Medium`, and `High`. New tickets default to `Open`; allowed statuses are `Open`, `In Progress`, and `Resolved`. Missing or invalid request fields return HTTP 422, and endpoints for a missing ticket return HTTP 404.

Example requests (run from PowerShell using `curl.exe`):

```powershell
curl.exe -X POST http://localhost:8000/api/tickets -H "Content-Type: application/json" -d '{"title":"Wi-Fi issue","description":"Connection drops after login.","requester":"Alex User","priority":"High"}'
curl.exe http://localhost:8000/api/tickets
curl.exe http://localhost:8000/api/tickets/1
curl.exe -X PATCH http://localhost:8000/api/tickets/1/status -H "Content-Type: application/json" -d '{"status":"In Progress"}'
curl.exe http://localhost:8000/api/tickets/stats
```

## Employee Registration API

`POST /api/auth/register` registers an employee account. The request requires `full_name`, a valid `email`, and a password between 8 and 128 characters. Email addresses are trimmed and lowercased, and duplicate addresses return HTTP 409. The role is assigned as `employee`; client-supplied extra fields such as `role` are rejected. Passwords are stored as Argon2id hashes and are never included in the response.

Example request:

```powershell
curl.exe -X POST http://localhost:8000/api/auth/register -H "Content-Type: application/json" -d '{"full_name":"Riley Employee","email":"riley.employee@example.com","password":"Strong-test-password-23"}'
```

Example response:

```json
{
  "id": 1,
  "full_name": "Riley Employee",
  "email": "riley.employee@example.com",
  "role": "employee",
  "created_at": "2026-11-22T21:00:00Z"
}
```

Tables are initialized with SQLAlchemy `create_all` when the API starts. This keeps the MVP setup simple, but `create_all` does not migrate existing tables if the model schema changes; a migration approach will be needed before making incompatible schema changes.

## Employee Login API

`POST /api/auth/login` accepts a normalized email address and password. Valid credentials return a signed JWT access token; invalid email or password returns the same HTTP 401 response. The token includes the user ID as `sub`, plus `iat` and `exp` claims. The default lifetime is 30 minutes.

Example request:

```powershell
curl.exe -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"email":"riley.employee@example.com","password":"<account-password>"}'
```

Example response:

```json
{
  "access_token": "<signed JWT>",
  "token_type": "bearer",
  "expires_in": 1800
}
```

Configure `JWT_SECRET_KEY` with a randomly generated value of at least 32 characters. `JWT_ALGORITHM` defaults to `HS256` (only HMAC SHA-2 algorithms are accepted), and `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` defaults to `30` and must be between 1 and 1440. If the secret is missing or invalid, login and token-authenticated dependencies return HTTP 503; ticket endpoints and other unrelated API functionality remain available.

Authenticated routes can use the reusable `get_current_user` dependency. Send a token using `Authorization: Bearer <access_token>`. Ticket routes are currently public and do not yet require authentication.

## Frontend Login

Open <http://localhost:5173/login> to log in with an employee account. A successful login returns to the dashboard. Use the profile menu to log out; the current session is also cleared when the API rejects the token or its reported expiration time is reached.

The frontend keeps the bearer token in tab-scoped `sessionStorage` because the backend currently issues tokens in JSON and does not provide secure HttpOnly cookies. JavaScript running on the page can read this token, so `sessionStorage` does not protect it from cross-site scripting (XSS). For production, prefer a backend-managed `Secure`, `HttpOnly`, appropriately `SameSite` cookie and add the corresponding CSRF protections.
