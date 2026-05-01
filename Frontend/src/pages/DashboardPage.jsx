import { modules } from '../data/modules'
import { ModuleCard } from '../components/ModuleCard'

export function DashboardPage({ onNavigate }) {
  return (
    <section className="dashboard-content">
      <div className="dashboard-copy">
        <span className="dashboard-badge">Dashboard</span>
        <h1>Modulos del sistema</h1>
        <p>Selecciona el modulo que queres administrar.</p>
      </div>

      <div className="cards-grid">
        {modules.map((module) => (
          <ModuleCard
            key={module.title}
            title={module.title}
            description={module.description}
            onEnter={() => onNavigate(module.title.toLowerCase())}
          />
        ))}
      </div>
    </section>
  )
}
