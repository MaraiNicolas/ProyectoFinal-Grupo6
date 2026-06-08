using Microsoft.EntityFrameworkCore;
using ProyectoFinal_Grupo6.Api.Dominio.Entidades;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;

namespace ProyectoFinal_Grupo6.Api.Infraestructura.Servicios
{
    // Mock que guarda audit logs en la base de datos InMemory.
    // En produccion se reemplaza por DynamoDbAuditLogService.
    public class MockAuditLogService : IAuditLogService
    {
        private readonly ApplicationDbContext _context;

        public MockAuditLogService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task RegistrarEvento(string eventType, Guid? usuarioId = null, Guid? visitanteId = null, Guid? invitacionId = null, string? usuarioEmail = null, string? visitanteEmail = null, string? invitacionTitulo = null, string? metadata = null)
        {
            _context.Set<AuditLog>().Add(new AuditLog
            {
                EventType = eventType,
                UsuarioId = usuarioId,
                VisitanteId = visitanteId,
                InvitacionId = invitacionId,
                UsuarioEmail = usuarioEmail,
                VisitanteEmail = visitanteEmail,
                InvitacionTitulo = invitacionTitulo,
                Metadata = metadata
            });
            await _context.SaveChangesAsync();
        }

        public async Task<List<AuditLog>> ObtenerLogs(string? eventType = null, DateTime? desde = null, DateTime? hasta = null)
        {
            var query = _context.Set<AuditLog>().AsQueryable();

            if (!string.IsNullOrWhiteSpace(eventType))
                query = query.Where(a => a.EventType == eventType);

            if (desde.HasValue)
                query = query.Where(a => a.Timestamp >= desde.Value);

            if (hasta.HasValue)
                query = query.Where(a => a.Timestamp <= hasta.Value);

            return await query.OrderByDescending(a => a.Timestamp).ToListAsync();
        }
    }
}
