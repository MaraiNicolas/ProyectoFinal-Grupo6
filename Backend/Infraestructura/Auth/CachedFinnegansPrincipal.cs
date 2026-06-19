namespace ProyectoFinal_Grupo6.Api.Infraestructura.Auth
{
    // Snapshot del usuario que cacheamos por TTL para evitar golpear a Finnegans
    // y a la DB en cada request. Se reconstruye un ClaimsPrincipal a partir de esto.
    public class CachedFinnegansPrincipal
    {
        public Guid Guid { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Rol { get; set; } = string.Empty;
        public bool Admin { get; set; }
    }
}
