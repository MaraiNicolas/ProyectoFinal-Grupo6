using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using ProyectoFinal_Grupo6.Api.Dominio.Entidades;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;

namespace ProyectoFinal_Grupo6.Api.Infraestructura.Servicios
{
    // Implementacion real que guarda audit logs en DynamoDB.
    // Usado en produccion o cuando AuditLog:UseMock = false.
    public class DynamoDbAuditLogService : IAuditLogService
    {
        private readonly IAmazonDynamoDB _dynamoClient;
        private const string TableName = "AuditLogs";
        private const string IndexName = "EventType-Timestamp-index";

        public DynamoDbAuditLogService(IAmazonDynamoDB dynamoClient)
        {
            _dynamoClient = dynamoClient;
        }

        public async Task RegistrarEvento(string eventType, Guid? usuarioId = null, Guid? visitanteId = null, Guid? invitacionId = null, string? metadata = null)
        {
            var item = new Dictionary<string, AttributeValue>
            {
                ["Guid"] = new AttributeValue { S = Guid.NewGuid().ToString() },
                ["EventType"] = new AttributeValue { S = eventType },
                ["Timestamp"] = new AttributeValue { N = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString() }
            };

            if (usuarioId.HasValue)
                item["UsuarioId"] = new AttributeValue { S = usuarioId.Value.ToString() };

            if (visitanteId.HasValue)
                item["VisitanteId"] = new AttributeValue { S = visitanteId.Value.ToString() };

            if (invitacionId.HasValue)
                item["InvitacionId"] = new AttributeValue { S = invitacionId.Value.ToString() };

            if (!string.IsNullOrWhiteSpace(metadata))
                item["Metadata"] = new AttributeValue { S = metadata };

            var request = new PutItemRequest
            {
                TableName = TableName,
                Item = item
            };

            await _dynamoClient.PutItemAsync(request);
        }

        public async Task<List<AuditLog>> ObtenerLogs(string? eventType = null, DateTime? desde = null, DateTime? hasta = null)
        {
            QueryRequest? queryRequest = null;
            ScanRequest? scanRequest = null;

            // Si se especifica eventType, usar el GSI para consulta eficiente
            if (!string.IsNullOrWhiteSpace(eventType))
            {
                var keyConditionExpression = "EventType = :eventType";
                var expressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    [":eventType"] = new AttributeValue { S = eventType }
                };

                if (desde.HasValue)
                {
                    keyConditionExpression += " AND #ts >= :desde";
                    expressionAttributeValues[":desde"] = new AttributeValue { N = new DateTimeOffset(desde.Value).ToUnixTimeSeconds().ToString() };
                }

                if (hasta.HasValue && !desde.HasValue)
                {
                    keyConditionExpression += " AND #ts <= :hasta";
                    expressionAttributeValues[":hasta"] = new AttributeValue { N = new DateTimeOffset(hasta.Value).ToUnixTimeSeconds().ToString() };
                }
                else if (hasta.HasValue && desde.HasValue)
                {
                    keyConditionExpression += " AND #ts <= :hasta";
                    expressionAttributeValues[":hasta"] = new AttributeValue { N = new DateTimeOffset(hasta.Value).ToUnixTimeSeconds().ToString() };
                }

                queryRequest = new QueryRequest
                {
                    TableName = TableName,
                    IndexName = IndexName,
                    KeyConditionExpression = keyConditionExpression,
                    ExpressionAttributeNames = new Dictionary<string, string>
                    {
                        ["#ts"] = "Timestamp"
                    },
                    ExpressionAttributeValues = expressionAttributeValues,
                    ScanIndexForward = false // Orden descendente por Timestamp
                };
            }
            else
            {
                // Sin eventType, hacer scan (menos eficiente)
                scanRequest = new ScanRequest
                {
                    TableName = TableName
                };

                if (desde.HasValue || hasta.HasValue)
                {
                    var filterExpression = new List<string>();
                    var expressionAttributeValues = new Dictionary<string, AttributeValue>();
                    var expressionAttributeNames = new Dictionary<string, string>
                    {
                        ["#ts"] = "Timestamp"
                    };

                    if (desde.HasValue)
                    {
                        filterExpression.Add("#ts >= :desde");
                        expressionAttributeValues[":desde"] = new AttributeValue { N = new DateTimeOffset(desde.Value).ToUnixTimeSeconds().ToString() };
                    }

                    if (hasta.HasValue)
                    {
                        filterExpression.Add("#ts <= :hasta");
                        expressionAttributeValues[":hasta"] = new AttributeValue { N = new DateTimeOffset(hasta.Value).ToUnixTimeSeconds().ToString() };
                    }

                    scanRequest.FilterExpression = string.Join(" AND ", filterExpression);
                    scanRequest.ExpressionAttributeNames = expressionAttributeNames;
                    scanRequest.ExpressionAttributeValues = expressionAttributeValues;
                }
            }

            var items = new List<Dictionary<string, AttributeValue>>();

            if (queryRequest != null)
            {
                var response = await _dynamoClient.QueryAsync(queryRequest);
                items.AddRange(response.Items);
            }
            else if (scanRequest != null)
            {
                var response = await _dynamoClient.ScanAsync(scanRequest);
                items.AddRange(response.Items);
            }

            // Convertir items de DynamoDB a AuditLog
            var logs = items.Select(item => new AuditLog
            {
                EventType = item.ContainsKey("EventType") ? item["EventType"].S : string.Empty,
                Timestamp = item.ContainsKey("Timestamp") 
                    ? DateTimeOffset.FromUnixTimeSeconds(long.Parse(item["Timestamp"].N)).DateTime 
                    : DateTime.UtcNow,
                UsuarioId = item.ContainsKey("UsuarioId") ? Guid.Parse(item["UsuarioId"].S) : null,
                VisitanteId = item.ContainsKey("VisitanteId") ? Guid.Parse(item["VisitanteId"].S) : null,
                InvitacionId = item.ContainsKey("InvitacionId") ? Guid.Parse(item["InvitacionId"].S) : null,
                Metadata = item.ContainsKey("Metadata") ? item["Metadata"].S : null
            }).OrderByDescending(a => a.Timestamp).ToList();

            return logs;
        }
    }
}
