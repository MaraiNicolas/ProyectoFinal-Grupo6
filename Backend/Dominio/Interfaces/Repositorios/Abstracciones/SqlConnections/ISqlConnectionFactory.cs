using System.Data;

namespace ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Repositorios.Abstracciones.SqlConnections
{
    public interface ISqlConnectionFactory
    {
        IDbConnection CreateConnection();
    }
}
