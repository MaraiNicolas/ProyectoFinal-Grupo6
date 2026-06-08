using Microsoft.EntityFrameworkCore;
using ProyectoFinal_Grupo6.Api.Dominio.Entidades;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;

namespace ProyectoFinal_Grupo6.Api.Funcionalidades.Visitantes
{
    public class VisitantesService
    {
        private readonly ApplicationDbContext _context;

        public VisitantesService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<Visitante>> ObtenerVisitantes(string? search)
        {
            var query = _context.Set<Visitante>().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.ToLower();
                query = query.Where(v =>
                    v.Nombre.ToLower().Contains(term) ||
                    v.Apellido.ToLower().Contains(term) ||
                    v.Email.ToLower().Contains(term) ||
                    v.NumeroDocumento.Contains(term));
            }

            return await query.OrderBy(v => v.Apellido).ThenBy(v => v.Nombre).ToListAsync();
        }
    }
}
