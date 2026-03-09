// OFFLINE MODE - All data loaded from bundled JSON
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import the bundled plant data
import plantsData from '../data/plants.json';

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

export interface Plant {
  _id?: string;
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

// Cast imported data to Plant array
const allPlants: Plant[] = plantsData as Plant[];

// Compatibility rules (embedded for offline use)
const SUBSTRATE_COMPATIBILITY: Record<string, string[]> = {
  'foliage': ['foliage', 'moss_both', 'tropical_aroid'],
  'tropical_aroid': ['tropical_aroid', 'foliage', 'moss_both'],
  'moss_both': ['moss_both', 'foliage', 'tropical_aroid', 'sphagnum_acidic'],
  'sphagnum_acidic': ['sphagnum_acidic', 'moss_both', 'carnivorous'],
  'carnivorous': ['carnivorous', 'sphagnum_acidic'],
  'succulent': ['succulent', 'cactus'],
  'cactus': ['cactus', 'succulent'],
  'tillandsia': ['tillandsia', 'epiphyte'],
  'epiphyte': ['epiphyte', 'tillandsia', 'tropical_aroid'],
};

// Check substrate compatibility
const areSubstratesCompatible = (sub1?: string, sub2?: string): boolean => {
  if (!sub1 || !sub2) return true;
  if (sub1 === sub2) return true;
  const compatible = SUBSTRATE_COMPATIBILITY[sub1] || [];
  return compatible.includes(sub2);
};

// Calculate humidity overlap
const calculateHumidityOverlap = (plant1: Plant, plant2: Plant): number => {
  const min1 = plant1.humidity_min || 50;
  const max1 = plant1.humidity_max || 80;
  const min2 = plant2.humidity_min || 50;
  const max2 = plant2.humidity_max || 80;
  
  const overlapStart = Math.max(min1, min2);
  const overlapEnd = Math.min(max1, max2);
  
  if (overlapStart > overlapEnd) return 0;
  
  const overlapRange = overlapEnd - overlapStart;
  const totalRange = Math.max(max1, max2) - Math.min(min1, min2);
  
  return totalRange > 0 ? (overlapRange / totalRange) * 100 : 100;
};

// Calculate compatibility score between two plants
const calculateCompatibilityScore = (basePlant: Plant, candidatePlant: Plant, terrariumType?: string): number => {
  let score = 0;
  
  // Substrate compatibility (40 points)
  if (areSubstratesCompatible(basePlant.substrate_group, candidatePlant.substrate_group)) {
    score += 40;
  } else {
    return 0; // Incompatible substrates = not compatible
  }
  
  // Humidity overlap (30 points)
  const humidityOverlap = calculateHumidityOverlap(basePlant, candidatePlant);
  score += (humidityOverlap / 100) * 30;
  
  // Light level compatibility (20 points)
  if (basePlant.light_level === candidatePlant.light_level) {
    score += 20;
  } else if (
    (basePlant.light_level === 'medium' || candidatePlant.light_level === 'medium')
  ) {
    score += 10;
  }
  
  // Terrarium type compatibility (10 points)
  if (terrariumType) {
    const field = terrariumType === 'zart' ? 'Z' : terrariumType === 'felzart' ? 'F' : 'N';
    const baseCompat = basePlant[field as keyof Plant];
    const candidateCompat = candidatePlant[field as keyof Plant];
    
    if (baseCompat === '✓' && candidateCompat === '✓') {
      score += 10;
    } else if (baseCompat === '✓' && candidateCompat === '~') {
      score += 5;
    } else if (baseCompat === '~' && candidateCompat === '✓') {
      score += 5;
    }
  } else {
    score += 5; // Partial credit if no terrarium type specified
  }
  
  return Math.round(score);
};

// Get plants with filtering (OFFLINE)
export const getPlants = async (
  group?: string,
  terrariumType?: string,
  search?: string,
  _forceRefresh = false,
  _language?: string
): Promise<{ plants: Plant[]; total: number }> => {
  let plants = [...allPlants];
  
  // Apply filters
  if (group) {
    plants = plants.filter((p) => p.group === group);
  }
  
  if (search) {
    const s = search.toLowerCase();
    plants = plants.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.common.toLowerCase().includes(s)
    );
  }
  
  if (terrariumType) {
    const field = terrariumType === 'zart' ? 'Z' : terrariumType === 'felzart' ? 'F' : 'N';
    plants = plants.filter((p) => {
      const value = p[field as keyof Plant];
      return value === '✓' || value === '~';
    });
  }
  
  return { plants, total: plants.length };
};

// Get plant detail (OFFLINE)
export const getPlantDetail = async (plantName: string, _language?: string): Promise<Plant> => {
  const plant = allPlants.find((p) => p.name === plantName);
  if (!plant) {
    throw new Error(`Plant not found: ${plantName}`);
  }
  return plant;
};

