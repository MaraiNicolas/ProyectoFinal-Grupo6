namespace ProyectoFinal_Grupo6.Api.Dominio.Entidades
{
    public class Reunion
    {
        public Reunion()
        {
            Guid = Guid.NewGuid();
        }
        public Guid Guid { get; private set; }
    }
}
