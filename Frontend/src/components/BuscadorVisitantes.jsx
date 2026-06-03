import { useState, useRef, useEffect } from 'react'
import { obtenerVisitantes } from '../services/api'

export function BuscadorVisitantes({ onSelect, excludeEmails = [] }) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (value) => {
    setBusqueda(value)
    setShowResults(true)
    if (!value.trim()) {
      setResultados([])
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setBuscando(true)
      obtenerVisitantes(value).then((data) => {
        setResultados(data || [])
        setBuscando(false)
      })
    }, 300)
  }

  const handleSelect = (visitante) => {
    onSelect(visitante)
    setBusqueda('')
    setResultados([])
    setShowResults(false)
  }

  const excluded = excludeEmails.map((e) => e.toLowerCase())

  return (
    <div ref={searchRef} style={{ position: 'relative', marginBottom: 12 }}>
      <label className="field">
        <span>Buscar visitante existente</span>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (resultados.length > 0) setShowResults(true) }}
          placeholder="Buscar por nombre, email o documento..."
        />
      </label>
      {showResults && (resultados.length > 0 || buscando) && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
          background: 'white', border: '1px solid rgba(20,31,56,0.16)', borderRadius: 8,
          maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          {buscando ? (
            <div style={{ padding: '10px 14px', color: '#888' }}>Buscando...</div>
          ) : resultados.map((v) => {
            const alreadyAdded = excluded.includes(v.email.toLowerCase())
            return (
              <div
                key={v.guid}
                onClick={() => !alreadyAdded && handleSelect(v)}
                style={{
                  padding: '10px 14px', cursor: alreadyAdded ? 'default' : 'pointer',
                  borderBottom: '1px solid rgba(20,31,56,0.06)',
                  opacity: alreadyAdded ? 0.5 : 1,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
                onMouseEnter={(e) => { if (!alreadyAdded) e.currentTarget.style.background = 'rgba(20,31,56,0.04)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <div>
                  <strong>{v.nombre} {v.apellido}</strong>
                  <span style={{ marginLeft: 8, color: '#666' }}>{v.email}</span>
                </div>
                {alreadyAdded && <span style={{ fontSize: '0.8rem', color: '#888' }}>Ya agregado</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
