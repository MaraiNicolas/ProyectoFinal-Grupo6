using ProyectoFinal_Grupo6.Api.Dominio.Entidades;

namespace ProyectoFinal_Grupo6.Api.Infraestructura.Database
{
    // Datos iniciales para la base de datos InMemory.
    // Se ejecuta al iniciar la aplicacion para que haya datos de prueba disponibles.
    public static class SeedData
    {
        public static void Inicializar(ApplicationDbContext context)
        {
            if (context.Set<Usuario>().Any())
                return; // Ya tiene datos

            // --- Usuarios ---
            var admin = new Usuario
            {
                Nombre = "Admin",
                Apellido = "Sistema",
                Email = "admin@empresa.com",
                Rol = "Admin"
            };
            var empleado1 = new Usuario
            {
                Nombre = "Maria",
                Apellido = "Garcia",
                Email = "empleado1@empresa.com",
                Rol = "Empleado"
            };
            var empleado2 = new Usuario
            {
                Nombre = "Carlos",
                Apellido = "Lopez",
                Email = "empleado2@empresa.com",
                Rol = "Empleado"
            };
            context.Set<Usuario>().AddRange(admin, empleado1, empleado2);

            // --- Destinos (floors) ---
            var piso1 = new Destino { Nombre = "Piso 1", Descripcion = "Planta baja - Recepcion" };
            var piso2 = new Destino { Nombre = "Piso 2", Descripcion = "Oficinas administrativas" };
            var piso3 = new Destino { Nombre = "Piso 3", Descripcion = "Desarrollo y tecnologia" };
            var piso4 = new Destino { Nombre = "Piso 4", Descripcion = "Sala de reuniones" };
            var piso5 = new Destino { Nombre = "Piso 5", Descripcion = "Direccion general" };
            context.Set<Destino>().AddRange(piso1, piso2, piso3, piso4, piso5);

            // --- Visitantes (returning visitors) ---
            var visitante1 = new Visitante
            {
                Nombre = "Lucia",
                Apellido = "Fernandez",
                Email = "lucia.fernandez@mail.com",
                Telefono = "+5491155001234",
                TipoDocumento = "DNI",
                NumeroDocumento = "35123456"
            };
            var visitante2 = new Visitante
            {
                Nombre = "Matias",
                Apellido = "Gomez",
                Email = "matias.gomez@mail.com",
                Telefono = "+5491155005678",
                TipoDocumento = "DNI",
                NumeroDocumento = "38654321"
            };
            var visitante3 = new Visitante
            {
                Nombre = "Camila",
                Apellido = "Ruiz",
                Email = "camila.ruiz@mail.com",
                TipoDocumento = "Pasaporte",
                NumeroDocumento = "AAB123456"
            };
            context.Set<Visitante>().AddRange(visitante1, visitante2, visitante3);

            // --- Invitaciones ---
            var hoy = DateTime.Today;

            // Invitacion activa para hoy (form completed)
            var invitacion1 = new Invitacion
            {
                UsuarioId = empleado1.Guid,
                DestinoId = piso3.Guid,
                Fecha = hoy,
                HoraInicio = new TimeSpan(10, 0, 0),
                HoraFin = new TimeSpan(12, 0, 0),
                BufferMinutos = 120,
                Motivo = "Reunion de proyecto",
                Estado = "Activa"
            };

            // Invitacion pendiente para hoy (form not completed yet)
            var invitacion2 = new Invitacion
            {
                UsuarioId = empleado1.Guid,
                DestinoId = piso4.Guid,
                Fecha = hoy,
                HoraInicio = new TimeSpan(15, 0, 0),
                HoraFin = new TimeSpan(16, 30, 0),
                BufferMinutos = 120,
                Motivo = "Entrevista",
                Estado = "Pendiente"
            };

            // Invitacion expirada (yesterday)
            var invitacion3 = new Invitacion
            {
                UsuarioId = empleado2.Guid,
                DestinoId = piso2.Guid,
                Fecha = hoy.AddDays(-1),
                HoraInicio = new TimeSpan(9, 0, 0),
                HoraFin = new TimeSpan(11, 0, 0),
                BufferMinutos = 120,
                Motivo = "Entrevista",
                Estado = "Expirada"
            };

            // Invitacion pendiente para manana
            var invitacion4 = new Invitacion
            {
                UsuarioId = empleado2.Guid,
                DestinoId = piso5.Guid,
                Fecha = hoy.AddDays(1),
                HoraInicio = new TimeSpan(14, 0, 0),
                HoraFin = new TimeSpan(15, 0, 0),
                BufferMinutos = 120,
                Motivo = "Presentacion comercial",
                Estado = "Pendiente"
            };

            context.Set<Invitacion>().AddRange(invitacion1, invitacion2, invitacion3, invitacion4);

            // --- InvitacionVisitantes ---
            var iv1 = new InvitacionVisitante
            {
                InvitacionId = invitacion1.Guid,
                VisitanteId = visitante1.Guid,
                EstadoFormulario = "Completado",
                EmailVisitante = visitante1.Email,
                TelefonoVisitante = visitante1.Telefono,
                HikCentralReservationId = "MOCK-RES-001",
                FechaCompletado = hoy.AddDays(-1).AddHours(14)
            };
            var iv2 = new InvitacionVisitante
            {
                InvitacionId = invitacion1.Guid,
                VisitanteId = visitante2.Guid,
                EstadoFormulario = "Completado",
                EmailVisitante = visitante2.Email,
                TelefonoVisitante = visitante2.Telefono,
                HikCentralReservationId = "MOCK-RES-002",
                FechaCompletado = hoy.AddDays(-1).AddHours(16)
            };
            var iv3 = new InvitacionVisitante
            {
                InvitacionId = invitacion2.Guid,
                EstadoFormulario = "Pendiente",
                EmailVisitante = "nuevo.visitante@mail.com"
            };
            var iv4 = new InvitacionVisitante
            {
                InvitacionId = invitacion3.Guid,
                VisitanteId = visitante3.Guid,
                EstadoFormulario = "Completado",
                EmailVisitante = visitante3.Email,
                HikCentralReservationId = "MOCK-RES-003",
                FechaCompletado = hoy.AddDays(-2).AddHours(10)
            };
            var iv5 = new InvitacionVisitante
            {
                InvitacionId = invitacion4.Guid,
                EstadoFormulario = "Pendiente",
                EmailVisitante = "proveedor@empresa-externa.com",
                TelefonoVisitante = "+5491166007890"
            };

            context.Set<InvitacionVisitante>().AddRange(iv1, iv2, iv3, iv4, iv5);

            // --- AuditLog ---
            context.Set<AuditLog>().AddRange(
                new AuditLog
                {
                    EventType = "INVITATION_CREATED",
                    Timestamp = hoy.AddDays(-1).AddHours(10),
                    UsuarioId = empleado1.Guid,
                    InvitacionId = invitacion1.Guid
                },
                new AuditLog
                {
                    EventType = "FORM_COMPLETED",
                    Timestamp = hoy.AddDays(-1).AddHours(14),
                    VisitanteId = visitante1.Guid,
                    InvitacionId = invitacion1.Guid
                },
                new AuditLog
                {
                    EventType = "RESERVATION_CREATED",
                    Timestamp = hoy.AddDays(-1).AddHours(14),
                    VisitanteId = visitante1.Guid,
                    InvitacionId = invitacion1.Guid,
                    Metadata = "{\"hikCentralReservationId\": \"MOCK-RES-001\"}"
                },
                new AuditLog
                {
                    EventType = "INVITATION_CREATED",
                    Timestamp = hoy.AddHours(8),
                    UsuarioId = empleado1.Guid,
                    InvitacionId = invitacion2.Guid
                },
                new AuditLog
                {
                    EventType = "INVITATION_EXPIRED",
                    Timestamp = hoy,
                    InvitacionId = invitacion3.Guid
                }
            );

            // --- Configuracion ---
            context.Set<Configuracion>().Add(new Configuracion
            {
                Clave = "BufferMinutosPorDefecto",
                Valor = "120",
                Descripcion = "Buffer en minutos agregado a ambos lados de la ventana horaria de la invitacion"
            });

            context.SaveChanges();
        }
    }
}
