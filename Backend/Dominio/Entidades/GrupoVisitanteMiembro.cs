namespace ProyectoFinal_Grupo6.Api.Dominio.Entidades
{
    public class GrupoVisitanteMiembro
    {
        public GrupoVisitanteMiembro()
        {
            Guid = Guid.NewGuid();
        }

        public Guid Guid { get; private set; }
        public Guid GrupoId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? Telefono { get; set; }

        public GrupoVisitantes? Grupo { get; set; }
    }
}
