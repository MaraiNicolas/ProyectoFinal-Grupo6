namespace ProyectoFinal_Grupo6.Api.Dominio.Entidades
{
    // Piso o ubicacion dentro del edificio. Informativo, no se envia a HikCentral.
    public class Destino
    {
        public Destino()
        {
            Guid = Guid.NewGuid();
        }

        public Guid Guid { get; private set; }
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
    }
}
