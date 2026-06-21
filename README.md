# ProyectoFinal-Grupo6

## Descripcion

Sistema de Gestion de Acceso de Visitantes — capa UX sobre HikCentral para ingreso a edificios mediante QR.
Los empleados crean invitaciones, el sistema genera un link unico por visitante, el visitante completa un formulario de registro, el backend crea una reserva en HikCentral (que genera el QR y lo envia por email), y el visitante usa el QR para acceder al edificio durante la ventana de tiempo configurada.

## Arquitectura

```
Navegador → Frontend (React 19 + Vite) → Backend API (.NET 9)
                                              ├→ HikCentral (reservas, QR, acceso)
                                              ├→ Finnegans GO (SSO, autenticacion)
                                              ├→ SQLite (usuarios, invitaciones, visitantes, grupos)
                                              ├→ DynamoDB (logs de auditoria)
                                              └→ SMTP (notificaciones por email)
```

## Estructura del repositorio

- `Frontend/` — interfaz de usuario (React 19, Vite, vanilla CSS)
- `Backend/` — API y capas de dominio/infraestructura (.NET 9, EF Core)
- `Backend/Documents/` — documentacion tecnica (SSO, modelo de datos, deployment)
- `docker-compose.yml` — orquestacion Docker (backend + frontend + DynamoDB)

## Requisitos

### Desarrollo local
- Node.js 20+
- npm
- .NET SDK 9.0+

### Docker (recomendado)
- Docker Desktop

## Ejecucion con Docker (recomendado)

```bash
cp .env.default .env
docker compose up --build -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

Ver `Backend/Documents/Docker-Deployment-Guide.md` para configuracion completa.

## Ejecucion local (desarrollo)

### 1) Backend

```bash
cd Backend
dotnet run --project ProyectoFinal-Grupo6.Api.csproj
```

### 2) Frontend

```bash
cd Frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Swagger: https://localhost:7289/swagger

## Funcionalidades

### Gestion de invitaciones
- Crear invitaciones con titulo, fecha, horario, destino y visitantes
- Wizard paso a paso con selector de dia de la semana
- Cancelar invitaciones (revoca acceso en HikCentral)
- Eliminar invitaciones
- Agregar visitantes a invitaciones existentes

### Grupos de visitantes
- Crear grupos al finalizar una invitacion con 2+ visitantes
- Seleccionar grupo al crear nueva invitacion (pre-llena visitantes)
- Editar nombre, descripcion y miembros de un grupo
- Crear invitacion directamente desde un grupo

### Integracion HikCentral
- Creacion de reservas via API `/registerment`
- Cancelacion via `/registerment/update` (mueve fecha al pasado)
- QR generado por HikCentral y mostrado en confirmacion
- Soporte mock para desarrollo sin VPN

### Email automatico
- Envio de link de registro al crear invitacion
- Configurable via SMTP (Gmail, Outlook, corporativo)
- Mock disponible (logea a consola)

### Autenticacion SSO (Finnegans GO)
- Login via token de Finnegans GO
- Auto-creacion de usuarios en primer login
- Mock con tokens predefinidos para desarrollo

### Auditoria
- Logs de eventos (invitacion creada, formulario completado, reserva creada, cancelaciones)
- Almacenamiento en DynamoDB (local o AWS)

### Administracion
- Panel admin con invitaciones de todos los usuarios
- CRUD de destinos (pisos del edificio)
- Configuracion global (buffer de minutos)
- Visualizacion de logs de auditoria

## Configuracion

El sistema se configura via variables de entorno (`.env`):

| Variable | Descripcion |
|----------|------------|
| `FINNEGANS_ENABLED` | Habilitar SSO con Finnegans |
| `FINNEGANS_USE_MOCK` | Usar mock de SSO |
| `HIKCENTRAL_USE_MOCK` | Usar mock de HikCentral |
| `EMAIL_USE_MOCK` | Usar mock de email |
| `AUDIT_USE_MOCK` | Usar mock de auditoria |
| `APP_BASE_URL` | URL del frontend (para links en emails) |

Ver `.env.example` para la lista completa con documentacion.
