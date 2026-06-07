using Microsoft.EntityFrameworkCore;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Repositorios.Abstracciones.RepositorioGenerico;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Repositorios.Abstracciones.SqlConnections;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Repositorios.UnitOfWork;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;
using ProyectoFinal_Grupo6.Api.Infraestructura.Excepciones;
using ProyectoFinal_Grupo6.Api.Infraestructura.Repositorios.Abstracciones.RepositorioGenerico;
using ProyectoFinal_Grupo6.Api.Infraestructura.Repositorios.Abstracciones.SqlConnections;
using ProyectoFinal_Grupo6.Api.Infraestructura.Repositorios.UnitOfWork;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;
using ProyectoFinal_Grupo6.Api.Funcionalidades.Admin;
using ProyectoFinal_Grupo6.Api.Infraestructura.Servicios;
using ProyectoFinal_Grupo6.Api.Funcionalidades.Destinos;
using ProyectoFinal_Grupo6.Api.Funcionalidades.Invitaciones;
using ProyectoFinal_Grupo6.Api.Funcionalidades.Registro;
using ProyectoFinal_Grupo6.Api.Funcionalidades.Visitantes;
using System.Reflection;
using Amazon.DynamoDBv2;

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
            services.AddScoped<InvitacionesService>();
            services.AddScoped<RegistroService>();
            services.AddScoped<VisitantesService>();
            services.AddScoped<DestinosService>();
            services.AddScoped<AdminService>();

            // HikCentral: mock o real segun configuracion
            var useMock = config.GetValue<bool>("HikCentral:UseMock", true);
            if (useMock)
            {
                services.AddScoped<IHikCentralService, MockHikCentralService>();
            }
            else
            {
                services.AddHttpClient<IHikCentralService, HikCentralService>()
                    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
                    {
                        // HikCentral usa certificado autofirmado
                        ServerCertificateCustomValidationCallback = (_, _, _, _) => true
                    });
            }
            // Email: mock o real segun configuracion
            var useMockEmail = config.GetValue<bool>("Email:UseMock", true);
            if (useMockEmail)
            {
                services.AddScoped<IEmailService, MockEmailService>();
            }
            else
            {
                services.AddScoped<IEmailService, SmtpEmailService>();
            }

            // DynamoDB Client
            // DynamoDB Client
            var dynamoDbServiceUrl = config.GetValue<string>("DynamoDB:ServiceUrl", "http://localhost:8000");
            services.AddSingleton<IAmazonDynamoDB>(sp =>
            {
                var dynamoConfig = new AmazonDynamoDBConfig
                {
                    ServiceURL = dynamoDbServiceUrl,
                    // Falla rapido si DynamoDB Local no esta disponible (evita bloquear el arranque).
                    Timeout = TimeSpan.FromSeconds(3),
                    MaxErrorRetry = 0
                };
                return new AmazonDynamoDBClient("fakeAccessKey", "fakeSecretKey", dynamoConfig);
            });

            // AuditLog: mock o real segun configuracion
            var useMockAudit = config.GetValue<bool>("AuditLog:UseMock", true);
            if (useMockAudit)
            {
                services.AddScoped<IAuditLogService, MockAuditLogService>();
            }
            else
            {
                services.AddScoped<IAuditLogService, DynamoDbAuditLogService>();
            }

            // Finnegans SSO: cliente HTTP que apunta a la API del cliente.
            // BaseUrl configurable via appsettings.json (seccion Finnegans) o variable
            // de entorno Finnegans__BaseUrl (ej: http://servicios.finneg.com).
            services.AddHttpClient<IFinnegansAuthService, FinnegansAuthService>((sp, client) =>
            {
                var cfg = sp.GetRequiredService<IConfiguration>();
                var baseUrl = cfg["Finnegans:BaseUrl"];
                if (!string.IsNullOrWhiteSpace(baseUrl))
                    client.BaseAddress = new Uri(baseUrl);
                client.Timeout = TimeSpan.FromSeconds(15);
            });

            // services.AddScoped<ISqlConnectionFactory, SqlConnectionFactory>();
            services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
            services.AddExceptionHandler<GlobalExceptionHandler>();
            services.AddProblemDetails();
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
