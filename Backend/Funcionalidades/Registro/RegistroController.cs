using Microsoft.AspNetCore.Mvc;

namespace ProyectoFinal_Grupo6.Api.Funcionalidades.Registro
{
    [ApiController]
    [Route("api/registro")]
    public class RegistroController : ControllerBase
    {
        private readonly RegistroService _service;

        public RegistroController(RegistroService service)
        {
            _service = service;
        }

        [HttpGet("{token}")]
        public async Task<IActionResult> Obtener(string token)
        {
            var resultado = await _service.ObtenerRegistro(token);
            return Ok(resultado);
        }

        [HttpPost("{token}")]
        public async Task<IActionResult> Completar(string token, [FromBody] CompletarRegistroRequest request)
        {
            var resultado = await _service.CompletarRegistro(token, request);

            if (resultado == null)
                return NotFound(new { mensaje = "Token invalido" });

            if (resultado.Estado == "Cancelada" || resultado.Estado == "Expirada" || resultado.Estado == "Error")
                return BadRequest(resultado);

            return Ok(resultado);
        }
    }
}
