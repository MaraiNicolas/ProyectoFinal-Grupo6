# Backend - ProyectoFinal-Grupo6

## Descripcion

API desarrollada en .NET 9 para soportar el sistema de gestion del proyecto.

## Stack

- ASP.NET Core Minimal API
- Entity Framework Core
- Base de datos en memoria para desarrollo (EF InMemory)
- DynamoDB Local para logs de auditoria
- Swagger / OpenAPI

## Requisitos

- .NET SDK 9.0 o superior
- Docker Desktop (para DynamoDB Local)
- (Opcional) AWS CLI para verificar tablas manualmente

---

## Ejecucion local

### 1. Levantar DynamoDB Local

Ejecutá este comando en PowerShell/Terminal:

```powershell
docker run -d --name dynamodb-local -p 8000:8000 -v dynamodb-data:/home/dynamodblocal amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb -dbPath /home/dynamodblocal
```

**Verificar que está corriendo:**
```powershell
docker ps --filter "name=dynamodb-local"
```

### 2. Restaurar dependencias e iniciar la API

Desde la carpeta Backend:

```bash
dotnet restore
dotnet run
```

Tambien podes ejecutarlo desde la raiz del repositorio:

```bash
dotnet run --project Backend/ProyectoFinal-Grupo6.Api.csproj
```

**Al arrancar la API:**
- Se crea automáticamente la tabla `AuditLogs` en DynamoDB Local si no existe
- Se inicializan datos de prueba en EF InMemory (usuarios, destinos, invitaciones)

---

## Documentacion de API

En modo desarrollo, Swagger queda disponible al iniciar la API en la URL que informe consola, normalmente:

- https://localhost:xxxx/swagger

---

## Configuracion actual

- CORS habilitado para frontend en http://localhost:5173
- Base de datos en memoria con nombre Grupo6Db (usuarios, invitaciones, visitantes, etc.)
- **DynamoDB Local** en `http://localhost:8000` para logs de auditoria persistentes

### Archivo `appsettings.json`

```json
"DynamoDB": {
  "ServiceUrl": "http://localhost:8000"
},
"AuditLog": {
  "UseMock": false  // false = usa DynamoDB, true = usa InMemory
}
```

Si no querés usar DynamoDB, cambiá `"UseMock": true` y los logs se guardarán en memoria (se pierden al reiniciar).

---

## Estructura principal

- `Program.cs`: configuracion de servicios, CORS y middlewares
- `Dominio/`: entidades y contratos de dominio
- `Infraestructura/`: acceso a datos, repositorios y servicios externos
  - `Servicios/DynamoDbAuditLogService.cs`: implementación de auditoría con DynamoDB
  - `Servicios/DynamoDbInitializer.cs`: crea tabla `AuditLogs` automáticamente
  - `Servicios/MockAuditLogService.cs`: implementación en memoria (mock)
- `Funcionalidades/`: features organizadas por vertical slice (Admin, Invitaciones, Registro, etc.)

---

## DynamoDB Local - Comandos útiles

### Detener DynamoDB Local
```powershell
docker stop dynamodb-local
```

### Iniciar DynamoDB Local (si ya existe)
```powershell
docker start dynamodb-local
```

### Ver logs del contenedor
```powershell
docker logs dynamodb-local
```

### Verificar tablas con AWS CLI
```powershell
aws dynamodb list-tables --endpoint-url http://localhost:8000
aws dynamodb scan --table-name AuditLogs --endpoint-url http://localhost:8000
```

### Eliminar y recrear el contenedor
```powershell
docker stop dynamodb-local
docker rm dynamodb-local
docker run -d --name dynamodb-local -p 8000:8000 -v dynamodb-data:/home/dynamodblocal amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb -dbPath /home/dynamodblocal
```

---

## Herramientas opcionales para visualizar DynamoDB

### AWS NoSQL Workbench (GUI oficial)
- Descarga: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/workbench.settingup.html
- Conectar a `localhost:8000`

### DynamoDB Admin (Web UI)
```powershell
npm install -g dynamodb-admin
set DYNAMO_ENDPOINT=http://localhost:8000
dynamodb-admin
```
Luego abrí `http://localhost:8001`

---

## Troubleshooting

### Error: "Could not connect to the endpoint"
- DynamoDB Local no está corriendo ? `docker start dynamodb-local`
- Puerto 8000 ocupado ? cambiá el puerto en `appsettings.json` y en el comando `docker run`

### La tabla AuditLogs no aparece
- Reiniciá la API para que se ejecute el inicializador
- Verificá con: `aws dynamodb list-tables --endpoint-url http://localhost:8000`

### Quiero volver a InMemory temporalmente
En `appsettings.json`:
```json
"AuditLog": {
  "UseMock": true
}
```

---

## Notas importantes

1. **Los datos de EF InMemory (usuarios, invitaciones, etc.) se pierden al reiniciar la API** — solo `AuditLog` persiste en DynamoDB.
2. El volumen `dynamodb-data` persiste incluso si reiniciás Docker Desktop.
3. Para **producción en AWS**, cambiar `ServiceUrl` por la región de AWS y configurar credenciales reales.
