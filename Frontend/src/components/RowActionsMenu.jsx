import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function RowActionsMenu({ label, actions }) {
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })

  const updateMenuPosition = () => {
    const trigger = triggerRef.current
    if (!trigger) return

    setAnchorRect(trigger.getBoundingClientRect())
  }

  useLayoutEffect(() => {
    if (!isOpen || !anchorRect) return

    const dropdown = dropdownRef.current
    if (!dropdown) return

    const viewportPadding = 8
    const menuWidth = dropdown.offsetWidth
    const menuHeight = dropdown.offsetHeight

    let nextLeft = anchorRect.right - menuWidth
    let nextTop = anchorRect.bottom + 8

    const maxLeft = window.innerWidth - menuWidth - viewportPadding
    if (nextLeft > maxLeft) nextLeft = maxLeft
    if (nextLeft < viewportPadding) nextLeft = viewportPadding

    const maxTop = window.innerHeight - menuHeight - viewportPadding
    if (nextTop > maxTop) {
      nextTop = anchorRect.top - menuHeight - 8
    }
    if (nextTop < viewportPadding) nextTop = viewportPadding

    setMenuPosition({ top: nextTop, left: nextLeft })
  }, [isOpen, anchorRect, actions.length])

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      const root = rootRef.current
      if (!root || root.contains(event.target)) return
      setIsOpen(false)
    }

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      setIsOpen(false)
    }

    const handleScrollOrResize = () => {
      setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [isOpen])

  const handleAction = (onClick) => {
    onClick()
    setIsOpen(false)
  }

  const handleToggle = () => {
    if (!isOpen) updateMenuPosition()
    setIsOpen((current) => {
      const next = !current
      if (!next) setAnchorRect(null)
      return next
    })
  }

  return (
    <div className="visitor-actions-menu" ref={rootRef}>
      <button
        type="button"
        className="visitor-actions-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={handleToggle}
        ref={triggerRef}
      >
        ...
      </button>

      {isOpen
        ? createPortal(
          <div
            ref={dropdownRef}
            className="visitor-actions-dropdown"
            role="menu"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
          >
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={`visitor-action-item${action.danger ? ' danger' : ''}`}
                role="menuitem"
                onClick={() => handleAction(action.onClick)}
              >
                {action.label}
              </button>
            ))}
          </div>,
          document.body
        )
        : null}
    </div>
  )
}