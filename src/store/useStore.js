import { create } from 'zustand';

// Decoupled, Atomic Zustand store primarily aimed at driving high-performance
// visual updates for the 3D Canvas without forcing global React Context re-renders.

export const useStore = create((set, get) => ({
  // The global source of truth for raw pipe geometries
  dataTable: [],

  // Proposals emitted from the SmartFixer
  proposals: [],

  // Highlighting/Interaction state for the canvas
  selectedElementId: null,
  hoveredElementId: null,

  // Sync function to mirror AppContext if required,
  // or act as the standalone state manager.
  setDataTable: (table) => set({ dataTable: table }),

  setProposals: (proposals) => set({ proposals }),

  // Interaction handlers
  setSelected: (id) => set({ selectedElementId: id }),
  setHovered: (id) => set({ hoveredElementId: id }),

  // A helper method that safely retrieves pipes only
  getPipes: () => get().dataTable.filter(r => (r.type || "").toUpperCase() === 'PIPE'),

  // A helper method that safely retrieves immutable components
  getImmutables: () => get().dataTable.filter(r => ['FLANGE', 'BEND', 'TEE', 'VALVE'].includes((r.type || "").toUpperCase())),
}));
