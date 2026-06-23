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
- `.env.example` — plantilla completa con documentacion de todas las variables
- `.env.default` — configuracion lista para usar con todos los mocks habilitados

---

## Inicio Rapido con Docker

### Requisitos
- Docker Desktop instalado y corriendo

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/MaraiNicolas/ProyectoFinal-Grupo6.git
cd ProyectoFinal-Grupo6

# 2. Copiar configuracion por defecto
cp .env.default .env

# 3. Construir y levantar
docker compose up --build -d
```

### Acceso
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8080

Con la configuracion por defecto, el login muestra botones mock para pruebas:
- `mock-admin-token` — ingresa como administrador
- `mock-empleado-token` — ingresa como empleado
- `mock-nuevo-token` — crea un usuario nuevo automaticamente

---

## Configuracion para Produccion

Editar el archivo `.env` con los valores reales del entorno del cliente.

### 1. SSO Finnegans (Autenticacion)

```env
FINNEGANS_ENABLED=true
FINNEGANS_USE_MOCK=false
BASE_GO_URL=https://servicios.cliente.com
FINNEGANS_AUTO_CREATE=true
FINNEGANS_ROL_DEFAULT=Empleado
```

Reiniciar: `docker compose down && docker compose up --build -d`
(requiere rebuild del frontend porque `VITE_SHOW_MOCK_SSO` debe ser `false`)

### 2. HikCentral (Reservas y QR)

```env
HIKCENTRAL_USE_MOCK=false
HIKCENTRAL_BASE_URL=https://direccion-del-servidor
HIKCENTRAL_PARTNER_KEY=tu-partner-key
HIKCENTRAL_PARTNER_SECRET=tu-partner-secret
HIKCENTRAL_ACCESS_LEVEL_ID=7
HIKCENTRAL_ACCESS_LEVEL_NAME=Visitantes
```

**Importante:**
- El servidor HikCentral debe ser accesible desde el contenedor Docker (VPN o misma red)
- `ACCESS_LEVEL_ID` y `ACCESS_LEVEL_NAME` se obtienen desde HikCentral: Access Control > Access Level
- El sistema usa `/v2/appointment` para crear reservas con access level (QR funciona en las puertas)
- La cancelacion usa `/v1/appointment/single/delete` para eliminar reservas

Reiniciar: `docker compose up -d --force-recreate proyectofinal-grupo6.api`

### 3. Email (SMTP)

```env
EMAIL_USE_MOCK=false
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=notificaciones@empresa.com
EMAIL_PASSWORD=app-password-aqui
EMAIL_FROM_NAME=Sistema de Visitas
```

**Proveedores SMTP:**
| Proveedor | Host | Puerto | Notas |
|-----------|------|--------|-------|
| Gmail | smtp.gmail.com | 587 | Requiere App Password: https://myaccount.google.com/apppasswords |
| Outlook/O365 | smtp.office365.com | 587 | Usar credenciales de la cuenta |
| SMTP corporativo | Consultar con IT | Consultar con IT | Proporcionado por el equipo de IT |

Reiniciar: `docker compose up -d --force-recreate proyectofinal-grupo6.api`

### 4. Auditoria (DynamoDB)

DynamoDB Local esta incluido en docker-compose. Para logs persistentes:

```env
AUDIT_USE_MOCK=false
```

Reiniciar: `docker compose up -d --force-recreate proyectofinal-grupo6.api`

### 5. URLs de Produccion

```env
APP_BASE_URL=https://visitas.empresa.com
VITE_API_URL=https://api.visitas.empresa.com/api
VITE_SHOW_MOCK_SSO=false
```

Rebuild: `docker compose down && docker compose up --build -d`

---

## Operaciones Docker

| Accion | Comando |
|--------|---------|
| Ver logs | `docker compose logs -f` |
| Ver logs del backend | `docker compose logs -f proyectofinal-grupo6.api` |
| Detener todo | `docker compose down` |
| Reiniciar backend (cambios en .env) | `docker compose up -d --force-recreate proyectofinal-grupo6.api` |
| Rebuild frontend (cambios en VITE_*) | `docker compose down && docker compose up --build -d` |
| Reconstruir todo desde cero | `docker compose down -v && docker compose up --build -d` |

**Nota:** `docker compose down -v` elimina los volumenes (base de datos SQLite y DynamoDB). Usar solo cuando se quiera empezar con datos limpios.

---

## Checklist de Produccion

- [ ] `FINNEGANS_ENABLED=true` y `FINNEGANS_USE_MOCK=false`
- [ ] `BASE_GO_URL` apuntando a la API real de Finnegans
- [ ] `HIKCENTRAL_USE_MOCK=false` y credenciales configuradas
- [ ] `HIKCENTRAL_ACCESS_LEVEL_ID` y `HIKCENTRAL_ACCESS_LEVEL_NAME` configurados
- [ ] Servidor HikCentral accesible desde Docker (VPN o misma red)
- [ ] `EMAIL_USE_MOCK=false` y credenciales SMTP configuradas
- [ ] `APP_BASE_URL` apuntando a la URL real del frontend
- [ ] `VITE_API_URL` apuntando a la URL real de la API
- [ ] `VITE_SHOW_MOCK_SSO=false`
- [ ] `AUDIT_USE_MOCK=false` para logs persistentes
- [ ] El archivo `.env` NO esta commiteado en git

---

## Resolucion de Problemas

### "Error de autenticacion - Falta access_token"
Configurar `FINNEGANS_ENABLED=true` con `FINNEGANS_USE_MOCK=true` y `VITE_SHOW_MOCK_SSO=true` para pruebas. En produccion, acceder desde Finnegans GO.

### "No se pudo conectar con el servidor"
Verificar que la URL del frontend este en la lista de CORS en `Backend/Program.cs`. Origenes permitidos: `http://localhost:5173`, `http://localhost:3000`, `http://localhost`.

