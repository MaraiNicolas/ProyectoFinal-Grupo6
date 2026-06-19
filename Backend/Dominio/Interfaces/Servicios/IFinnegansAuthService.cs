using ProyectoFinal_Grupo6.Api.Dominio.Modelos;

namespace ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios
{
    public interface IFinnegansAuthService
    {
        Task<FinnegansUserInfo?> ValidarTokenAsync(string accessToken, CancellationToken cancellationToken = default);
    }
}
