using Microsoft.EntityFrameworkCore;
using ProyectoFinal_Grupo6.Api.Dominio.Entidades;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;

namespace ProyectoFinal_Grupo6.Api.Funcionalidades.Registro
{
    public class RegistroService
    {
        private readonly ApplicationDbContext _context;
        private readonly IHikCentralService _hikCentral;
        private readonly IAuditLogService _auditLog;

        public RegistroService(ApplicationDbContext context, IHikCentralService hikCentral, IAuditLogService auditLog)
        {
            _context = context;
            _auditLog = auditLog;
            _hikCentral = hikCentral;
        }

        public async Task<RegistroResponse?> ObtenerRegistro(string token)
        {
            var iv = await _context.Set<InvitacionVisitante>()
                .Include(x => x.Invitacion)
                    .ThenInclude(i => i!.Destino)
                .Include(x => x.Invitacion)
                    .ThenInclude(i => i!.Usuario)
                .Include(x => x.Visitante)
                .FirstOrDefaultAsync(x => x.Token == token);

            if (iv == null)
                return new RegistroResponse { Estado = "Invalido" };

            var invitacion = iv.Invitacion!;

            // Verificar si fue cancelada
            if (invitacion.Estado == "Cancelada")
                return BuildResponse(iv, "Cancelada");

            // Verificar si expiro
            var finConBuffer = invitacion.Fecha.Date + invitacion.HoraFin + TimeSpan.FromMinutes(invitacion.BufferMinutos);
            if (DateTime.Now > finConBuffer)
                return BuildResponse(iv, "Expirada");

            // Verificar si ya fue completado
            if (iv.EstadoFormulario == "Completado")
                return BuildResponse(iv, "Completado");

            // Pendiente — verificar si el visitante ya existe (visitante recurrente)
            var hikVisitante = await _hikCentral.BuscarVisitantePorEmail(iv.EmailVisitante);
            var response = BuildResponse(iv, "Pendiente");
            response.EsVisitanteExistente = hikVisitante != null;
            if (hikVisitante != null)
            {
                response.Visitante = new VisitanteResponse
                {
                    Nombre = hikVisitante.VisitorGivenName,
                    Apellido = hikVisitante.VisitorFamilyName,
                    Email = hikVisitante.Email ?? "",
                    Telefono = hikVisitante.PhoneNum
                };
            }
            return response;
        }

        public async Task<RegistroResponse?> CompletarRegistro(string token, CompletarRegistroRequest request)
        {
            var iv = await _context.Set<InvitacionVisitante>()
                .Include(x => x.Invitacion)
                    .ThenInclude(i => i!.Destino)
                .Include(x => x.Invitacion)
                    .ThenInclude(i => i!.Usuario)
                .FirstOrDefaultAsync(x => x.Token == token);

            if (iv == null)
                return null;

            var invitacion = iv.Invitacion!;

            // No se puede completar si esta cancelada o expirada
            if (invitacion.Estado == "Cancelada")
                return new RegistroResponse { Estado = "Cancelada" };

            var finConBuffer = invitacion.Fecha.Date + invitacion.HoraFin + TimeSpan.FromMinutes(invitacion.BufferMinutos);
            if (DateTime.Now > finConBuffer)
                return new RegistroResponse { Estado = "Expirada" };

            // Ya completado
            if (iv.EstadoFormulario == "Completado")
                return BuildResponse(iv, "Completado");

            // Crear reserva en HikCentral PRIMERO — si falla, no completamos el registro
            var hikRequest = new HikReservaRequest
            {
                VisitStartTime = (invitacion.Fecha.Date + invitacion.HoraInicio - TimeSpan.FromMinutes(invitacion.BufferMinutos)).ToString("yyyy-MM-ddTHH:mm:sszzz"),
                VisitEndTime = (invitacion.Fecha.Date + invitacion.HoraFin + TimeSpan.FromMinutes(invitacion.BufferMinutos)).ToString("yyyy-MM-ddTHH:mm:sszzz"),
                VisitPurpose = invitacion.Motivo ?? "Visita",
                VisitorInfoList = new List<HikVisitorInfo>
                {
                    new HikVisitorInfo
                    {
                        VisitorInfo = new HikVisitante
                        {
                            VisitorGivenName = request.Nombre,
                            VisitorFamilyName = request.Apellido,
                            Email = iv.EmailVisitante,
                            PhoneNum = request.Telefono,
                            CertificateType = request.TipoDocumento,
                            CertificateNum = request.NumeroDocumento
                        }
                    }
                }
            };
            var hikResponse = await _hikCentral.CrearReserva(hikRequest);

            if (!hikResponse.Success)
            {
                return new RegistroResponse
                {
                    Estado = "Error",
                    ErrorMessage = hikResponse.ErrorMessage ?? "Error al crear la reserva en HikCentral."
                };
            }

            // HikCentral OK — crear o actualizar registro de Visitante
            var visitante = await _context.Set<Visitante>()
                .FirstOrDefaultAsync(v => v.Email == iv.EmailVisitante);

            if (visitante == null)
            {
                visitante = new Visitante
                {
                    Nombre = request.Nombre,
                    Apellido = request.Apellido,
                    Email = iv.EmailVisitante,
                    Telefono = request.Telefono,
                    TipoDocumento = request.TipoDocumento,
                    NumeroDocumento = request.NumeroDocumento
                };
                _context.Set<Visitante>().Add(visitante);
            }
            else
            {
                visitante.Nombre = request.Nombre;
                visitante.Apellido = request.Apellido;
                visitante.Telefono = request.Telefono;
                visitante.TipoDocumento = request.TipoDocumento;
                visitante.NumeroDocumento = request.NumeroDocumento;
            }

            // Guardar visitorId de HikCentral
            visitante.HikCentralVisitorId = hikResponse.VisitorId;

            // Actualizar InvitacionVisitante
            iv.VisitanteId = visitante.Guid;
            iv.EstadoFormulario = "Completado";
            iv.FechaCompletado = DateTime.UtcNow;
            iv.HikCentralReservationId = hikResponse.ReservationId;
            iv.QrCodeImage = hikResponse.QrCodeImage;

            // Actualizar estado de la invitacion si es el primer visitante en completar
            if (invitacion.Estado == "Pendiente")
                invitacion.Estado = "Activa";

            await _context.SaveChangesAsync();

            // Registrar eventos de auditoria
            await _auditLog.RegistrarEvento("FORM_COMPLETED", visitanteId: visitante.Guid, invitacionId: invitacion.Guid);
            await _auditLog.RegistrarEvento("RESERVATION_CREATED", visitanteId: visitante.Guid, invitacionId: invitacion.Guid,
                metadata: $"{{\"hikCentralReservationId\": \"{iv.HikCentralReservationId}\", \"hikCentralVisitorId\": \"{visitante.HikCentralVisitorId}\"}}");

            // Recargar con propiedades de navegacion
            iv = await _context.Set<InvitacionVisitante>()
                .Include(x => x.Invitacion)
                    .ThenInclude(i => i!.Destino)
                .Include(x => x.Invitacion)
                    .ThenInclude(i => i!.Usuario)
                .Include(x => x.Visitante)
                .FirstOrDefaultAsync(x => x.Token == token);

            return BuildResponse(iv!, "Completado");
        }

