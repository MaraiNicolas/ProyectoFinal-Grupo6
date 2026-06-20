using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProyectoFinal_Grupo6.Api.Compartidos.Paginacion;

namespace ProyectoFinal_Grupo6.Api.Funcionalidades.Visitantes
{
    [ApiController]
    [Route("api/visitantes")]
    [Authorize]
    public class VisitantesController : ControllerBase
    {
        private readonly VisitantesService _service;

        public VisitantesController(VisitantesService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> Listar([FromQuery] string? search, [FromQuery] PaginacionParams paginacion)
        {
            var resultado = await _service.ObtenerVisitantes(search, paginacion);

            return Ok(new
            {
                resultado.Total,
                resultado.Pagina,
                resultado.Tamano,
                resultado.TotalPaginas,
                items = resultado.Items.Select(v => new
                {
                    v.Guid,
                    v.Nombre,
                    v.Apellido,
                    v.Email,
                    v.Telefono,
                    v.TipoDocumento,
                    v.NumeroDocumento
                })
            });
        }
    }
}
