export function ModuleCard({ title, description, onEnter }) {
  return (
    <article className="module-card">
      <h2>{title}</h2>
      <p>{description}</p>
      <button type="button" className="module-button" onClick={onEnter}>
        Ingresar
      </button>
    </article>
  )
}
