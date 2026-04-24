namespace ProyectoFinal_Grupo6.Api.Dominio.Entidades
{
    public class Recurso
    {
        public Recurso()
        {
            Guid = Guid.NewGuid();
        }
        public Guid Guid { get; set; }
    }
}
