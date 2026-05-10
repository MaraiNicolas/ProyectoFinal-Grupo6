using Microsoft.EntityFrameworkCore;
using ProyectoFinal_Grupo6.Api.Dominio.Entidades;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;

namespace ProyectoFinal_Grupo6.Api.Funcionalidades.Admin
{
    public class AdminService
    {
        private readonly ApplicationDbContext _context;
        private readonly IAuditLogService _auditLog;

        public AdminService(ApplicationDbContext context, IAuditLogService auditLog)
        {
            _context = context;
            _auditLog = auditLog;
        }

        // --- Usuarios ---

        public async Task<List<Usuario>> ObtenerUsuarios()
        {
            return await _context.Set<Usuario>().OrderBy(u => u.Apellido).ToListAsync();
        }

        public async Task<Usuario> CrearUsuario(CrearUsuarioRequest request)
        {
            var usuario = new Usuario
            {
                Nombre = request.Nombre,
                Apellido = request.Apellido,
                Email = request.Email,
                Rol = request.Rol
            };
            _context.Set<Usuario>().Add(usuario);
            await _context.SaveChangesAsync();
            return usuario;
        }

        public async Task<Usuario?> ActualizarUsuario(Guid id, CrearUsuarioRequest request)
        {
            var usuario = await _context.Set<Usuario>().FirstOrDefaultAsync(u => u.Guid == id);
            if (usuario == null) return null;

            usuario.Nombre = request.Nombre;
            usuario.Apellido = request.Apellido;
            usuario.Email = request.Email;
            usuario.Rol = request.Rol;
            await _context.SaveChangesAsync();
            return usuario;
        }

        public async Task<bool> EliminarUsuario(Guid id)
        {
            var usuario = await _context.Set<Usuario>().FirstOrDefaultAsync(u => u.Guid == id);
            if (usuario == null) return false;

            _context.Set<Usuario>().Remove(usuario);
            await _context.SaveChangesAsync();
            return true;
        }

        // --- Configuracion ---

        public async Task<List<Configuracion>> ObtenerConfiguracion()
        {
            return await _context.Set<Configuracion>().OrderBy(c => c.Clave).ToListAsync();
        }

        public async Task<Configuracion?> ActualizarConfiguracion(string clave, string valor)
        {
            var config = await _context.Set<Configuracion>().FirstOrDefaultAsync(c => c.Clave == clave);
            if (config == null) return null;

            config.Valor = valor;
            await _context.SaveChangesAsync();
            return config;
        }

        // --- Audit Logs ---

        public async Task<List<AuditLog>> ObtenerAuditLogs(string? eventType, DateTime? desde, DateTime? hasta)
        {
            return await _auditLog.ObtenerLogs(eventType, desde, hasta);
        }
    }

    // DTOs de request
    public class CrearUsuarioRequest
    {
        public string Nombre { get; set; } = string.Empty;
        public string Apellido { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Rol { get; set; } = "Empleado";
    }

    public class ActualizarConfiguracionRequest
    {
        public string Valor { get; set; } = string.Empty;
    }
}
