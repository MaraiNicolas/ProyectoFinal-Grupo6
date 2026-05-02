import { useEffect, useRef } from 'react'

export function RowActionsMenu({ label, actions }) {
  const menuRef = useRef(null)

  useEffect(() => {
    const handlePointerDown = (event) => {
      const menu = menuRef.current
      if (!menu || !menu.open || menu.contains(event.target)) return
      menu.removeAttribute('open')
    }

    const handleKeyDown = (event) => {
      const menu = menuRef.current
      if (event.key !== 'Escape' || !menu || !menu.open) return
      menu.removeAttribute('open')
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleAction = (onClick, event) => {
    onClick()
    const details = event.currentTarget.closest('details')
    if (details) details.removeAttribute('open')
  }

  return (
    <details className="visitor-actions-menu" ref={menuRef}>
      <summary className="visitor-actions-trigger" aria-label={label}>
        ...
      </summary>

      <div className="visitor-actions-dropdown" role="menu">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`visitor-action-item${action.danger ? ' danger' : ''}`}
            role="menuitem"
            onClick={(event) => handleAction(action.onClick, event)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </details>
  )
}