using Microsoft.AspNetCore.Authentication;

namespace ProyectoFinal_Grupo6.Api.Infraestructura.Auth
{
    public class FinnegansAuthenticationOptions : AuthenticationSchemeOptions
    {
        // TTL del cache de validacion. Define el peor caso de delay entre que Finnegans
        // revoca un token y nuestro backend deja de aceptarlo.
        public TimeSpan CacheTtl { get; set; } = TimeSpan.FromMinutes(5);
    }
}
