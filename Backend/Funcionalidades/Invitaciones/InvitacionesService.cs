using Microsoft.EntityFrameworkCore;
using ProyectoFinal_Grupo6.Api.Dominio.Entidades;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;

namespace ProyectoFinal_Grupo6.Api.Funcionalidades.Invitaciones
{
    public class InvitacionesService
    {
        private readonly ApplicationDbContext _context;
        private readonly IAuditLogService _auditLog;

        public InvitacionesService(ApplicationDbContext context, IAuditLogService auditLog)
        {
            _context = context;
            _auditLog = auditLog;
        }

        public async Task<Invitacion> CrearInvitacion(CrearInvitacionRequest request, Guid usuarioId)
        {
            var invitacion = new Invitacion
            {
                UsuarioId = usuarioId,
                DestinoId = request.DestinoId,
                Fecha = request.Fecha,
                HoraInicio = request.HoraInicio,
                HoraFin = request.HoraFin,
                BufferMinutos = request.BufferMinutos,
                Titulo = request.Titulo,
                Descripcion = request.Descripcion,
                Motivo = string.IsNullOrWhiteSpace(request.Motivo) ? request.Titulo : request.Motivo,
                Estado = "Pendiente"
            };

            foreach (var visitante in request.Visitantes)
            {
                var iv = new InvitacionVisitante
                {
                    InvitacionId = invitacion.Guid,
                    EmailVisitante = visitante.Email,
                    TelefonoVisitante = visitante.Telefono
                };
                invitacion.Visitantes.Add(iv);
            }

            _context.Set<Invitacion>().Add(invitacion);
            await _context.SaveChangesAsync();

            await _auditLog.RegistrarEvento("INVITATION_CREATED", usuarioId, invitacionId: invitacion.Guid);

            return invitacion;
        }

        public async Task<List<Invitacion>> ObtenerInvitaciones(DateTime? fecha)
        {
            var query = _context.Set<Invitacion>()
                .Include(i => i.Usuario)
                .Include(i => i.Destino)
                .Include(i => i.Visitantes)
                .AsQueryable();

            if (fecha.HasValue)
                query = query.Where(i => i.Fecha.Date == fecha.Value.Date);

            return await query.OrderByDescending(i => i.Fecha).ThenByDescending(i => i.HoraInicio).ToListAsync();
        }

        public async Task<Invitacion?> ObtenerInvitacionPorId(Guid id)
        {
            return await _context.Set<Invitacion>()
                .Include(i => i.Usuario)
                .Include(i => i.Destino)
                .Include(i => i.Visitantes)
                    .ThenInclude(iv => iv.Visitante)
                .FirstOrDefaultAsync(i => i.Guid == id);
        }

        public async Task<Invitacion?> CancelarInvitacion(Guid id, Guid usuarioId)
        {
            var invitacion = await _context.Set<Invitacion>()
                .Include(i => i.Visitantes)
                .FirstOrDefaultAsync(i => i.Guid == id);

            if (invitacion == null)
                return null;

            invitacion.Estado = "Cancelada";
            await _context.SaveChangesAsync();

            await _auditLog.RegistrarEvento("INVITATION_CANCELLED", usuarioId, invitacionId: invitacion.Guid);

            return invitacion;
        }

        public async Task<InvitacionVisitante?> CancelarVisitante(Guid invitacionId, Guid visitanteId, Guid usuarioId)
        {
            var iv = await _context.Set<InvitacionVisitante>()
                .FirstOrDefaultAsync(v => v.Guid == visitanteId && v.InvitacionId == invitacionId);

            if (iv == null)
                return null;

            iv.EstadoFormulario = "Cancelado";
            await _context.SaveChangesAsync();

            await _auditLog.RegistrarEvento("VISITOR_CANCELLED", usuarioId, invitacionId: invitacionId,
                metadata: $"{{\"invitacionVisitanteId\": \"{visitanteId}\", \"email\": \"{iv.EmailVisitante}\"}}");

            return iv;
        }
    }

    // DTOs de request
    public class CrearInvitacionRequest
    {
        public Guid DestinoId { get; set; }
        public DateTime Fecha { get; set; }
        public TimeSpan HoraInicio { get; set; }
        public TimeSpan HoraFin { get; set; }
        public int BufferMinutos { get; set; } = 120;
        public string Titulo { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public string? Motivo { get; set; }
        public List<VisitanteInvitacionRequest> Visitantes { get; set; } = new();
    }

    public class VisitanteInvitacionRequest
    {
        public string Email { get; set; } = string.Empty;
        public string? Telefono { get; set; }
    }
}
