using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;
using ProyectoFinal_Grupo6.Api.Infraestructura.Extensiones;
using Amazon.DynamoDBv2;
using ProyectoFinal_Grupo6.Api.Infraestructura.Servicios;
using System.Text;

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
        policy.WithOrigins("http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod();
    })
);
builder.Services.AddControllers();

// Autenticacion JWT
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Falta configuracion 'Jwt:Key'. Definirla en appsettings.Development.json o como variable de entorno Jwt__Key (minimo 32 caracteres).");
var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException("Falta configuracion 'Jwt:Issuer'.");
var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException("Falta configuracion 'Jwt:Audience'.");

if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("'Jwt:Key' debe tener al menos 32 caracteres (256 bits) para HS256.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey))
        };
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
app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();