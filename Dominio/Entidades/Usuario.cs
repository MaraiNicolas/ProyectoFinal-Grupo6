namespace ProyectoFinal_Grupo6.Api.Dominio.Entidades
{
    public class Usuario
    {
        public Usuario()
        {
            Guid = Guid.NewGuid();
        }
        public Guid Guid { get; private set; }
        public string Nombre { get; private set; }
        public string Apellido { get; private set; }
        public string Email { get; set; }

    }
}
