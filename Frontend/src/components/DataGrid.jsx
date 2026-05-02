import { RowActionsMenu } from './RowActionsMenu'

export function DataGrid({
  columns,
  rows,
  rowKey,
  actions,
  emptyMessage = 'Sin resultados.',
}) {
  return (
    <>
      <table className="visitors-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            {actions ? <th>Acciones</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[rowKey]}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
              {actions ? (
                <td className="visitor-actions-cell">
                  <RowActionsMenu
                    label={`Acciones para ${row[rowKey]}`}
                    actions={actions(row)}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 ? <p className="empty-state">{emptyMessage}</p> : null}
    </>
  )
}