using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ProyectoFinal_Grupo6.Api.Funcionalidades.Auth
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        // Usuarios y passwords hardcodeados para MVP
        private static readonly Dictionary<string, string> Credenciales = new()
        {
            { "admin@empresa.com", "admin123" },
            { "empleado1@empresa.com", "emp123" },
            { "empleado2@empresa.com", "emp123" }
        };

        public AuthController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            // Verificar credenciales
            if (!Credenciales.TryGetValue(request.Email, out var passwordEsperado) || request.Password != passwordEsperado)
                return Unauthorized(new { mensaje = "Email o password incorrectos" });

            // Buscar usuario en la base de datos
            var usuario = await _context.Set<Dominio.Entidades.Usuario>()
                .FirstOrDefaultAsync(u => u.Email == request.Email);

            if (usuario == null)
                return Unauthorized(new { mensaje = "Usuario no encontrado" });

            // Generar JWT
            var token = GenerarToken(usuario);

            return Ok(new
            {
                token,
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

        // SSO con Finnegans: el cliente redirige a nuestra app con ?access_token=xxx.
        // Validamos ese token contra su API y, si es valido, emitimos nuestro propio JWT.
        // Configuracion en appsettings.json -> "Finnegans" o variables de entorno
        // (Finnegans__Enabled, Finnegans__BaseUrl, Finnegans__AutoCreateUsuarios).
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

            var usuario = await _context.Set<Dominio.Entidades.Usuario>()
                .FirstOrDefaultAsync(u => u.Email == info.Email, cancellationToken);

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

            var token = GenerarToken(usuario);

            return Ok(new
            {
                token,
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

        private string GenerarToken(Dominio.Entidades.Usuario usuario)
        {
            var jwtKey = _configuration["Jwt:Key"]!;
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, usuario.Guid.ToString()),
                new Claim(ClaimTypes.Email, usuario.Email),
                new Claim(ClaimTypes.Role, usuario.Rol)
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
