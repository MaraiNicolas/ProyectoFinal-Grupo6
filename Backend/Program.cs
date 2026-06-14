using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using ProyectoFinal_Grupo6.Api.Infraestructura.Auth;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;
using ProyectoFinal_Grupo6.Api.Infraestructura.Extensiones;
using Amazon.DynamoDBv2;
using ProyectoFinal_Grupo6.Api.Infraestructura.Servicios;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseInMemoryDatabase("Grupo6Db");
});
// Agregar servicios al contenedor
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(
    options => options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Proyecto Final - Grupo 6 API",
        Version = "v1"
    })
);
builder.Services.AddCors(options =>
    options.AddPolicy("AllowReact", policy =>
    {
        // Origenes permitidos:
        // - http://localhost:5173
        // - http://localhost:3000
        // - http://localhost  
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:3000",
                "http://localhost")
        .AllowAnyHeader()
        .AllowAnyMethod();
    })
);
builder.Services.AddControllers();

// Cache de validacion de tokens de Finnegans. Tope de entradas para evitar que
// el cache crezca sin limites (cada entrada usa Size=1).
builder.Services.AddMemoryCache(options =>
{
    options.SizeLimit = 10_000;
});

// Autenticacion: esquema custom que valida access_tokens de Finnegans.
// No emite JWT propio; el access_token de Finnegans es la unica fuente de verdad
// de la sesion. El handler cachea el resultado de la validacion por CacheTtl
// (default 5 min, configurable via Finnegans__CacheTtlMinutes).
builder.Services.AddAuthentication(FinnegansAuthDefaults.AuthenticationScheme)
    .AddScheme<FinnegansAuthenticationOptions, FinnegansAuthenticationHandler>(
        FinnegansAuthDefaults.AuthenticationScheme,
        options =>
        {
            var ttlMinutes = builder.Configuration.GetValue<int>("Finnegans:CacheTtlMinutes", 5);
            options.CacheTtl = TimeSpan.FromMinutes(ttlMinutes);
        });
builder.Services.AddAuthorization();
builder.Services.AddInfraestructure(builder.Configuration);
var app = builder.Build();

// Datos iniciales para MVP (se reinician al reiniciar la app)
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    SeedData.Inicializar(context);
}

// Intentar crear la tabla AuditLogs en DynamoDB solo si NO estamos usando el mock.
// Si DynamoDB Local no esta disponible, no debe bloquear el arranque (timeout corto).
var useMockAudit = app.Configuration.GetValue<bool>("AuditLog:UseMock", true);
if (!useMockAudit)
{
    try
    {
        var dynamoClient = app.Services.GetRequiredService<IAmazonDynamoDB>();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        await DynamoDbInitializer.EnsureAuditLogsTableAsync(dynamoClient, cts.Token);
        Console.WriteLine("Tabla AuditLogs verificada/creada en DynamoDB.");
    }
    catch (OperationCanceledException)
    {
        Console.WriteLine("Timeout al conectar con DynamoDB. Verifica que DynamoDB Local este corriendo en el ServiceUrl configurado.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error al inicializar DynamoDB: {ex.Message}");
    }
}
else
{
    Console.WriteLine("AuditLog:UseMock=true, se omite la inicializacion de DynamoDB.");
}

app.UseExceptionHandler();

app.UseCors("AllowReact");
// Configurar el pipeline HTTP
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
//app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
