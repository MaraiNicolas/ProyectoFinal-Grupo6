namespace ProyectoFinal_Grupo6.Api.Compartidos.Paginacion
{
    public class PaginacionParams
    {
        private const int TamanoMaximo = 100;
        private int _tamano = 20;

        public int Pagina { get; set; } = 1;

        public int Tamano
        {
            get => _tamano;
            set => _tamano = value < 1 ? 1 : value > TamanoMaximo ? TamanoMaximo : value;
        }
    }
}
