# Backend - ProyectoFinal-Grupo6

## Descripcion
API desarrollada en .NET 9 para soportar el sistema de gestion del proyecto.

## Stack
- ASP.NET Core Minimal API
- Entity Framework Core
- Base de datos en memoria para desarrollo
- Swagger / OpenAPI

## Requisitos
- .NET SDK 9.0 o superior

## Ejecucion local
Desde la carpeta Backend:

```bash
dotnet restore
dotnet run
```

Tambien podes ejecutarlo desde la raiz del repositorio:

```bash
dotnet run --project Backend/ProyectoFinal-Grupo6.Api.csproj
```

## Documentacion de API
En modo desarrollo, Swagger queda disponible al iniciar la API en la URL que informe consola, normalmente:

- https://localhost:xxxx/swagger

## Configuracion actual
- CORS habilitado para frontend en http://localhost:5173
- Base de datos en memoria con nombre Grupo6Db

## Estructura principal
- Program.cs: configuracion de servicios, CORS y middlewares
- Dominio/: entidades y contratos de dominio
- Infraestructura/: acceso a datos, repositorios y dependencias
- Compartidos/: abstracciones CQRS