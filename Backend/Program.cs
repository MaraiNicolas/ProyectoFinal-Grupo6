using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using ProyectoFinal_Grupo6.Api.Infraestructura.Auth;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;
using ProyectoFinal_Grupo6.Api.Infraestructura.Extensiones;
using Amazon.DynamoDBv2;
using ProyectoFinal_Grupo6.Api.Infraestructura.Servicios;

var builder = WebApplication.CreateBuilder(args);


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

// Crear el schema de la base de datos al arrancar (idempotente: si las tablas
// ya existen, no hace nada).
//
// Usamos EnsureCreated en lugar de Migrate para evitar que el cliente necesite
// instalar la herramienta "dotnet-ef". La contrapartida es que EnsureCreated NO
// soporta migracion incremental de schema: si cambian las entidades C# y la DB
// ya existe, hay que borrar el archivo grupo6.db (o el volumen "sqlite-data")
// para que se recree con el schema nuevo. Aceptable mientras el modelo este
// estable; si en el futuro se necesita versionado de schema, migrar a Migrate
// instalando "dotnet ef migrations add ..." y commiteando las migraciones.
//
// InMemory provider no soporta esquema relacional, por eso se omite en ese caso.
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    if (context.Database.IsRelational())
    {
        context.Database.EnsureCreated();
    }
    // Datos iniciales (admin, destinos, etc.). Idempotente: solo seed si la DB
    // esta vacia, por lo que es seguro correrlo en cada arranque.
    SeedData.Inicializar(context);
}

// Intentar crear la tabla AuditLogs en DynamoDB solo si NO estamos usando el mock.
// Si DynamoDB Local no esta disponible al arrancar (todavia booteando), reintenta
// varias veces antes de rendirse. Si igual falla, no bloquea el arranque: el
// DynamoDbAuditLogService es resiliente y reintenta crear la tabla en el primer
// PutItem que falle con ResourceNotFoundException.
var useMockAudit = app.Configuration.GetValue<bool>("AuditLog:UseMock", true);
if (!useMockAudit)
{
    var dynamoClient = app.Services.GetRequiredService<IAmazonDynamoDB>();
    const int maxIntentos = 6;
    var creada = false;
    for (var intento = 1; intento <= maxIntentos && !creada; intento++)
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            await DynamoDbInitializer.EnsureAuditLogsTableAsync(dynamoClient, cts.Token);
            Console.WriteLine($"Tabla AuditLogs verificada/creada en DynamoDB (intento {intento}).");
            creada = true;
        }
        catch (Exception ex) when (intento < maxIntentos)
        {
            Console.WriteLine($"Intento {intento}/{maxIntentos} fallido al inicializar DynamoDB: {ex.Message}. Reintentando en 2s...");
            await Task.Delay(TimeSpan.FromSeconds(2));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"No se pudo inicializar DynamoDB tras {maxIntentos} intentos: {ex.Message}. El servicio reintentara en cada evento de auditoria.");
        }
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
