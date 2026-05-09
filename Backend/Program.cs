using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;
using ProyectoFinal_Grupo6.Api.Infraestructura.Extensiones;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseInMemoryDatabase("Grupo6Db");
});
// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
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
builder.Services.AddInfraestructure(builder.Configuration);
var app = builder.Build();

app.UseExceptionHandler();

app.UseCors("AllowReact");
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseHttpsRedirection();


app.Run();
