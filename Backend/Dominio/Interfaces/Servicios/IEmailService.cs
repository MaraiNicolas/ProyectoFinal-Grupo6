namespace ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios
{
    public interface IEmailService
    {
        Task EnviarLinkRegistro(EmailRegistroRequest request);
    }

    public class EmailRegistroRequest
    {
        public string DestinatarioEmail { get; set; } = string.Empty;
        public string LinkRegistro { get; set; } = string.Empty;
        public string TituloInvitacion { get; set; } = string.Empty;
        public string NombreAnfitrion { get; set; } = string.Empty;
        public DateTime Fecha { get; set; }
        public TimeSpan HoraInicio { get; set; }
        public TimeSpan HoraFin { get; set; }
        public string? Destino { get; set; }
    }
}
