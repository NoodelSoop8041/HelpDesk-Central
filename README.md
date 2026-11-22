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

The application is being developed incrementally. The initial local development foundation and a static dashboard shell are in place. Ticket and asset features and live dashboard data have not yet been implemented.

## Run Locally with Docker Compose

1. Copy `.env.example` to `.env` and adjust the local PostgreSQL settings if needed.
   In PowerShell, run `Copy-Item .env.example .env`.
2. Start the services from the repository root:

   ```sh
   docker compose up --build
   ```

3. Open the frontend at <http://localhost:5173>. The backend health endpoint is at <http://localhost:8000/health>, and its interactive API documentation is at <http://localhost:8000/docs>.

The Compose setup starts the React/Vite frontend, FastAPI backend, and PostgreSQL database. The database uses a named Docker volume so its data remains across container restarts. Stop the services with `docker compose down`.

## Backend Tests

From the repository root, build and start the backend service, then run:

```sh
docker compose run --build --rm backend pytest
```

The current test covers the API health endpoint. Ticket and asset behavior and database persistence will be added in later development steps.
