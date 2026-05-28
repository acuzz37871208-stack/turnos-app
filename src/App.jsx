import { useAuth } from './context/useAuth'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing        from './pages/Landing'
import BookingFlow    from './pages/onboarding/BookingFlow'
import Confirmacion   from './pages/Confirmacion'
import MisTurnos      from './pages/MisTurnos'
import AdminLogin     from './pages/admin/Login'
import Dashboard      from './pages/admin/Dashboard'
import Configuracion  from './pages/admin/Configuracion'
import Onboarding     from './pages/onboarding/Onboarding'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { LoadingScreen } from './components/ui'

export default function App() {
  const { loading } = useAuth()

  if (loading) return <LoadingScreen title="Cargando Turnos" description="Estamos preparando tu sesión." />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/:slug"               element={<Landing />} />
        <Route path="/:slug/reservar"      element={<BookingFlow />} />
        <Route path="/:slug/confirmacion"  element={<Confirmacion />} />
        <Route path="/:slug/mis-turnos"    element={<MisTurnos />} />
        <Route path="/admin/login"         element={<AdminLogin />} />
        <Route path="/admin"               element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/configuracion" element={<ProtectedRoute><Configuracion /></ProtectedRoute>} />
        <Route path="/onboarding"          element={<Onboarding />} />
        <Route path="/"                    element={<Navigate to="/onboarding" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
