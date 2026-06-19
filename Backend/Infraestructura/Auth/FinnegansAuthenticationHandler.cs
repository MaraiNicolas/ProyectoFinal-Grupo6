using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;

namespace ProyectoFinal_Grupo6.Api.Infraestructura.Auth
{
    // Esquema de autenticacion custom: lee Authorization: Bearer <access_token>,
    // valida el token contra Finnegans (con cache de TTL configurable) y arma
    // el ClaimsPrincipal con NameIdentifier (Guid del usuario), Email y Role.
    //
    // No emite tokens propios: el access_token que viene de Finnegans es la
    // unica fuente de verdad de la sesion. Cuando expira o se revoca, las
    // requests siguientes fallan en cache miss + validacion contra Finnegans.
    public class FinnegansAuthenticationHandler : AuthenticationHandler<FinnegansAuthenticationOptions>
    {
        private readonly IMemoryCache _cache;
        private readonly IFinnegansAuthService _finnegansAuth;
        private readonly ApplicationDbContext _dbContext;

        public FinnegansAuthenticationHandler(
            IOptionsMonitor<FinnegansAuthenticationOptions> options,
            ILoggerFactory loggerFactory,
            UrlEncoder encoder,
            IMemoryCache cache,
            IFinnegansAuthService finnegansAuth,
            ApplicationDbContext dbContext)
            : base(options, loggerFactory, encoder)
        {
            _cache = cache;
            _finnegansAuth = finnegansAuth;
            _dbContext = dbContext;
        }

        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            // Permite que endpoints publicos (sin [Authorize]) sigan funcionando.
            if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
                return AuthenticateResult.NoResult();

            var header = authHeader.ToString();
            if (string.IsNullOrWhiteSpace(header) || !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                return AuthenticateResult.NoResult();

            var accessToken = header["Bearer ".Length..].Trim();
            if (string.IsNullOrWhiteSpace(accessToken))
                return AuthenticateResult.Fail("Bearer token vacio");

            var cacheKey = FinnegansAuthDefaults.CacheKeyPrefix + Sha256Hex(accessToken);

            // Cache hit: reconstruir el principal sin llamar a Finnegans ni a la DB.
            if (_cache.TryGetValue<CachedFinnegansPrincipal>(cacheKey, out var cached) && cached is not null)
            {
                return AuthenticateResult.Success(BuildTicket(cached));
            }

            // Cache miss: validar contra Finnegans.
            var info = await _finnegansAuth.ValidarTokenAsync(accessToken, Context.RequestAborted);
            if (info == null || string.IsNullOrWhiteSpace(info.Email))
            {
                Logger.LogInformation("Token rechazado por Finnegans");
                return AuthenticateResult.Fail("Token invalido o no se pudo validar con Finnegans");
            }

            // Resolver el Usuario en la DB. El auto-create esta restringido al endpoint
            // /api/auth/sso para que el alta quede centralizada y auditable; aqui solo
            // aceptamos usuarios ya existentes.
            var usuario = await _dbContext.Set<Dominio.Entidades.Usuario>()
                .FirstOrDefaultAsync(u => u.Email == info.Email, Context.RequestAborted);

            if (usuario == null)
            {
                Logger.LogWarning("Token valido en Finnegans pero usuario {Email} no existe en la DB", info.Email);
                return AuthenticateResult.Fail($"El usuario {info.Email} no esta registrado en el sistema");
            }

            var entry = new CachedFinnegansPrincipal
            {
                Guid = usuario.Guid,
                Email = usuario.Email,
                Rol = usuario.Rol,
                Admin = info.Admin
            };

            _cache.Set(cacheKey, entry, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = Options.CacheTtl,
                Size = 1
            });

            return AuthenticateResult.Success(BuildTicket(entry));
        }

        protected override Task HandleChallengeAsync(AuthenticationProperties properties)
        {
            Response.StatusCode = StatusCodes.Status401Unauthorized;
            Response.Headers.WWWAuthenticate = $"Bearer realm=\"{Scheme.Name}\"";
            return Task.CompletedTask;
        }

        private AuthenticationTicket BuildTicket(CachedFinnegansPrincipal entry)
        {
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, entry.Guid.ToString()),
                new(ClaimTypes.Email, entry.Email),
                new(ClaimTypes.Role, entry.Rol),
                new("finnegans:admin", entry.Admin ? "true" : "false")
            };

            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            return new AuthenticationTicket(principal, Scheme.Name);
        }

        private static string Sha256Hex(string input)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(bytes);
        }
    }
}
