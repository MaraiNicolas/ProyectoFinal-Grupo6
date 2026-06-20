namespace ProyectoFinal_Grupo6.Api.Compartidos.Paginacion
{
    public class PagedResult<T>
    {
        public IReadOnlyList<T> Items { get; init; } = [];
        public int Total { get; init; }
        public int Pagina { get; init; }
        public int Tamano { get; init; }
        public int TotalPaginas => Tamano > 0 ? (int)Math.Ceiling(Total / (double)Tamano) : 0;
    }
}
