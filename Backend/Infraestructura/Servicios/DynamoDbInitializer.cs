using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;

namespace ProyectoFinal_Grupo6.Api.Infraestructura.Servicios
{
    public static class DynamoDbInitializer
    {
        public static async Task EnsureAuditLogsTableAsync(IAmazonDynamoDB client)
        {
            const string tableName = "AuditLogs";

            var existingTables = await client.ListTablesAsync();
            if (existingTables.TableNames.Contains(tableName))
                return;

            var request = new CreateTableRequest
            {
                TableName = tableName,
                AttributeDefinitions = new List<AttributeDefinition>
                {
                    new AttributeDefinition { AttributeName = "Guid", AttributeType = "S" },
                    new AttributeDefinition { AttributeName = "EventType", AttributeType = "S" },
                    new AttributeDefinition { AttributeName = "Timestamp", AttributeType = "N" }
                },
                KeySchema = new List<KeySchemaElement>
                {
                    new KeySchemaElement { AttributeName = "Guid", KeyType = "HASH" }
                },
                GlobalSecondaryIndexes = new List<GlobalSecondaryIndex>
                {
                    new GlobalSecondaryIndex
                    {
                        IndexName = "EventType-Timestamp-index",
                        KeySchema = new List<KeySchemaElement>
                        {
                            new KeySchemaElement { AttributeName = "EventType", KeyType = "HASH" },
                            new KeySchemaElement { AttributeName = "Timestamp", KeyType = "RANGE" }
                        },
                        Projection = new Projection { ProjectionType = "ALL" },
                        ProvisionedThroughput = new ProvisionedThroughput(5, 5)
                    }
                },
                ProvisionedThroughput = new ProvisionedThroughput(5, 5)
            };

            await client.CreateTableAsync(request);

            // Esperar hasta que la tabla esté activa (opcional en Local)
            await WaitForTableActiveAsync(client, tableName);
        }

        private static async Task WaitForTableActiveAsync(IAmazonDynamoDB client, string tableName)
        {
            for (int i = 0; i < 10; i++)
            {
                var resp = await client.DescribeTableAsync(new DescribeTableRequest { TableName = tableName });
                if (resp.Table.TableStatus == TableStatus.ACTIVE)
                    return;
                await Task.Delay(500);
            }
        }
    }
}
