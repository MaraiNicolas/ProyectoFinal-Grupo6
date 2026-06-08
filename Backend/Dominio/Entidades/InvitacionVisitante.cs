namespace ProyectoFinal_Grupo6.Api.Dominio.Entidades
{
    // Relacion entre una invitacion y un visitante. Cada registro tiene un Token unico
    // que se usa como link para el formulario de registro. VisitanteId es null hasta
    // que el visitante completa el formulario.
    public class InvitacionVisitante
    {
        public InvitacionVisitante()
        {
            Guid = Guid.NewGuid();
        }

        public Guid Guid { get; private set; }
        public Guid InvitacionId { get; set; }
        public Guid? VisitanteId { get; set; }
        public string Token { get; set; } = System.Guid.NewGuid().ToString();
        public string EstadoFormulario { get; set; } = "Pendiente";
        public string EmailVisitante { get; set; } = string.Empty;
        public string? TelefonoVisitante { get; set; }
        public string? HikCentralReservationId { get; set; }
        public string? QrCodeImage { get; set; }
        public DateTime? FechaCompletado { get; set; }

        // Propiedades de navegacion
        public Invitacion? Invitacion { get; set; }
        public Visitante? Visitante { get; set; }
    }
}
