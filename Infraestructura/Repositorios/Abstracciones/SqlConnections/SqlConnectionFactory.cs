using Microsoft.Data.SqlClient;
using Microsoft.IdentityModel.Tokens;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Repositorios.Abstracciones.SqlConnections;
using System.Data;

namespace ProyectoFinal_Grupo6.Api.Infraestructura.Repositorios.Abstracciones.SqlConnections
{
    public class SqlConnectionFactory : ISqlConnectionFactory
    {
        private readonly string _connectionString;
        public SqlConnectionFactory(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection") ?? throw new ArgumentNullException(nameof(configuration));
        }
        public IDbConnection CreateConnection()
        { 
            SqlConnection connection = new SqlConnection(_connectionString);
            connection.Open();
            return connection;
        }
    }
}
