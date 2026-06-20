using Microsoft.EntityFrameworkCore;

namespace ProyectoFinal_Grupo6.Api.Compartidos.Paginacion
{
    public static class QueryableExtensions
    {
        public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
            this IQueryable<T> query,
            PaginacionParams paginacion,
            CancellationToken cancellationToken = default)
        {
            var total = await query.CountAsync(cancellationToken);

            var items = await query
                .Skip((paginacion.Pagina - 1) * paginacion.Tamano)
                .Take(paginacion.Tamano)
                .ToListAsync(cancellationToken);

            return new PagedResult<T>
            {
                Items = items,
                Total = total,
                Pagina = paginacion.Pagina,
                Tamano = paginacion.Tamano
            };
        }
    }
}
