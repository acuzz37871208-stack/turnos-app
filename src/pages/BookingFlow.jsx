import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useNegocio } from '../hooks/useNegocio'
import { useBookingStore } from '../store/bookingStore'
import { Button, StepIndicator, Spinner } from '../components/ui'
import StepServicio from './booking/StepServicio'
import StepProfesional from './booking/StepProfesional'
import StepFechaHora from './booking/StepFechaHora'
import StepCliente from './booking/StepCliente'
import StepResumen from './booking/StepResumen'
import StepPago from './booking/StepPago'

const SIN_PROFESIONAL = ['cancha']

export default function BookingFlow() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const { negocio, servicios, profesionales, loading, error } = useNegocio(slug)
  const { servicio, setProfesional, setContextoSlug, setNegocio } = useBookingStore()

  useEffect(() => {
    setContextoSlug(slug)
  }, [setContextoSlug, slug])

  useEffect(() => {
    if (negocio) {
      setNegocio(negocio)
    }
  }, [negocio, setNegocio])

  const usaProfesional = !SIN_PROFESIONAL.includes(negocio?.tipo)
  const requierePago = servicio?.requiere_pago

  const stepsBase = usaProfesional
    ? ['Servicio', 'Profesional', 'Fecha', 'Datos', 'Resumen']
    : ['Servicio', 'Fecha', 'Datos', 'Resumen']

  const stepsConPago = requierePago ? [...stepsBase, 'Pago'] : stepsBase
  const currentStep = Math.min(step, stepsConPago.length - 1)

  const next = () => {
    if (!usaProfesional && step === 0) {
      setProfesional({ id: 'cualquiera', nombre: 'Sin preferencia' })
    }

    setStep((current) => current + 1)
  }

  const back = () => (step === 0 ? navigate(`/${slug}`) : setStep((current) => current - 1))

  const stepComponents = usaProfesional
    ? [
        <StepServicio key="s" servicios={servicios} onNext={next} onBack={back} />,
        <StepProfesional key="p" profesionales={profesionales} servicio={servicio} onNext={next} onBack={back} />,
        <StepFechaHora key="f" negocio={negocio} onNext={next} onBack={back} />,
        <StepCliente key="c" onNext={next} onBack={back} />,
        <StepResumen key="r" negocio={negocio} slug={slug} onNext={requierePago ? next : null} onBack={back} />,
        ...(requierePago ? [<StepPago key="pg" negocio={negocio} slug={slug} onBack={back} />] : []),
      ]
    : [
        <StepServicio key="s" servicios={servicios} onNext={next} onBack={back} />,
        <StepFechaHora key="f" negocio={negocio} onNext={next} onBack={back} />,
        <StepCliente key="c" onNext={next} onBack={back} />,
        <StepResumen key="r" negocio={negocio} slug={slug} onNext={requierePago ? next : null} onBack={back} />,
        ...(requierePago ? [<StepPago key="pg" negocio={negocio} slug={slug} onBack={back} />] : []),
      ]

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !negocio) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 text-center">
          <h1 className="text-xl font-semibold text-white mb-2">No pudimos cargar este negocio</h1>
          <p className="text-sm text-muted mb-6">
            {error || 'La URL puede ser incorrecta o el negocio ya no estar disponible.'}
          </p>
          <Button onClick={() => navigate('/')}>Ir al inicio</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8 max-w-lg mx-auto page-enter">
      <button
        onClick={() => navigate(`/${slug}`)}
        className="text-sm text-muted hover:text-white mb-6 flex items-center gap-1 transition-colors"
      >
        Volver a {negocio.nombre}
      </button>

      <StepIndicator steps={stepsConPago} current={currentStep} />

      <div key={currentStep} className="page-enter">
        {stepComponents[currentStep]}
      </div>
    </div>
  )
}
