import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const initialState = {
  contextoSlug: null,
  negocio: null,
  servicio: null,
  profesional: null,
  fecha: null,
  hora: null,
  cliente: { nombre: '', telefono: '', email: '', nota: '' },
  turnoConfirmado: null,
}

export const useBookingStore = create(
  persist(
    (set) => ({
      ...initialState,

      setContextoSlug: (contextoSlug) => set((state) => {
        if (!contextoSlug || state.contextoSlug === contextoSlug) {
          return { contextoSlug }
        }

        return {
          ...initialState,
          contextoSlug,
        }
      }),

      setNegocio: (negocio) => set({ negocio }),
      setServicio: (servicio) => set({ servicio, profesional: null, fecha: null, hora: null, turnoConfirmado: null }),
      setProfesional: (profesional) => set({ profesional, fecha: null, hora: null, turnoConfirmado: null }),
      setFecha: (fecha) => set({ fecha, hora: null, turnoConfirmado: null }),
      setHora: (hora) => set({ hora, turnoConfirmado: null }),
      setCliente: (cliente) => set((state) => ({
        cliente: { ...state.cliente, ...cliente },
        turnoConfirmado: null,
      })),

      setTurnoConfirmado: (turno) => set({ turnoConfirmado: turno }),

      resetBooking: () => set((state) => ({
        ...initialState,
        contextoSlug: state.contextoSlug,
      })),
    }),
    {
      name: 'turnos-booking',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        contextoSlug: state.contextoSlug,
        negocio: state.negocio,
        servicio: state.servicio,
        profesional: state.profesional,
        fecha: state.fecha,
        hora: state.hora,
        cliente: state.cliente,
        turnoConfirmado: state.turnoConfirmado,
      }),
    }
  )
)
