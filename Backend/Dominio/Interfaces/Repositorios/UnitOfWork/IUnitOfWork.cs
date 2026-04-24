namespace ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Repositorios.UnitOfWork
{
    public interface IUnitOfWork 
    {
        Task GuardarCambiosAsync(CancellationToken cancellationToken = default);
    }
}