### "Error al crear reserva"
- Con HikCentral real: verificar VPN y conectividad con el servidor
- Con `AuditLog:UseMock=false`: verificar que DynamoDB Local este corriendo (`docker compose ps`)

### Los links de email no tienen dominio
Configurar `APP_BASE_URL` en el `.env` y reiniciar el backend.

### Los cambios en .env no toman efecto
- Variables del backend: `docker compose up -d --force-recreate proyectofinal-grupo6.api`
- Variables `VITE_*`: requieren rebuild del frontend: `docker compose down && docker compose up --build -d`

### El QR no abre la puerta
- Verificar que `HIKCENTRAL_ACCESS_LEVEL_ID` y `HIKCENTRAL_ACCESS_LEVEL_NAME` esten configurados correctamente
- Verificar que el access level exista en HikCentral: Access Control > Access Level
- El QR funciona dentro de la ventana horaria configurada (hora inicio - buffer hasta hora fin + buffer)

---

## Funcionalidades

### Gestion de invitaciones
- Crear invitaciones con titulo, fecha, horario, destino y visitantes
- Wizard paso a paso con selector de dia de la semana
- Pegar lista de emails para agregar multiples visitantes
- Cancelar invitaciones (elimina reserva en HikCentral)
- Eliminar invitaciones
- Agregar visitantes a invitaciones existentes

### Grupos de visitantes
- Crear grupos al finalizar una invitacion con 2+ visitantes
- Seleccionar grupo al crear nueva invitacion (pre-llena visitantes)
- Editar nombre, descripcion y miembros de un grupo
- Crear invitacion directamente desde un grupo

### Integracion HikCentral
- Creacion de reservas via API `/v2/appointment` con access level
- Cancelacion via `/v1/appointment/single/delete`
- QR generado por HikCentral con acceso a puertas configuradas
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
- Paginacion server-side en todas las tablas

---

## Ejecucion Local (Desarrollo sin Docker)

### Requisitos
- Node.js 20+
- .NET SDK 9.0+

### Backend

```bash
cd Backend
dotnet run --project ProyectoFinal-Grupo6.Api.csproj
```

Requiere `appsettings.Development.json` con JWT y credenciales (gitignored).

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Swagger: https://localhost:7289/swagger
