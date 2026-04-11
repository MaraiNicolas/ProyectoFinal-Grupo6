namespace ProyectoFinal_Grupo6.Api.Dominio.Entidades
{
    public class Visitante
    {
        public Visitante()
        {
            Guid = Guid.NewGuid();
        }
        public Guid Guid { get; set; }
    }
}
