using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ProyectoFinal_Grupo6.Api.Funcionalidades.Invitaciones
{
    [ApiController]
    [Route("api/invitaciones")]
    [Authorize]
    public class InvitacionesController : ControllerBase
    {
        private readonly InvitacionesService _service;

        public InvitacionesController(InvitacionesService service)
        {
            _service = service;
        }

        [HttpPost]
        public async Task<IActionResult> Crear([FromBody] CrearInvitacionRequest request)
        {
            var usuarioId = ObtenerUsuarioId();
            var invitacion = await _service.CrearInvitacion(request, usuarioId);

            return CreatedAtAction(nameof(ObtenerPorId), new { id = invitacion.Guid }, new
            {
                invitacion.Guid,
                invitacion.Titulo,
                invitacion.Descripcion,
                invitacion.Motivo,
                invitacion.Fecha,
                invitacion.HoraInicio,
                invitacion.HoraFin,
                invitacion.BufferMinutos,
                invitacion.Estado,
                visitantes = invitacion.Visitantes.Select(v => new
                {
                    v.Guid,
                    v.Token,
                    v.EmailVisitante,
                    v.TelefonoVisitante,
                    v.EstadoFormulario,
                    link = $"/registro/{v.Token}"
                })
            });
        }

        [HttpGet]
        public async Task<IActionResult> Listar([FromQuery] DateTime? fecha)
        {
            var usuarioId = ObtenerUsuarioId();
            var invitaciones = await _service.ObtenerInvitaciones(fecha, usuarioId);

            return Ok(invitaciones.Select(i => new
            {
                i.Guid,
                i.Titulo,
                i.Motivo,
                i.Fecha,
                i.HoraInicio,
                i.HoraFin,
                i.Estado,
                usuario = i.Usuario != null ? new { i.Usuario.Nombre, i.Usuario.Apellido } : null,
                destino = i.Destino != null ? new { i.Destino.Nombre } : null,
                cantidadVisitantes = i.Visitantes.Count,
                visitantesCompletados = i.Visitantes.Count(v => v.EstadoFormulario == "Completado")
            }));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> ObtenerPorId(Guid id)
        {
            var invitacion = await _service.ObtenerInvitacionPorId(id);
            if (invitacion == null)
                return NotFound(new { mensaje = "Invitacion no encontrada" });

            return Ok(new
            {
                invitacion.Guid,
                invitacion.Titulo,
                invitacion.Descripcion,
                invitacion.Motivo,
                invitacion.Fecha,
                invitacion.HoraInicio,
                invitacion.HoraFin,
                invitacion.BufferMinutos,
                invitacion.Estado,
                usuario = invitacion.Usuario != null ? new { invitacion.Usuario.Nombre, invitacion.Usuario.Apellido, invitacion.Usuario.Email } : null,
                destino = invitacion.Destino != null ? new { invitacion.Destino.Nombre, invitacion.Destino.Descripcion } : null,
                visitantes = invitacion.Visitantes.Select(v => new
                {
                    v.Guid,
                    v.Token,
                    v.EmailVisitante,
                    v.TelefonoVisitante,
                    v.EstadoFormulario,
                    v.FechaCompletado,
                    v.HikCentralReservationId,
                    link = $"/registro/{v.Token}",
                    visitante = v.Visitante != null ? new { v.Visitante.Nombre, v.Visitante.Apellido } : null
                })
            });
        }

        [HttpPut("{id}/cancelar")]
        public async Task<IActionResult> Cancelar(Guid id)
        {
            var usuarioId = ObtenerUsuarioId();
            var invitacion = await _service.CancelarInvitacion(id, usuarioId);

            if (invitacion == null)
                return NotFound(new { mensaje = "Invitacion no encontrada" });

            return Ok(new { invitacion.Guid, invitacion.Estado });
        }

        [HttpPost("{id}/visitantes")]
        public async Task<IActionResult> AgregarVisitantes(Guid id, [FromBody] List<AgregarVisitanteRequest> visitantes)
        {
            var usuarioId = ObtenerUsuarioId();
            var agregados = await _service.AgregarVisitantes(id, visitantes.Select(v => new VisitanteInvitacionRequest { Email = v.Email, Telefono = v.Telefono }).ToList(), usuarioId);

            if (agregados == null)
                return NotFound(new { mensaje = "Invitacion no encontrada o no se pueden agregar visitantes" });

            return Ok(agregados.Select(v => new
            {
                v.Guid,
                v.Token,
                v.EmailVisitante,
                v.TelefonoVisitante,
                v.EstadoFormulario,
                link = $"/registro/{v.Token}"
            }));
        }

        [HttpPut("{id}/visitantes/{visitanteId}/cancelar")]
        public async Task<IActionResult> CancelarVisitante(Guid id, Guid visitanteId)
        {
            var usuarioId = ObtenerUsuarioId();
            var iv = await _service.CancelarVisitante(id, visitanteId, usuarioId);

            if (iv == null)
                return NotFound(new { mensaje = "Visitante no encontrado" });

            return Ok(new { iv.Guid, iv.EstadoFormulario });
        }

        private Guid ObtenerUsuarioId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return Guid.Parse(claim!.Value);
        }
    }
}
