using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;
using ProyectoFinal_Grupo6.Api.Dominio.Modelos;

namespace ProyectoFinal_Grupo6.Api.Infraestructura.Servicios
{
    // Mock para probar el SSO sin necesidad de credenciales reales de Finnegans.
    // Activar con Finnegans:UseMock=true (recomendado para desarrollo local).
    //
    // Tokens predefinidos:
    //   mock-admin-token     -> admin@empresa.com (admin: true)
    //   mock-empleado-token  -> empleado1@empresa.com (admin: false)
    //   mock-nuevo-token     -> nuevo@empresa.com (admin: false, usuario inexistente
    //                          para probar el flujo de AutoCreateUsuarios=true)
    //
    // Cualquier otro token retorna null (= 401 Unauthorized).
    public class MockFinnegansAuthService : IFinnegansAuthService
    {
        private readonly ILogger<MockFinnegansAuthService> _logger;
        private readonly Dictionary<string, FinnegansUserInfo> _tokens;

        public MockFinnegansAuthService(ILogger<MockFinnegansAuthService> logger)
        {
            _logger = logger;
            _tokens = new Dictionary<string, FinnegansUserInfo>(StringComparer.OrdinalIgnoreCase)
            {
                ["mock-admin-token"] = new FinnegansUserInfo
                {
                    Email = "admin@empresa.com",
                    Domain = "mock",
                    Admin = true,
                    PanelUsuarioCodigo = "MOCK-ADMIN"
                },
                ["mock-empleado-token"] = new FinnegansUserInfo
                {
                    Email = "empleado1@empresa.com",
                    Domain = "mock",
                    Admin = false,
                    PanelUsuarioCodigo = "MOCK-EMPLEADO"
                },
                ["mock-nuevo-token"] = new FinnegansUserInfo
                {
                    Email = "nuevo@empresa.com",
                    Domain = "mock",
                    Admin = false,
                    PanelUsuarioCodigo = "MOCK-NUEVO"
                }
            };
        }

        public Task<FinnegansUserInfo?> ValidarTokenAsync(string accessToken, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(accessToken))
                return Task.FromResult<FinnegansUserInfo?>(null);

            if (_tokens.TryGetValue(accessToken, out var info))
            {
                _logger.LogInformation("Mock Finnegans: token reconocido para {Email}", info.Email);
                return Task.FromResult<FinnegansUserInfo?>(info);
            }

            _logger.LogWarning("Mock Finnegans: token no reconocido");
            return Task.FromResult<FinnegansUserInfo?>(null);
        }
    }
}
