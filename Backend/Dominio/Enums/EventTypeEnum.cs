using System.ComponentModel;

namespace ProyectoFinal_Grupo6.Api.Dominio.Enums
{
    public enum EventTypeEnum
    {
        [Description("Invitación Creada")]
        INVITATION_CREATED,

        [Description("Formulario Completado")]
        FORM_COMPLETED,

        [Description("Reserva Creada")]
        RESERVATION_CREATED,

        [Description("Invitación Expirada")]
        INVITATION_EXPIRED,

        [Description("Invitación Cancelada")]
        INVITATION_CANCELLED
    }
}
