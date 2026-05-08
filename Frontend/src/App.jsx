import { useEffect, useState } from 'react'
import './App.css'
import { useAuth } from './hooks/useAuth'
import { Navbar } from './components/Navbar'
import { Sidenav } from './components/Sidenav'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { VisitantesPage } from './pages/VisitantesPage'
import { NuevoVisitantePage } from './pages/NuevoVisitantePage'
import { visitors as initialVisitors } from './data/visitors'
import { scheduledVisits } from './data/scheduledVisits'
import { VisitasProgramadasPage } from './pages/VisitasProgramadasPage'

function App() {
  const auth = useAuth()
  const [activeView, setActiveView] = useState('home')
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [visitors, setVisitors] = useState(initialVisitors)
  const [visitorToEditId, setVisitorToEditId] = useState(null)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const visitorToEdit = visitors.find((visitor) => visitor.id === visitorToEditId) ?? null

  useEffect(() => {
    if (!snackbarMessage) return undefined

    const timeoutId = setTimeout(() => {
      setSnackbarMessage('')
    }, 2800)

    return () => clearTimeout(timeoutId)
  }, [snackbarMessage])

  const handleNavigate = (view) => {
    setActiveView(view)
    if (view === 'home') setIsSidebarExpanded(false)
  }

  const handleLogout = () => {
    auth.handleLogout()
    setActiveView('home')
    setIsSidebarExpanded(false)
  }

  const handleCreateVisitor = (newVisitorData) => {
    setVisitors((current) => {
      const nextId = current.length > 0
        ? Math.max(...current.map((visitor) => visitor.id)) + 1
        : 1

      return [
        ...current,
        {
          id: nextId,
          ...newVisitorData,
        },
      ]
    })

    setActiveView('visitantes')
    setSnackbarMessage('Creado exitosamente.')
  }

  const handleStartEditVisitor = (visitorId) => {
    setVisitorToEditId(visitorId)
    setActiveView('editar-visitante')
  }

  const handleUpdateVisitor = (updatedVisitorData) => {
    if (!visitorToEditId) return

    setVisitors((current) => current.map((visitor) => (
      visitor.id === visitorToEditId
        ? { ...visitor, ...updatedVisitorData }
        : visitor
    )))

    setVisitorToEditId(null)
    setActiveView('visitantes')
    setSnackbarMessage('Modificado exitosamente.')
  }

  const handleDeleteVisitor = (visitorId) => {
    setVisitors((current) => current.filter((visitor) => visitor.id !== visitorId))
    if (visitorToEditId === visitorId) setVisitorToEditId(null)
    setSnackbarMessage('Eliminado exitosamente.')
  }

  if (!auth.isLoggedIn) {
    return <LoginPage auth={auth} />
  }

  const renderPage = () => {
    if (activeView === 'visitantes') {
      return (
        <VisitantesPage
          visitors={visitors}
          onCreateVisitor={() => handleNavigate('nuevo-visitante')}
          onEditVisitor={handleStartEditVisitor}
          onDeleteVisitor={handleDeleteVisitor}
        />
      )
    }

    if (activeView === 'nuevo-visitante') {
      return (
        <NuevoVisitantePage
          onSave={handleCreateVisitor}
          onCancel={() => handleNavigate('visitantes')}
        />
      )
    }

    if (activeView === 'editar-visitante' && visitorToEdit) {
      return (
        <NuevoVisitantePage
          key={`edit-${visitorToEdit.id}`}
          initialData={visitorToEdit}
          title="Modificar visitante"
          submitLabel="Guardar cambios"
          onSave={handleUpdateVisitor}
          onCancel={() => {
            setVisitorToEditId(null)
            handleNavigate('visitantes')
          }}
        />
      )
    }

    if (activeView === 'editar-visitante' && !visitorToEdit) {
      return (
        <VisitantesPage
          visitors={visitors}
          onCreateVisitor={() => handleNavigate('nuevo-visitante')}
          onEditVisitor={handleStartEditVisitor}
          onDeleteVisitor={handleDeleteVisitor}
        />
      )
    }

    if (activeView === 'scheduled visits') {
      return <VisitasProgramadasPage scheduledVisits={scheduledVisits} />
    }

    return <DashboardPage onNavigate={handleNavigate} />
  }

  return (
    <main className="app-shell">
      <Navbar userName={auth.userName} onLogout={handleLogout} />

      {activeView !== 'home' ? (
        <Sidenav
          activeView={activeView}
          onNavigate={handleNavigate}
          isExpanded={isSidebarExpanded}
          onToggle={() => setIsSidebarExpanded((current) => !current)}
        />
      ) : null}

      <div className="main-panel">
        {renderPage()}
      </div>

      {snackbarMessage ? (
        <div className="app-snackbar" role="status" aria-live="polite">
          {snackbarMessage}
        </div>
      ) : null}
    </main>
  )
}

export default App
