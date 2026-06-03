// ── Button ──────────────────────────────────────────────
export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-accent text-white px-5 py-2.5 hover:bg-opacity-90',
    ghost:   'border border-border text-muted px-5 py-2.5 hover:border-accent hover:text-white',
    danger:  'bg-accent2 bg-opacity-10 text-accent2 border border-accent2 border-opacity-30 px-5 py-2.5 hover:bg-opacity-20',
    success: 'bg-accent3 bg-opacity-10 text-accent3 border border-accent3 border-opacity-30 px-5 py-2.5 hover:bg-opacity-20',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

// ── Input ──────────────────────────────────────────────
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-muted font-medium">{label}</label>}
      <input
        className={`w-full bg-surface border ${error ? 'border-accent2' : 'border-border'} rounded-lg px-4 py-3 text-sm text-white placeholder-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150 ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-accent2">{error}</span>}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────
export function Card({ children, className = '', onClick, selected }) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface border rounded-xl p-5 transition-all duration-150
        ${onClick ? 'cursor-pointer' : ''}
        ${selected ? 'border-accent ring-1 ring-accent' : 'border-border hover:border-muted'}
        ${className}`}
    >
      {children}
    </div>
  )
}

// ── Badge ──────────────────────────────────────────────
const badgeColors = {
  pendiente:      'bg-yellow-500 bg-opacity-15 text-yellow-400',
  pendiente_pago: 'bg-blue-500 bg-opacity-15 text-blue-300',
  confirmado:     'bg-accent bg-opacity-15 text-accent',
  atendido:       'bg-accent3 bg-opacity-15 text-accent3',
  cancelado:      'bg-accent2 bg-opacity-15 text-accent2',
}

const badgeLabels = {
  pendiente:      'pendiente',
  pendiente_pago: 'pago pendiente',
  confirmado:     'confirmado',
  atendido:       'realizado',
  cancelado:      'cancelado',
}

export function Badge({ estado }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wide ${badgeColors[estado] || 'bg-border text-muted'}`}>
      {badgeLabels[estado] || estado}
    </span>
  )
}

// ── Spinner ──────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div className={`${s[size]} border-2 border-border border-t-accent rounded-full animate-spin`} />
  )
}

// ── LoadingScreen ─────────────────────────────────────
export function LoadingScreen({ title = 'Cargando', description = 'Preparando la información...' }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-surface border border-border rounded-xl px-6 py-8 w-full max-w-sm flex flex-col items-center gap-4 text-center">
        <Spinner size="lg" />
        <div>
          <p className="text-white font-medium">{title}</p>
          <p className="text-sm text-muted mt-1">{description}</p>
        </div>
      </div>
    </div>
  )
}

// ── LoadingBlock ─────────────────────────────────────
export function LoadingBlock({ title = 'Cargando', description = 'Preparando la información...' }) {
  return (
    <div className="bg-surface border border-border rounded-xl px-5 py-10 flex flex-col items-center gap-3 text-center">
      <Spinner size="lg" />
      <div>
        <p className="text-white font-medium">{title}</p>
        <p className="text-sm text-muted mt-1">{description}</p>
      </div>
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────
export function Alert({ tone = 'danger', title, children, className = '' }) {
  const tones = {
    danger: 'bg-accent2 bg-opacity-10 border-accent2 border-opacity-30 text-accent2',
    warning: 'bg-yellow-400 bg-opacity-10 border-yellow-400 border-opacity-30 text-yellow-400',
    info: 'bg-accent bg-opacity-10 border-accent border-opacity-30 text-accent',
    success: 'bg-accent3 bg-opacity-10 border-accent3 border-opacity-30 text-accent3',
  }

  return (
    <div className={`border rounded-xl px-4 py-3 ${tones[tone]} ${className}`}>
      {title && <p className="text-sm font-medium mb-1">{title}</p>}
      {children && <p className="text-sm leading-relaxed">{children}</p>}
    </div>
  )
}

// ── PageLayout ──────────────────────────────────────────────
export function PageLayout({ children, maxWidth = 'max-w-lg' }) {
  return (
    <div className={`min-h-screen bg-bg px-4 py-8 ${maxWidth} mx-auto page-enter`}>
      {children}
    </div>
  )
}

// ── StepIndicator ──────────────────────────────────────────────
export function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-1 flex-1">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-mono transition-all
            ${i < current ? 'bg-accent3 bg-opacity-20 text-accent3' : i === current ? 'bg-accent text-white' : 'bg-surface border border-border text-muted'}`}>
            {i < current ? '✓' : i + 1}
          </div>
          <span className={`text-xs hidden sm:block ${i === current ? 'text-white' : 'text-muted'}`}>{step}</span>
          {i < steps.length - 1 && <div className={`flex-1 h-px ${i < current ? 'bg-accent3 bg-opacity-40' : 'bg-border'}`} />}
        </div>
      ))}
    </div>
  )
}

// ── EmptyState ──────────────────────────────────────────────
export function EmptyState({ icon = 'i', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-bg text-sm font-mono text-accent">
        {icon}
      </span>
      <p className="text-white font-medium">{title}</p>
      {description && <p className="text-sm text-muted max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
