import { Button } from './Button'

export function ModuleCard({ title, description, onEnter }) {
  return (
    <article className="module-card">
      <h2>{title}</h2>
      <p>{description}</p>
      <Button className="module-button" onClick={onEnter}>
        Ingresar
      </Button>
    </article>
  )
}
