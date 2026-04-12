namespace ProyectoFinal_Grupo6.Api.Compartidos.CQRSPattern
{
    public interface ICommand<TCommand, TResponse> where TCommand : ICommand<TResponse>
    {
        Task<TResponse> Handle(TCommand command, CancellationToken cancellationToken = default);
    }
}
