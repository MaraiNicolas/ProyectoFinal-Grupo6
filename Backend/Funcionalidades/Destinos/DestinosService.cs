using Microsoft.EntityFrameworkCore;
using ProyectoFinal_Grupo6.Api.Dominio.Entidades;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;

namespace ProyectoFinal_Grupo6.Api.Funcionalidades.Destinos
{
    public class DestinosService
    {
        private readonly ApplicationDbContext _context;

        public DestinosService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<Destino>> ObtenerDestinos()
        {
            return await _context.Set<Destino>().OrderBy(d => d.Nombre).ToListAsync();
        }

        public async Task<Destino> CrearDestino(CrearDestinoRequest request)
        {
            var destino = new Destino
            {
                Nombre = request.Nombre,
                Descripcion = request.Descripcion
            };
            _context.Set<Destino>().Add(destino);
            await _context.SaveChangesAsync();
            return destino;
        }

        public async Task<Destino?> ActualizarDestino(Guid id, CrearDestinoRequest request)
        {
            var destino = await _context.Set<Destino>().FirstOrDefaultAsync(d => d.Guid == id);
            if (destino == null) return null;

            destino.Nombre = request.Nombre;
            destino.Descripcion = request.Descripcion;
            await _context.SaveChangesAsync();
            return destino;
        }

        public async Task<bool> EliminarDestino(Guid id)
        {
            var destino = await _context.Set<Destino>().FirstOrDefaultAsync(d => d.Guid == id);
            if (destino == null) return false;

            _context.Set<Destino>().Remove(destino);
            await _context.SaveChangesAsync();
            return true;
        }
    }

    public class CrearDestinoRequest
    {
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
    }
}
