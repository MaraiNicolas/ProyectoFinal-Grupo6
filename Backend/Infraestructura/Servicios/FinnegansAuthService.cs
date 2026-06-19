using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;
using ProyectoFinal_Grupo6.Api.Dominio.Modelos;
using System.Text.Json;

namespace ProyectoFinal_Grupo6.Api.Infraestructura.Servicios
{
    public class FinnegansAuthService : IFinnegansAuthService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<FinnegansAuthService> _logger;
        private readonly string _endpoint;

        public FinnegansAuthService(HttpClient httpClient, IConfiguration configuration, ILogger<FinnegansAuthService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _endpoint = configuration["Finnegans:InvitadosEndpoint"] ?? "/api/1/invitados";
        }

        public async Task<FinnegansUserInfo?> ValidarTokenAsync(string accessToken, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(accessToken))
                return null;

            var url = $"{_endpoint}?access_token={Uri.EscapeDataString(accessToken)}";

            try
            {
                using var response = await _httpClient.GetAsync(url, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Finnegans rechazo el token. StatusCode: {Status}", response.StatusCode);
                    return null;
                }

                await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
                var root = doc.RootElement;

                if (!root.TryGetProperty("email", out var emailProp) || emailProp.ValueKind != JsonValueKind.String)
                {
                    _logger.LogWarning("Respuesta de Finnegans sin email valido.");
                    return null;
                }

                return new FinnegansUserInfo
                {
                    Email = emailProp.GetString() ?? string.Empty,
                    Domain = root.TryGetProperty("domain", out var d) ? d.GetString() : null,
                    Admin = root.TryGetProperty("admin", out var a) && a.ValueKind == JsonValueKind.True,
                    PanelUsuarioCodigo = root.TryGetProperty("panelUsuarioCodigo", out var p) ? p.GetString() : null
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error consultando API de Finnegans en {Url}", url);
                return null;
            }
        }
    }
}
