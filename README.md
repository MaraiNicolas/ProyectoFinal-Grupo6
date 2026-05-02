# ProyectoFinal-Grupo6

## Descripcion

Proyecto de gestion compuesto por un frontend web en React y un backend en .NET.

## Arquitectura

- Frontend: React + Vite
- Backend: ASP.NET Core + Entity Framework Core
- Comunicacion: HTTP con CORS habilitado para entorno local

## Estructura del repositorio

- Frontend/: interfaz de usuario
- Backend/: API y capas de dominio/infraestructura

## Requisitos

- Node.js 20 o superior
- npm
- .NET SDK 9.0 o superior

## Ejecucion local

### 1) Levantar backend

En una terminal, desde la raiz del repositorio:

```bash
dotnet run --project Backend/ProyectoFinal-Grupo6.Api.csproj
```

### 2) Levantar frontend

En otra terminal:

```bash
cd Frontend
npm install
npm run dev
```

## URLs habituales

- Frontend: http://localhost:5173
- Swagger backend: https://localhost:xxxx/swagger

## Estado funcional actual

- Login local
- Persistencia de login en localStorage
- Dashboard de modulos
- Sidebar contraible
- Grilla de visitantes con filtros
- Componente de grilla reutilizable para distintas vistas
- Alta de visitante con redireccion a grilla
- Edicion de visitante desde accion Modificar con formulario precargado
- Snackbar de confirmacion de alta
- Eliminacion de visitante con confirmacion y mensaje de exito
- Menu de acciones por visitante (elipsis)

## Notas

- El backend usa base de datos en memoria para desarrollo.
- Para detalles por capa, revisar:
  - Backend/README.md
  - Frontend/README.md
