# SSO con Finnegans - Walkthrough del codigo

> Documento tecnico para el equipo. Recorre archivo por archivo y linea por linea
> los componentes que implementan el SSO con la API de Finnegans.
>
> Para el flujo general y decisiones de diseno, ver [`SSO-Finnegans.md`](./SSO-Finnegans.md).
> Para la guia de deploy del cliente, ver [`SSO-Finnegans-Deployment.md`](./SSO-Finnegans-Deployment.md).

---

## Indice

1. [Resumen del flujo](#1-resumen-del-flujo)
2. [`FinnegansUserInfo.cs` - DTO de dominio](#2-finnegansuserinfocs---dto-de-dominio)
3. [`IFinnegansAuthService.cs` - Contrato](#3-ifinnegansauthservicecs---contrato)
4. [`FinnegansAuthService.cs` - Cliente HTTP](#4-finnegansauthservicecs---cliente-http)
5. [`DependencyInjection.cs` - Registro DI](#5-dependencyinjectioncs---registro-di)
6. [`appsettings.json` - Configuracion](#6-appsettingsjson---configuracion)
7. [`AuthController.cs` - Endpoints](#7-authcontrollercs---endpoints)
8. [Tabla de respuestas HTTP](#8-tabla-de-respuestas-http)
9. [Como probarlo en local](#9-como-probarlo-en-local)

---

## 1. Resumen del flujo

```
sequenceDiagram
    participant U as "Usuario interno"
    participant GO as "Finnegans GO"
    participant FE as "Frontend (nuestro)"
    participant BE as "Backend (nuestro)"
    participant FAPI as "API Finnegans"

    U->>GO: Click en acceso a nuestra app
    GO->>FE: Redirect a /auth/sso?access_token=xxx
    FE->>BE: GET /api/auth/sso?access_token=xxx
    BE->>FAPI: GET {BaseUrl}/api/1/invitados?access_token=xxx
    FAPI-->>BE: { email, domain, admin, ... }
    BE->>BE: Busca/crea Usuario por email + emite JWT propio
    BE-->>FE: { token, usuario }
    FE->>FE: Guarda JWT en localStorage + redirect a /
```

Concepto clave: el `access_token` de Finnegans **NO se reusa**, se valida una sola vez
y emitimos nuestro **propio JWT** para el resto de la sesion.

---

## 2. `FinnegansUserInfo.cs` - DTO de dominio

**Ubicacion:** `Backend/Dominio/Entidades/FinnegansUserInfo.cs`

```csharp
namespace ProyectoFinal_Grupo6.Api.Dominio.Entidades
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

### Que hace

Representa los campos que nos interesan de la respuesta de Finnegans, ignorando el resto.

### Por que solo 4 campos

La respuesta real tiene 20+ campos (`lastContext`, `typeLicense`, `expiresAt`,
`empresaCodigoDefault`, etc.) pero para nuestro sistema solo necesitamos:

| Campo | Para que lo usamos |
|---|---|
| `Email` | Buscar/crear el `Usuario` en nuestra DB. Es la **clave de match** |
| `Domain` | Logging y trazabilidad |
| `Admin` | Si es `true`, asignamos rol `Admin` al usuario autocreado |
| `PanelUsuarioCodigo` | Trazabilidad (puede servir despues para reportes) |

Si en el futuro necesitamos mas campos, se agregan aca y se mapean en `FinnegansAuthService`.

### Por que vive en `Dominio/Entidades`

Porque es un **modelo de dominio**, no un detalle de transporte. La interfaz
`IFinnegansAuthService` lo retorna, y el controller lo consume sin saber que
viene de un JSON de una API externa.

---

## 3. `IFinnegansAuthService.cs` - Contrato

**Ubicacion:** `Backend/Dominio/Interfaces/Servicios/IFinnegansAuthService.cs`

```csharp
using ProyectoFinal_Grupo6.Api.Dominio.Entidades;

namespace ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios
{
    public interface IFinnegansAuthService
    {
        Task<FinnegansUserInfo?> ValidarTokenAsync(string accessToken, CancellationToken cancellationToken = default);
    }
}
```

### Que hace

Define el contrato del servicio que valida tokens contra Finnegans.

### Razonamiento de la firma

- **`Task<FinnegansUserInfo?>`**: retorna `null` cuando el token no es valido o la API falla.
  Asi el controller decide la traduccion a HTTP (401, 500, etc.) sin que el servicio
  conozca el framework web.
- **`CancellationToken cancellationToken = default`**: si el usuario cierra el navegador,
  ASP.NET Core cancela la request y se propaga al `HttpClient`. Default value para
  poder llamarlo en tests sin pasar el token.

### Por que vive en `Dominio/Interfaces`

Inversion de dependencias: el `AuthController` (capa de aplicacion) depende de la
**abstraccion**, no de la implementacion HTTP. Esto permite mockear el servicio en
tests sin levantar un `HttpClient` real.

---

## 4. `FinnegansAuthService.cs` - Cliente HTTP

**Ubicacion:** `Backend/Infraestructura/Servicios/FinnegansAuthService.cs`

### 4.1 Constructor

```csharp
public FinnegansAuthService(HttpClient httpClient, IConfiguration configuration, ILogger<FinnegansAuthService> logger)
{
    _httpClient = httpClient;
    _logger = logger;
    _endpoint = configuration["Finnegans:InvitadosEndpoint"] ?? "/api/1/invitados";
}
```

| Parametro | De donde viene | Para que |
|---|---|---|
| `HttpClient` | `IHttpClientFactory` (configurado en DI con `BaseAddress`) | Llamar a la API de Finnegans |
| `IConfiguration` | DI estandar de ASP.NET Core | Leer el endpoint configurable |
| `ILogger<...>` | DI estandar | Loguear warnings/errores sin tirar excepciones |

`_endpoint` se lee con fallback a `/api/1/invitados`. Esto permite que el cliente
cambie el path desde config si Finnegans publica una nueva version del endpoint.

### 4.2 Metodo `ValidarTokenAsync` - paso a paso

**Paso 1: Validacion defensiva**

```csharp
if (string.IsNullOrWhiteSpace(accessToken))
    return null;
```

Si llega vacio, cortamos antes de hacer una request HTTP innecesaria.

**Paso 2: Construir URL relativa**

```csharp
var url = $"{_endpoint}?access_token={Uri.EscapeDataString(accessToken)}";
```

- URL **relativa** (no incluye host) porque el `HttpClient` ya tiene `BaseAddress`.
- **`Uri.EscapeDataString`**: escapa el token. Si el token llegara a tener caracteres
  raros (`&`, `=`, espacios), no rompe el query string.

**Paso 3: Request HTTP**

```csharp
using var response = await _httpClient.GetAsync(url, cancellationToken);
if (!response.IsSuccessStatusCode)
{
    _logger.LogWarning("Finnegans rechazo el token. StatusCode: {Status}", response.StatusCode);
    return null;
}
```

- `using` libera la `HttpResponseMessage` al salir del scope.
- Si Finnegans responde 4xx/5xx (token expirado, invalido, etc.) logueamos y devolvemos `null`.
- **No tiramos excepcion** porque "token invalido" es un caso de negocio esperado, no un error.

**Paso 4: Parseo del JSON**

```csharp
await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
var root = doc.RootElement;
```

- Usamos **stream + `JsonDocument`** en vez de `ReadAsStringAsync` + `JsonSerializer.Deserialize`
  porque no materializamos todo el JSON en memoria.
- `await using` para el stream (es `IAsyncDisposable`).
- `using` para el `JsonDocument` (es `IDisposable`).

**Paso 5: Validacion del email**

```csharp
if (!root.TryGetProperty("email", out var emailProp) || emailProp.ValueKind != JsonValueKind.String)
{
    _logger.LogWarning("Respuesta de Finnegans sin email valido.");
    return null;
}
```

`email` es el unico campo obligatorio. Si no esta o no es string, la respuesta no nos sirve.

**Paso 6: Construccion del DTO**

```csharp
return new FinnegansUserInfo
{
    Email = emailProp.GetString() ?? string.Empty,
    Domain = root.TryGetProperty("domain", out var d) ? d.GetString() : null,
    Admin = root.TryGetProperty("admin", out var a) && a.ValueKind == JsonValueKind.True,
    PanelUsuarioCodigo = root.TryGetProperty("panelUsuarioCodigo", out var p) ? p.GetString() : null
};
```

- **`TryGetProperty`** para los campos opcionales: si Finnegans omite alguno, no rompemos.
- **`Admin`**: solo es `true` si el JSON tiene literalmente `true`. Cualquier otra cosa
  (`null`, `"true"` como string, etc.) lo dejamos en `false` por seguridad.

**Paso 7: Catch general**

```csharp
catch (Exception ex)
{
    _logger.LogError(ex, "Error consultando API de Finnegans en {Url}", url);
    return null;
}
```

Cualquier excepcion (timeout, DNS, conexion rechazada, JSON malformado) se loguea
y se retorna `null`. El controller traduce el `null` a `401 Unauthorized`.

> Decision consciente: **fail-safe**. Si Finnegans esta caido, los usuarios no pueden
> loguearse, pero los que ya tienen JWT siguen trabajando hasta que expire (8hs).

---

## 5. `DependencyInjection.cs` - Registro DI

**Ubicacion:** `Backend/Infraestructura/Extensiones/DependencyInjection.cs` (lineas 83-93)

```csharp
services.AddHttpClient<IFinnegansAuthService, FinnegansAuthService>((sp, client) =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    var baseUrl = cfg["Finnegans:BaseUrl"];
    if (!string.IsNullOrWhiteSpace(baseUrl))
        client.BaseAddress = new Uri(baseUrl);
    client.Timeout = TimeSpan.FromSeconds(15);
});
```

### Que hace

Registra `FinnegansAuthService` como implementacion de `IFinnegansAuthService` usando
el patron **typed client** de `IHttpClientFactory`.

### Paso a paso

| Linea | Que hace | Por que |
|---|---|---|
| `AddHttpClient<I, Impl>` | Registra ambos en DI y crea un pool de `HttpClient` | Evita socket exhaustion (no instanciar `new HttpClient()` a mano) |
| `(sp, client) => ...` | Lambda con acceso al `IServiceProvider` | Necesitamos leer `IConfiguration` para configurar el cliente |
| `cfg["Finnegans:BaseUrl"]` | Lee la URL base de la API de Finnegans | Configurable por env var `Finnegans__BaseUrl` |
| `client.BaseAddress = new Uri(baseUrl)` | Setea la base del cliente | Por eso en el servicio usamos URLs relativas |
| `client.Timeout = 15s` | Timeout explicito | Sin esto el default es 100s, demasiado largo para una pantalla de login |

### Resultado

Cuando el controller pide un `IFinnegansAuthService`, el contenedor:
1. Crea un `HttpClient` del pool con `BaseAddress` y `Timeout` configurados.
2. Lo inyecta en el constructor de `FinnegansAuthService`.
3. Devuelve la instancia al controller.

---

## 6. `appsettings.json` - Configuracion

**Ubicacion:** `Backend/appsettings.json` (lineas 31-38)

```json
"Finnegans": {
  "_descripcion": "SSO con Finnegans. Configurar BaseUrl en appsettings.Development.json (local) o variable de entorno Finnegans__BaseUrl / BASE_GO_URL (produccion).",
  "Enabled": false,
  "BaseUrl": "",
  "InvitadosEndpoint": "/api/1/invitados",
  "AutoCreateUsuarios": false,
  "RolPorDefecto": "Empleado"
}
```

### Significado de cada clave

| Clave | Tipo | Default | Descripcion |
|---|---|---|---|
| `Enabled` | bool | `false` | Si esta en `false`, el endpoint `/api/auth/sso` responde 404 |
| `BaseUrl` | string | `""` (vacio) | URL base de la API de Finnegans. Setear via env var `BASE_GO_URL` o `appsettings.Development.json` |
| `InvitadosEndpoint` | string | `/api/1/invitados` | Path del endpoint de validacion |
| `AutoCreateUsuarios` | bool | `false` | Crea el usuario en su primer login si no existe |
| `RolPorDefecto` | string | `Empleado` | Rol para autocreados sin flag `admin` |

### Como sobrescribir en produccion

ASP.NET Core lee variables de entorno automaticamente. El separador entre seccion y
clave son **dos guiones bajos** (`__`):

```
Finnegans__Enabled=true
Finnegans__BaseUrl=https://servicios.cliente.com
Finnegans__AutoCreateUsuarios=true
```

> Por que `Enabled: false` por defecto: el equipo desarrolla con login local
> sin necesitar conectividad a Finnegans. El cliente lo prende solo en su servidor.

---

## 7. `AuthController.cs` - Endpoints

**Ubicacion:** `Backend/Funcionalidades/Auth/AuthController.cs`

### 7.1 Atributos de clase

```csharp
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
```

- `[ApiController]`: validacion automatica del modelo, respuesta 400 si el body es invalido.
- `[Route("api/auth")]`: prefijo comun. Los endpoints quedan en `/api/auth/login` y `/api/auth/sso`.

### 7.2 Dependencias inyectadas

```csharp
private readonly ApplicationDbContext _context;
private readonly IConfiguration _configuration;
```

`IFinnegansAuthService` **no** se inyecta en el constructor porque solo lo usa el SSO.
Se inyecta a nivel metodo con `[FromServices]`.

### 7.3 Endpoint `POST /api/auth/login` (login local, MVP)

```csharp
[HttpPost("login")]
public async Task<IActionResult> Login([FromBody] LoginRequest request)
```

Flujo:

1. **Valida credenciales** contra el diccionario hardcodeado `Credenciales`. Si falla ? `401`.
2. **Busca el usuario** en la DB por email. Si no existe ? `401`.
3. **Genera JWT** llamando a `GenerarToken(usuario)`.
4. **Devuelve** `{ token, usuario }` para que el frontend lo guarde en `localStorage`.

> Este endpoint queda **intacto** despues del SSO. Lo seguimos usando en desarrollo.

### 7.4 Endpoint `GET /api/auth/sso` (nuevo)

**Firma:**

```csharp
[HttpGet("sso")]
public async Task<IActionResult> SsoLogin(
    [FromQuery(Name = "access_token")] string? accessToken,
    [FromServices] IFinnegansAuthService finnegansAuth,
    CancellationToken cancellationToken)
```

| Decision | Razon |
|---|---|
| `[HttpGet]` (no POST) | El usuario llega por **redirect del navegador**, un POST no funciona con click en link |
| `[FromQuery(Name = "access_token")]` | Mapea el query string `?access_token=xxx` al parametro C# (que usa camelCase) |
| `[FromServices]` (no constructor) | Solo este metodo necesita el servicio, no contamina al login local |
| `CancellationToken` | Si el usuario cierra el browser, cancelamos la llamada a Finnegans y la query a DB |

**Paso 1: Verificar si el SSO esta habilitado**

```csharp
var enabled = _configuration.GetValue<bool>("Finnegans:Enabled", false);
if (!enabled)
    return NotFound(new { mensaje = "SSO con Finnegans no esta habilitado" });
```

Si el cliente no activo el feature, **404** (como si el endpoint no existiera).
Default es `false`, asi en desarrollo no hay que tocar nada.

**Paso 2: Validar que llego el token**

```csharp
if (string.IsNullOrWhiteSpace(accessToken))
    return BadRequest(new { mensaje = "Falta el parametro access_token" });
```

Si alguien entra a `/api/auth/sso` sin query string, **400** con mensaje claro.

**Paso 3: Validar el token contra Finnegans**

```csharp
var info = await finnegansAuth.ValidarTokenAsync(accessToken, cancellationToken);
if (info == null || string.IsNullOrWhiteSpace(info.Email))
    return Unauthorized(new { mensaje = "Token invalido o no se pudo validar con Finnegans" });
```

Delegamos la logica HTTP al servicio. Si retorna `null` o sin email ? **401**.
Despues de esta linea **sabemos que el usuario es valido en Finnegans**.

**Paso 4: Buscar el usuario en nuestra DB**

```csharp
var usuario = await _context.Set<Dominio.Entidades.Usuario>()
    .FirstOrDefaultAsync(u => u.Email == info.Email, cancellationToken);
```

Buscamos por el email retornado por Finnegans. Dos casos:

**Caso A - El usuario existe:** seguimos al paso 5.

**Caso B - El usuario NO existe:** entramos al bloque de autocreacion:

```csharp
if (usuario == null)
{
    var autoCrear = _configuration.GetValue<bool>("Finnegans:AutoCreateUsuarios", false);
    if (!autoCrear)
        return Unauthorized(new { mensaje = $"El usuario {info.Email} no esta registrado en el sistema" });

    var rolPorDefecto = _configuration["Finnegans:RolPorDefecto"] ?? "Empleado";
    usuario = new Dominio.Entidades.Usuario
    {
        Nombre = info.Email.Split('@')[0],
        Apellido = string.Empty,
        Email = info.Email,
        Rol = info.Admin ? "Admin" : rolPorDefecto
    };
    _context.Set<Dominio.Entidades.Usuario>().Add(usuario);
    await _context.SaveChangesAsync(cancellationToken);
}
```

Dos modos segun configuracion:

| `AutoCreateUsuarios` | Que pasa si el usuario no existe |
|---|---|
| `false` (default, seguro) | **401** con "El usuario no esta registrado". El admin debe darlo de alta a mano |
| `true` (onboarding automatico) | Se crea con email, nombre = parte antes del `@`, apellido vacio, rol segun flag `admin` |

**Paso 5: Emitir JWT propio y devolver**

```csharp
var token = GenerarToken(usuario);
return Ok(new { token, usuario = new { ... } });
```

> Crucial: devolvemos **nuestro** JWT (firmado con `Jwt:Key`), no el `access_token`
> de Finnegans. Asi el resto del sistema usa una sola fuente de autenticacion.

### 7.5 Metodo privado `GenerarToken`

```csharp
private string GenerarToken(Dominio.Entidades.Usuario usuario)
```

**Usado por ambos endpoints** (login local y SSO).

| Paso | Linea | Que hace |
|---|---|---|
| 1 | `var jwtKey = _configuration["Jwt:Key"]!` | Lee la clave de firma (env var `Jwt__Key` en prod) |
| 2 | `new SymmetricSecurityKey(...)` | Crea la key con bytes UTF-8 de la clave |
| 3 | `new SigningCredentials(key, HmacSha256)` | Define el algoritmo de firma |
| 4 | `new Claim(...)` | Arma los claims: `NameIdentifier` (Guid), `Email`, `Role` |
| 5 | `new JwtSecurityToken(...)` | Construye el JWT con issuer, audience, claims, expiracion (8hs) |
| 6 | `new JwtSecurityTokenHandler().WriteToken(token)` | Serializa a string compacto |

El rol va como claim para que funcionen los `[Authorize(Roles = "Admin")]` del resto del sistema.

---

## 8. Tabla de respuestas HTTP

### `POST /api/auth/login`

| Status | Cuando | Body |
|---|---|---|
| `200 OK` | Credenciales validas y usuario existe | `{ token, usuario }` |
| `401 Unauthorized` | Credenciales invalidas o usuario no existe | `{ mensaje }` |

### `GET /api/auth/sso?access_token=xxx`

| Status | Cuando | Body |
|---|---|---|
| `200 OK` | Token valido y usuario existe (o se autocreo) | `{ token, usuario }` |
| `400 BadRequest` | Falta el parametro `access_token` | `{ mensaje }` |
| `401 Unauthorized` | Token invalido en Finnegans, o usuario no registrado y `AutoCreateUsuarios=false` | `{ mensaje }` |
| `404 NotFound` | `Finnegans:Enabled = false` | `{ mensaje }` |

---

## 9. Como probarlo en local

### Opcion A: Con token real de Finnegans

1. En `Backend/appsettings.Development.json` agregar:
```json
   "Finnegans": {
     "Enabled": true,
     "BaseUrl": "https://servicios.cliente.com",
     "AutoCreateUsuarios": true
   }
```

2. Pedir un `access_token` valido al cliente.

3. Levantar back + front:
```powershell
   # Terminal 1
   dotnet run --project Backend/ProyectoFinal-Grupo6.Api.csproj
   # Terminal 2
   cd Frontend
   npm run dev
```

4. Abrir en el navegador:
```
   http://localhost:5173/auth/sso?access_token=<TOKEN>
```

5. Deberia redirigir a `/` ya autenticado.

### Opcion B: Sin token real (mock manual)

Comentar la llamada HTTP en `FinnegansAuthService.ValidarTokenAsync` y retornar
un `FinnegansUserInfo` con un email conocido (ej: `admin@empresa.com`).
Reactivar antes de commitear.

### Smoke test del endpoint (sin token valido)

```powershell
# Si Enabled=false
curl -i "https://localhost:7289/api/auth/sso?access_token=fake"
# -> HTTP/1.1 404 Not Found

# Si Enabled=true pero token invalido
curl -i "https://localhost:7289/api/auth/sso?access_token=fake"
# -> HTTP/1.1 401 Unauthorized

# Si Enabled=true y falta parametro
curl -i "https://localhost:7289/api/auth/sso"
# -> HTTP/1.1 400 Bad Request
```

---

## Apendice: Resumen de archivos

| Archivo | Capa | Responsabilidad |
|---|---|---|
| `Dominio/Entidades/FinnegansUserInfo.cs` | Dominio | DTO con los campos que nos interesan de Finnegans |
| `Dominio/Interfaces/Servicios/IFinnegansAuthService.cs` | Dominio | Contrato del servicio de validacion |
| `Infraestructura/Servicios/FinnegansAuthService.cs` | Infraestructura | Implementacion: llama a la API HTTP de Finnegans |
| `Infraestructura/Extensiones/DependencyInjection.cs` | Infraestructura | Registra el servicio con `AddHttpClient` |
| `Funcionalidades/Auth/AuthController.cs` | Aplicacion | Expone `GET /api/auth/sso` |
| `appsettings.json` | Configuracion | Seccion `Finnegans` con valores por defecto |
