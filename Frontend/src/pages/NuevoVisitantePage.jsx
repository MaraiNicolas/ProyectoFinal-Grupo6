import { useState } from 'react'

export function NuevoVisitantePage({ onSave, onCancel }) {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    mail: '',
    dni: '',
  })

  const handleChange = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    onSave({
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      mail: formData.mail.trim(),
      dni: formData.dni.trim(),
    })
  }

  return (
    <section className="dashboard-content">
      <div className="dashboard-copy">
        <h1>Nuevo visitante</h1>
      </div>

      <section className="table-panel visitor-form-panel">
        <form className="visitor-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Nombre</span>
            <input
              type="text"
              placeholder="Nombre"
              value={formData.nombre}
              onChange={(event) => handleChange('nombre', event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Apellido</span>
            <input
              type="text"
              placeholder="Apellido"
              value={formData.apellido}
              onChange={(event) => handleChange('apellido', event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Mail</span>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={formData.mail}
              onChange={(event) => handleChange('mail', event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>DNI</span>
            <input
              type="text"
              placeholder="DNI"
              value={formData.dni}
              onChange={(event) => handleChange('dni', event.target.value)}
              required
            />
          </label>

          <div className="visitor-form-actions">
            <button type="button" className="secondary-action-button" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="primary-action-button">
              Guardar
            </button>
          </div>
        </form>
      </section>
    </section>
  )
}
