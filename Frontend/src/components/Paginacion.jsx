import './Paginacion.css'

/**
 * Controles de paginacion reutilizables.
 *
 * @param {number}   pagina        Pagina actual (1-based)
 * @param {number}   totalPaginas  Total de paginas
 * @param {number}   total         Total de registros
 * @param {number}   tamano        Registros por pagina
 * @param {Function} onCambiarPagina  Callback (nuevaPagina: number) => void
 */
export function Paginacion({ pagina, totalPaginas, total, tamano, onCambiarPagina }) {
  const desde = (pagina - 1) * tamano + 1
  const hasta = Math.min(pagina * tamano, total)

  return (
    <div className="paginacion">
      <span className="paginacion-info">
        {desde}&ndash;{hasta} de {total}
      </span>

      <div className="paginacion-controles">
        <button
          className="paginacion-btn"
          onClick={() => onCambiarPagina(1)}
          disabled={pagina === 1}
          aria-label="Primera pagina"
        >
          &laquo;
        </button>
        <button
          className="paginacion-btn"
          onClick={() => onCambiarPagina(pagina - 1)}
          disabled={pagina === 1}
          aria-label="Pagina anterior"
        >
          &lsaquo;
        </button>

        <span className="paginacion-pagina">
          {pagina} / {totalPaginas}
        </span>

        <button
          className="paginacion-btn"
          onClick={() => onCambiarPagina(pagina + 1)}
          disabled={pagina === totalPaginas}
          aria-label="Pagina siguiente"
        >
          &rsaquo;
        </button>
        <button
          className="paginacion-btn"
          onClick={() => onCambiarPagina(totalPaginas)}
          disabled={pagina === totalPaginas}
          aria-label="Ultima pagina"
        >
          &raquo;
        </button>
      </div>
    </div>
  )
}
