using Microsoft.EntityFrameworkCore;
using ProyectoFinal_Grupo6.Api.Dominio.Entidades;
using ProyectoFinal_Grupo6.Api.Dominio.Enums;
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

            var usuario = await _context.Set<Usuario>().FindAsync(usuarioId);
            await _auditLog.RegistrarEvento(EventTypeEnum.INVITATION_CREATED.ToString(), usuarioId, invitacionId: invitacion.Guid,
                usuarioEmail: usuario?.Email, invitacionTitulo: invitacion.Titulo);

            return invitacion;
        }

        public async Task<List<Invitacion>> ObtenerInvitaciones(DateTime? fecha, Guid? usuarioId = null)
        {
            var query = _context.Set<Invitacion>()
                .Include(i => i.Usuario)
                .Include(i => i.Destino)
                .Include(i => i.Visitantes)
                .AsQueryable();

            if (usuarioId.HasValue)
                query = query.Where(i => i.UsuarioId == usuarioId.Value);

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

            var usuario = await _context.Set<Usuario>().FindAsync(usuarioId);
            await _auditLog.RegistrarEvento(EventTypeEnum.INVITATION_CANCELLED.ToString(), usuarioId, invitacionId: invitacion.Guid,
                usuarioEmail: usuario?.Email, invitacionTitulo: invitacion.Titulo);

            return invitacion;
        }

        public async Task<List<InvitacionVisitante>?> AgregarVisitantes(Guid invitacionId, List<VisitanteInvitacionRequest> nuevosVisitantes, Guid usuarioId)
        {
            var invitacion = await _context.Set<Invitacion>()
                .Include(i => i.Visitantes)
                .FirstOrDefaultAsync(i => i.Guid == invitacionId);

            if (invitacion == null || invitacion.Estado == "Cancelada" || invitacion.Estado == "Expirada")
                return null;

            var agregados = new List<InvitacionVisitante>();
            foreach (var v in nuevosVisitantes)
            {
                if (string.IsNullOrWhiteSpace(v.Email)) continue;
                if (invitacion.Visitantes.Any(iv => iv.EmailVisitante?.ToLower() == v.Email.ToLower())) continue;

                var iv = new InvitacionVisitante
                {
                    InvitacionId = invitacionId,
                    EmailVisitante = v.Email,
                    TelefonoVisitante = v.Telefono
                };
                invitacion.Visitantes.Add(iv);
                agregados.Add(iv);
            }

            if (agregados.Count > 0)
                await _context.SaveChangesAsync();

            return agregados;
        }

        public async Task<InvitacionVisitante?> CancelarVisitante(Guid invitacionId, Guid visitanteId, Guid usuarioId)
        {
            var iv = await _context.Set<InvitacionVisitante>()
                .Include(v => v.Invitacion)
                .FirstOrDefaultAsync(v => v.Guid == visitanteId && v.InvitacionId == invitacionId);

            if (iv == null)
                return null;

            iv.EstadoFormulario = "Cancelado";
            await _context.SaveChangesAsync();

            var usuario = await _context.Set<Usuario>().FindAsync(usuarioId);
            await _auditLog.RegistrarEvento("VISITOR_CANCELLED", usuarioId, invitacionId: invitacionId,
                usuarioEmail: usuario?.Email, visitanteEmail: iv.EmailVisitante, invitacionTitulo: iv.Invitacion?.Titulo,
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

    public class AgregarVisitanteRequest
    {
        public string Email { get; set; } = string.Empty;
        public string? Telefono { get; set; }
    }
}
