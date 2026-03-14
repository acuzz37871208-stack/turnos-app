import { create } from 'zustand'

export const useBookingStore = create((set) => ({
  // El negocio al que se le reserva
  negocio: null,
  setNegocio: (negocio) => set({ negocio }),

  // Paso a paso del booking
  servicio: null,
  profesional: null,
  fecha: null,
  hora: null,
  cliente: { nombre: '', telefono: '', email: '', nota: '' },

  setServicio:     (servicio)    => set({ servicio, profesional: null, fecha: null, hora: null }),
  setProfesional:  (profesional) => set({ profesional, fecha: null, hora: null }),
  setFecha:        (fecha)       => set({ fecha, hora: null }),
  setHora:         (hora)        => set({ hora }),
  setCliente:      (cliente)     => set((s) => ({ cliente: { ...s.cliente, ...cliente } })),

  // Turno confirmado
  turnoConfirmado: null,
  setTurnoConfirmado: (turno) => set({ turnoConfirmado: turno }),

  // Reset
  resetBooking: () => set({
    servicio: null, profesional: null,
    fecha: null, hora: null,
    cliente: { nombre: '', telefono: '', email: '', nota: '' },
    turnoConfirmado: null,
  }),
}))
