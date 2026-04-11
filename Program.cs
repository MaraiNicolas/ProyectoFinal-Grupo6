using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using ProyectoFinal_Grupo6.Api.Infraestructura.Database;

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
    options => options.SwaggerDoc("V1", new OpenApiInfo
    {
        Title = "Proyecto Final - Grupo 6 API",
        Version = "v1"
    })
);
var app = builder.Build();


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseHttpsRedirection();


app.Run();
