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
        private readonly IEmailService _emailService;
        private readonly IHikCentralService _hikCentral;
        private readonly IConfiguration _configuration;

        public InvitacionesService(ApplicationDbContext context, IAuditLogService auditLog, IEmailService emailService, IHikCentralService hikCentral, IConfiguration configuration)
        {
            _context = context;
            _auditLog = auditLog;
            _emailService = emailService;
            _hikCentral = hikCentral;
            _configuration = configuration;
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
            foreach (var visitante in invitacion.Visitantes)
            {
                await _auditLog.RegistrarEvento(EventTypeEnum.INVITATION_CREATED.ToString(), usuarioId,
                    invitacionId: invitacion.Guid,
                    usuarioEmail: usuario?.Email,
                    visitanteEmail: visitante.EmailVisitante,
                    invitacionTitulo: invitacion.Titulo);
            }

            var destino = await _context.Set<Destino>().FindAsync(invitacion.DestinoId);
            var nombreAnfitrion = usuario != null ? $"{usuario.Nombre} {usuario.Apellido}" : "Anfitrion";
            var baseUrl = _configuration["App:BaseUrl"]!;

            foreach (var iv in invitacion.Visitantes)
            {
                await _emailService.EnviarLinkRegistro(new EmailRegistroRequest
                {
                    DestinatarioEmail = iv.EmailVisitante,
                    LinkRegistro = $"{baseUrl}/registro/{iv.Token}",
                    TituloInvitacion = invitacion.Titulo,
                    NombreAnfitrion = nombreAnfitrion,
                    Fecha = invitacion.Fecha,
                    HoraInicio = invitacion.HoraInicio,
                    HoraFin = invitacion.HoraFin,
                    Destino = destino?.Nombre
                });
            }

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

            var invitaciones = await query.OrderByDescending(i => i.Fecha).ToListAsync();
            return invitaciones
                .OrderByDescending(i => i.Fecha)
                .ThenByDescending(i => i.HoraInicio)
                .ToList();
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

            var horaInicio = $"{invitacion.HoraInicio.Hours:D2}:{invitacion.HoraInicio.Minutes:D2}";
            var horaFin = $"{invitacion.HoraFin.Hours:D2}:{invitacion.HoraFin.Minutes:D2}";
            var cancelPurpose = $"{invitacion.Titulo} - {invitacion.Fecha:dd-MM-yyyy} {horaInicio} a {horaFin}";

            foreach (var iv in invitacion.Visitantes.Where(v => v.HikCentralReservationId != null))
            {
                var hikRequest = new HikReservaRequest
                {
                    VisitPurpose = cancelPurpose,
                    VisitorInfoList = new List<HikVisitorInfo>
                    {
                        new HikVisitorInfo
                        {
                            VisitorInfo = new HikVisitante
                            {
                                VisitorGivenName = iv.Visitante?.Nombre ?? "",
                                VisitorFamilyName = iv.Visitante?.Apellido ?? "",
                                Email = iv.EmailVisitante,
                                Remark = "Cancelado por el sistema"
                            }
                        }
                    }
                };
                var cancelResult = await _hikCentral.CancelarReserva(iv.HikCentralReservationId!, hikRequest);
                if (cancelResult.Success && cancelResult.NewReservationId != null)
                    iv.HikCentralReservationId = cancelResult.NewReservationId;
            }

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
                _context.Set<InvitacionVisitante>().Add(iv);
                agregados.Add(iv);
            }

            if (agregados.Count > 0)
            {
                await _context.SaveChangesAsync();

                var usuario = await _context.Set<Usuario>().FindAsync(usuarioId);
                var destino = await _context.Set<Destino>().FindAsync(invitacion.DestinoId);
                var nombreAnfitrion = usuario != null ? $"{usuario.Nombre} {usuario.Apellido}" : "Anfitrion";
                var baseUrl = _configuration["App:BaseUrl"]!;

                foreach (var iv in agregados)
                {
                    await _auditLog.RegistrarEvento(EventTypeEnum.INVITATION_CREATED.ToString(), usuarioId,
                        invitacionId: invitacion.Guid,
                        usuarioEmail: usuario?.Email,
                        visitanteEmail: iv.EmailVisitante,
                        invitacionTitulo: invitacion.Titulo);

                    await _emailService.EnviarLinkRegistro(new EmailRegistroRequest
                    {
                        DestinatarioEmail = iv.EmailVisitante,
                        LinkRegistro = $"{baseUrl}/registro/{iv.Token}",
                        TituloInvitacion = invitacion.Titulo,
                        NombreAnfitrion = nombreAnfitrion,
                        Fecha = invitacion.Fecha,
                        HoraInicio = invitacion.HoraInicio,
                        HoraFin = invitacion.HoraFin,
                        Destino = destino?.Nombre
                    });
                }
            }

            return agregados;
        }

        public async Task<InvitacionVisitante?> CancelarVisitante(Guid invitacionId, Guid visitanteId, Guid usuarioId)
        {
            var iv = await _context.Set<InvitacionVisitante>()
                .Include(v => v.Invitacion)
                .Include(v => v.Visitante)
                .FirstOrDefaultAsync(v => v.Guid == visitanteId && v.InvitacionId == invitacionId);

            if (iv == null)
                return null;

            if (iv.HikCentralReservationId != null)
            {
                var inv = iv.Invitacion;
                var horaInicio = inv != null ? $"{inv.HoraInicio.Hours:D2}:{inv.HoraInicio.Minutes:D2}" : "";
                var horaFin = inv != null ? $"{inv.HoraFin.Hours:D2}:{inv.HoraFin.Minutes:D2}" : "";
                var cancelPurpose = $"{inv?.Titulo} - {inv?.Fecha:dd-MM-yyyy} {horaInicio} a {horaFin}";

                var hikRequest = new HikReservaRequest
                {
                    VisitPurpose = cancelPurpose,
                    VisitorInfoList = new List<HikVisitorInfo>
                    {
                        new HikVisitorInfo
                        {
                            VisitorInfo = new HikVisitante
                            {
                                VisitorGivenName = iv.Visitante?.Nombre ?? "",
                                VisitorFamilyName = iv.Visitante?.Apellido ?? "",
                                Email = iv.EmailVisitante,
                                Remark = "Cancelado por el sistema"
                            }
                        }
                    }
                };
                var cancelResult = await _hikCentral.CancelarReserva(iv.HikCentralReservationId, hikRequest);
                if (cancelResult.Success && cancelResult.NewReservationId != null)
                    iv.HikCentralReservationId = cancelResult.NewReservationId;
            }

            iv.EstadoFormulario = "Cancelado";
            await _context.SaveChangesAsync();

            var usuario = await _context.Set<Usuario>().FindAsync(usuarioId);
            await _auditLog.RegistrarEvento("VISITOR_CANCELLED", usuarioId, invitacionId: invitacionId,
                usuarioEmail: usuario?.Email, visitanteEmail: iv.EmailVisitante, invitacionTitulo: iv.Invitacion?.Titulo,
                metadata: $"{{\"invitacionVisitanteId\": \"{visitanteId}\", \"email\": \"{iv.EmailVisitante}\"}}");

            return iv;
        }

        public async Task<bool> EliminarInvitacion(Guid id)
        {
            var invitacion = await _context.Set<Invitacion>()
                .Include(i => i.Visitantes)
                .FirstOrDefaultAsync(i => i.Guid == id);

            if (invitacion == null) return false;

            _context.Set<InvitacionVisitante>().RemoveRange(invitacion.Visitantes);
            _context.Set<Invitacion>().Remove(invitacion);
            await _context.SaveChangesAsync();
            return true;
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
