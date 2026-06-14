# Guia de deployment - SSO Finnegans

> Documento para el equipo de infraestructura del cliente (Finnegans).
> Describe los pasos para desplegar y configurar la aplicacion con SSO habilitado.
>
> Para el walkthrough tecnico del codigo, ver [`SSO-Finnegans-Paso-a-Paso.md`](./SSO-Finnegans-Paso-a-Paso.md).

---

## Indice

1. [Que reciben](#1-que-reciben)
2. [Requisitos del servidor](#2-requisitos-del-servidor)
3. [Opcion A - Deploy con Docker Compose (recomendado)](#3-opcion-a---deploy-con-docker-compose-recomendado)
4. [Opcion B - Deploy tradicional (sin Docker)](#4-opcion-b---deploy-tradicional-sin-docker)
5. [Configurar el acceso desde Finnegans GO](#5-configurar-el-acceso-desde-finnegans-go)
6. [Alta de usuarios](#6-alta-de-usuarios)
7. [Checklist de deploy](#7-checklist-de-deploy)
8. [Verificacion post-deploy](#8-verificacion-post-deploy)
9. [Soporte](#9-soporte)

---

## 1. Que reciben

La solucion son dos componentes:

1. **Backend** - API en ASP.NET Core (.NET 9)
2. **Frontend** - SPA en React (build estatico servido por Nginx)

Ambos se entregan como codigo fuente desde el repositorio Git. Hay dos modos de
deploy: con **Docker Compose** (recomendado) o instalacion tradicional en el host.

> **Modelo de autenticacion:** la app NO emite tokens propios. El `access_token`
> que recibe el usuario desde Finnegans GO es la unica credencial de la sesion;
> el backend lo valida contra la API de Finnegans en cada request (con cache de
> TTL configurable para no golpear a Finnegans en cada llamada).

---

## 2. Requisitos del servidor

### Para deploy con Docker (Opcion A)
- Docker Engine 20.10+ y Docker Compose v2
- Acceso de red saliente al dominio de la API de Finnegans (ej: `servicios.cliente.com`)
- (Opcional) Reverse proxy externo para HTTPS (Nginx, Traefik, Caddy)

### Para deploy tradicional (Opcion B)
- Sistema operativo: Windows Server 2019+ / Linux (Ubuntu 22.04+, RHEL 8+)
- Runtime: **.NET 9 ASP.NET Core Runtime** (no hace falta el SDK)
- Servidor web para el frontend: IIS, Nginx, Apache
- Node.js 20+ solo si se compila el frontend en el servidor

---

## 3. Opcion A - Deploy con Docker Compose (recomendado)

### 3.1 Estructura del proyecto

El repositorio incluye en la raiz:

```
docker-compose.yml      <- orquesta backend + frontend + dynamodb-local
.env.example            <- plantilla de variables (commiteada)
Backend/Dockerfile      <- imagen de la API
Frontend/Dockerfile     <- imagen del frontend (Nginx + build de Vite)
```

Servicios que levanta:

| Servicio | Imagen | Puerto host | Para que |
|---|---|---|---|
| `proyectofinal-grupo6.api` | construida desde `Backend/Dockerfile` | 8080 | API REST |
| `frontend` | construida desde `Frontend/Dockerfile` | 3000 | SPA React (Nginx) |
| `dynamodb-local` | `amazon/dynamodb-local:latest` | 8000 | Almacena AuditLogs |

> **AWS DynamoDB real en lugar del contenedor:** si el cliente prefiere usar
> AWS DynamoDB en la nube, eliminar el servicio `dynamodb-local` del
> `docker-compose.yml` y setear `DYNAMODB_SERVICE_URL` apuntando al endpoint
> regional (ej: `https://dynamodb.us-east-1.amazonaws.com`) ademas de las
> credenciales AWS estandar (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).

### 3.2 Configurar variables de entorno

Copiar el archivo de plantilla y completarlo:

```powershell
# Windows
copy .env.example .env
```

```bash
# Linux
cp .env.example .env
```

Editar `.env` con los valores reales del entorno:

```sh
# --- SSO Finnegans ---
FINNEGANS_ENABLED=true
# En produccion siempre "false". El mock se usa solo en desarrollo local.
FINNEGANS_USE_MOCK=false
BASE_GO_URL=https://servicios.cliente.com
FINNEGANS_INVITADOS_ENDPOINT=/api/1/invitados
FINNEGANS_AUTO_CREATE=false
# Rol asignado a usuarios autocreados que NO son admin en Finnegans.
# El sistema hoy no usa el rol para autorizar endpoints (todos los usuarios
# autenticados pueden acceder a todo), pero el campo queda preconfigurado
# para habilitar autorizacion por rol en el futuro sin tocar el deploy.
FINNEGANS_ROL_DEFAULT=Admin
# TTL (minutos) del cache de validacion de tokens. Define el peor caso de
# delay entre que Finnegans revoca un token y nuestro backend deja de
# aceptarlo. Default: 5. Bajarlo si el cliente requiere revocacion mas
# rapida (a costo de mas llamadas a la API de Finnegans).
FINNEGANS_CACHE_TTL_MINUTES=5

# --- Servicios externos ---
HIKCENTRAL_USE_MOCK=false
AUDIT_USE_MOCK=false
EMAIL_USE_MOCK=false

# --- Frontend ---
VITE_API_URL=https://api.cliente.com/api
# En produccion debe ser "false". Si esta en "true", la pagina /login muestra
# botones con tokens mock que en produccion no funcionan (el mock esta apagado).
VITE_SHOW_MOCK_SSO=false
```

> **Importante:** el archivo `.env` esta en `.gitignore` y **no debe commitearse**.
> Solo `.env.example` se versiona.

#### Notas de seguridad

- **`BASE_GO_URL`**: este valor no viene precargado en el repo a proposito.
  Debe ser provisto por el cliente para evitar exponer URLs internas en GitHub.
  Si la variable falta, el backend logueara un warning al validar tokens.
- **`FINNEGANS_USE_MOCK`**: DEBE estar en `false` en produccion. Si por error
  queda en `true`, el backend usa tokens hardcodeados (`mock-admin-token`,
  etc.) y cualquiera con ese string puede autenticarse como admin.
- **`VITE_SHOW_MOCK_SSO`**: DEBE estar en `false` en produccion. Solo controla
  si la pagina `/login` muestra los botones de tokens mock; no afecta la
  validacion real, pero expone informacion innecesaria.
- **`.env` nunca debe commitearse**: ya esta incluido en `.gitignore`.
- **Sesiones del usuario**: la sesion vive lo que dure el `access_token` de
  Finnegans. Nuestro backend NO emite tokens propios; cuando Finnegans revoca
  o expira el token, el usuario queda deslogueado en el proximo cache miss
  (peor caso: `FINNEGANS_CACHE_TTL_MINUTES` minutos despues de la revocacion).

### 3.3 Construir y levantar

```bash
docker compose up -d --build
```

Esto:
1. Construye la imagen del backend (`Backend/Dockerfile`).
2. Construye la imagen del frontend pasando `VITE_API_URL` como build arg.
3. Descarga `amazon/dynamodb-local:latest` (solo la primera vez).
4. Levanta los 3 contenedores en background.
5. Backend queda en `http://localhost:8080`, frontend en `http://localhost:3000`,
   DynamoDB Local en `http://localhost:8000` (opcional, solo para inspeccion).

Los AuditLogs se persisten en el volumen Docker `dynamodb-data`. Para borrar
todos los logs (resetear la auditoria):

```bash
docker compose down -v
```

### 3.4 Verificar que arranco

```bash
docker compose ps
docker compose logs proyectofinal-grupo6.api
docker compose logs frontend
docker compose logs dynamodb-local
```

En los logs del backend, si `AuditLog__UseMock=false`, deberias ver:
```
Tabla AuditLogs verificada/creada en DynamoDB.
```

### 3.5 Cambiar configuracion

| Tipo de cambio | Comando |
|---|---|
| Variables del backend (`FINNEGANS_*`, etc.) | Editar `.env` + `docker compose up -d` |
| `VITE_API_URL` o `VITE_SHOW_MOCK_SSO` (frontend) | Editar `.env` + `docker compose up -d --build frontend` |
| Codigo fuente | `docker compose up -d --build` |

> El frontend requiere rebuild porque Vite **inlinea** las variables en el bundle
> durante `npm run build`. Las variables `VITE_*` no son runtime.

### 3.6 HTTPS en produccion

Las imagenes exponen HTTP. Para HTTPS hay dos opciones:

**Opcion 1:** poner un reverse proxy externo (Nginx, Traefik, IIS) delante de los
contenedores que termine SSL y haga proxy a `localhost:8080` y `localhost:3000`.

**Opcion 2:** agregar un servicio Traefik/Nginx en el mismo `docker-compose.yml`.

---

## 4. Opcion B - Deploy tradicional (sin Docker)

### 4.1 Backend

ASP.NET Core lee variables de entorno automaticamente y sobrescriben los valores
de `appsettings.json`. El separador entre seccion y clave son **dos guiones bajos**: `Seccion__Clave`.

**Variables minimas requeridas:**

```
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:5000

Finnegans__Enabled=true
Finnegans__UseMock=false
Finnegans__BaseUrl=https://servicios.cliente.com
Finnegans__InvitadosEndpoint=/api/1/invitados
Finnegans__AutoCreateUsuarios=false
# Rol por defecto para usuarios autocreados que NO son admin en Finnegans.
# Hoy no se usa para autorizar endpoints (queda preconfigurado para a futuro).
Finnegans__RolPorDefecto=Admin
# Opcional. Default: 5 minutos.
Finnegans__CacheTtlMinutes=5

HikCentral__UseMock=false
HikCentral__BaseUrl=https://<ip-hikcentral>
HikCentral__PartnerKey=<partner-key>
HikCentral__PartnerSecret=<partner-secret>

AuditLog__UseMock=false
DynamoDB__ServiceUrl=http://localhost:8000

Email__UseMock=false
```

### 4.2 Como setear las variables segun el host

**Windows Server / IIS:** en `web.config` bajo `<system.webServer>`:
```xml
<aspNetCore processPath="dotnet" arguments=".\ProyectoFinal-Grupo6.Api.dll" hostingModel="inprocess">
  <environmentVariables>
    <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Production" />
    <environmentVariable name="Finnegans__Enabled" value="true" />
    <environmentVariable name="Finnegans__UseMock" value="false" />
    <environmentVariable name="Finnegans__BaseUrl" value="https://servicios.cliente.com" />
  </environmentVariables>
</aspNetCore>
```

**Linux (systemd):** en `/etc/systemd/system/proyecto-final.service`:
```ini
[Service]
WorkingDirectory=/var/www/proyecto-final
ExecStart=/usr/bin/dotnet /var/www/proyecto-final/ProyectoFinal-Grupo6.Api.dll
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=Finnegans__Enabled=true
Environment=Finnegans__UseMock=false
Environment=Finnegans__BaseUrl=https://servicios.cliente.com
```

### 4.3 Publicar el backend

Desde la maquina de build (con .NET SDK 9):
```bash
dotnet publish Backend/ProyectoFinal-Grupo6.Api.csproj -c Release -o ./publish
```

Copiar `./publish` al servidor y ejecutar con `dotnet ProyectoFinal-Grupo6.Api.dll`.

### 4.4 Frontend

```bash
cd Frontend
# Setear VITE_API_URL antes de compilar
echo "VITE_API_URL=https://api.cliente.com/api" > .env.production
npm install
npm run build
```

Copiar `dist/` al servidor web. Configurar **SPA fallback** a `index.html` para que
las rutas client-side (`/auth/sso`, `/invitaciones`) funcionen.

**Nginx:**
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---

## 5. Configurar el acceso desde Finnegans GO

Una vez desplegado, el cliente debe agregar en su app interna un link que apunte
a la URL de la SPA con el `access_token` del usuario:

```
https://app.cliente.com/auth/sso?access_token={ACCESS_TOKEN_DEL_USUARIO}
```

Donde `{ACCESS_TOKEN_DEL_USUARIO}` es el mismo token que Finnegans GO usa para
identificar al usuario en su propio ecosistema. La SPA lo guarda en
`localStorage` y lo envia como `Authorization: Bearer ...` en cada request al
backend.

---

## 6. Alta de usuarios

Hay dos modos segun el valor de `FINNEGANS_AUTO_CREATE`:

### Modo 1: Alta manual (`FINNEGANS_AUTO_CREATE=false`)

El administrador debe dar de alta al usuario en el sistema **antes** de su primer
ingreso, desde la pantalla de administracion (`/admin`). Los emails deben coincidir
exactamente con el email que retorna la API de Finnegans.

Si el usuario intenta entrar sin estar registrado, recibe el error:
> "El usuario {email} no esta registrado en el sistema"

### Modo 2: Alta automatica (`FINNEGANS_AUTO_CREATE=true`)

La primera vez que un usuario ingresa, se crea automaticamente:
- **Email**: el que retorna Finnegans
- **Nombre**: la parte local del email (antes del `@`)
- **Apellido**: vacio (editable luego desde `/admin`)
- **Rol**: `Admin` si Finnegans devuelve `admin: true`, sino `FINNEGANS_ROL_DEFAULT`

> El auto-create solo aplica en el endpoint `GET /api/auth/sso`. Si un usuario
> es eliminado de la DB despues de tener una sesion activa, el handler de auth
> respondera 401 en el proximo cache miss (no auto-recrea).

---

## 7. Checklist de deploy

### Generico
- [ ] `FINNEGANS_ENABLED=true` en el entorno
- [ ] `FINNEGANS_USE_MOCK=false` (CRITICO en produccion)
- [ ] `VITE_SHOW_MOCK_SSO=false` en el build del frontend
- [ ] El servidor puede resolver y conectarse al `BASE_GO_URL`
- [ ] HTTPS configurado en frontend y backend (certificado valido)
- [ ] Link en Finnegans GO apunta a `https://app.cliente.com/auth/sso?access_token=...`
- [ ] Usuarios dados de alta (o `FINNEGANS_AUTO_CREATE=true`)
- [ ] `FINNEGANS_CACHE_TTL_MINUTES` revisado segun politica de revocacion del cliente
- [ ] HikCentral con `BaseUrl`, `PartnerKey` y `PartnerSecret` reales
- [ ] SMTP configurado para envio de invitaciones

### Solo Docker
- [ ] Docker Engine y Compose v2 instalados
- [ ] Archivo `.env` creado a partir de `.env.example` y completado
- [ ] `.env` NO esta commiteado al repo
- [ ] `docker compose up -d --build` ejecutado sin errores
- [ ] Reverse proxy externo (Nginx/Traefik) configurado para HTTPS

### Solo deploy tradicional
- [ ] .NET 9 ASP.NET Core Runtime instalado
- [ ] Variables de entorno seteadas en el host (web.config / systemd / etc.)
- [ ] Frontend compilado con `VITE_API_URL` correcto
- [ ] Servidor web con SPA fallback a `index.html`

---

## 8. Verificacion post-deploy

### 8.1 Smoke test del backend

```bash
curl https://api.cliente.com/swagger/v1/swagger.json
```
Debe responder con el JSON de OpenAPI.

### 8.2 Smoke test del SSO

```bash
# Si FINNEGANS_ENABLED=false
curl -i "https://api.cliente.com/api/auth/sso?access_token=fake"
# -> HTTP/1.1 404 Not Found

# Si FINNEGANS_ENABLED=true
curl -i "https://api.cliente.com/api/auth/sso?access_token=fake"
# -> HTTP/1.1 401 Unauthorized

# Sin parametro
curl -i "https://api.cliente.com/api/auth/sso"
# -> HTTP/1.1 400 Bad Request

# Endpoint protegido con token invalido (ejercita el handler de auth)
curl -i -H "Authorization: Bearer token-invalido" \
     "https://api.cliente.com/api/invitaciones"
# -> HTTP/1.1 401 Unauthorized

# Endpoint protegido sin token
curl -i "https://api.cliente.com/api/invitaciones"
# -> HTTP/1.1 401 Unauthorized
```

### 8.3 Test end-to-end

1. Loguearse en Finnegans GO con un usuario interno
2. Click en el acceso a nuestra app
3. Debe redirigir a `https://app.cliente.com/auth/sso?access_token=...`
4. Tras 1-2 segundos, debe quedar en `https://app.cliente.com/` autenticado
5. El nombre del usuario en la barra superior debe coincidir con el email logueado

### 8.4 Diagnostico con Docker

```bash
# Logs en vivo
docker compose logs -f proyectofinal-grupo6.api

# Inspeccionar variables de entorno del contenedor
docker compose exec proyectofinal-grupo6.api env | findstr Finnegans

# Reiniciar solo el backend tras cambiar .env
docker compose up -d proyectofinal-grupo6.api
```

---

## 9. Soporte

Para incidencias contactar al equipo de desarrollo con:

- Logs del backend (`docker compose logs` o `journalctl -u proyecto-final`)
- Valores configurados **sin exponer** credenciales de Finnegans, `PartnerSecret`
  de HikCentral, ni credenciales SMTP
- Resultado de los smoke tests del paso 8.2
- Captura del error en el navegador (incluyendo Network tab)
