using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ProyectoFinal_Grupo6.Api.Funcionalidades.Destinos
{
    [ApiController]
    [Route("api/destinos")]
    [Authorize]
    public class DestinosController : ControllerBase
    {
        private readonly DestinosService _service;

        public DestinosController(DestinosService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> Listar()
        {
            var destinos = await _service.ObtenerDestinos();
            return Ok(destinos.Select(d => new { d.Guid, d.Nombre, d.Descripcion }));
        }

        [HttpPost]
        public async Task<IActionResult> Crear([FromBody] CrearDestinoRequest request)
        {
            var destino = await _service.CrearDestino(request);
            return CreatedAtAction(nameof(Listar), new { d = destino.Guid }, new { destino.Guid, destino.Nombre, destino.Descripcion });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Actualizar(Guid id, [FromBody] CrearDestinoRequest request)
        {
            var destino = await _service.ActualizarDestino(id, request);
            if (destino == null)
                return NotFound(new { mensaje = "Destino no encontrado" });

            return Ok(new { destino.Guid, destino.Nombre, destino.Descripcion });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Eliminar(Guid id)
        {
            var eliminado = await _service.EliminarDestino(id);
            if (!eliminado)
                return NotFound(new { mensaje = "Destino no encontrado" });

            return NoContent();
        }
    }
}
