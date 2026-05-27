using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;

namespace ProyectoFinal_Grupo6.Api.Infraestructura.Servicios
{
    // Implementacion real que se conecta a la API de HikCentral.
    // Requiere VPN y credenciales configuradas en appsettings.json seccion "HikCentral".
    // BuscarVisitantePorEmail: no soportado por la API (retorna null siempre).
    // CrearReserva: llama al endpoint de appointment y parsea appointRecordId, visitorId, qrCodeImage.
    public class HikCentralService : IHikCentralService
    {
        private readonly HttpClient _httpClient;
        private readonly string _partnerKey;
        private readonly string _partnerSecret;
        private readonly string _baseUrl;
        private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        private const string ENDPOINT_APPOINTMENT = "/artemis/api/visitor/v1/appointment";
        private const string ENDPOINT_VERSION = "/artemis/api/common/v1/version";

        public HikCentralService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _partnerKey = configuration["HikCentral:PartnerKey"] ?? "";
            _partnerSecret = configuration["HikCentral:PartnerSecret"] ?? "";
            _baseUrl = configuration["HikCentral:BaseUrl"] ?? "";
        }

        public async Task<HikVisitante?> BuscarVisitantePorEmail(string email)
        {
            // La API de HikCentral no soporta busqueda por email.
            // El endpoint de visitor groups solo retorna ID y fullName.
            // Retornamos null siempre (visitante tratado como nuevo).
            var conectado = await PingServidor();
            if (!conectado)
                throw new Exception("No se pudo conectar con HikCentral. Verifique la VPN.");

            return null;
        }

        public async Task<HikReservaResponse> CrearReserva(HikReservaRequest request)
        {
            var response = await CallApi(ENDPOINT_APPOINTMENT, request);

            if (response == null)
            {
                return new HikReservaResponse
                {
                    Success = false,
                    ErrorMessage = "No se pudo conectar con HikCentral. Verifique la VPN."
                };
            }

            var root = response.RootElement;
            var code = root.TryGetProperty("code", out var codeProp) ? codeProp.GetString() : null;

            if (code != "0")
            {
                var msg = root.TryGetProperty("msg", out var msgProp) ? msgProp.GetString() : "Error desconocido";
                return new HikReservaResponse
                {
                    Success = false,
                    ErrorMessage = $"HikCentral error ({code}): {msg}"
                };
            }

            var data = root.GetProperty("data");
            return new HikReservaResponse
            {
                Success = true,
                ReservationId = data.TryGetProperty("appointRecordId", out var rid) ? rid.GetString() : null,
                VisitorId = data.TryGetProperty("visitorId", out var vid) ? vid.GetString() : null,
                QrCodeImage = data.TryGetProperty("qrCodeImage", out var qr) ? qr.GetString() : null
            };
        }

        public async Task<string?> ObtenerVersion()
        {
            var response = await CallApi(ENDPOINT_VERSION, null);

            if (response != null)
            {
                var root = response.RootElement;
                if (root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object)
                {
                    if (data.TryGetProperty("softVersion", out var version))
                        return version.GetString();
                }
            }

            return null;
        }

        // Verifica que el servidor responda correctamente
        private async Task<bool> PingServidor()
        {
            var response = await CallApi(ENDPOINT_VERSION, null);
            if (response == null) return false;

            var root = response.RootElement;
            return root.TryGetProperty("code", out var code) && code.GetString() == "0";
        }

        // Port of Python sign() function — HMAC-SHA256 signature
        private string Sign(string path)
        {
            var stringToSign = "POST\n*/*\napplication/json\nx-ca-key:" + _partnerKey + "\n" + path;
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_partnerSecret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(stringToSign));
            return Convert.ToBase64String(hash);
        }

        // Creación De Signature
        private async Task<JsonDocument?> CallApi(string path, object? body)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}{path}");

            request.Headers.Add("Accept", "*/*");
            request.Headers.Add("x-ca-key", _partnerKey);
            request.Headers.Add("x-ca-signature-headers", "x-ca-key");
            request.Headers.Add("x-ca-signature", Sign(path));

            var jsonContent = body != null ? JsonSerializer.Serialize(body, _jsonOptions) : "{}";
            var httpContent = new StringContent(jsonContent, Encoding.UTF8);
            httpContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
            request.Content = httpContent;

            try
            {
                var response = await _httpClient.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();
                return JsonDocument.Parse(content);
            }
            catch
            {
                return null;
            }
        }
    }
}
