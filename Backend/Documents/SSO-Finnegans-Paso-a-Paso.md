# SSO con Finnegans - Walkthrough del codigo

> Documento tecnico para el equipo. Recorre archivo por archivo y linea por linea
> los componentes que implementan el SSO con la API de Finnegans.
>
> Para la guia de deploy del cliente, ver [`SSO-Finnegans-Deployment.md`](./SSO-Finnegans-Deployment.md).

---

## Indice

1. [Resumen del flujo](#1-resumen-del-flujo)
2. [`FinnegansUserInfo.cs` - DTO de dominio](#2-finnegansuserinfocs---dto-de-dominio)
3. [`IFinnegansAuthService.cs` - Contrato](#3-ifinnegansauthservicecs---contrato)
4. [`FinnegansAuthService.cs` - Cliente HTTP real](#4-finnegansauthservicecs---cliente-http-real)
5. [`MockFinnegansAuthService.cs` - Mock para desarrollo](#5-mockfinnegansauthservicecs---mock-para-desarrollo)
6. [`FinnegansAuthenticationHandler.cs` - Handler de auth](#6-finnegansauthenticationhandlercs---handler-de-auth)
7. [`DependencyInjection.cs` y `Program.cs` - Registro DI](#7-dependencyinjectioncs-y-programcs---registro-di)
8. [`appsettings.json` - Configuracion](#8-appsettingsjson---configuracion)
9. [`AuthController.cs` - Endpoints](#9-authcontrollercs---endpoints)
10. [Tabla de respuestas HTTP](#10-tabla-de-respuestas-http)
11. [Como probarlo en local](#11-como-probarlo-en-local)

---

## 1. Resumen del flujo

El cliente confirmo que NO necesitamos emitir tokens propios: el `access_token`
de Finnegans es la unica credencial de la sesion. Se valida en cada request
contra la API de Finnegans, con un cache (`IMemoryCache`) de TTL configurable
(default 5 min) para evitar overhead.

### 1.1 SSO inicial (una sola vez)

```
sequenceDiagram
    participant U as "Usuario"
    participant FE as "Frontend"
    participant BE as "Backend"
    participant C as "IMemoryCache"
    participant FN as "API Finnegans"

    U->>FE: /auth/sso?access_token=XXX
    FE->>BE: GET /api/auth/sso?access_token=XXX
    BE->>FN: GET /api/1/invitados?access_token=XXX
    FN-->>BE: { email, admin }
    BE->>BE: Busca/crea Usuario por email
    BE->>C: cache.Set(sha256(XXX), CachedFinnegansPrincipal, TTL=5min)
    BE-->>FE: { usuario }
    FE->>FE: Guarda access_token + usuario en localStorage
```

### 1.2 Requests posteriores

```
sequenceDiagram
    participant U as "Usuario"
    participant FE as "Frontend"
    participant BE as "Backend (Handler)"
    participant C as "IMemoryCache"
    participant FN as "API Finnegans"

    U->>FE: clic en /invitaciones
    FE->>BE: GET /api/invitaciones (Bearer XXX)
    BE->>C: cache.Get(sha256(XXX))?
    alt cache hit
        C-->>BE: CachedFinnegansPrincipal
    else cache miss
        BE->>FN: GET /api/1/invitados?access_token=XXX
        FN-->>BE: { email, admin }
        BE->>C: cache.Set(sha256(XXX), entry, TTL=5min)
    end
    BE->>BE: Arma ClaimsPrincipal (NameIdentifier, Email, Role)
    BE-->>FE: 200 OK + datos
```

---

## 2. `FinnegansUserInfo.cs` - DTO de dominio

**Ubicacion:** `Backend/Dominio/Modelos/FinnegansUserInfo.cs`

```csharp
namespace ProyectoFinal_Grupo6.Api.Dominio.Modelos
{
    public class FinnegansUserInfo
    {
        public string Email { get; set; } = string.Empty;
        public string? Domain { get; set; }
        public bool Admin { get; set; }
        public string? PanelUsuarioCodigo { get; set; }
    }
}
```

Representa los campos que nos interesan de la respuesta de Finnegans, ignorando
el resto. La respuesta real tiene 20+ campos; nos quedamos con cuatro:

| Campo | Para que lo usamos |
|---|---|
| `Email` | Buscar/crear el `Usuario` en nuestra DB. Clave de match |
| `Domain` | Logging y trazabilidad |
| `Admin` | Si es `true`, asignamos rol `Admin` al usuario autocreado |
| `PanelUsuarioCodigo` | Trazabilidad (puede servir despues para reportes) |

---

## 3. `IFinnegansAuthService.cs` - Contrato

**Ubicacion:** `Backend/Dominio/Interfaces/Servicios/IFinnegansAuthService.cs`

```csharp
public interface IFinnegansAuthService
{
    Task<FinnegansUserInfo?> ValidarTokenAsync(string accessToken, CancellationToken cancellationToken = default);
}
```

Una sola operacion: validar un token. Retorna `null` cuando el token no es
valido o la API falla. El caller traduce `null` a `401 Unauthorized`.

Hay dos implementaciones intercambiables segun configuracion:
- `FinnegansAuthService` (cliente HTTP real)
- `MockFinnegansAuthService` (tokens hardcodeados, para desarrollo)

---

## 4. `FinnegansAuthService.cs` - Cliente HTTP real

**Ubicacion:** `Backend/Infraestructura/Servicios/FinnegansAuthService.cs`

Llama a la API de Finnegans (`GET {BaseUrl}{InvitadosEndpoint}?access_token=...`),
parsea el JSON y devuelve un `FinnegansUserInfo`. Si la API responde 4xx/5xx o
hay timeout/excepcion, loguea y devuelve `null` (fail-safe: token invalido =
usuario no entra, no se cae el sistema).

Puntos clave de la implementacion:
- **`HttpClient` tipado** (`IHttpClientFactory`): evita socket exhaustion.
- **URL relativa** (`/api/1/invitados?...`) porque el `BaseAddress` se setea
  en DI.
- **`Uri.EscapeDataString`** sobre el token: escapa caracteres especiales.
- **Stream + `JsonDocument`**: no materializa todo el JSON en memoria.
- **`TryGetProperty`** para los campos opcionales: si Finnegans omite alguno,
  no rompe.
- **`Admin = true`** solo si el JSON tiene literalmente `true`. Cualquier otra
  cosa (`null`, string `"true"`, etc.) lo dejamos en `false` por seguridad.

---

## 5. `MockFinnegansAuthService.cs` - Mock para desarrollo

**Ubicacion:** `Backend/Infraestructura/Servicios/MockFinnegansAuthService.cs`

Permite probar el flujo SSO completo sin necesidad de credenciales reales de
Finnegans. Se activa con `Finnegans:UseMock=true` (recomendado en desarrollo).

Tokens predefinidos:

| Token | Email | Admin | Para que |
|---|---|---|---|
| `mock-admin-token` | `admin@empresa.com` | `true` | Probar flujos de admin |
| `mock-empleado-token` | `empleado1@empresa.com` | `false` | Probar flujos de empleado |
| `mock-nuevo-token` | `nuevo@empresa.com` | `false` | Probar `AutoCreateUsuarios=true` (usuario que no existe en la DB) |

Cualquier otro token retorna `null` (el handler responde 401).

> **Seguridad:** en produccion DEBE estar en `false`. Si por error queda en
> `true`, cualquiera con uno de los strings de arriba se autentica como admin.

---

## 6. `FinnegansAuthenticationHandler.cs` - Handler de auth

**Ubicacion:** `Backend/Infraestructura/Auth/FinnegansAuthenticationHandler.cs`

Es el componente central de la nueva arquitectura: un `AuthenticationHandler`
custom que se integra al pipeline estandar de ASP.NET Core (`UseAuthentication`,
`[Authorize]`, `User.Identity`, etc.).

### Flujo en cada request

1. **Lee `Authorization: Bearer <token>`**. Si no hay header o no es Bearer,
   retorna `AuthenticateResult.NoResult()` (deja que endpoints publicos
   funcionen).
2. **Calcula `cacheKey = "fg:" + SHA256(token)`**. No guardamos el token en
   claro como key.
3. **Busca en `IMemoryCache`**:
   - **Hit**: reconstruye `ClaimsPrincipal` desde la entrada cacheada y
     retorna `AuthenticateResult.Success(...)`. No llama a Finnegans ni a la
     DB.
   - **Miss**: llama a `IFinnegansAuthService.ValidarTokenAsync(token)`.
     - Si retorna `null` -> `AuthenticateResult.Fail("Token invalido")`.
     - Si retorna OK -> busca el `Usuario` por email en la DB.
       - Si no existe -> 401 ("usuario no registrado"). NO auto-crea: el
         auto-create esta restringido al endpoint `/auth/sso` para que el
         alta quede centralizada.
       - Si existe -> arma `CachedFinnegansPrincipal { Guid, Email, Rol,
         Admin }`, lo guarda en cache con `AbsoluteExpirationRelativeToNow =
         Options.CacheTtl` y `Size = 1`.
4. **Arma `ClaimsPrincipal`** con:
   - `ClaimTypes.NameIdentifier = Usuario.Guid` (los controllers ya lo leen
     asi para `ObtenerUsuarioId()`)
   - `ClaimTypes.Email`
   - `ClaimTypes.Role` (para `[Authorize(Roles = "...")]` a futuro)
   - `"finnegans:admin"` (flag del lado de Finnegans, no es el rol)

### Logout

Cuando el usuario hace logout, el frontend llama `POST /auth/logout?access_token=...`
y el controller hace `cache.Remove(cacheKey)`. El token queda invalido en
nuestro lado inmediatamente (pero sigue valido en Finnegans hasta que ellos lo
revoquen).

### Por que no usamos JWT propio

El cliente confirmo que no necesita un token propio. Ventajas de no emitirlo:
- **Una sola fuente de verdad**: la sesion vive lo que dure el `access_token`
  de Finnegans. Si Finnegans lo revoca, el usuario queda fuera (peor caso:
  `CacheTtl` minutos despues).
- **Menos secretos para rotar**: no hay `JWT_KEY` que generar ni rotar.
- **Menos codigo**: cero dependencia de `Microsoft.AspNetCore.Authentication.JwtBearer`.

---

## 7. `DependencyInjection.cs` y `Program.cs` - Registro DI

### 7.1 `DependencyInjection.cs`

```csharp
var useMockFinnegans = config.GetValue<bool>("Finnegans:UseMock", false);
if (useMockFinnegans)
{
    services.AddScoped<IFinnegansAuthService, MockFinnegansAuthService>();
}
else
{
    services.AddHttpClient<IFinnegansAuthService, FinnegansAuthService>((sp, client) =>
    {
        var cfg = sp.GetRequiredService<IConfiguration>();
        var baseUrl = cfg["Finnegans:BaseUrl"];
        if (!string.IsNullOrWhiteSpace(baseUrl))
            client.BaseAddress = new Uri(baseUrl);
        client.Timeout = TimeSpan.FromSeconds(15);
    });
}
```

Mismo patron que `HikCentral`, `Email`, `AuditLog`: flag `UseMock` decide
implementacion. El `AuthController` y el `FinnegansAuthenticationHandler`
dependen solo de la interfaz, no se enteran cual implementacion se inyecta.

### 7.2 `Program.cs`

```csharp
// Cache de validacion de tokens. Tope de entradas para evitar growth no acotado.
builder.Services.AddMemoryCache(options =>
{
    options.SizeLimit = 10_000;
});

// Esquema custom (reemplaza el AddJwtBearer del modelo anterior).
builder.Services.AddAuthentication(FinnegansAuthDefaults.AuthenticationScheme)
    .AddScheme<FinnegansAuthenticationOptions, FinnegansAuthenticationHandler>(
        FinnegansAuthDefaults.AuthenticationScheme,
        options =>
        {
            var ttlMinutes = builder.Configuration.GetValue<int>("Finnegans:CacheTtlMinutes", 5);
            options.CacheTtl = TimeSpan.FromMinutes(ttlMinutes);
        });
builder.Services.AddAuthorization();
```

| Linea | Por que |
|---|---|
| `AddMemoryCache` con `SizeLimit = 10_000` | Tope de entradas (~10k usuarios concurrentes con tokens distintos). Cada entrada usa `Size = 1` para respetar el limite. |
| `AddAuthentication("Finnegans")` | Esquema default usado cuando un endpoint tiene `[Authorize]` sin especificar esquema. |
| `AddScheme<TOpts, THandler>` | Registra el handler. ASP.NET Core lo invoca en el pipeline. |
| `CacheTtlMinutes` desde config | Default 5 minutos, override via `Finnegans__CacheTtlMinutes`. |

### 7.3 `FinnegansAuthDefaults` y `FinnegansAuthenticationOptions`

Tipos auxiliares en `Backend/Infraestructura/Auth/`:

- `FinnegansAuthDefaults.AuthenticationScheme = "Finnegans"`: nombre del
  esquema.
- `FinnegansAuthDefaults.CacheKeyPrefix = "fg:"`: prefijo de las keys en
  `IMemoryCache` para no chocar con otros usos del cache.
- `FinnegansAuthenticationOptions.CacheTtl`: TTL configurable, hereda de
  `AuthenticationSchemeOptions`.

---

## 8. `appsettings.json` - Configuracion

### Produccion (`appsettings.json`)

```json
"Finnegans": {
  "Enabled": false,
  "UseMock": false,
  "BaseUrl": "",
  "InvitadosEndpoint": "/api/1/invitados",
  "AutoCreateUsuarios": false,
  "RolPorDefecto": "Empleado",
  "CacheTtlMinutes": 5
}
```

Defaults seguros: SSO apagado, mock apagado, sin autocreate. El cliente activa
lo que necesite via variables de entorno (`Finnegans__Enabled=true`,
`Finnegans__BaseUrl=...`).

### Desarrollo (`appsettings.Development.json`)

```json
"Finnegans": {
  "Enabled": true,
  "UseMock": true,
  "AutoCreateUsuarios": true,
  "RolPorDefecto": "Admin",
  "CacheTtlMinutes": 5
}
```

SSO prendido + mock prendido + autocreate prendido = se puede probar el flujo
completo sin internet ni credenciales reales.

### Significado de cada clave

| Clave | Tipo | Default | Descripcion |
|---|---|---|---|
| `Enabled` | bool | `false` | Si esta en `false`, el endpoint `/api/auth/sso` responde 404 |
| `UseMock` | bool | `false` | Usa `MockFinnegansAuthService` con tokens hardcodeados |
| `BaseUrl` | string | `""` | URL base de la API de Finnegans (ignorado si `UseMock=true`) |
| `InvitadosEndpoint` | string | `/api/1/invitados` | Path del endpoint de validacion |
| `AutoCreateUsuarios` | bool | `false` | Crea el usuario en su primer login si no existe |
| `RolPorDefecto` | string | `Empleado` | Rol para autocreados sin flag `admin` |
| `CacheTtlMinutes` | int | `5` | TTL del cache de validacion de tokens |

---

## 9. `AuthController.cs` - Endpoints

**Ubicacion:** `Backend/Funcionalidades/Auth/AuthController.cs`

Quedan dos endpoints. El controller ya no inyecta nada relacionado a JWT.

### 9.1 `GET /api/auth/sso`

```csharp
[HttpGet("sso")]
public async Task<IActionResult> SsoLogin(
    [FromQuery(Name = "access_token")] string? accessToken,
    [FromServices] IFinnegansAuthService finnegansAuth,
    CancellationToken cancellationToken)
```

Flujo:

1. **Verifica `Finnegans:Enabled`**. Si esta en `false` -> 404.
2. **Valida que llego el `access_token`**. Si no -> 400.
3. **Llama a `IFinnegansAuthService.ValidarTokenAsync`**. Si retorna `null` -> 401.
4. **Resuelve/crea el `Usuario`** en la DB (`ResolverOCrearUsuarioAsync`):
   - Si existe -> lo devuelve.
   - Si no existe y `AutoCreateUsuarios=true` -> crea con email, nombre =
     parte local del email, apellido vacio, rol segun flag `admin`.
   - Si no existe y `AutoCreateUsuarios=false` -> retorna `null` -> 401.
5. **Prepopula el cache** con `cache.Set(sha256(token), CachedFinnegansPrincipal, TTL)`.
   Esto evita un round-trip extra a Finnegans en la primera request
   autenticada del usuario.
6. **Devuelve `{ usuario }`** (sin token).

> Cambio clave vs version anterior: ya no devolvemos `token`. El frontend
> guarda el mismo `access_token` que recibio en la URL y lo usa como Bearer
> para las requests siguientes.

### 9.2 `POST /api/auth/logout`

```csharp
[HttpPost("logout")]
public IActionResult Logout([FromQuery(Name = "access_token")] string? accessToken)
{
    if (string.IsNullOrWhiteSpace(accessToken))
        return NoContent();

    var cacheKey = FinnegansAuthDefaults.CacheKeyPrefix + Sha256Hex(accessToken);
    _cache.Remove(cacheKey);
    return NoContent();
}
```

Invalida la entrada del cache. El frontend tambien limpia `localStorage`. El
token sigue siendo valido en Finnegans hasta que ellos lo revoquen
(deslogueo en su lado).

---

## 10. Tabla de respuestas HTTP

### `GET /api/auth/sso?access_token=xxx`

| Status | Cuando | Body |
|---|---|---|
| `200 OK` | Token valido y usuario existe (o se autocreo) | `{ usuario }` |
| `400 BadRequest` | Falta el parametro `access_token` | `{ mensaje }` |
| `401 Unauthorized` | Token invalido en Finnegans, o usuario no registrado y `AutoCreateUsuarios=false` | `{ mensaje }` |
| `404 NotFound` | `Finnegans:Enabled = false` | `{ mensaje }` |

### `POST /api/auth/logout?access_token=xxx`

| Status | Cuando |
|---|---|
| `204 NoContent` | Siempre (best-effort) |

### Endpoints protegidos (`[Authorize]`)

| Status | Cuando |
|---|---|
| `200 OK` | Cache hit, o cache miss + token valido en Finnegans + usuario existe |
| `401 Unauthorized` | Sin header `Authorization`, token invalido, o usuario eliminado de la DB |

---

## 11. Como probarlo en local

### Opcion A: Mock (recomendado, sin internet)

`appsettings.Development.json` ya tiene `Finnegans:UseMock=true` y
`AutoCreateUsuarios=true`. Levantar back + front:

```powershell
# Terminal 1
dotnet run --project Backend/ProyectoFinal-Grupo6.Api.csproj

# Terminal 2
cd Frontend
npm run dev
```

Abrir en el navegador alguno de:

```
http://localhost:5173/auth/sso?access_token=mock-admin-token
http://localhost:5173/auth/sso?access_token=mock-empleado-token
http://localhost:5173/auth/sso?access_token=mock-nuevo-token
```

Tambien estan disponibles como botones en `/login` cuando
`VITE_SHOW_MOCK_SSO=true`.

### Opcion B: Con token real de Finnegans

1. En `appsettings.Development.json` cambiar:
   ```json
   "Finnegans": {
     "UseMock": false,
     "BaseUrl": "https://servicios.cliente.com"
   }
   ```
2. Pedir un `access_token` valido al cliente.
3. Abrir `http://localhost:5173/auth/sso?access_token=<TOKEN>`.

### Smoke tests del backend

```powershell
# Enabled=false -> 404
curl -i "https://localhost:7289/api/auth/sso?access_token=fake"

# Enabled=true, token invalido -> 401
curl -i "https://localhost:7289/api/auth/sso?access_token=fake"

# Falta parametro -> 400
curl -i "https://localhost:7289/api/auth/sso"

# Endpoint protegido, sin token -> 401
curl -i "https://localhost:7289/api/invitaciones"

# Endpoint protegido, token mock -> 200
curl -i -H "Authorization: Bearer mock-admin-token" \
     "https://localhost:7289/api/invitaciones"
```

---

## Apendice: Resumen de archivos

| Archivo | Capa | Responsabilidad |
|---|---|---|
| `Dominio/Modelos/FinnegansUserInfo.cs` | Dominio | DTO con los campos que nos interesan de Finnegans |
| `Dominio/Interfaces/Servicios/IFinnegansAuthService.cs` | Dominio | Contrato del servicio de validacion |
| `Infraestructura/Servicios/FinnegansAuthService.cs` | Infraestructura | Implementacion real: llama a la API HTTP de Finnegans |
| `Infraestructura/Servicios/MockFinnegansAuthService.cs` | Infraestructura | Mock para desarrollo (tokens hardcodeados) |
| `Infraestructura/Auth/FinnegansAuthDefaults.cs` | Infraestructura | Constantes (nombre de esquema, prefijo de cache) |
| `Infraestructura/Auth/FinnegansAuthenticationOptions.cs` | Infraestructura | Opciones del esquema (`CacheTtl`) |
| `Infraestructura/Auth/CachedFinnegansPrincipal.cs` | Infraestructura | DTO de la entrada cacheada |
| `Infraestructura/Auth/FinnegansAuthenticationHandler.cs` | Infraestructura | Handler que valida el Bearer token en cada request |
| `Infraestructura/Extensiones/DependencyInjection.cs` | Infraestructura | Registra `IFinnegansAuthService` (mock o real) |
| `Program.cs` | Composition root | Registra `AddMemoryCache` y `AddAuthentication("Finnegans")` |
| `Funcionalidades/Auth/AuthController.cs` | Aplicacion | Expone `GET /api/auth/sso` y `POST /api/auth/logout` |
| `appsettings.json` | Configuracion | Seccion `Finnegans` con defaults seguros |
