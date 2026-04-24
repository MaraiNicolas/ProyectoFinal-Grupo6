namespace ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Repositorios.Abstracciones.RepositorioGenerico
{
    public interface IGenericRepository<T> where T : class
    {
        Task AddAsync(T entity, CancellationToken ct = default);
        Task Update(T entity);
        Task Delete(T entity);
        Task<T?> GetByIdAsync(object id, CancellationToken ct = default);
    }
}
