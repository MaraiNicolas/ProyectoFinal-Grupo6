namespace ProyectoFinal_Grupo6.Api.Dominio.Entidades
{
    public class Visitante
    {
        public Visitante()
        {
            Guid = Guid.NewGuid();
        }

        public Guid Guid { get; private set; }
        public string? HikCentralVisitorId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Apellido { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Telefono { get; set; }
        public string TipoDocumento { get; set; } = string.Empty;
        public string NumeroDocumento { get; set; } = string.Empty;
    }
}
