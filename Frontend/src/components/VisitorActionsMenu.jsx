import { useEffect, useRef } from 'react'

function noop() {}

export function VisitorActionsMenu({
  visitorName,
  onInvite = noop,
  onEdit = noop,
  onDelete = noop,
}) {
  const menuRef = useRef(null)

  useEffect(() => {
    const handlePointerDown = (event) => {
      const menu = menuRef.current
      if (!menu) return
      if (!menu.open) return
      if (menu.contains(event.target)) return
      menu.removeAttribute('open')
    }

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      const menu = menuRef.current
      if (!menu) return
      if (!menu.open) return
      menu.removeAttribute('open')
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleAction = (callback, event) => {
    callback()
    const details = event.currentTarget.closest('details')
    if (details) details.removeAttribute('open')
  }

  return (
    <details className="visitor-actions-menu" ref={menuRef}>
      <summary
        className="visitor-actions-trigger"
        aria-label={`Acciones para ${visitorName}`}
      >
        ...
      </summary>

      <div className="visitor-actions-dropdown" role="menu">
        <button
          type="button"
          className="visitor-action-item"
          role="menuitem"
          onClick={(event) => handleAction(onInvite, event)}
        >
          Invitar
        </button>

        <button
          type="button"
          className="visitor-action-item"
          role="menuitem"
          onClick={(event) => handleAction(onEdit, event)}
        >
          Modificar
        </button>

        <button
          type="button"
          className="visitor-action-item danger"
          role="menuitem"
          onClick={(event) => handleAction(onDelete, event)}
        >
          Eliminar
        </button>
      </div>
    </details>
  )
}
