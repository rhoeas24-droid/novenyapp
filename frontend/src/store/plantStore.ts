import { create } from 'zustand';
import { Plant, Group, getPlants, getGroups, getPlantDetail, getCompatiblePlants } from '../api/client';

interface PlantStore {
  // State
  plants: Plant[];
  groups: Group[];
  selectedPlant: Plant | null;
  compatiblePlants: Plant[];
  loading: boolean;
  error: string | null;
  
  // Filters
  searchQuery: string;
  selectedGroup: string | null;
  selectedTerrariumType: 'zart' | 'felzart' | 'nyitott' | null;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedGroup: (group: string | null) => void;
  setSelectedTerrariumType: (type: 'zart' | 'felzart' | 'nyitott' | null) => void;
  
  fetchPlants: () => Promise<void>;
  fetchGroups: () => Promise<void>;
  fetchPlantDetail: (plantName: string) => Promise<void>;
  fetchCompatiblePlants: (plantName: string) => Promise<void>;
  clearSelectedPlant: () => void;
}

export const usePlantStore = create<PlantStore>((set, get) => ({
  // Initial state
  plants: [],
  groups: [],
  selectedPlant: null,
  compatiblePlants: [],
  loading: false,
  error: null,
  searchQuery: '',
  selectedGroup: null,
  selectedTerrariumType: null,

  // Filter actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedGroup: (group) => set({ selectedGroup: group }),
  setSelectedTerrariumType: (type) => set({ selectedTerrariumType: type }),

  // Data fetching
  fetchPlants: async () => {
    const { searchQuery, selectedGroup, selectedTerrariumType } = get();
    set({ loading: true, error: null });
    
    try {
      const data = await getPlants(
        selectedGroup || undefined,
        selectedTerrariumType || undefined,
        searchQuery || undefined
      );
      set({ plants: data.plants, loading: false });
    } catch (error) {
      set({ 
        error: 'Hiba történt az adatok betöltésekor. Próbáld újra később.',
        loading: false 
      });
    }
  },

  fetchGroups: async () => {
    try {
      const groups = await getGroups();
      set({ groups });
    } catch (error) {
      // Groups have fallback, so we don't need to show error
    }
  },

  fetchPlantDetail: async (plantName) => {
    set({ loading: true, error: null });
    try {
      const plant = await getPlantDetail(plantName);
      set({ selectedPlant: plant, loading: false });
    } catch (error) {
      set({ 
        error: 'Hiba történt a növény adatainak betöltésekor.',
        loading: false 
      });
    }
  },

  fetchCompatiblePlants: async (plantName) => {
    const { selectedTerrariumType } = get();
    try {
      const data = await getCompatiblePlants(
        plantName,
        selectedTerrariumType || undefined
      );
      set({ compatiblePlants: data.compatible_plants });
    } catch (error) {
      set({ compatiblePlants: [] });
    }
  },

  clearSelectedPlant: () => set({ selectedPlant: null, compatiblePlants: [] }),
}));
