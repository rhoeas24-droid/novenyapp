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
  'foliage': ['foliage'],
  'carnivorous': ['carnivorous'],
  'succulent': ['succulent', 'cactus'],
  'cactus': ['cactus', 'succulent'],
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
// Helper: categorize plant light level
const getLightCategory = (light: string): string => {
  const l = light.toLowerCase();
  if (l.startsWith('low')) return 'low';
  if (l.startsWith('indirect') || l.startsWith('indirect')) return 'medium';
  return 'high'; // bright indirect, bright-direct, etc.
};

// Helper: get optimal temp range from temp string like "18–30°C (opt. 20–26°C)"
const getOptimalTemp = (temp: string): { min: number; max: number } | null => {
  const m = temp.match(/opt\.\s*(\d+)[–-](\d+)/);
  if (m) return { min: parseInt(m[1]), max: parseInt(m[2]) };
  return null;
};

export const getPlants = async (
  group?: string,
  terrariumType?: string,
  search?: string,
  _forceRefresh = false,
  _language?: string,
  lightPref?: string,
  tempPref?: string
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

  // Light preference filter
  if (lightPref && lightPref !== 'any') {
    plants = plants.filter((p) => {
      const cat = getLightCategory(p.light || '');
      return cat === lightPref;
    });
  }

  // Temperature preference filter
  if (tempPref && tempPref !== 'any') {
    plants = plants.filter((p) => {
      const opt = getOptimalTemp(p.temp || '');
      if (!opt) return true; // keep if no data
      if (tempPref === 'cool') return opt.max <= 22; // opt range ends at or below 22
      if (tempPref === 'room') return opt.min >= 15 && opt.max <= 26; // standard room
      if (tempPref === 'warm') return opt.min >= 20; // warm-loving
      return true;
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
      recipe: '2 rész kókusztőzeg, 1 rész homok, 1 rész semleges kertészeti tőzeg, 1 rész fenyőkéreg, ¾ rész aquasoil, ¾ rész gilisztahumusz, ½ rész aktív szén. Zárt/félzárt terráriumba ugróvillásokat (Collembola) is adj hozzá penészmegelőzésként.',
    },
    'carnivorous': {
      name: 'Húsevő mix',
      recipe: '50% savas kertészeti tőzeg, 50% szilika homok vagy perlit (drénezés és levegőztetés). Felső réteg: élő sphagnum szőnyeg a szubsztrát takarására. Ugróvillásokat (Collembola) adj hozzá penészmegelőzésként.',
    },
    'succulent': {
      name: 'Pozsgás mix',
      recipe: '30% horzsakő, 25% lávaőrlemény, 20% perlit, 15% durva homok, 5% gilisztahumusz, 5% semleges kertészeti tőzeg vagy kókusz',
    },
    'cactus': {
      name: 'Kaktusz mix',
      recipe: '35% horzsakő, 30% lávaőrlemény, 20% homok, 10% perlit, 5% gilisztahumusz',
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
