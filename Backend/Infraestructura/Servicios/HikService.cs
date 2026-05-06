using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;

namespace ProyectoFinal_Grupo6.Api.Infraestructura.Servicios
{
    public class HikService : IHikService
    {
        public IConfiguration _configuration;
        private readonly HttpClient _httpClient;
        public HikService(HttpClient httpClient, IConfiguration configuration)
        {
            this._httpClient = httpClient;
            this._configuration = configuration;
        }


    }
}
