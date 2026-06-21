using System.ComponentModel;

namespace ProyectoFinal_Grupo6.Api.Dominio.Enums
{
    public enum EventTypeEnum
    {
        [Description("Invitacion Creada")]
        INVITATION_CREATED,

        [Description("Formulario Completado")]
        FORM_COMPLETED,

        [Description("Reserva Creada")]
        RESERVATION_CREATED,

        [Description("Invitacion Expirada")]
        INVITATION_EXPIRED,

        [Description("Invitacion Cancelada")]
        INVITATION_CANCELLED,

        [Description("Visitante Cancelado")]
        VISITOR_CANCELLED
    }
}
