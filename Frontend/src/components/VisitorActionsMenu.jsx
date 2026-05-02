import { RowActionsMenu } from './RowActionsMenu'

function noop() {}

export function VisitorActionsMenu({
  visitorName,
  onInvite = noop,
  onEdit = noop,
  onDelete = noop,
}) {
  return (
    <RowActionsMenu
      label={`Acciones para ${visitorName}`}
      actions={[
        { label: 'Invitar', onClick: onInvite },
        { label: 'Modificar', onClick: onEdit },
        { label: 'Eliminar', onClick: onDelete, danger: true },
      ]}
    />
  )
}
