using MailKit.Net.Smtp;
using MimeKit;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;

namespace ProyectoFinal_Grupo6.Api.Infraestructura.Servicios
{
    public class SmtpEmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<SmtpEmailService> _logger;

        public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task EnviarLinkRegistro(EmailRegistroRequest request)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(
                _config["Email:FromName"] ?? "Sistema de Visitas",
                _config["Email:User"]!));
            message.To.Add(MailboxAddress.Parse(request.DestinatarioEmail));
            message.Subject = $"Invitacion: {request.TituloInvitacion}";

            var fecha = request.Fecha.ToString("dd/MM/yyyy");
            var horaInicio = $"{request.HoraInicio.Hours:D2}:{request.HoraInicio.Minutes:D2}";
            var horaFin = $"{request.HoraFin.Hours:D2}:{request.HoraFin.Minutes:D2}";

            var body = new BodyBuilder
            {
                HtmlBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                        <h2>Tenes una invitacion</h2>
                        <p><strong>{request.NombreAnfitrion}</strong> te invito a <strong>{request.TituloInvitacion}</strong>.</p>
                        <table style='margin: 16px 0; border-collapse: collapse;'>
                            <tr><td style='padding: 4px 12px 4px 0; color: #666;'>Fecha</td><td>{fecha}</td></tr>
                            <tr><td style='padding: 4px 12px 4px 0; color: #666;'>Horario</td><td>{horaInicio} - {horaFin}</td></tr>
                            {(request.Destino != null ? $"<tr><td style='padding: 4px 12px 4px 0; color: #666;'>Destino</td><td>{request.Destino}</td></tr>" : "")}
                        </table>
                        <p>Para confirmar tu asistencia, completa el formulario de registro:</p>
                        <p style='margin: 20px 0;'>
                            <a href='{request.LinkRegistro}' style='display: inline-block; padding: 12px 24px; background: #0b5dd7; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;'>
                                Completar registro
                            </a>
                        </p>
                        <p style='font-size: 12px; color: #999;'>Si no esperabas esta invitacion, podes ignorar este email.</p>
                    </div>"
            };
            message.Body = body.ToMessageBody();

            using var client = new SmtpClient();
            client.ServerCertificateValidationCallback = (_, _, _, _) => true;
            await client.ConnectAsync(
                _config["Email:Host"]!,
                _config.GetValue<int>("Email:Port", 587),
                MailKit.Security.SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(_config["Email:User"]!, _config["Email:Password"]!);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Email de registro enviado a {Email} para invitacion {Titulo}",
                request.DestinatarioEmail, request.TituloInvitacion);
        }
    }
}
