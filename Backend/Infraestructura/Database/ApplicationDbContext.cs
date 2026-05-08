using Microsoft.EntityFrameworkCore;
using ProyectoFinal_Grupo6.Api.Dominio.Entidades;
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

            // Entity keys (all use Guid as primary key)
            modelBuilder.Entity<Usuario>().HasKey(e => e.Guid);
            modelBuilder.Entity<Visitante>().HasKey(e => e.Guid);
            modelBuilder.Entity<Destino>().HasKey(e => e.Guid);
            modelBuilder.Entity<Invitacion>().HasKey(e => e.Guid);
            modelBuilder.Entity<InvitacionVisitante>().HasKey(e => e.Guid);
            modelBuilder.Entity<AuditLog>().HasKey(e => e.Guid);
            modelBuilder.Entity<Configuracion>().HasKey(e => e.Guid);

            // Invitacion → Usuario
            modelBuilder.Entity<Invitacion>()
                .HasOne(i => i.Usuario)
                .WithMany()
                .HasForeignKey(i => i.UsuarioId);

            // Invitacion → Destino
            modelBuilder.Entity<Invitacion>()
                .HasOne(i => i.Destino)
                .WithMany()
                .HasForeignKey(i => i.DestinoId);

            // Invitacion → many InvitacionVisitante
            modelBuilder.Entity<InvitacionVisitante>()
                .HasOne(iv => iv.Invitacion)
                .WithMany(i => i.Visitantes)
                .HasForeignKey(iv => iv.InvitacionId);

            // InvitacionVisitante → Visitante (optional)
            modelBuilder.Entity<InvitacionVisitante>()
                .HasOne(iv => iv.Visitante)
                .WithMany()
                .HasForeignKey(iv => iv.VisitanteId)
                .IsRequired(false);

            // Unique index on Token
            modelBuilder.Entity<InvitacionVisitante>()
                .HasIndex(iv => iv.Token)
                .IsUnique();

            // Unique index on Configuracion.Clave
            modelBuilder.Entity<Configuracion>()
                .HasIndex(c => c.Clave)
                .IsUnique();
        }
    }
}
