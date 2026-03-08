// Simple in-memory cache for plant data to handle navigation issues
import { Plant } from './client';

interface CachedPlantData {
  plant: Plant;
  compatiblePlants: Plant[];
  timestamp: number;
}

// Cache keyed by plant name
const plantCache: Map<string, CachedPlantData> = new Map();

// Cache expiry time (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

export const getFromCache = (plantName: string): CachedPlantData | null => {
  const cached = plantCache.get(plantName);
  if (!cached) return null;
  
  // Check if cache is still valid
  if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
    plantCache.delete(plantName);
    return null;
  }
  
  return cached;
};

export const setToCache = (plantName: string, plant: Plant, compatiblePlants: Plant[]): void => {
  plantCache.set(plantName, {
    plant,
    compatiblePlants,
    timestamp: Date.now(),
  });
};

export const clearPlantCache = (): void => {
  plantCache.clear();
};
