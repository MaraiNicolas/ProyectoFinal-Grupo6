using Microsoft.EntityFrameworkCore;
using ProyectoFinal_Grupo6.Api.Dominio.Entidades;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;

namespace ProyectoFinal_Grupo6.Api.Funcionalidades.Grupos
{
    public class GruposService
    {
        private readonly ApplicationDbContext _context;

        public GruposService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<(List<GrupoVisitantes> Items, bool HasMore)> ObtenerGrupos(int page = 1, int pageSize = 20)
        {
            var items = await _context.Set<GrupoVisitantes>()
                .Include(g => g.CreadoPor)
                .Include(g => g.Miembros)
                .OrderBy(g => g.Nombre)
                .Skip((page - 1) * pageSize).Take(pageSize + 1)
                .ToListAsync();
            var hasMore = items.Count > pageSize;
            if (hasMore) items = items.Take(pageSize).ToList();
            return (items, hasMore);
        }

        public async Task<GrupoVisitantes?> ObtenerGrupoPorId(Guid id)
        {
            return await _context.Set<GrupoVisitantes>()
                .Include(g => g.CreadoPor)
                .Include(g => g.Miembros)
                .FirstOrDefaultAsync(g => g.Guid == id);
        }

        public async Task<GrupoVisitantes> CrearGrupo(CrearGrupoRequest request, Guid usuarioId)
        {
            var grupo = new GrupoVisitantes
            {
                Nombre = request.Nombre,
                Descripcion = request.Descripcion,
                CreadoPorUsuarioId = usuarioId
            };

            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var m in request.Miembros)
            {
                if (string.IsNullOrWhiteSpace(m.Email)) continue;
                var email = m.Email.Trim().ToLower();
                if (!seen.Add(email)) continue;
                grupo.Miembros.Add(new GrupoVisitanteMiembro
                {
                    GrupoId = grupo.Guid,
                    Email = email,
                    Telefono = m.Telefono
                });
            }

            _context.Set<GrupoVisitantes>().Add(grupo);
            await _context.SaveChangesAsync();
            return grupo;
        }

        public async Task<GrupoVisitantes?> ActualizarGrupo(Guid id, ActualizarGrupoRequest request)
        {
            var grupo = await _context.Set<GrupoVisitantes>()
                .Include(g => g.Miembros)
                .FirstOrDefaultAsync(g => g.Guid == id);

            if (grupo == null) return null;

            grupo.Nombre = request.Nombre;
            grupo.Descripcion = request.Descripcion;

            _context.Set<GrupoVisitanteMiembro>().RemoveRange(grupo.Miembros);

            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var m in request.Miembros)
            {
                if (string.IsNullOrWhiteSpace(m.Email)) continue;
                var email = m.Email.Trim().ToLower();
                if (!seen.Add(email)) continue;
                _context.Set<GrupoVisitanteMiembro>().Add(new GrupoVisitanteMiembro
                {
                    GrupoId = grupo.Guid,
                    Email = email,
                    Telefono = m.Telefono
                });
            }

            await _context.SaveChangesAsync();
            return grupo;
        }

        public async Task<bool> EliminarGrupo(Guid id)
        {
            var grupo = await _context.Set<GrupoVisitantes>().FindAsync(id);
            if (grupo == null) return false;

            _context.Set<GrupoVisitantes>().Remove(grupo);
            await _context.SaveChangesAsync();
            return true;
        }
    }

    public class CrearGrupoRequest
    {
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public List<MiembroRequest> Miembros { get; set; } = new();
    }

    public class ActualizarGrupoRequest
    {
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public List<MiembroRequest> Miembros { get; set; } = new();
    }

    public class MiembroRequest
    {
        public string Email { get; set; } = string.Empty;
        public string? Telefono { get; set; }
    }
}
