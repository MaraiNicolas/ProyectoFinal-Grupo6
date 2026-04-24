using Microsoft.EntityFrameworkCore;
using System.Reflection;

namespace ProyectoFinal_Grupo6.Api.Infraestructura.Database
{
    public class ApplicationDbContext : DbContext
    {

        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            var assembly = typeof(ApplicationDbContext).Assembly;
            var entityTypes = assembly.GetTypes()
                       .Where(t => t.IsClass && !t.IsAbstract &&
                                   t.Namespace == "ProyectoFinal_Grupo6.Api.Dominio.Entidades");
            foreach (var type in entityTypes)
            {
                modelBuilder.Entity(type);
            }

            modelBuilder.ApplyConfigurationsFromAssembly(assembly);
        }
    }
}
