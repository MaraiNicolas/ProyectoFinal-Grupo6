namespace ProyectoFinal_Grupo6.Api.Dominio.Entidades
{
    public class Usuario
    {
        public Usuario()
        {
            Guid = Guid.NewGuid();
        }

        public Guid Guid { get; private set; }
        public string Nombre { get; set; } = string.Empty;
        public string Apellido { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Rol { get; set; } = string.Empty;
    }
}
