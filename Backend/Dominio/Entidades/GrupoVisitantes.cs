namespace ProyectoFinal_Grupo6.Api.Dominio.Entidades
{
    public class GrupoVisitantes
    {
        public GrupoVisitantes()
        {
            Guid = Guid.NewGuid();
            FechaCreacion = DateTime.UtcNow;
        }

        public Guid Guid { get; private set; }
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public Guid CreadoPorUsuarioId { get; set; }
        public DateTime FechaCreacion { get; set; }

        public Usuario? CreadoPor { get; set; }
        public List<GrupoVisitanteMiembro> Miembros { get; set; } = new();
    }
}