// Get compatible plants (OFFLINE)
export const getCompatiblePlants = async (
  plantName: string,
  terrariumType?: string,
  limit = 20,
  _language?: string
): Promise<{ plant: Plant; compatible_plants: Plant[]; total: number }> => {
  const basePlant = allPlants.find((p) => p.name === plantName);
  if (!basePlant) {
    throw new Error(`Plant not found: ${plantName}`);
  }
  
  // Calculate compatibility scores for all other plants
  const scoredPlants = allPlants
    .filter((p) => p.name !== plantName)
    .map((p) => ({
      ...p,
      compatibility_score: calculateCompatibilityScore(basePlant, p, terrariumType),
    }))
    .filter((p) => p.compatibility_score > 0)
    .sort((a, b) => (b.compatibility_score || 0) - (a.compatibility_score || 0))
    .slice(0, limit);
  
  return {
    plant: basePlant,
    compatible_plants: scoredPlants,
    total: scoredPlants.length,
  };
};

// Get substrate-compatible plants (OFFLINE)
export const getSubstrateCompatiblePlants = async (
  plantName: string,
  terrariumType?: string,
  limit = 30,
  _language?: string
): Promise<{
  plant: Plant;
  compatible_plants: Plant[];
  total: number;
  substrate_recipe?: { name: string; recipe: string };
  terrarium_compatibility?: { ideal: string[]; acceptable: string[]; avoid: string[] };
  warnings?: string[];
}> => {
  const basePlant = allPlants.find((p) => p.name === plantName);
  if (!basePlant) {
    throw new Error(`Plant not found: ${plantName}`);
  }
  
  // Get compatible plants
  const result = await getCompatiblePlants(plantName, terrariumType, limit);
  
  // Add substrate recipe based on plant type
  const substrateRecipes: Record<string, { name: string; recipe: string }> = {
    'foliage': {
      name: 'Trópusi lombozat mix',
      recipe: '40% tőzeg, 30% perlit, 20% kókuszrost, 10% faszén',
    },
    'tropical_aroid': {
      name: 'Aroid mix',
      recipe: '30% kéreg, 30% perlit, 20% tőzeg, 10% faszén, 10% sphagnum',
    },
    'moss_both': {
      name: 'Moha mix',
      recipe: '50% sphagnum, 30% tőzeg, 20% perlit',
    },
    'sphagnum_acidic': {
      name: 'Savas sphagnum mix',
      recipe: '70% sphagnum, 20% tőzeg, 10% perlit (pH 4-5)',
    },
    'carnivorous': {
      name: 'Húsevő mix',
      recipe: '50% sphagnum, 50% perlit (tiszta, tápanyagmentes!)',
    },
    'succulent': {
      name: 'Pozsgás mix',
      recipe: '50% homok, 30% perlit, 20% föld',
    },
    'cactus': {
      name: 'Kaktusz mix',
      recipe: '60% homok, 25% perlit, 15% föld',
    },
    'tillandsia': {
      name: 'Léggyökeres (nincs szubsztrát)',
      recipe: 'Rögzítés fára vagy kőre, rendszeres permetezés',
    },
    'epiphyte': {
      name: 'Epifita mix',
      recipe: '60% kéreg, 20% sphagnum, 20% perlit',
    },
  };
  
  const recipe = substrateRecipes[basePlant.substrate_group || 'foliage'];
  
  // Generate warnings
  const warnings: string[] = [];
  const incompatibleFound = result.compatible_plants.filter(
    (p) => (p.compatibility_score || 0) < 50
  );
  if (incompatibleFound.length > 0) {
    warnings.push('Néhány növény csak részben kompatibilis - figyelj a páratartalomra!');
  }
  
  return {
    plant: basePlant,
    compatible_plants: result.compatible_plants,
    total: result.total,
    substrate_recipe: recipe,
    warnings,
  };
};

// Get groups (OFFLINE)
export const getGroups = async (_language?: string): Promise<Group[]> => {
  // Extract unique groups from plants
  const groupSet = new Set(allPlants.map((p) => p.group));
  
  const groupNames: Record<string, string> = {
    'Ferns & Foliage': 'Páfrányok és Lombnövények',
    'Peperomia & Pilea': 'Peperomia és Pilea',
    'Aroids & Tropicals': 'Aroidok és Trópusi növények',
    'Moss & Selaginella': 'Mohák és Selaginella',
    'Succulents & Cacti': 'Pozsgások és Kaktuszok',
    'Carnivorous': 'Húsevő növények',
    'Tillandsia': 'Tillandsia (Légynövények)',
  };
  
  return Array.from(groupSet).map((id) => ({
    id,
    name: groupNames[id] || id,
  }));
};

// Clear cache (no-op in offline mode, kept for compatibility)
export const clearCache = async (): Promise<void> => {
  // Nothing to clear in offline mode
};