        private RegistroResponse BuildResponse(InvitacionVisitante iv, string estado)
        {
            var invitacion = iv.Invitacion!;
            return new RegistroResponse
            {
                Estado = estado,
                Fecha = invitacion.Fecha,
                HoraInicio = invitacion.HoraInicio,
                HoraFin = invitacion.HoraFin,
                Destino = invitacion.Destino?.Nombre,
                Anfitrion = invitacion.Usuario != null
                    ? $"{invitacion.Usuario.Nombre} {invitacion.Usuario.Apellido}"
                    : null,
                Titulo = invitacion.Titulo,
                Descripcion = invitacion.Descripcion,
                Motivo = invitacion.Motivo,
                EmailVisitante = iv.EmailVisitante,
                FechaCompletado = iv.FechaCompletado,
                QrCodeImage = iv.QrCodeImage,
                Visitante = iv.Visitante != null ? new VisitanteResponse
                {
                    Nombre = iv.Visitante.Nombre,
                    Apellido = iv.Visitante.Apellido,
                    Email = iv.Visitante.Email,
                    Telefono = iv.Visitante.Telefono
                } : null
            };
        }
    }

    // DTOs de request / response
    public class CompletarRegistroRequest
    {
        public string Nombre { get; set; } = string.Empty;
        public string Apellido { get; set; } = string.Empty;
        public string? Telefono { get; set; }
        public string TipoDocumento { get; set; } = string.Empty;
        public string NumeroDocumento { get; set; } = string.Empty;
    }

    public class RegistroResponse
    {
        public string Estado { get; set; } = string.Empty; // Pendiente, Completado, Expirada, Cancelada, Invalido
        public DateTime? Fecha { get; set; }
        public TimeSpan? HoraInicio { get; set; }
        public TimeSpan? HoraFin { get; set; }
        public string? Destino { get; set; }
        public string? Anfitrion { get; set; }
        public string? Titulo { get; set; }
        public string? Descripcion { get; set; }
        public string? Motivo { get; set; }
        public string? EmailVisitante { get; set; }
        public bool EsVisitanteExistente { get; set; }
        public DateTime? FechaCompletado { get; set; }
        public string? QrCodeImage { get; set; }
        public string? ErrorMessage { get; set; }
        public VisitanteResponse? Visitante { get; set; }
    }

    public class VisitanteResponse
    {
        public string Nombre { get; set; } = string.Empty;
        public string Apellido { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Telefono { get; set; }
    }
}
