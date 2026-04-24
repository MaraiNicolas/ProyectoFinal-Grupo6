using Microsoft.EntityFrameworkCore;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Repositorios.Abstracciones.RepositorioGenerico;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Repositorios.Abstracciones.SqlConnections;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Repositorios.UnitOfWork;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;
using ProyectoFinal_Grupo6.Api.Infraestructura.Repositorios.Abstracciones.RepositorioGenerico;
using ProyectoFinal_Grupo6.Api.Infraestructura.Repositorios.Abstracciones.SqlConnections;
using ProyectoFinal_Grupo6.Api.Infraestructura.Repositorios.UnitOfWork;
using System.Reflection;

namespace ProyectoFinal_Grupo6.Api.Infraestructura.Extensiones
{
    public static class DependencyInjection 
    {
        public static IServiceCollection AddInfraestructure(this IServiceCollection services, IConfiguration config)
        {
            services.AddDbContext<ApplicationDbContext>(options =>
            {
                options.UseInMemoryDatabase("Grupo6Db");
            });
            var assembly = Assembly.GetExecutingAssembly();
            services.AddScoped<IUnitOfWork, UnitOfWork>();
           // services.AddScoped<ISqlConnectionFactory, SqlConnectionFactory>();
            services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
            var repositories = assembly.GetTypes().Where(t => t.IsClass && !t.IsAbstract && t.Name.EndsWith("Repository") && t.Name != "GenericRepository");

            foreach (var repo in repositories)
            {
                var interfaceType = repo.GetInterface($"I{repo.Name}");
                if (interfaceType != null)
                {
                    services.AddScoped(interfaceType, repo);
                }
            }
            return services;
        }
    }
}
