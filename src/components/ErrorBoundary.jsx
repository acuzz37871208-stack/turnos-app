import React from 'react'
import { Button } from './ui'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Pantalla recuperada por ErrorBoundary', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface px-6 py-8 text-center">
          <p className="text-white font-semibold">No pudimos abrir esta pantalla</p>
          <p className="mt-2 text-sm text-muted">
            Recargá la página. Si vuelve a pasar, revisá que el negocio tenga servicios, recursos y horarios cargados.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => window.history.back()} className="text-sm px-3 py-2">
              Volver
            </Button>
            <Button type="button" onClick={() => window.location.reload()} className="text-sm px-3 py-2">
              Recargar
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
