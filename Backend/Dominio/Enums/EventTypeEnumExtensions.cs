using System.ComponentModel;
using System.Reflection;

namespace ProyectoFinal_Grupo6.Api.Dominio.Enums
{
    public static class EventTypeEnumExtensions
    {
        // Devuelve la descripcion en espanol del enum (atributo [Description]).
        // Si el string no corresponde a un valor del enum, retorna el mismo string.
        public static string ObtenerDescripcion(string? eventType)
        {
            if (string.IsNullOrWhiteSpace(eventType))
                return string.Empty;

            if (!Enum.TryParse<EventTypeEnum>(eventType, out var value))
                return eventType;

            return value.ObtenerDescripcion();
        }

        public static string ObtenerDescripcion(this EventTypeEnum value)
        {
            var field = value.GetType().GetField(value.ToString());
            var attr = field?.GetCustomAttribute<DescriptionAttribute>();
            return attr?.Description ?? value.ToString();
        }
    }
}
