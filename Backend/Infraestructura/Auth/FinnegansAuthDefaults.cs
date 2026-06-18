namespace ProyectoFinal_Grupo6.Api.Infraestructura.Auth
{
    public static class FinnegansAuthDefaults
    {
        public const string AuthenticationScheme = "Finnegans";

        // Prefijo de las claves en IMemoryCache para no chocar con otros usos del cache.
        public const string CacheKeyPrefix = "fg:";
    }
}
