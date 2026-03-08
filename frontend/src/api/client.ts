import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use the public API URL directly
const API_URL = 'https://terrarium-matcher.preview.emergentagent.com';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 60000, // Increased timeout for large images
});

// Language key for cache
const LANGUAGE_KEY = 'app_language';

// Get current language from storage
const getCurrentLanguage = async (): Promise<string> => {
  try {
    const lang = await AsyncStorage.getItem(LANGUAGE_KEY);
    return lang || 'hu';
  } catch {
    return 'hu';
  }
};

// Cache keys
const CACHE_KEYS = {
  PLANTS: 'cached_plants',
  GROUPS: 'cached_groups',
  PLANT_DETAILS: 'cached_plant_details_',
  LAST_SYNC: 'last_sync_time',
};

// Cache duration (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export interface Plant {
  _id: string;
  name: string;
  common: string;
  group: string;
  family?: string;
  light: string;
  temp?: string;
  humidity: string;
  substrate_notes?: string;
  substrate_base?: string;
  propagation?: string;
  Z: string;
  F: string;
  N: string;
  cites?: string;
  cyprus?: string;
  avoid?: string;
  maintenance?: string;
  role: string;
  diseases?: {
    fungal: Array<{ name: string; symptoms: string; treatment: string }>;
    pests: Array<{ name: string; symptoms: string; treatment: string }>;
    other: Array<{ name: string; symptoms: string; treatment: string }>;
  };
  height_cm?: string;
  spread_cm?: string;
  vessel_min?: number;
  vessel_max?: number;
  growth_rate?: string;
  substrate_group?: string;
  image_base64?: string | null;
  humidity_min?: number;
  humidity_max?: number;
  light_level?: string;
  compatibility_score?: number;
}

export interface Group {
  id: string;
  name: string;
}

// Check if cache is valid
const isCacheValid = async (): Promise<boolean> => {
  try {
    const lastSync = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
    if (!lastSync) return false;
    return Date.now() - parseInt(lastSync) < CACHE_DURATION;
  } catch {
    return false;
  }
};

// Get plants with caching
export const getPlants = async (
  group?: string,
  terrariumType?: string,
  search?: string,
  forceRefresh = false,
  language?: string
): Promise<{ plants: Plant[]; total: number }> => {
  // Get current language
  const lang = language || await getCurrentLanguage();
  const cacheKey = `${CACHE_KEYS.PLANTS}_${lang}`;
  
  // Try cache first if no filters and not forcing refresh
  if (!group && !terrariumType && !search && !forceRefresh) {
    const cacheValid = await isCacheValid();
    if (cacheValid) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
  }

  try {
    const params: Record<string, string> = { lang };
    if (group) params.group = group;
    if (terrariumType) params.terrarium_type = terrariumType;
    if (search) params.search = search;

    const response = await api.get('/plants', { params });
    const data = response.data;

    // Cache if no filters
    if (!group && !terrariumType && !search) {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
    }

    return data;
  } catch (error) {
    // Return cached data on error
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      // Apply client-side filtering
      let plants = data.plants;
      if (group) plants = plants.filter((p: Plant) => p.group === group);
      if (search) {
        const s = search.toLowerCase();
        plants = plants.filter(
          (p: Plant) =>
            p.name.toLowerCase().includes(s) ||
            p.common.toLowerCase().includes(s)
        );
      }
      if (terrariumType) {
        plants = plants.filter((p: Plant) => {
          const field = terrariumType === 'zart' ? 'Z' : terrariumType === 'felzart' ? 'F' : 'N';
          return p[field as keyof Plant] === '✓' || p[field as keyof Plant] === '~';
        });
      }
      return { plants, total: plants.length };
    }
    throw error;
  }
};

// Get plant detail with caching
export const getPlantDetail = async (plantName: string, language?: string): Promise<Plant> => {
  const lang = language || await getCurrentLanguage();
  const cacheKey = `${CACHE_KEYS.PLANT_DETAILS}${plantName}_${lang}`;

  try {
    const response = await api.get(`/plants/${encodeURIComponent(plantName)}`, {
      params: { lang }
    });
    const data = response.data;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
  } catch (error) {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    throw error;
  }
};

// Get compatible plants
export const getCompatiblePlants = async (
  plantName: string,
  terrariumType?: string,
  limit = 20,
  language?: string
): Promise<{ plant: Plant; compatible_plants: Plant[]; total: number }> => {
  const lang = language || await getCurrentLanguage();
  const params: Record<string, string | number> = { limit, lang };
  if (terrariumType) params.terrarium_type = terrariumType;

  const response = await api.get(
    `/plants/${encodeURIComponent(plantName)}/compatible`,
    { params }
  );
  return response.data;
};

// Get substrate-compatible plants
export const getSubstrateCompatiblePlants = async (
  plantName: string,
  terrariumType?: string,
  limit = 30,
  language?: string
): Promise<{ 
  plant: any; 
  compatible_plants: Plant[]; 
  total: number;
  substrate_recipe?: { name: string; recipe: string };
  terrarium_compatibility?: { ideal: string[]; acceptable: string[]; avoid: string[] };
  warnings?: string[];
}> => {
  const lang = language || await getCurrentLanguage();
  const params: Record<string, string | number> = { limit, lang };
  if (terrariumType) params.terrarium_type = terrariumType;

  const response = await api.get(
    `/plants/${encodeURIComponent(plantName)}/substrate-compatible`,
    { params }
  );
  return response.data;
};

// Get groups with caching
export const getGroups = async (language?: string): Promise<Group[]> => {
  const lang = language || await getCurrentLanguage();
  const cacheKey = `${CACHE_KEYS.GROUPS}_${lang}`;
  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) {
    const groups = JSON.parse(cached);
    if (groups.length > 0) {
      // Still try to update in background
      api.get('/groups', { params: { lang } }).then(async (response) => {
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify(response.data.groups)
        );
      }).catch(() => {});
      return groups;
    }
  }

  try {
    const response = await api.get('/groups', { params: { lang } });
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify(response.data.groups)
    );
    return response.data.groups;
  } catch (error) {
    if (cached) {
      return JSON.parse(cached);
    }
    // Return default groups as fallback
    return [
      { id: 'Ferns & Foliage', name: 'Páfrányok és Lombnövények' },
      { id: 'Peperomia & Pilea', name: 'Peperomia és Pilea' },
      { id: 'Aroids & Tropicals', name: 'Aroidok és Trópusi növények' },
      { id: 'Moss & Selaginella', name: 'Mohák és Selaginella' },
      { id: 'Succulents & Cacti', name: 'Pozsgások és Kaktuszok' },
      { id: 'Carnivorous', name: 'Húsevő növények' },
      { id: 'Tillandsia', name: 'Tillandsia (Légynövények)' },
    ];
  }
};

// Clear cache
export const clearCache = async (): Promise<void> => {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((key) => 
    key.startsWith('cached_') || key === 'last_sync_time'
  );
  await AsyncStorage.multiRemove(cacheKeys);
};

export default api;
