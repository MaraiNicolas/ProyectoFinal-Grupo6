using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;
using ProyectoFinal_Grupo6.Api.Dominio.Modelos;
using ProyectoFinal_Grupo6.Api.Infraestructura.Auth;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;

namespace ProyectoFinal_Grupo6.Api.Funcionalidades.Auth
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IMemoryCache _cache;

        public AuthController(ApplicationDbContext context, IConfiguration configuration, IMemoryCache cache)
        {
            _context = context;
            _configuration = configuration;
            _cache = cache;
        }

        // SSO con Finnegans: el cliente redirige a nuestra app con ?access_token=xxx.
        // Validamos ese token contra su API. Si es valido, devolvemos los datos del
        // usuario (sin emitir JWT propio: el frontend usa el mismo access_token de
        // Finnegans para todas las requests siguientes).
        //
        // Prepoblamos IMemoryCache para que la primera request del usuario despues
        // del SSO no vuelva a golpear a Finnegans (el handler vera cache hit).
        //
        // Configuracion en appsettings.json -> "Finnegans" o variables de entorno
        // (Finnegans__Enabled, Finnegans__BaseUrl, Finnegans__AutoCreateUsuarios,
        //  Finnegans__CacheTtlMinutes, Finnegans__UseMock).
        [HttpGet("sso")]
        public async Task<IActionResult> SsoLogin(
            [FromQuery(Name = "access_token")] string? accessToken,
            [FromServices] IFinnegansAuthService finnegansAuth,
            CancellationToken cancellationToken)
        {
            var enabled = _configuration.GetValue<bool>("Finnegans:Enabled", false);
            if (!enabled)
                return NotFound(new { mensaje = "SSO con Finnegans no esta habilitado" });

            if (string.IsNullOrWhiteSpace(accessToken))
                return BadRequest(new { mensaje = "Falta el parametro access_token" });

            var info = await finnegansAuth.ValidarTokenAsync(accessToken, cancellationToken);
            if (info == null || string.IsNullOrWhiteSpace(info.Email))
                return Unauthorized(new { mensaje = "Token invalido o no se pudo validar con Finnegans" });

            var usuario = await ResolverOCrearUsuarioAsync(info, cancellationToken);
            if (usuario == null)
                return Unauthorized(new { mensaje = $"El usuario {info.Email} no esta registrado en el sistema" });

            // Prepoblar el cache para evitar un round-trip extra a Finnegans en la
            // primera request autenticada del usuario.
            var ttlMinutes = _configuration.GetValue<int>("Finnegans:CacheTtlMinutes", 5);
            var cacheKey = FinnegansAuthDefaults.CacheKeyPrefix + Sha256Hex(accessToken);
            _cache.Set(cacheKey, new CachedFinnegansPrincipal
            {
                Guid = usuario.Guid,
                Email = usuario.Email,
                Rol = usuario.Rol,
                Admin = info.Admin
            }, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(ttlMinutes),
                Size = 1
            });

            return Ok(new
            {
                usuario = new
                {
                    guid = usuario.Guid,
                    nombre = usuario.Nombre,
                    apellido = usuario.Apellido,
                    email = usuario.Email,
                    rol = usuario.Rol
                }
            });
        }

        // Invalida la entrada del cache para el token recibido. El frontend debe
        // limpiar localStorage; este endpoint solo evita que el token siga siendo
        // aceptado hasta que expire el TTL.
        [HttpPost("logout")]
        public IActionResult Logout([FromQuery(Name = "access_token")] string? accessToken)
        {
            if (string.IsNullOrWhiteSpace(accessToken))
                return NoContent();

            var cacheKey = FinnegansAuthDefaults.CacheKeyPrefix + Sha256Hex(accessToken);
            _cache.Remove(cacheKey);
            return NoContent();
        }

        // Auto-create solo aplica en este endpoint. Si Finnegans:AutoCreateUsuarios=false
        // y el usuario no existe, retorna null y el caller responde 401.
        private async Task<Dominio.Entidades.Usuario?> ResolverOCrearUsuarioAsync(
            FinnegansUserInfo info,
            CancellationToken cancellationToken)
        {
            var usuario = await _context.Set<Dominio.Entidades.Usuario>()
                .FirstOrDefaultAsync(u => u.Email == info.Email, cancellationToken);

            if (usuario != null)
                return usuario;

            var autoCrear = _configuration.GetValue<bool>("Finnegans:AutoCreateUsuarios", false);
            if (!autoCrear)
                return null;

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
            return usuario;
        }

        private static string Sha256Hex(string input)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(bytes);
        }
    }
}

