import { create } from 'zustand'

let nextId = 1

export const useToastStore = create((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, ...toast }] })) // keep at most 4 on screen
    setTimeout(() => get().dismiss(id), toast.duration ?? 5000)
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))