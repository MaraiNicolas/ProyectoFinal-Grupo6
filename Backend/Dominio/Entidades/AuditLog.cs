namespace ProyectoFinal_Grupo6.Api.Dominio.Entidades
{
    // Registro de auditoria inmutable. DynamoDB en produccion, EF InMemory para MVP.
    public class AuditLog
    {
        public AuditLog()
        {
            Guid = Guid.NewGuid();
        }

        public Guid Guid { get; private set; }
        public string EventType { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public Guid? UsuarioId { get; set; }
        public Guid? VisitanteId { get; set; }
        public Guid? InvitacionId { get; set; }
        public string? Metadata { get; set; }
    }
}
