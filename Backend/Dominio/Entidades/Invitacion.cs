namespace ProyectoFinal_Grupo6.Api.Dominio.Entidades
{
    // Invitacion creada por un empleado. Define fecha, horario, destino y visitantes.
    // Al completarse el formulario, se crea una reserva en HikCentral.
    public class Invitacion
    {
        public Invitacion()
        {
            Guid = Guid.NewGuid();
        }

        public Guid Guid { get; private set; }
        public Guid UsuarioId { get; set; }
        public Guid DestinoId { get; set; }
        public DateTime Fecha { get; set; }
        public TimeSpan HoraInicio { get; set; }
        public TimeSpan HoraFin { get; set; }
        public int BufferMinutos { get; set; } = 120;
        public string Titulo { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public string? Motivo { get; set; }
        public string Estado { get; set; } = "Pendiente";

        // Propiedades de navegacion
        public Usuario? Usuario { get; set; }
        public Destino? Destino { get; set; }
        public List<InvitacionVisitante> Visitantes { get; set; } = new();
    }
}
