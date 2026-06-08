using System.Text.Json.Serialization;

namespace ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios
{
    // Interfaz para comunicacion con HikCentral.
    // MockHikCentralService para MVP, HikCentralService para produccion.
    public interface IHikCentralService
    {
        Task<HikVisitante?> BuscarVisitantePorEmail(string email);
        Task<HikReservaResponse> CrearReserva(HikReservaRequest request);
        Task<string?> ObtenerVersion();
    }

    // DTOs que reflejan la estructura de la API de HikCentral
    public class HikVisitante
    {
        public string? VisitorId { get; set; }
        public string VisitorGivenName { get; set; } = string.Empty;
        public string VisitorFamilyName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? PhoneNum { get; set; }
        public int Gender { get; set; }
        public string? CertificateType { get; set; }
        public string? CertificateNum { get; set; }
        public string? Organization { get; set; }
    }

    public class HikReservaRequest
    {
        public string VisitStartTime { get; set; } = string.Empty;  // ISO-8601
        public string VisitEndTime { get; set; } = string.Empty;    // ISO-8601
        public int VisitPurposeType { get; set; } = 0;
        public string VisitPurpose { get; set; } = string.Empty;
        public List<HikVisitorInfo> VisitorInfoList { get; set; } = new();
    }

    public class HikVisitorInfo
    {
        [JsonPropertyName("VisitorInfo")]
        public HikVisitante VisitorInfo { get; set; } = new();
    }

    public class HikReservaResponse
    {
        public bool Success { get; set; }
        public string? ReservationId { get; set; }
        public string? VisitorId { get; set; }
        public string? QrCodeImage { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
