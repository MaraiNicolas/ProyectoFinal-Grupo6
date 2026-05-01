import { useState } from 'react'
import './App.css'
import { useAuth } from './hooks/useAuth'
import { Navbar } from './components/Navbar'
import { Sidenav } from './components/Sidenav'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { VisitantesPage } from './pages/VisitantesPage'

function App() {
  const auth = useAuth()
  const [activeView, setActiveView] = useState('home')
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)

  const handleNavigate = (view) => {
    setActiveView(view)
    if (view === 'home') setIsSidebarExpanded(false)
  }

  const handleLogout = () => {
    auth.handleLogout()
    setActiveView('home')
    setIsSidebarExpanded(false)
  }

  if (!auth.isLoggedIn) {
    return <LoginPage auth={auth} />
  }

  const renderPage = () => {
    if (activeView === 'visitantes') return <VisitantesPage />
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
    </main>
  )
}

export default App
