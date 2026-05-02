# Frontend - ProyectoFinal-Grupo6

## Descripcion

Aplicacion web en React para gestionar modulos del sistema, incluyendo login local, dashboard y gestion de visitantes.

## Stack

- React 19
- Vite 8
- CSS tradicional (sin framework)

## Requisitos

- Node.js 20 o superior
- npm

## Ejecucion local

Desde la carpeta Frontend:

```bash
npm install
npm run dev
```

La aplicacion queda disponible normalmente en:

- http://localhost:5173

## Scripts

- npm run dev: inicia entorno de desarrollo
- npm run build: genera build de produccion
- npm run preview: sirve build generado localmente
- npm run lint: ejecuta linting

## Funcionalidades implementadas

- Pantalla de login local
- Persistencia de sesion de login en localStorage
- Dashboard con modulos
- Sidebar contraible
- Grilla de visitantes con filtros por nombre, apellido, mail y DNI
- Columna de acciones por visitante con menu de elipsis
- Grilla reutilizable configurable por columnas y acciones
- Alta de visitante en vista dedicada
- Edicion de visitante con formulario precargado
- Snackbar de confirmacion al crear visitante
- Eliminacion de visitante con modal de confirmacion y snackbar de exito

## Estructura principal

- src/components/: componentes reutilizables de UI
- src/pages/: vistas principales
- src/hooks/: logica de estado y filtros
- src/data/: datos iniciales mock
