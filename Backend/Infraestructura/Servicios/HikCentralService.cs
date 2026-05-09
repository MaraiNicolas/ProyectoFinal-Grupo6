using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;

namespace ProyectoFinal_Grupo6.Api.Infraestructura.Servicios
{
    // Implementacion real que se conecta a la API de HikCentral.
    // Requiere VPN y permisos habilitados en el servidor.
    // Configuracion en appsettings.json seccion "HikCentral".
    //
    // Mientras no tengamos permisos para los endpoints de visitantes/reservas,
    // usamos el endpoint de version como ping: si responde con exito, retornamos
    // datos simulados. Cuando los permisos esten habilitados, se cambian los
    // endpoints y se parsea la respuesta real.
    public class HikCentralService : IHikCentralService
    {
        private readonly HttpClient _httpClient;
        private readonly string _partnerKey;
        private readonly string _partnerSecret;
        private readonly string _baseUrl;
        private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        // Endpoints reales (descomentar cuando tengamos permisos)
        // private const string ENDPOINT_APPOINTMENT = "/artemis/api/visitor/v1/appointment";
        // private const string ENDPOINT_VISITOR_GROUPS = "/artemis/api/visitor/v1/visitorgroups/groupinfo";

        // Endpoint de ping (el unico con permisos por ahora)
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
            // TODO: Cuando tengamos permisos, usar ENDPOINT_VISITOR_GROUPS
            // y filtrar por email en la respuesta.
            //
            // Por ahora: ping al servidor para verificar conexion.
            // Si responde OK, retornamos null (visitante no encontrado)
            // porque no podemos buscar realmente.
            var conectado = await PingServidor();
            if (!conectado)
                throw new Exception("No se pudo conectar con HikCentral. Verifique la VPN.");

            return null;
        }

        public async Task<HikReservaResponse> CrearReserva(HikReservaRequest request)
        {
            // TODO: Cuando tengamos permisos, usar ENDPOINT_APPOINTMENT
            // con el body real (visitStartTime, visitEndTime, visitorInfoList, etc.)
            //
            // Por ahora: ping al servidor. Si responde OK, simulamos
            // que la reserva fue creada exitosamente.
            var conectado = await PingServidor();
            if (!conectado)
            {
                return new HikReservaResponse
                {
                    Success = false,
                    ErrorMessage = "No se pudo conectar con HikCentral. Verifique la VPN."
                };
            }

            return new HikReservaResponse
            {
                Success = true,
                ReservationId = $"HIK-{Guid.NewGuid().ToString()[..8].ToUpper()}"
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
