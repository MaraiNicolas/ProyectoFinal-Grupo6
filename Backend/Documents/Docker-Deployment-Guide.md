# Docker Deployment Guide

**Date:** 2026-06-11

This guide explains how to deploy the Visitor Access Management System using Docker. It covers every step from prerequisites to running the system in production.

---

## Prerequisites

- **Docker Desktop** installed and running (Windows/Mac) or Docker Engine (Linux)
- **Git** to clone the repository
- Access to the following (provided by the client):
  - HikCentral server address, PartnerKey, and PartnerSecret
  - Finnegans GO API URL (if using SSO)
  - SMTP email credentials (if sending real emails)

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/MaraiNicolas/ProyectoFinal-Grupo6.git
cd ProyectoFinal-Grupo6
git checkout deploy-sql
```

---

## Step 2: Create the Environment File

Copy the example file and edit it with your real values:

```bash
cp .env.example .env
```

Open `.env` in any text editor and configure each section as described below.

---

## Step 3: Configure the .env File

### 3.1 Database

SQLite is the default. No changes needed unless migrating to PostgreSQL or SQL Server.

```env
DB_CONNECTION_STRING=Data Source=/app/data/grupo6.db
```

### 3.2 SSO Finnegans (Authentication)

For production with Finnegans GO:

```env
FINNEGANS_ENABLED=true
FINNEGANS_USE_MOCK=false
BASE_GO_URL=https://servicios.cliente.com
FINNEGANS_INVITADOS_ENDPOINT=/api/1/invitados
FINNEGANS_AUTO_CREATE=true
FINNEGANS_ROL_DEFAULT=Empleado
FINNEGANS_CACHE_TTL_MINUTES=5
```

For local testing without Finnegans:

```env
FINNEGANS_ENABLED=true
FINNEGANS_USE_MOCK=true
VITE_SHOW_MOCK_SSO=true
```

Mock tokens available: `mock-admin-token`, `mock-empleado-token`, `mock-nuevo-token`.

### 3.3 HikCentral (Visitor Reservations & QR Codes)

For production with real HikCentral:

```env
HIKCENTRAL_USE_MOCK=false
HIKCENTRAL_BASE_URL=https://172.20.2.97
HIKCENTRAL_PARTNER_KEY=your-partner-key
HIKCENTRAL_PARTNER_SECRET=your-partner-secret
```

The server must be reachable from the Docker container (VPN or same network).

For local testing without HikCentral:

```env
HIKCENTRAL_USE_MOCK=true
```

### 3.4 Email (SMTP)

For production with real email delivery:

```env
EMAIL_USE_MOCK=false
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=notifications@company.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM_NAME=Sistema de Visitas
```

**SMTP providers:**

| Provider | Host | Port | Notes |
|----------|------|------|-------|
| Gmail | smtp.gmail.com | 587 | Requires App Password (https://myaccount.google.com/apppasswords) |
| Outlook/O365 | smtp.office365.com | 587 | Use account credentials |
| Corporate SMTP | Ask IT team | Ask IT team | Provided by client's IT department |

For local testing without email:

```env
EMAIL_USE_MOCK=true
```

Emails will be logged to the Docker console instead of being sent.

### 3.5 Audit Logs (DynamoDB)

DynamoDB Local is included in docker-compose.yml. For real audit logging:

```env
AUDIT_USE_MOCK=false
DYNAMODB_PORT=8000
```

For local testing without audit:

```env
AUDIT_USE_MOCK=true
```

### 3.6 Frontend

```env
APP_BASE_URL=https://visitas.company.com
VITE_API_URL=https://api.visitas.company.com/api
VITE_SHOW_MOCK_SSO=false
```

- `APP_BASE_URL`: The URL where the frontend is accessible. Used in email links sent to visitors.
- `VITE_API_URL`: The URL of the backend API from the browser's perspective.
- `VITE_SHOW_MOCK_SSO`: Must be `false` in production.

**Important:** `VITE_*` variables are baked into the frontend at build time. If you change them, you must rebuild the frontend image:

```bash
docker compose up -d --build frontend
```

---

## Step 4: Build and Run

```bash
docker compose up --build -d
```

This creates and starts 3 containers:

| Container | Port | Description |
|-----------|------|-------------|
| Backend API | 8080 | .NET 9 Web API |
| Frontend | 3000 | React app served by Nginx |
| DynamoDB Local | 8000 | Audit log storage (optional) |

---

## Step 5: Verify

1. Open http://localhost:3000 in a browser
2. Log in (mock SSO or real Finnegans depending on config)
3. Create an invitation
4. Check that the visitor receives an email with the registration link
5. Open the registration link and complete the form
6. Verify the reservation appears in HikCentral

---

## Common Operations

### View logs

```bash
docker compose logs -f
```

Backend only:

```bash
docker compose logs -f proyectofinal-grupo6.api
```

### Stop the system

```bash
docker compose down
```

### Restart after config change

For `.env` changes that don't affect `VITE_*` variables:

```bash
docker compose up -d --force-recreate proyectofinal-grupo6.api
```

For `VITE_*` changes (requires frontend rebuild):

```bash
docker compose up -d --build frontend
```

### Full rebuild

```bash
docker compose down
docker compose up --build -d
```

### Access the SQLite database

The database file is persisted in a Docker volume. To inspect it:

```bash
docker compose exec proyectofinal-grupo6.api ls /app/data/
```

---

## Production Checklist

- [ ] `FINNEGANS_USE_MOCK=false` and `BASE_GO_URL` set to real Finnegans API
- [ ] `FINNEGANS_AUTO_CREATE=true` if users should be created on first login
- [ ] `HIKCENTRAL_USE_MOCK=false` and credentials configured
- [ ] HikCentral server reachable from Docker container (VPN or same network)
- [ ] `EMAIL_USE_MOCK=false` and SMTP credentials configured
- [ ] `APP_BASE_URL` set to the real frontend URL (for email links)
- [ ] `VITE_API_URL` set to the real backend API URL
- [ ] `VITE_SHOW_MOCK_SSO=false`
- [ ] `AUDIT_USE_MOCK=false` for persistent audit logs
- [ ] `.env` file is NOT committed to git

---

## Troubleshooting

### "Error de autenticacion - Falta access_token"
The frontend expects SSO. Either set `FINNEGANS_ENABLED=true` with `FINNEGANS_USE_MOCK=true` and `VITE_SHOW_MOCK_SSO=true` for testing, or access the app through Finnegans GO.

### "No se pudo conectar con el servidor"
CORS issue. Check that the frontend URL is listed in `Backend/Program.cs` under `WithOrigins`. Current allowed origins: `http://localhost:5173`, `http://localhost:3000`, `http://localhost`.

### "Error al crear reserva"
- If using real HikCentral: check VPN connection and that the server is reachable
- If `AuditLog:UseMock=false`: check that DynamoDB Local container is running

### Email links show relative path (no domain)
`APP_BASE_URL` is not set. Add it to `.env` and restart the backend container.

### Changes to .env not taking effect
- For backend env vars: `docker compose up -d --force-recreate proyectofinal-grupo6.api`
- For `VITE_*` vars: `docker compose up -d --build frontend` (requires rebuild)

---

## Architecture Summary

```
Browser → Frontend (Nginx, port 3000) → Backend API (.NET 9, port 8080)
                                              ├→ HikCentral (reservations, QR codes)
                                              ├→ Finnegans GO (SSO authentication)
                                              ├→ SQLite (users, invitations, visitors)
                                              ├→ DynamoDB Local (audit logs)
                                              └→ SMTP (email notifications)
```

All services run in Docker containers. Data persists in Docker volumes (SQLite and DynamoDB).
