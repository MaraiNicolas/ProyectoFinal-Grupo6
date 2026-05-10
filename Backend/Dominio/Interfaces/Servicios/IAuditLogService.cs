using ProyectoFinal_Grupo6.Api.Dominio.Entidades;

namespace ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios
{
    public interface IAuditLogService
    {
        Task RegistrarEvento(string eventType, Guid? usuarioId = null, Guid? visitanteId = null, Guid? invitacionId = null, string? metadata = null);
        Task<List<AuditLog>> ObtenerLogs(string? eventType = null, DateTime? desde = null, DateTime? hasta = null);
    }
}
