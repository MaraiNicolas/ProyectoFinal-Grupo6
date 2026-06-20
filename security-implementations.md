# Implementaciones de Seguridad — Justificación Técnica

Sistema de Gestión de Visitantes — ProyectoFinal-Grupo6  
Fecha: 2026-06-19

---

## Índice

1. [Delegación de Identidad — SSO con Finnegans](#1-delegación-de-identidad--sso-con-finnegans)
2. [Handler de Autenticación Custom](#2-handler-de-autenticación-custom)
3. [SHA256 como Clave de Caché de Tokens](#3-sha256-como-clave-de-caché-de-tokens)
4. [Caché de Validación con TTL Configurable](#4-caché-de-validación-con-ttl-configurable)
5. [Límite de Tamaño del Caché](#5-límite-de-tamaño-del-caché)
6. [Autorización con [Authorize]](#6-autorización-con-authorize)
7. [Creación de Usuarios Centralizada y Auditable](#7-creación-de-usuarios-centralizada-y-auditable)
8. [Prevención de SQL Injection — EF Core con LINQ](#8-prevención-de-sql-injection--ef-core-con-linq)
9. [Identificadores No Predecibles — GUID como Clave Primaria](#9-identificadores-no-predecibles--guid-como-clave-primaria)
10. [Tokens de Registro de Un Solo Uso](#10-tokens-de-registro-de-un-solo-uso)
11. [Audit Logging de Eventos de Negocio](#11-audit-logging-de-eventos-de-negocio)
12. [Invalidación Activa de Sesión en Logout](#12-invalidación-activa-de-sesión-en-logout)
13. [Propagación de CancellationToken](#13-propagación-de-cancellationtoken)
14. [CORS Restringido por Origen](#14-cors-restringido-por-origen)
15. [WWW-Authenticate en Respuestas 401](#15-www-authenticate-en-respuestas-401)
16. [Manejo de 401 en el Frontend](#16-manejo-de-401-en-el-frontend)
17. [Manejo Centralizado de Excepciones](#17-manejo-centralizado-de-excepciones)

---

## 1. Delegación de Identidad — SSO con Finnegans

### Qué es

El sistema no gestiona contraseñas propias. La autenticación de usuarios se delega completamente a **Finnegans**, un proveedor de identidad externo ya adoptado por la organización. El usuario que desea acceder al sistema es redirigido a Finnegans, que emite un `access_token` si las credenciales son válidas. Ese token es la única prueba de identidad que el sistema acepta.

### Implementación

```csharp
// AuthController.cs — el token llega desde Finnegans vía query param
[HttpGet("sso")]
public async Task<IActionResult> SsoLogin(
    [FromQuery(Name = "access_token")] string? accessToken,
    [FromServices] IFinnegansAuthService finnegansAuth,
    CancellationToken cancellationToken)
{
    var info = await finnegansAuth.ValidarTokenAsync(accessToken, cancellationToken);
    if (info == null || string.IsNullOrWhiteSpace(info.Email))
        return Unauthorized(new { mensaje = "Token invalido o no se pudo validar con Finnegans" });

    var usuario = await ResolverOCrearUsuarioAsync(info, cancellationToken);
    // ...
}
```

```csharp
// FinnegansAuthService.cs — validación contra la API real de Finnegans
public async Task<FinnegansUserInfo?> ValidarTokenAsync(string accessToken, CancellationToken ct)
{
    var url = $"{_endpoint}?access_token={Uri.EscapeDataString(accessToken)}";
    using var response = await _httpClient.GetAsync(url, ct);
    if (!response.IsSuccessStatusCode)
        return null;
    // Parsea email, domain, admin, panelUsuarioCodigo del JSON de Finnegans
}
```

### Justificación

Gestionar contraseñas propias implica almacenarlas (con hashing, salting, versionado del algoritmo), implementar recuperación segura, proteger el endpoint de login contra ataques de fuerza bruta, y mantener la base de datos de credenciales protegida frente a filtraciones. Cada uno de esos puntos es una superficie de ataque independiente.

Al delegar a Finnegans, el sistema:

- **Elimina toda la clase de vulnerabilidades de gestión de contraseñas** (almacenamiento inseguro, password spraying, credential stuffing).
- **Hereda los controles de seguridad de Finnegans**: políticas de contraseñas, MFA si están habilitados, detección de anomalías.
- **Centraliza la revocación de acceso**: si un empleado deja la organización, basta con desactivar su cuenta en Finnegans para que el token deje de ser válido.
- **Evita la proliferación de credenciales**: el usuario tiene una sola contraseña para todos los sistemas integrados con Finnegans, reduciendo el riesgo de reutilización de contraseñas débiles.

La consecuencia directa es que el `access_token` de Finnegans —no un JWT emitido por este sistema— es la única credencial de sesión. Esto simplifica el modelo de seguridad: no hay gestión de refresh tokens, no hay firmado criptográfico propio, no hay secretos de firma que proteger.

---

## 2. Handler de Autenticación Custom

### Qué es

ASP.NET Core implementa autenticación a través de *schemes*. En lugar de usar el esquema JWT Bearer estándar (que asume tokens firmados localmente), el sistema implementa un esquema propio llamado `"Finnegans"` que sabe cómo validar los tokens opacos de Finnegans.

### Implementación

```csharp
// Program.cs — registro del esquema custom
builder.Services.AddAuthentication(FinnegansAuthDefaults.AuthenticationScheme)
    .AddScheme<FinnegansAuthenticationOptions, FinnegansAuthenticationHandler>(
        FinnegansAuthDefaults.AuthenticationScheme,
        options => {
            var ttlMinutes = builder.Configuration.GetValue<int>("Finnegans:CacheTtlMinutes", 5);
            options.CacheTtl = TimeSpan.FromMinutes(ttlMinutes);
        });
```

```csharp
// FinnegansAuthenticationHandler.cs — lógica central del handler
protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
{
    // 1. Si no hay header Authorization, los endpoints públicos siguen funcionando
    if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
        return AuthenticateResult.NoResult();

    // 2. Verificar formato "Bearer <token>"
    var header = authHeader.ToString();
    if (!header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        return AuthenticateResult.NoResult();

    var accessToken = header["Bearer ".Length..].Trim();
    if (string.IsNullOrWhiteSpace(accessToken))
        return AuthenticateResult.Fail("Bearer token vacio");

    // 3. Consulta al caché antes de llamar a Finnegans
    var cacheKey = FinnegansAuthDefaults.CacheKeyPrefix + Sha256Hex(accessToken);
    if (_cache.TryGetValue<CachedFinnegansPrincipal>(cacheKey, out var cached) && cached is not null)
        return AuthenticateResult.Success(BuildTicket(cached));

    // 4. Cache miss: validar contra Finnegans
    var info = await _finnegansAuth.ValidarTokenAsync(accessToken, Context.RequestAborted);
    if (info == null)
        return AuthenticateResult.Fail("Token invalido o no se pudo validar con Finnegans");

    // 5. El usuario debe existir en la DB local
    var usuario = await _dbContext.Set<Usuario>()
        .FirstOrDefaultAsync(u => u.Email == info.Email, Context.RequestAborted);
    if (usuario == null)
        return AuthenticateResult.Fail($"El usuario {info.Email} no esta registrado en el sistema");

    // 6. Guardar en caché y construir el ticket de autenticación
    _cache.Set(cacheKey, new CachedFinnegansPrincipal { ... }, new MemoryCacheEntryOptions
    {
        AbsoluteExpirationRelativeToNow = Options.CacheTtl,
        Size = 1
    });
    return AuthenticateResult.Success(BuildTicket(cached));
}
```

### Justificación

El esquema Bearer JWT estándar de ASP.NET valida tokens firmados con una clave local. Los tokens de Finnegans son **opacos** (no contienen información directamente legible ni firma verificable sin la API de Finnegans). Un handler custom es la única forma de integrar ambos sistemas sin comprometer la seguridad.

La separación en un handler dedicado tiene ventajas arquitectónicas clave:

- **Un único punto de validación**: toda autenticación pasa por `HandleAuthenticateAsync`. No hay código de validación disperso en controladores o servicios.
- **Doble barrera**: el token debe ser válido en Finnegans *y* el usuario debe existir en la base de datos local. Un token válido de Finnegans para un email que no está registrado en el sistema es rechazado, lo que permite al administrador revocar acceso localmente sin depender de Finnegans.
- **Separación de responsabilidades**: el handler no sabe si el endpoint requiere autenticación o no — eso lo decide `[Authorize]`. Si no hay header, retorna `NoResult()` (no falla), permitiendo que endpoints públicos como `/api/registro/{token}` sigan funcionando sin autenticación.

---

## 3. SHA256 como Clave de Caché de Tokens

### Qué es

Cuando se almacena el resultado de la validación de un token en `IMemoryCache`, la clave no es el token en texto claro sino su hash SHA256 en formato hexadecimal.

### Implementación

```csharp
// FinnegansAuthenticationHandler.cs
private static string Sha256Hex(string input)
{
    var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
    return Convert.ToHexString(bytes);
}

// Uso al leer/escribir el caché:
var cacheKey = FinnegansAuthDefaults.CacheKeyPrefix + Sha256Hex(accessToken);
// Resultado: "fg:3A5F2B1C..." (64 chars hex, nunca el token original)
```

El mismo método existe en `AuthController.cs` para que el prepoblado del caché en el login use la misma clave:

```csharp
// AuthController.cs — prepoblado en /auth/sso
var cacheKey = FinnegansAuthDefaults.CacheKeyPrefix + Sha256Hex(accessToken);
_cache.Set(cacheKey, new CachedFinnegansPrincipal { ... }, options);
```

### Justificación

`IMemoryCache` de ASP.NET Core almacena los datos en memoria del proceso. En un escenario de ataque donde el atacante logra:
- **Dump de memoria del proceso** (mediante una vulnerabilidad de lectura de memoria, un adjunto de debugger, o acceso al archivo de paginación en sistemas Windows).
- **Acceso a una herramienta de diagnóstico mal configurada** (como una ruta de diagnóstico que exponga el estado interno).
- **Un error de logging** que registre el contenido del caché.

Si los tokens estuvieran almacenados en texto claro, el atacante obtendría tokens activos que puede reutilizar inmediatamente hasta que expiren. Con SHA256:

- El hash es **unidireccional**: conocer `SHA256(token)` no permite recuperar el token original.
- El hash tiene **resistencia a colisiones**: no se puede construir un token diferente que produzca la misma clave de caché.
- El hash es **determinístico**: el mismo token siempre produce la misma clave, lo que permite invalidar entradas en el logout (ver sección 12).

SHA256, aunque no es la opción más costosa computacionalmente (como bcrypt), es apropiada aquí porque no se está almacenando una contraseña (que requiere hacer el cómputo costoso para dificultar ataques de diccionario) sino protegiéndose contra la exposición de tokens activos. La operación se ejecuta en microsegundos y no introduce latencia perceptible.

---

## 4. Caché de Validación con TTL Configurable

### Qué es

Después de la primera validación exitosa de un token contra Finnegans, el resultado se almacena en `IMemoryCache` por un tiempo configurable (TTL). Las requests siguientes con el mismo token leen del caché sin contactar a Finnegans.

### Implementación

```csharp
// FinnegansAuthenticationOptions.cs
public class FinnegansAuthenticationOptions : AuthenticationSchemeOptions
{
    // Peor caso de delay entre que Finnegans revoca un token
    // y nuestro backend deja de aceptarlo.
    public TimeSpan CacheTtl { get; set; } = TimeSpan.FromMinutes(5);
}

// Escritura en caché con expiración absoluta:
_cache.Set(cacheKey, entry, new MemoryCacheEntryOptions
{
    AbsoluteExpirationRelativeToNow = Options.CacheTtl,  // default: 5 min
    Size = 1
});
```

El TTL se configura por fuera del código:

```json
// appsettings.json
{
  "Finnegans": {
    "CacheTtlMinutes": 5
  }
}
```

### Justificación

Sin caché, cada request autenticada (listar invitaciones, crear visitantes, etc.) requeriría una llamada HTTP a la API de Finnegans para validar el token. Esto introduce:

- **Latencia adicional**: una llamada HTTP externa en cada request agrega decenas a cientos de milisegundos de latencia, degradando la experiencia del usuario.
- **Acoplamiento operacional**: si Finnegans tiene una interrupción momentánea, el sistema queda inoperativo para todas las requests autenticadas, incluso si el token sería válido.
- **Carga sobre Finnegans**: un usuario navegando activamente puede generar decenas de requests por minuto, multiplicado por la cantidad de usuarios concurrentes.

El caché es **de expiración absoluta** (no sliding), lo que significa que el tiempo máximo que un token revocado en Finnegans sigue siendo aceptado es exactamente el TTL configurado. Expiración deslizante (que se reinicia con cada uso) podría mantener un token activo indefinidamente mientras el usuario siga haciendo requests.

El valor de 5 minutos es un equilibrio deliberado: suficientemente corto para que la revocación de acceso sea operacionalmente efectiva (ej. desactivar una cuenta comprometida), y suficientemente largo para minimizar la carga sobre Finnegans. Este balance es configurable para ajustarse a las políticas de seguridad del cliente.

---

## 5. Límite de Tamaño del Caché

### Qué es

El `IMemoryCache` tiene un límite máximo de entradas configurado a nivel de servicio, y cada entrada de token declara su peso en `Size = 1`.

### Implementación

```csharp
// Program.cs — límite global del caché
builder.Services.AddMemoryCache(options =>
{
    options.SizeLimit = 10_000;
});

// FinnegansAuthenticationHandler.cs — cada entrada ocupa 1 unidad
_cache.Set(cacheKey, entry, new MemoryCacheEntryOptions
{
    AbsoluteExpirationRelativeToNow = Options.CacheTtl,
    Size = 1   // ← peso declarado explícitamente
});
```

### Justificación

Sin un límite, un atacante que genere una cantidad arbitraria de tokens (válidos o no) y haga requests con ellos podría llenar el caché con entradas hasta agotar la memoria del proceso — un ataque de denegación de servicio basado en agotamiento de recursos (Resource Exhaustion DoS).

Con `SizeLimit = 10_000` y `Size = 1` por entrada, el caché nunca puede contener más de 10.000 tokens en simultáneo. Cuando se alcanza el límite, `IMemoryCache` comienza a evictar entradas según su política de prioridad (por defecto, las más antiguas y menos usadas). Esto garantiza que:

- El caché nunca crece de forma ilimitada.
- En condiciones de alta carga, el sistema sigue funcionando (aunque con más cache misses y más llamadas a Finnegans).
- El consumo de memoria del proceso permanece predecible y acotado.

10.000 entradas simultáneas es un valor generoso para un sistema de gestión de visitantes corporativo (implica 10.000 usuarios con sesiones activas en el mismo intervalo de TTL), sin ser excesivo para la infraestructura objetivo.

---

## 6. Autorización con `[Authorize]`

### Qué es

Los controladores que manejan datos sensibles requieren que el usuario esté autenticado antes de procesar cualquier request. Esto se declara con el atributo `[Authorize]` a nivel de clase, protegiendo todos los endpoints del controlador.

### Implementación

```csharp
// InvitacionesController.cs — protección a nivel de clase
[ApiController]
[Route("api/invitaciones")]
[Authorize]   // ← aplica a todos los endpoints del controlador
public class InvitacionesController : ControllerBase { ... }

// AdminController.cs
[ApiController]
[Route("api/admin")]
[Authorize]
public class AdminController : ControllerBase { ... }

// RegistroController.cs — sin [Authorize]: endpoint público por diseño
[ApiController]
[Route("api/registro")]
public class RegistroController : ControllerBase { ... }
```

ASP.NET Core aplica el middleware de autorización automáticamente cuando `app.UseAuthorization()` está en el pipeline:

```csharp
// Program.cs — orden correcto del middleware
app.UseAuthentication();  // 1. ¿Quién eres?
app.UseAuthorization();   // 2. ¿Tienes permiso?
app.MapControllers();
```

### Justificación

`[Authorize]` es la implementación del principio de **denegación por defecto** (*deny by default*): en lugar de proteger endpoints individualmente (y arriesgarse a olvidar uno), se protege el controlador completo y se eximen explícitamente los endpoints que deben ser públicos.

El controlador `RegistroController` (auto-registro de visitantes) es intencionalmente público: un visitante recibe un enlace por email con un token de un solo uso y no tiene cuenta en el sistema. Exponer únicamente este controlador sin autenticación es una decisión de diseño deliberada, no una omisión. El acceso está igualmente controlado por el token de registro (ver sección 10).

El orden del middleware es crítico: `UseAuthentication` debe ejecutarse antes que `UseAuthorization`. Si se invierten, el sistema de autorización no tendría el `ClaimsPrincipal` construido y rechazaría todas las requests aunque el handler de autenticación hubiera validado el token correctamente.

---

## 7. Creación de Usuarios Centralizada y Auditable

### Qué es

La creación automática de usuarios a partir de tokens SSO está restringida a un único endpoint (`/api/auth/sso`). El handler de autenticación que se ejecuta en cada request **solo acepta usuarios que ya existen en la base de datos local**.

### Implementación

```csharp
// FinnegansAuthenticationHandler.cs — solo acepta usuarios existentes
var usuario = await _dbContext.Set<Usuario>()
    .FirstOrDefaultAsync(u => u.Email == info.Email, Context.RequestAborted);

if (usuario == null)
{
    Logger.LogWarning("Token valido en Finnegans pero usuario {Email} no existe en la DB", info.Email);
    return AuthenticateResult.Fail($"El usuario {info.Email} no esta registrado en el sistema");
}
```

```csharp
// AuthController.cs — la creación automática solo ocurre en /auth/sso
private async Task<Usuario?> ResolverOCrearUsuarioAsync(FinnegansUserInfo info, CancellationToken ct)
{
    var usuario = await _context.Set<Usuario>()
        .FirstOrDefaultAsync(u => u.Email == info.Email, ct);

    if (usuario != null) return usuario;

    // Configurable: si está desactivado, usuarios nuevos en Finnegans no entran al sistema
    var autoCrear = _configuration.GetValue<bool>("Finnegans:AutoCreateUsuarios", false);
    if (!autoCrear) return null;

    // Alta controlada con rol por defecto
    var rolPorDefecto = _configuration["Finnegans:RolPorDefecto"] ?? "Empleado";
    usuario = new Usuario
    {
        Email = info.Email,
        Rol = info.Admin ? "Admin" : rolPorDefecto,
        // ...
    };
    _context.Set<Usuario>().Add(usuario);
    await _context.SaveChangesAsync(ct);
    return usuario;
}
```

### Justificación

Un diseño alternativo más simple habría creado automáticamente el usuario en cada request que presentara un token válido de Finnegans. Esto tiene un problema de seguridad concreto: **cualquier persona con una cuenta en Finnegans (toda la organización, potencialmente miles de usuarios) tendría acceso automático al sistema**, sin ningún control de quién puede entrar.

La separación en dos niveles resuelve esto:

1. **El handler de autenticación** actúa como portero estricto: token válido en Finnegans *y* usuario registrado localmente. Si solo se cumple la primera condición, el acceso es denegado. Esto permite al administrador del sistema revocar el acceso localmente (eliminando o desactivando el usuario en la DB) sin depender de que Finnegans revoque el token.

2. **El endpoint `/auth/sso`** es el único punto de alta: cuando `AutoCreateUsuarios=true`, el primer login de un usuario en Finnegans que no existe localmente crea la cuenta con el rol configurado. Esta operación es auditable (ocurre en un endpoint conocido, puede loggearse) en lugar de ocurrir de forma invisible en el middleware de autenticación.

3. **`AutoCreateUsuarios` es configurable**: en entornos donde el acceso debe ser explícitamente aprobado por un administrador, se puede desactivar (`false`) y el administrador debe crear manualmente los usuarios antes de que puedan ingresar.

---

## 8. Prevención de SQL Injection — EF Core con LINQ

### Qué es

Todas las consultas a la base de datos se escriben en LINQ (Language Integrated Query), que Entity Framework Core traduce a SQL parametrizado en tiempo de ejecución. No existe SQL en texto claro en ningún punto del código.

### Implementación

```csharp
// FinnegansAuthenticationHandler.cs — consulta parametrizada automáticamente
var usuario = await _dbContext.Set<Usuario>()
    .FirstOrDefaultAsync(u => u.Email == info.Email, Context.RequestAborted);
// EF Core genera: SELECT * FROM "Usuario" WHERE "Email" = @p0
// El valor de info.Email nunca se concatena al SQL directamente

// InvitacionesService.cs — consulta con múltiples condiciones
var invitaciones = await _context.Set<Invitacion>()
    .Include(i => i.Usuario)
    .Include(i => i.Destino)
    .Include(i => i.Visitantes)
    .Where(i => i.UsuarioId == usuarioId)
    .Where(i => fecha == null || i.Fecha.Date == fecha.Value.Date)
    .ToListAsync();
// Todos los parámetros (usuarioId, fecha) se pasan como parámetros SQL, nunca interpolados
```

```csharp
// ApplicationDbContext.cs — auto-descubrimiento por reflexión
// No hay SQL raw; el esquema y las relaciones se definen en C# puro
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    var assembly = Assembly.GetExecutingAssembly();
    var entityTypes = assembly.GetTypes()
        .Where(t => t.Namespace == "ProyectoFinal_Grupo6.Api.Dominio.Entidades");
    foreach (var type in entityTypes)
        modelBuilder.Entity(type);
    // Relaciones, índices únicos y claves foráneas configuradas en C#, no en SQL
}
```

### Justificación

SQL Injection es consistentemente la vulnerabilidad #1 en sistemas que construyen queries mediante concatenación de strings. Una query vulnerable se vería así:

```csharp
// EJEMPLO DE CÓDIGO VULNERABLE — no existe en el sistema
var sql = $"SELECT * FROM Usuario WHERE Email = '{userInput}'";
// Si userInput = "' OR '1'='1", la query retorna todos los usuarios
// Si userInput = "'; DROP TABLE Usuario; --", destruye la tabla
```

EF Core convierte la expresión LINQ en una consulta con parámetros posicionales (`@p0`, `@p1`, etc.). El motor de base de datos recibe el SQL y los parámetros por separado, tratando los parámetros siempre como datos literales, nunca como parte del SQL. Es imposible que el contenido de un parámetro altere la estructura de la query.

La protección es **estructural**: no depende de que cada desarrollador recuerde sanitizar inputs manualmente, sino de que la única forma de consultar la base de datos en el sistema (EF Core + LINQ) es inherentemente segura.

---

## 9. Identificadores No Predecibles — GUID como Clave Primaria

### Qué es

Todas las entidades del sistema usan `Guid` (Globally Unique Identifier, 128 bits aleatorios) como clave primaria, en lugar de enteros autoincrementales.

### Implementación

```csharp
// Dominio/Entidades/Usuario.cs — clave primaria GUID
public class Usuario
{
    public Guid Guid { get; set; }  // ← 128 bits, generado por EF Core
    public string Nombre { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    // ...
}

// Lo mismo para: Visitante, Invitacion, Destino, InvitacionVisitante
```

```csharp
// Ejemplo de endpoint con ID en la URL
[HttpGet("{id}")]
public async Task<IActionResult> ObtenerPorId(Guid id)
{
    var invitacion = await _service.ObtenerInvitacionPorId(id);
    if (invitacion == null)
        return NotFound(new { mensaje = "Invitacion no encontrada" });
    // ...
}
// URL: /api/invitaciones/3fa85f64-5717-4562-b3fc-2c963f66afa6
```

### Justificación

Los IDs autoincrementales (1, 2, 3, ...) son **predecibles**: un atacante que descubre el ID de un recurso puede inferir el ID de los recursos adyacentes y enumerarlos sistemáticamente. Este ataque se llama **Insecure Direct Object Reference (IDOR)**.

Con IDs autoincremental, un usuario malicioso que puede acceder a `/api/invitaciones/42` intentará `/api/invitaciones/41`, `/api/invitaciones/40`, etc. Si el control de acceso tiene un fallo (como el de la sección 6 antes de aplicar roles), puede acceder a datos de otros usuarios.

Con GUIDs, el espacio de búsqueda es 2¹²² posibles valores (aproximadamente 5×10³⁶). Adivinar un GUID válido mediante fuerza bruta es computacionalmente inviable incluso con infraestructura de ataque masiva. El atacante necesita conocer el GUID exacto, que no puede derivar del contexto.

Los GUIDs también tienen beneficios secundarios: no revelan el volumen de datos del sistema (un ID `42` indica que hay al menos 41 registros previos), y simplifican la fusión de datos de múltiples fuentes o la generación de IDs en el cliente sin coordinación con el servidor.

---

## 10. Tokens de Registro de Un Solo Uso

### Qué es

Cuando se crea una invitación, el sistema genera un token único (GUID) para cada visitante invitado. Ese token se incluye en el enlace de registro enviado por email y es la única forma de acceder al formulario de auto-registro.

### Implementación

```csharp
// InvitacionVisitante — entidad de la tabla de unión
public class InvitacionVisitante
{
    public Guid Guid { get; set; }
    public Guid InvitacionId { get; set; }
    public Guid? VisitanteId { get; set; }   // ← null hasta que el visitante complete el formulario

    public string Token { get; set; } = string.Empty;  // ← GUID único por invitado
    public string EstadoFormulario { get; set; } = "Pendiente";

    public string EmailVisitante { get; set; } = string.Empty;
    public string? HikCentralReservationId { get; set; }
    public string? QrCodeImage { get; set; }
    public DateTime? FechaCompletado { get; set; }
}
```

```csharp
// ApplicationDbContext.cs — índice único sobre el token
modelBuilder.Entity<InvitacionVisitante>()
    .HasIndex(iv => iv.Token)
    .IsUnique();   // ← no puede existir el mismo token dos veces en la DB
```

```csharp
// RegistroController.cs — endpoint público que valida el token
[HttpPost("{token}")]
public async Task<IActionResult> Completar(string token, [FromBody] CompletarRegistroRequest request)
{
    var resultado = await _service.CompletarRegistro(token, request);
    if (resultado == null)
        return NotFound(new { mensaje = "Token invalido" });  // token no existe o ya fue usado
    // ...
}
```

### Justificación

El flujo de registro de visitantes tiene un requisito de seguridad particular: el visitante (una persona externa a la organización) debe poder acceder a un formulario sin tener una cuenta en el sistema. La alternativa de enviar credenciales temporales crearía un problema de gestión (crear, enviar y revocar contraseñas para cada visitante).

El token de invitación resuelve esto de forma elegante y segura:

- **No requiere autenticación**: el visitante hace clic en el enlace del email y accede directamente al formulario. No necesita recordar ni ingresar contraseña alguna.
- **Es de un solo uso implícito**: una vez que el visitante completa el formulario, `EstadoFormulario` cambia a `"Completado"` y `VisitanteId` se asigna. El servicio rechaza intentos posteriores de completar el mismo token.
- **Está vinculado a una invitación específica**: el token no es un pase genérico; está vinculado a una invitación concreta, a un visitante específico, con fecha y horario. Si la invitación es cancelada, el token deja de ser procesable.
- **Es imposible de adivinar**: al ser un GUID v4, el espacio de búsqueda hace inviable la enumeración.
- **El índice único en DB** actúa como última línea de defensa: incluso si por un error de lógica se intentara crear dos registros con el mismo token, la restricción de base de datos rechazaría la operación.

---

## 11. Audit Logging de Eventos de Negocio

### Qué es

El sistema registra los eventos de negocio relevantes desde el punto de vista de seguridad y cumplimiento. Cada evento incluye quién lo realizó, sobre qué entidad, y cuándo.

### Implementación

```csharp
// Dominio/Enums/EventTypeEnum.cs
public enum EventTypeEnum
{
    INVITATION_CREATED,    // Empleado crea una invitación
    FORM_COMPLETED,        // Visitante completa el formulario de registro
    RESERVATION_CREATED,   // Se crea una reserva en HikCentral
    INVITATION_EXPIRED,    // Invitación vence sin ser completada
    INVITATION_CANCELLED,  // Empleado cancela una invitación
    VISITOR_CANCELLED      // Visitante cancela su participación
}
```

```csharp
// IAuditLogService.cs — interfaz del servicio de auditoría
public interface IAuditLogService
{
    Task RegistrarEvento(
        EventTypeEnum eventType,
        Guid? usuarioId,
        Guid? visitanteId,
        Guid? invitacionId,
        string? usuarioEmail,
        string? visitanteEmail,
        string? invitacionTitulo,
        string? metadata
    );
    Task<IEnumerable<AuditLog>> ObtenerLogs(string? eventType, DateTime? desde, DateTime? hasta);
}
```

```csharp
// DynamoDbAuditLogService.cs — persistencia en DynamoDB con reintentos
public async Task RegistrarEvento(EventTypeEnum eventType, ...)
{
    var item = new Dictionary<string, AttributeValue>
    {
        ["Guid"]            = new AttributeValue { S = Guid.NewGuid().ToString() },
        ["EventType"]       = new AttributeValue { S = eventType.ToString() },
        ["Timestamp"]       = new AttributeValue { S = DateTime.UtcNow.ToString("o") },
        ["UsuarioId"]       = new AttributeValue { S = usuarioId?.ToString() ?? "" },
        ["VisitanteEmail"]  = new AttributeValue { S = visitanteEmail ?? "" },
        // ...
    };
    await _dynamoClient.PutItemAsync(new PutItemRequest
    {
        TableName = "AuditLogs",
        Item = item
    });
}
```

### Justificación

El audit log cumple tres funciones distintas:

**Cumplimiento regulatorio**: un sistema que gestiona el acceso físico a instalaciones debe poder demostrar, ante una auditoría interna o externa, quién autorizó el ingreso de cada visitante, cuándo, y a qué área. Sin este registro, en caso de un incidente de seguridad física (un intruso, un robo), no hay forma de determinar si el acceso fue autorizado o cómo fue posible.

**Detección de anomalías**: los logs permiten identificar patrones sospechosos, como un usuario que crea un número inusualmente alto de invitaciones, invitaciones creadas para horarios fuera del rango normal, o visitantes que nunca completan el formulario pero cuya invitación tampoco se cancela.

**Separación de la base de datos relacional**: los audit logs se almacenan en DynamoDB, separado de la base de datos operacional SQLite. Esta separación tiene implicaciones de seguridad:
- Un atacante que comprometa la base de datos SQLite no puede alterar el historial de auditoría.
- Los logs en DynamoDB pueden tener políticas de retención y acceso independientes (solo lectura para auditores, sin capacidad de borrado).
- DynamoDB escala de forma independiente sin afectar el rendimiento de las operaciones de negocio.

La interfaz `IAuditLogService` permite la implementación `MockAuditLogService` para desarrollo sin infraestructura AWS, garantizando que el código de negocio (que llama a `RegistrarEvento`) no cambia entre entornos.

---

## 12. Invalidación Activa de Sesión en Logout

### Qué es

El logout no se limita a limpiar el estado del frontend (localStorage). El backend recibe el token y lo elimina activamente del caché de validación, haciendo que cualquier request posterior con ese token falle en cache miss y deba revalidar contra Finnegans.

### Implementación

```csharp
// AuthController.cs — invalidación del caché al hacer logout
[HttpPost("logout")]
public IActionResult Logout([FromQuery(Name = "access_token")] string? accessToken)
{
    if (string.IsNullOrWhiteSpace(accessToken))
        return NoContent();

    // La misma función hash que usa el handler: mismo token → misma clave → misma entrada de caché
    var cacheKey = FinnegansAuthDefaults.CacheKeyPrefix + Sha256Hex(accessToken);
    _cache.Remove(cacheKey);
    return NoContent();
}
```

```javascript
// api.js — el frontend llama al backend antes de limpiar localStorage
export async function logout() {
  const token = getToken();
  if (token) {
    try {
      await fetch(
        `${API_URL}/auth/logout?access_token=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
    } catch {
      // best-effort: si falla, el token expira solo al cabo del TTL
    }
  }
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}
```

### Justificación

En un esquema de caché con TTL, hacer logout solo en el cliente (limpiar localStorage) no invalida la sesión en el servidor: el token sigue siendo aceptado por el backend hasta que el TTL expire (hasta 5 minutos). Si el token es interceptado en ese intervalo, puede ser reutilizado.

La invalidación activa del caché garantiza que el token deje de ser válido **inmediatamente** desde el momento del logout, independientemente del TTL. El backend no puede revocar el token en Finnegans (eso dependería de la API de Finnegans), pero sí puede asegurarse de que su propia caché no lo acepte.

El diseño `best-effort` en el frontend (el `try/catch` que ignora el error) es deliberado: si la llamada al backend falla (por un problema de red o porque el backend está caído), el logout del frontend se completa de todas formas. El riesgo residual —que el token siga siendo válido en el backend por hasta TTL minutos— es aceptable y el usuario no queda bloqueado en un estado de logout fallido.

---

## 13. Propagación de CancellationToken

### Qué es

Todas las operaciones asíncronas (llamadas a la base de datos, llamadas HTTP a servicios externos, operaciones de caché) reciben y propagan un `CancellationToken` vinculado al ciclo de vida del request HTTP.

### Implementación

```csharp
// FinnegansAuthenticationHandler.cs
protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
{
    // Context.RequestAborted se cancela cuando el cliente cierra la conexión
    var info = await _finnegansAuth.ValidarTokenAsync(accessToken, Context.RequestAborted);
    var usuario = await _dbContext.Set<Usuario>()
        .FirstOrDefaultAsync(u => u.Email == info.Email, Context.RequestAborted);
}

// AuthController.cs — el CancellationToken viene del framework automáticamente
[HttpGet("sso")]
public async Task<IActionResult> SsoLogin(
    [FromQuery] string? accessToken,
    [FromServices] IFinnegansAuthService finnegansAuth,
    CancellationToken cancellationToken)  // ← inyectado por ASP.NET Core
{
    var info = await finnegansAuth.ValidarTokenAsync(accessToken, cancellationToken);
    var usuario = await ResolverOCrearUsuarioAsync(info, cancellationToken);
}
```

### Justificación

Cuando un cliente HTTP cierra la conexión antes de que el servidor termine de procesar una request (por timeout, por el usuario cerrando el navegador, o por una interrupción de red), el servidor puede:

- **Sin CancellationToken**: continuar ejecutando toda la lógica (llamadas a Finnegans, consultas a DB, operaciones en DynamoDB) aunque nadie vaya a leer la respuesta. Esto desperdicia recursos y puede acumular conexiones y threads bloqueados bajo carga alta.

- **Con CancellationToken**: abortar cooperativamente todas las operaciones en curso. `EF Core` y `HttpClient` respetan el token de cancelación: si el cliente se desconecta a mitad de una consulta, la consulta se interrumpe y los recursos se liberan.

Desde el punto de vista de seguridad, la propagación correcta del `CancellationToken` previene condiciones de carrera sutiles: una operación parcialmente ejecutada (ej. se creó el registro de auditoría pero no se guardó la entidad principal) que podría quedar en un estado inconsistente si no se aborta limpiamente. ASP.NET Core inyecta automáticamente un `CancellationToken` vinculado al `HttpContext` en los parámetros del action method cuando se declara, sin necesidad de configuración adicional.

---

## 14. CORS Restringido por Origen

### Qué es

La política Cross-Origin Resource Sharing (CORS) del backend lista explícitamente los orígenes desde los cuales el navegador puede hacer requests a la API. Solo se permiten los orígenes de los frontends conocidos.

### Implementación

```csharp
// Program.cs
builder.Services.AddCors(options =>
    options.AddPolicy("AllowReact", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",   // Vite dev server
                "http://localhost:3000",   // Frontend Docker (Nginx)
                "http://localhost")        // Nginx sin puerto explícito
            .AllowAnyHeader()
            .AllowAnyMethod();
    })
);

// Middleware aplicado antes del routing
app.UseCors("AllowReact");
```

### Justificación

CORS es un mecanismo del navegador que previene que un sitio web malicioso (`evil.com`) haga requests a la API en nombre de un usuario autenticado. Sin una política CORS restrictiva, un atacante podría alojar una página que, al ser visitada por un usuario con sesión activa, realice llamadas a la API aprovechando las cookies o tokens del navegador.

La política `WithOrigins(...)` con orígenes explícitos garantiza que el navegador solo ejecutará requests cross-origin desde los orígenes listados. Un origen no listado recibe un rechazo del navegador antes de que la request llegue al servidor.

**Importante**: CORS es una protección del navegador, no del servidor. No impide que un atacante haga requests directas a la API con herramientas como `curl` o `httpie`. La autenticación con Bearer token sigue siendo la protección primaria para endpoints que requieren autenticación. CORS protege la sesión del usuario autenticado frente a ataques Cross-Site Request Forgery (CSRF) en contextos de aplicaciones web.

Para producción, esta política debe actualizarse reemplazando los orígenes `localhost` por el dominio real del frontend (ej. `https://visitantes.empresa.com`).

---

## 15. WWW-Authenticate en Respuestas 401

### Qué es

Cuando un endpoint protegido recibe una request sin autenticación válida, el servidor responde con `401 Unauthorized` e incluye el header `WWW-Authenticate` indicando el esquema de autenticación requerido.

### Implementación

```csharp
// FinnegansAuthenticationHandler.cs
protected override Task HandleChallengeAsync(AuthenticationProperties properties)
{
    Response.StatusCode = StatusCodes.Status401Unauthorized;
    Response.Headers.WWWAuthenticate = $"Bearer realm=\"{Scheme.Name}\"";
    // Resultado: WWW-Authenticate: Bearer realm="Finnegans"
    return Task.CompletedTask;
}
```

### Justificación

El header `WWW-Authenticate` está definido en RFC 7235 y es el mecanismo estándar por el que un servidor indica a un cliente qué esquema de autenticación debe usar. Sin este header, una respuesta `401` es ambigua: el cliente no sabe si debe enviar un Bearer token, credenciales básicas, un certificado de cliente, u otro mecanismo.

El valor `realm="Finnegans"` identifica el dominio de protección sin revelar detalles de implementación internos. Un cliente HTTP correcto (incluyendo herramientas de debugging y clientes REST) puede leer este header para entender automáticamente qué tipo de autenticación se requiere.

La implementación en `HandleChallengeAsync` (separada de `HandleAuthenticateAsync`) sigue el modelo de ASP.NET Core donde la *autenticación* (verificar identidad) y el *challenge* (indicar cómo autenticarse) son responsabilidades distintas. Esto permite reutilizar el handler en contextos diferentes sin acoplar la respuesta 401 a la lógica de validación.

---

## 16. Manejo de 401 en el Frontend

### Qué es

El cliente HTTP centralizado del frontend detecta respuestas `401 Unauthorized` de la API y limpia automáticamente la sesión local, redirigiendo al usuario al flujo de autenticación.

### Implementación

```javascript
// api.js — función de request centralizada
async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    // Token expirado, revocado o inválido
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    // Redirigir al flujo SSO sin token (mostrará mensaje de error)
    window.location.href = "/auth/sso";
    return;
  }

  if (response.status === 204) return null;
  return response.json();
}
```

### Justificación

Un `401` del servidor significa que el token almacenado en `localStorage` ya no es válido: expiró en Finnegans, fue revocado, o el usuario fue eliminado del sistema. Mantener ese token y seguir enviándolo en cada request crearía un estado inconsistente: el usuario vería la interfaz como si estuviera autenticado, pero todas las operaciones de negocio fallarían silenciosamente.

La gestión centralizada en la función `request()` garantiza que este comportamiento se aplica uniformemente a **toda** llamada a la API, sin importar qué página o componente la origina. No es necesario que cada página implemente su propio manejo de 401.

La redirección a `/auth/sso` sin token muestra al usuario un mensaje claro de que su sesión expiró y debe reautenticarse, en lugar de dejarlo en un estado de UI roto. Este patrón es coherente con la única forma de autenticación disponible en el sistema: SSO con Finnegans.

---

## 17. Manejo Centralizado de Excepciones

### Qué es

Las excepciones no controladas que escapan de los controladores y servicios son capturadas por un middleware global que las registra en el log y devuelve una respuesta HTTP estructurada con código `500`.

### Implementación

```csharp
// GlobalExceptionHandler.cs
public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        // Registro completo del error para diagnóstico interno
        _logger.LogError(exception, "Hubo un error inesperado:", exception.Message);

        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "Error Interno del Servidor",
            Type = "https://datatracker.ietf.org/doc/html/rfc7231#section-6.6.1",
            Detail = exception.Message   // ← ver nota en análisis de seguridad
        };

        httpContext.Response.StatusCode = 500;
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
        return false;
    }
}
```

```csharp
// DependencyInjection.cs — registro del handler
services.AddExceptionHandler<GlobalExceptionHandler>();
services.AddProblemDetails();
```

```csharp
// Program.cs — posición en el pipeline (debe ser lo primero)
app.UseExceptionHandler();
```

### Justificación

Sin un handler de excepciones global, una excepción no controlada en ASP.NET Core puede resultar en:

- **Exposición del stack trace completo** en la respuesta HTTP, incluyendo rutas de archivos, nombres de clases internas, versiones de dependencias y fragmentos de código. Esta información es valiosa para un atacante en la fase de reconocimiento.
- **Respuestas con formato inconsistente**: algunas rutas de error devuelven JSON, otras HTML de error de ASP.NET, otras texto plano. Los clientes (el frontend) no pueden manejar errores de forma uniforme.
- **Interrupciones silenciosas**: sin logging centralizado, las excepciones pueden pasar desapercibidas hasta que un usuario reporta un comportamiento incorrecto.

El `GlobalExceptionHandler` resuelve los tres problemas:

1. **Formato consistente** usando `ProblemDetails` (RFC 7807), estándar adoptado por ASP.NET Core para respuestas de error estructuradas en JSON.
2. **Logging centralizado** con `ILogger.LogError`, que registra la excepción completa (incluyendo stack trace) en el sistema de logs para diagnóstico sin exponerla al cliente.
3. **Respuesta controlada**: el cliente siempre recibe un JSON con `status`, `title` y `type`, independientemente del tipo de excepción.

**Nota**: la versión actual expone `exception.Message` en el campo `Detail`. Para producción, este campo debe reemplazarse por un mensaje genérico que no revele detalles internos. El detalle completo ya queda en el log y es accesible para el equipo de desarrollo a través de las herramientas de monitoreo.

---

## Resumen de Implementaciones

| # | Implementación | Amenaza mitigada | Nivel |
|---|---------------|-----------------|-------|
| 1 | Delegación de identidad a Finnegans (SSO) | Gestión insegura de contraseñas | Arquitectural |
| 2 | Handler de autenticación custom con doble barrera | Bypass de autenticación | Arquitectural |
| 3 | SHA256 como clave de caché de tokens | Exposición de tokens desde memoria | Criptográfico |
| 4 | Caché con TTL configurable | Carga excesiva sobre Finnegans; acoplamiento operacional | Disponibilidad |
| 5 | Límite de tamaño del caché (10.000 entradas) | Agotamiento de memoria (DoS) | Disponibilidad |
| 6 | `[Authorize]` a nivel de controlador | Acceso no autenticado a datos sensibles | Control de acceso |
| 7 | Creación de usuarios centralizada y configurable | Alta no controlada de usuarios | Control de acceso |
| 8 | EF Core con LINQ (sin SQL raw) | SQL Injection | Inyección |
| 9 | GUID como clave primaria | Enumeración de recursos (IDOR) | Control de acceso |
| 10 | Tokens de registro únicos e irrepetibles | Acceso no autorizado al flujo de registro | Autenticación |
| 11 | Audit logging en DynamoDB separado | Falta de trazabilidad; alteración de logs | Cumplimiento |
| 12 | Invalidación activa del caché en logout | Reutilización de tokens post-logout | Gestión de sesión |
| 13 | Propagación de CancellationToken | Estados inconsistentes; agotamiento de recursos | Disponibilidad |
| 14 | CORS restringido por origen | Cross-Site Request Forgery (CSRF) | Seguridad web |
| 15 | WWW-Authenticate en respuestas 401 | Ambigüedad de esquema de autenticación | Conformidad |
| 16 | Manejo de 401 centralizado en frontend | Estado de sesión inconsistente en el cliente | UX / Seguridad |
| 17 | GlobalExceptionHandler centralizado | Exposición de detalles internos en errores | Divulgación de información |
