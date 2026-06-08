import './Button.css'

/**
 * Button reutilizable
 *
 * @param {'brand'|'primary'|'secondary'|'danger'} variant  Estilo visual  (default: 'brand')
 * @param {'sm'|'md'|'lg'}                          size     Tamaño         (default: 'md')
 * @param {'button'|'submit'|'reset'}               type     Tipo HTML      (default: 'button')
 * @param {boolean}                                 fullWidth Ancho completo (default: false)
 * @param {boolean}                                 disabled
 * @param {Function}                                onClick
 * @param {string}                                  className Clases extra
 * @param {object}                                  style     Estilos inline extra
 */
export function Button({
  children,
  variant = 'brand',
  size = 'md',
  type = 'button',
  fullWidth = false,
  disabled = false,
  onClick,
  className = '',
  style,
  ...rest
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={classes}
      style={style}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  )
}
