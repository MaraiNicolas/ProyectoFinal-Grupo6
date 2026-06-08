namespace ProyectoFinal_Grupo6.Api.Dominio.Entidades
{
    // Configuracion global del sistema (clave-valor). Ej: BufferMinutosPorDefecto = 120.
    public class Configuracion
    {
        public Configuracion()
        {
            Guid = Guid.NewGuid();
        }

        public Guid Guid { get; private set; }
        public string Clave { get; set; } = string.Empty;
        public string Valor { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
    }
}
