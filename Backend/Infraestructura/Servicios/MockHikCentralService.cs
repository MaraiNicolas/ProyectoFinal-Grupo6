using Microsoft.EntityFrameworkCore;
using ProyectoFinal_Grupo6.Api.Dominio.Entidades;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;

namespace ProyectoFinal_Grupo6.Api.Infraestructura.Servicios
{
    // Mock que usa la base de datos local como stand-in de HikCentral.
    // Simula las respuestas con la misma estructura que la API real.
    public class MockHikCentralService : IHikCentralService
    {
        private readonly ApplicationDbContext _context;

        public MockHikCentralService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<HikVisitante?> BuscarVisitantePorEmail(string email)
        {
            var visitante = await _context.Set<Visitante>()
                .FirstOrDefaultAsync(v => v.Email.ToLower() == email.ToLower());

            if (visitante == null)
                return null;

            return new HikVisitante
            {
                VisitorId = visitante.HikCentralVisitorId ?? visitante.Guid.ToString(),
                VisitorGivenName = visitante.Nombre,
                VisitorFamilyName = visitante.Apellido,
                Email = visitante.Email,
                PhoneNum = visitante.Telefono,
                CertificateType = visitante.TipoDocumento,
                CertificateNum = visitante.NumeroDocumento
            };
        }

        public async Task<HikReservaResponse> CrearReserva(HikReservaRequest request)
        {
            // Simula la creacion de una reserva en HikCentral
            await Task.CompletedTask;

            return new HikReservaResponse
            {
                Success = true,
                ReservationId = $"MOCK-RES-{Guid.NewGuid().ToString()[..8].ToUpper()}"
            };
        }

        public async Task<string?> ObtenerVersion()
        {
            await Task.CompletedTask;
            return "HikCentral Professional V3.0.0.0 (Mock)";
        }
    }
}
