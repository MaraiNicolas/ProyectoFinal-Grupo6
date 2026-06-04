using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;

namespace ProyectoFinal_Grupo6.Api.Infraestructura.Servicios
{
    public class MockEmailService : IEmailService
    {
        private readonly ILogger<MockEmailService> _logger;

        public MockEmailService(ILogger<MockEmailService> logger)
        {
            _logger = logger;
        }

        public Task EnviarLinkRegistro(EmailRegistroRequest request)
        {
            _logger.LogInformation(
                "[MockEmail] Link de registro enviado a {Email} | Invitacion: {Titulo} | Link: {Link}",
                request.DestinatarioEmail, request.TituloInvitacion, request.LinkRegistro);
            return Task.CompletedTask;
        }
    }
}
