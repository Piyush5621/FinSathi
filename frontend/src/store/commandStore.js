import { create } from 'zustand';

export const useCommandStore = create((set) => ({
  isOpen: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (open) => set({ isOpen: open }),
  commands: [],
  registerCommand: (command) => set((state) => {
    // Prevent duplicate command registration by ID
    if (state.commands.some(c => c.id === command.id)) return state;
    return { commands: [...state.commands, command] };
  }),
  deregisterCommand: (id) => set((state) => ({
    commands: state.commands.filter(c => c.id !== id)
  })),
}));
