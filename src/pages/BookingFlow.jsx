import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useNegocio } from '../hooks/useNegocio'
import { useBookingStore } from '../store/bookingStore'
import { StepIndicator, Spinner } from '../components/ui'
import StepServicio from './booking/StepServicio'
import StepProfesional from './booking/StepProfesional'
import StepFechaHora from './booking/StepFechaHora'
import StepCliente from './booking/StepCliente'
import StepResumen from './booking/StepResumen'
import StepPago from './booking/StepPago'

const STEPS = ['Servicio', 'Profesional', 'Fecha', 'Datos', 'Resumen']

export default function BookingFlow() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const { negocio, servicios, profesionales, loading } = useNegocio(slug)
  const { servicio, profesional } = useBookingStore()

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  const next = () => setStep(s => s + 1)
  const back = () => step === 0 ? navigate(`/${slug}`) : setStep(s => s - 1)

  // Si el servicio requiere pago, hay un paso extra
  const requierePago = servicio?.requiere_pago

  const stepsConPago = requierePago ? [...STEPS, 'Pago'] : STEPS

  const stepComponents = [
    <StepServicio  key="s" servicios={servicios} onNext={next} onBack={back} />,
    <StepProfesional key="p" profesionales={profesionales} servicio={servicio} onNext={next} onBack={back} />,
    <StepFechaHora key="f" negocio={negocio} onNext={next} onBack={back} />,
    <StepCliente   key="c" onNext={next} onBack={back} />,
    <StepResumen   key="r" negocio={negocio} slug={slug}
                    onNext={requierePago ? next : null}
                    onBack={back} />,
    ...(requierePago ? [<StepPago key="pg" negocio={negocio} slug={slug} onBack={back} />] : []),
  ]

  return (
    <div className="min-h-screen bg-bg px-4 py-8 max-w-lg mx-auto page-enter">
      {/* Nav del negocio */}
      <button onClick={() => navigate(`/${slug}`)} className="text-sm text-muted hover:text-white mb-6 flex items-center gap-1 transition-colors">
        ← {negocio?.nombre}
      </button>

      <StepIndicator steps={stepsConPago} current={step} />

      <div key={step} className="page-enter">
        {stepComponents[step]}
      </div>
    </div>
  )
}
