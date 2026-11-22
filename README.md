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

The application is being developed incrementally. The ticket API persists tickets in PostgreSQL, and the dashboard displays live ticket data. Employee account registration is available; login and asset features have not yet been implemented.

## Run Locally with Docker Compose

1. Copy `.env.example` to `.env` and adjust the local PostgreSQL settings if needed.
   In PowerShell, run `Copy-Item .env.example .env`.
2. Start the services from the repository root:

   ```sh
   docker compose up --build
   ```

3. Open the frontend at <http://localhost:5173>. The backend health endpoint is at <http://localhost:8000/health>, and its interactive API documentation is at <http://localhost:8000/docs>.

The Compose setup starts the React/Vite frontend, FastAPI backend, and PostgreSQL database. The database uses a named Docker volume so its data remains across container restarts. Stop the services with `docker compose down`.

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
