import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useLanguage } from '../src/i18n/LanguageContext';
import { Plant, getPlants, getSubstrateCompatiblePlants } from '../src/api/client';

// Container types
const CONTAINER_SHAPES = [
  { id: 'cylinder', icon: 'flask-outline', labelKey: 'cylinder' },
  { id: 'bottle', icon: 'wine-outline', labelKey: 'bottle' },
  { id: 'sphere', icon: 'globe-outline', labelKey: 'sphere' },
  { id: 'cube', icon: 'cube-outline', labelKey: 'cube' },
];

// Opening size - affects what physically fits + air circulation intensity
const CONTAINER_OPENINGS = [
  { id: 'narrow', icon: 'remove-outline', labelKey: 'narrowMouth' },
  { id: 'medium', icon: 'contract-outline', labelKey: 'mediumMouth' },
  { id: 'wide', icon: 'resize-outline', labelKey: 'wideMouth' },
];

// Terrarium type - SEPARATE choice (is there a lid?)
const TERRARIUM_TYPES = [
  { id: 'zart', icon: 'lock-closed-outline', labelKey: 'closed', color: '#2E7D32' },
  { id: 'felzart', icon: 'lock-open-outline', labelKey: 'semiClosed', color: '#689F38' },
  { id: 'nyitott', icon: 'sunny-outline', labelKey: 'open', color: '#AFB42B' },
];

const CONTAINER_SIZES = [
  { id: 'small', labelKey: 'small', liters: '1-3L', maxPlants: 3 },
  { id: 'medium', labelKey: 'medium', liters: '3-10L', maxPlants: 5 },
  { id: 'large', labelKey: 'large', liters: '10L+', maxPlants: 8 },
];

type BuilderStep = 'container' | 'firstPlant' | 'addPlants' | 'summary';

interface ContainerConfig {
  shape: string | null;
  opening: string | null;
  size: string | null;
  terrariumType: string | null;
}

export default function TerrariumBuilderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  
  const [step, setStep] = useState<BuilderStep>('container');
  const [container, setContainer] = useState<ContainerConfig>({
    shape: null,
    opening: null,
    size: null,
    terrariumType: null,
  });
  const [selectedPlants, setSelectedPlants] = useState<Plant[]>([]);
  const [availablePlants, setAvailablePlants] = useState<Plant[]>([]);
  const [compatiblePlants, setCompatiblePlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(false);
  const [substrateRecipe, setSubstrateRecipe] = useState<{ name: string; recipe: string } | null>(null);
  const [terrariumWarnings, setTerrariumWarnings] = useState<string[]>([]);

  // Get terrarium type from container selection
  const getTerrariumType = useCallback(() => {
    return container.terrariumType || 'felzart';
  }, [container.terrariumType]);

  // Get max plants based on size
  const getMaxPlants = useCallback(() => {
    const size = CONTAINER_SIZES.find(s => s.id === container.size);
    return size?.maxPlants || 5;
  }, [container.size]);

  // Load plants for first selection - filtered by terrarium type (OFFLINE)
  const loadPlantsForFirstSelection = useCallback(async () => {
    setLoading(true);
    try {
      const terrariumType = getTerrariumType();
      // Get plants that are suitable for the selected terrarium type
      // OFFLINE: Images are already included in plant data
      const result = await getPlants(undefined, terrariumType);
      setAvailablePlants(result.plants);
    } catch (error) {
      console.error('Error loading plants:', error);
    } finally {
      setLoading(false);
    }
  }, [getTerrariumType]);

  // Load compatible plants after first plant is selected (substrate-based) - OFFLINE
  const loadCompatiblePlants = useCallback(async (basePlant: Plant) => {
    setLoading(true);
    try {
      const terrariumType = getTerrariumType();
      const result = await getSubstrateCompatiblePlants(basePlant.name, terrariumType, 50);
      
      // Store warnings and recipe
      setTerrariumWarnings(result.warnings || []);
      setSubstrateRecipe(result.substrate_recipe || null);
      
      // OFFLINE: Images are already included, just filter out selected plants
      const filteredPlants = result.compatible_plants
        .filter(p => !selectedPlants.some(sp => sp.name === p.name));
      
      setCompatiblePlants(filteredPlants);
    } catch (error) {
      console.error('Error loading compatible plants:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPlants, getTerrariumType]);

  // Handle container selection complete
  const handleContainerComplete = useCallback(() => {
    if (container.shape && container.opening && container.size && container.terrariumType) {
      loadPlantsForFirstSelection();
      setStep('firstPlant');
    }
  }, [container, loadPlantsForFirstSelection]);

  // Handle first plant selection
  const handleFirstPlantSelect = useCallback((plant: Plant) => {
    setSelectedPlants([plant]);
    loadCompatiblePlants(plant);
    setStep('addPlants');
  }, [loadCompatiblePlants]);

  // Track whether user confirmed adding beyond soft limit
  const [confirmedExtraPlants, setConfirmedExtraPlants] = useState(false);

  // Handle adding more plants
  const handleAddPlant = useCallback((plant: Plant) => {
    const maxPlants = getMaxPlants();
    const hardMax = maxPlants + 4; // absolute max beyond soft limit
    if (selectedPlants.length < hardMax) {
      setSelectedPlants(prev => [...prev, plant]);
      setCompatiblePlants(prev => prev.filter(p => p.name !== plant.name));
    }
  }, [getMaxPlants, selectedPlants.length]);

  // Handle removing a plant
  const handleRemovePlant = useCallback((plant: Plant) => {
    if (selectedPlants.length > 1) {
      setSelectedPlants(prev => prev.filter(p => p.name !== plant.name));
      // Add back to compatible if not the first plant
      if (plant.name !== selectedPlants[0].name) {
        setCompatiblePlants(prev => [...prev, plant]);
      }
    }
  }, [selectedPlants]);

  // Helper: parse "60–80% RH" → { min: 60, max: 80 }
  const parseHumidityRange = (h: string): { min: number; max: number } | null => {
    const m = h.match(/(\d+)[–\-](\d+)%/);
    if (m) return { min: parseInt(m[1]), max: parseInt(m[2]) };
    return null;
  };

  // Helper: parse light string to a numeric level + hours
  const parseLightLevel = (light: string): { level: number; label: string; minH: number; maxH: number } => {
    const lower = light.toLowerCase();
    let level = 2; // default medium
    let label = 'Indirect';
    if (lower.startsWith('low')) { level = 1; label = 'Low-indirect'; }
    else if (lower.startsWith('indirect–bright') || lower.startsWith('indirect–bright')) { level = 3; label = 'Indirect-bright'; }
    else if (lower.startsWith('indirect')) { level = 2; label = 'Indirect'; }
    else if (lower.startsWith('bright indirect–direct') || lower.startsWith('bright indirect–direct')) { level = 4; label = 'Bright indirect-direct'; }
    else if (lower.startsWith('bright indirect') || lower.startsWith('bright indirect')) { level = 3; label = 'Bright indirect'; }
    else if (lower.startsWith('bright–direct') || lower.startsWith('bright–direct')) { level = 5; label = 'Bright-direct'; }
    const hm = light.match(/(\d+)[–\-](\d+)\s*h/);
    const minH = hm ? parseInt(hm[1]) : 4;
    const maxH = hm ? parseInt(hm[2]) : 6;
    return { level, label, minH, maxH };
  };

  // Calculate unified terrarium profile
  const calculateSummary = useCallback(() => {
    if (selectedPlants.length === 0) return null;

    // --- Terrarium type: use what the user already selected ---
    const userType = container.terrariumType || 'felzart';

    // --- Unified humidity: intersection of all plants ---
    let humMin = 0;
    let humMax = 100;
    selectedPlants.forEach(p => {
      const range = parseHumidityRange(p.humidity || '');
      if (range) {
        humMin = Math.max(humMin, range.min);
        humMax = Math.min(humMax, range.max);
      }
    });
    // If no valid intersection (shouldn't happen if compatibility filter works), fallback
    if (humMin > humMax) { humMin = 60; humMax = 80; }

    // --- Unified light: the narrowest common range ---
    let lightLevelMin = 1;
    let lightLevelMax = 5;
    let lightHoursMin = 2;
    let lightHoursMax = 10;
    selectedPlants.forEach(p => {
      const parsed = parseLightLevel(p.light || '');
      lightLevelMin = Math.max(lightLevelMin, parsed.level);
      lightLevelMax = Math.min(lightLevelMax, parsed.level); // not useful for range, we use max of mins
      lightHoursMin = Math.max(lightHoursMin, parsed.minH);
      lightHoursMax = Math.min(lightHoursMax, parsed.maxH);
    });
    if (lightHoursMin > lightHoursMax) lightHoursMax = lightHoursMin + 1;
    // Build a human-readable light recommendation
    const lightLabels = ['', 'Low-indirect', 'Indirect', 'Bright indirect', 'Bright indirect-direct', 'Bright-direct'];
    const unifiedLightLabel = lightLabels[Math.min(lightLevelMin, 5)] || 'Indirect';

    // --- Watering note based on terrarium type ---
    let wateringNote = '';
    if (userType === 'zart') {
      wateringNote = 'wateringClosed'; // translation key
    } else if (userType === 'felzart') {
      wateringNote = 'wateringSemiClosed';
    } else {
      wateringNote = 'wateringOpen';
    }

    // --- Care tips: per-plant ---
    const perPlantCare: Array<{ name: string; tips: string }> = [];
    selectedPlants.forEach(p => {
      if (p.maintenance && p.maintenance !== '—') {
        perPlantCare.push({ name: p.name, tips: p.maintenance });
      }
    });

    // --- Potential issues: per-plant ---
    const perPlantIssues: Array<{ name: string; issues: string[] }> = [];
    selectedPlants.forEach(p => {
      const issues: string[] = [];
      if (p.diseases) {
        if (p.diseases.fungal) p.diseases.fungal.forEach(d => issues.push(d.name));
        if (p.diseases.pests) p.diseases.pests.forEach(d => issues.push(d.name));
        if (p.diseases.other) p.diseases.other.forEach(d => issues.push(d.name));
      }
      if (issues.length > 0) {
        perPlantIssues.push({ name: p.name, issues });
      }
    });

    // --- Check for any plant that significantly deviates ---
    const warnings: string[] = [...terrariumWarnings];
    selectedPlants.forEach(p => {
      const range = parseHumidityRange(p.humidity || '');
      if (range) {
        // If this plant's ideal range barely overlaps with the unified range
        const overlap = Math.min(range.max, humMax) - Math.max(range.min, humMin);
        const plantRange = range.max - range.min;
        if (plantRange > 0 && overlap < plantRange * 0.3) {
          warnings.push(`⚠ ${p.name}: ${p.humidity}`);
        }
      }
    });

    // --- Overcrowding warning based on container size ---
    const sizeConfig = CONTAINER_SIZES.find(s => s.id === container.size);
    const softMax = sizeConfig?.maxPlants || 5;
    if (selectedPlants.length > softMax) {
      // Count mosses - they take minimal space
      const mossCount = selectedPlants.filter(p => 
        p.substrate_group === 'moss_both' || p.substrate_group === 'sphagnum_acidic' || 
        p.group === 'Moss & Selaginella'
      ).length;
      const nonMossCount = selectedPlants.length - mossCount;
      // Only warn if non-moss plants exceed the soft limit
      if (nonMossCount > softMax) {
        warnings.push(t('overcrowdingWarning') || `A terrárium zsúfolt lehet (${selectedPlants.length} növény a javasolt ${softMax} helyett). A mohák kevés helyet foglalnak, de a nagyobb növényeknek több tér kell.`);
      }
    }

    return {
      terrariumType: userType,
      humidityMin: humMin,
      humidityMax: humMax,
      unifiedLight: `${unifiedLightLabel}, ${lightHoursMin}–${lightHoursMax} h`,
      wateringNote,
      perPlantCare,
      perPlantIssues,
      warnings,
    };
  }, [selectedPlants, container.terrariumType, terrariumWarnings]);

  // Render container selection step
  const renderContainerStep = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>{t('selectContainer')}</Text>
      
      {/* Shape Selection */}
      <Text style={styles.sectionLabel}>{t('shape')}</Text>
      <View style={styles.optionRow}>
        {CONTAINER_SHAPES.map(shape => (
          <TouchableOpacity
            key={shape.id}
            style={[
              styles.optionButton,
              container.shape === shape.id && styles.optionButtonSelected,
            ]}
            onPress={() => setContainer(prev => ({ ...prev, shape: shape.id }))}
          >
            <Ionicons
              name={shape.icon as any}
              size={32}
              color={container.shape === shape.id ? '#fff' : '#388E3C'}
            />
            <Text style={[
              styles.optionLabel,
              container.shape === shape.id && styles.optionLabelSelected,
            ]}>
              {t(shape.labelKey as any)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Opening Selection */}
      <Text style={styles.sectionLabel}>{t('opening')}</Text>
      <View style={styles.optionRow}>
        {CONTAINER_OPENINGS.map(opening => (
          <TouchableOpacity
            key={opening.id}
            style={[
              styles.optionButton,
              container.opening === opening.id && styles.optionButtonSelected,
            ]}
            onPress={() => setContainer(prev => ({ ...prev, opening: opening.id }))}
          >
            <Ionicons
              name={opening.icon as any}
              size={32}
              color={container.opening === opening.id ? '#fff' : '#388E3C'}
            />
            <Text style={[
              styles.optionLabel,
              container.opening === opening.id && styles.optionLabelSelected,
            ]}>
              {t(opening.labelKey as any)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Size Selection */}
      <Text style={styles.sectionLabel}>{t('size')}</Text>
      <View style={styles.optionRow}>
        {CONTAINER_SIZES.map(size => (
          <TouchableOpacity
            key={size.id}
            style={[
              styles.optionButton,
              container.size === size.id && styles.optionButtonSelected,
            ]}
            onPress={() => setContainer(prev => ({ ...prev, size: size.id }))}
          >
            <Text style={[
              styles.sizeText,
              container.size === size.id && styles.optionLabelSelected,
            ]}>
              {size.liters}
            </Text>
            <Text style={[
              styles.optionLabel,
              container.size === size.id && styles.optionLabelSelected,
            ]}>
              {t(size.labelKey as any)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Terrarium Type Selection */}
      <Text style={styles.sectionLabel}>{t('terrariumType')}</Text>
      <View style={styles.optionRow}>
        {TERRARIUM_TYPES.map(type => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.optionButton,
              container.terrariumType === type.id && { backgroundColor: type.color, borderColor: type.color },
            ]}
            onPress={() => setContainer(prev => ({ ...prev, terrariumType: type.id }))}
          >
            <Ionicons
              name={type.icon as any}
              size={32}
              color={container.terrariumType === type.id ? '#fff' : type.color}
            />
            <Text style={[
              styles.optionLabel,
              container.terrariumType === type.id && styles.optionLabelSelected,
            ]}>
              {t(type.labelKey as any)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        style={[
          styles.continueButton,
          (!container.shape || !container.opening || !container.size || !container.terrariumType) && styles.continueButtonDisabled,
        ]}
        onPress={handleContainerComplete}
        disabled={!container.shape || !container.opening || !container.size || !container.terrariumType}
      >
        <Text style={styles.continueButtonText}>{t('continue')}</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  // Render plant selection grid
  const renderPlantGrid = (plants: Plant[], onSelect: (plant: Plant) => void, showScore = false) => (
    <View style={styles.plantGrid}>
      {plants.map(plant => (
        <TouchableOpacity
          key={plant.name}
          style={styles.plantCard}
          onPress={() => onSelect(plant)}
        >
          {plant.image_base64 ? (
            <Image
              source={{ uri: plant.image_base64 }}
              style={styles.plantImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.plantImage, styles.plantImagePlaceholder]}>
              <Ionicons name="leaf" size={30} color="#81C784" />
            </View>
          )}
          <View style={styles.plantInfo}>
            <Text style={styles.plantName} numberOfLines={1}>{plant.name}</Text>
            <Text style={styles.plantCommon} numberOfLines={1}>{plant.common}</Text>
            {showScore && plant.compatibility_score && (
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreText}>{plant.compatibility_score}%</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render first plant selection step
  const renderFirstPlantStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('selectFirstPlant')}</Text>
      <Text style={styles.stepSubtitle}>{t('firstPlantHint')}</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#388E3C" style={styles.loader} />
      ) : (
        <ScrollView style={styles.plantScrollView} showsVerticalScrollIndicator={false}>
          {renderPlantGrid(availablePlants, handleFirstPlantSelect)}
        </ScrollView>
      )}
    </View>
  );

  // Render add plants step
  const renderAddPlantsStep = () => {
    const softMax = getMaxPlants();
    const hardMax = softMax + 4;
    const atSoftLimit = selectedPlants.length >= softMax && !confirmedExtraPlants;
    const canAddMore = selectedPlants.length < hardMax && (selectedPlants.length < softMax || confirmedExtraPlants);

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>{t('addMorePlants')}</Text>
        <Text style={styles.stepSubtitle}>
          {selectedPlants.length} {t('plantsSelected')}
        </Text>

        {/* Selected Plants */}
        <View style={styles.selectedPlantsContainer}>
          <Text style={styles.sectionLabel}>{t('selectedPlants')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedPlants.map((plant, index) => (
              <View key={plant.name} style={styles.selectedPlantChip}>
                <Text style={styles.selectedPlantName} numberOfLines={1}>
                  {index === 0 && '⭐ '}{plant.name}
                </Text>
                {index > 0 && (
                  <TouchableOpacity onPress={() => handleRemovePlant(plant)}>
                    <Ionicons name="close-circle" size={20} color="#E57373" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Soft limit reached — ask if they want more */}
        {atSoftLimit && (
          <View style={[styles.summarySection, { marginBottom: 16 }]}>
            <Text style={{ fontSize: 15, color: '#333', marginBottom: 12 }}>
              {t('softLimitReached') || `${softMax} növény kiválasztva. Szeretnél még hozzáadni?`}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[styles.continueButton, { flex: 1, paddingVertical: 12 }]}
                onPress={() => setConfirmedExtraPlants(true)}
              >
                <Text style={styles.continueButtonText}>{t('yesAddMore') || 'Igen, adj hozzá'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.continueButton, { flex: 1, paddingVertical: 12 }]}
                onPress={() => setStep('summary')}
              >
                <Text style={styles.continueButtonText}>{t('noGoToSummary') || 'Nem, összesítő'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Compatible Plants */}
        {canAddMore && (
          <>
            <Text style={styles.sectionLabel}>{t('compatiblePlants')}</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#388E3C" style={styles.loader} />
            ) : (
              <ScrollView style={styles.plantScrollView} showsVerticalScrollIndicator={false}>
                {renderPlantGrid(compatiblePlants, handleAddPlant, true)}
              </ScrollView>
            )}
          </>
        )}

        {/* Continue to Summary */}
        {!atSoftLimit && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => setStep('summary')}
          >
            <Text style={styles.continueButtonText}>{t('viewSummary')}</Text>
            <Ionicons name="document-text" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // --- Save terrarium to AsyncStorage ---
  const saveTerrarium = useCallback(async () => {
    const summary = calculateSummary();
    if (!summary) {
      console.error('Save: calculateSummary returned null');
      return;
    }

    const terrarium = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      container,
      // Save plant data WITHOUT image_base64 to keep AsyncStorage small
      plants: selectedPlants.map(p => ({
        name: p.name,
        common: p.common,
        family: p.family,
        light: p.light,
        temp: p.temp,
        humidity: p.humidity,
        maintenance: p.maintenance,
        diseases: p.diseases,
        substrate_group: p.substrate_group,
        group: p.group,
        role: p.role,
        propagation: p.propagation,
        avoid: p.avoid,
        cyprus: p.cyprus,
        height_cm: p.height_cm,
        spread_cm: p.spread_cm,
        // image_base64 intentionally excluded — too large for AsyncStorage
        // images are loaded from the bundled plant data when needed
      })),
      summary: {
        terrariumType: summary.terrariumType,
        humidityMin: summary.humidityMin,
        humidityMax: summary.humidityMax,
        unifiedLight: summary.unifiedLight,
        wateringNote: summary.wateringNote,
      },
      substrateRecipe,
    };

    try {
      const existing = await AsyncStorage.getItem('saved_terrariums');
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(terrarium);
      await AsyncStorage.setItem('saved_terrariums', JSON.stringify(list));
      Alert.alert(
        t('saved') || 'Mentve',
        t('terrariumSaved') || 'A terrárium elmentve a Terráriumaim listába.',
      );
    } catch (e) {
      console.error('Save error:', e);
      Alert.alert('Hiba', 'Nem sikerült menteni. Próbáld újra.');
    }
  }, [calculateSummary, container, selectedPlants, substrateRecipe, t]);

  // --- Helper: generate full HTML plant profile ---
  const plantProfileHtml = (p: Plant): string => {
    const imgTag = p.image_base64
      ? `<img src="${p.image_base64}" style="width:120px;height:120px;border-radius:12px;object-fit:cover;float:left;margin-right:16px;margin-bottom:8px;" />`
      : '';
    
    const diseasesHtml = (() => {
      if (!p.diseases) return '';
      const all = [
        ...(p.diseases.fungal || []),
        ...(p.diseases.pests || []),
        ...(p.diseases.other || []),
      ];
      if (all.length === 0) return '';
      return `<table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <tr style="background:#FFEBEE;"><th style="text-align:left;padding:4px 8px;font-size:12px;">Betegség/Kártevő</th><th style="text-align:left;padding:4px 8px;font-size:12px;">Tünetek</th><th style="text-align:left;padding:4px 8px;font-size:12px;">Kezelés</th></tr>
        ${all.map(d => `<tr style="border-bottom:1px solid #eee;">
          <td style="padding:4px 8px;font-size:11px;font-weight:600;color:#C62828;">${d.name}</td>
          <td style="padding:4px 8px;font-size:11px;">${d.symptoms}</td>
          <td style="padding:4px 8px;font-size:11px;">${d.treatment}</td>
        </tr>`).join('')}
      </table>`;
    })();

    const row = (label: string, value: string | undefined) => 
      value && value !== '—' ? `<tr><td style="padding:3px 8px;font-size:12px;color:#666;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:3px 8px;font-size:12px;">${value}</td></tr>` : '';

    return `
      <div style="page-break-inside:avoid;border:1px solid #E0E0E0;border-radius:12px;padding:16px;margin-bottom:16px;">
        ${imgTag}
        <h3 style="color:#1B5E20;margin:0 0 2px 0;font-size:16px;">${p.name}</h3>
        <p style="color:#666;margin:0 0 8px 0;font-size:12px;">${p.common || ''} ${p.family ? `· ${p.family}` : ''}</p>
        <div style="clear:both;"></div>
        <table style="width:100%;">
          ${row('☀️ Fény', p.light)}
          ${row('🌡️ Hőmérséklet', p.temp)}
          ${row('💧 Páratartalom', p.humidity)}
          ${row('📏 Magasság', p.height_cm ? `${p.height_cm} cm` : undefined)}
          ${row('📐 Szélességre', p.spread_cm ? `${p.spread_cm} cm` : undefined)}
          ${row('🌱 Szaporítás', p.propagation)}
          ${row('🎭 Szerep', p.role)}
          ${row('🔧 Gondozás', p.maintenance)}
          ${row('⚠️ Kerülendő', p.avoid)}
          ${row('🇨🇾 Ciprus', p.cyprus)}
        </table>
        ${diseasesHtml}
      </div>`;
  };

  // --- Export PDF ---
  const exportPDF = useCallback(async () => {
    const summary = calculateSummary();
    if (!summary) return;

    const terrariumTypeLabels: Record<string, string> = {
      zart: t('closed'),
      felzart: t('semiClosed'),
      nyitott: t('open'),
    };

    // Build plant thumbnail grid for summary page
    const plantCards = selectedPlants.map((p, i) => {
      const imgTag = p.image_base64
        ? `<img src="${p.image_base64}" style="width:80px;height:80px;border-radius:8px;object-fit:cover;" />`
        : `<div style="width:80px;height:80px;border-radius:8px;background:#E8F5E9;display:flex;align-items:center;justify-content:center;">🌿</div>`;
      return `<div style="text-align:center;width:30%;">
        ${imgTag}
        <p style="font-size:11px;margin:4px 0;">${i === 0 ? '⭐ ' : ''}${p.name}</p>
      </div>`;
    }).join('');

    const warningsHtml = summary.warnings.length > 0
      ? `<div style="background:#FFF3E0;border-left:4px solid #FF5722;padding:8px 12px;margin:12px 0;">
          <strong>⚠ ${t('warning')}</strong>
          ${summary.warnings.map(w => `<p style="color:#E65100;">${w}</p>`).join('')}
        </div>`
      : '';

    // Build full plant profiles
    const plantProfilesHtml = selectedPlants.map(p => plantProfileHtml(p)).join('');

    const html = `
      <html><head><meta charset="utf-8"/><style>
        body { font-family: -apple-system, sans-serif; padding: 24px; color: #333; }
        h1 { color: #1B5E20; font-size: 22px; }
        h2 { color: #388E3C; font-size: 16px; margin-top: 20px; border-bottom: 1px solid #E0E0E0; padding-bottom: 4px; }
        .plants-grid { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start; }
        .value { color: #555; margin-left: 8px; }
        .recipe { font-style: italic; color: #6D4C41; }
      </style></head><body>
        <h1>🌿 ${t('yourTerrarium')}</h1>
        <p style="color:#888;font-size:12px;">${new Date().toLocaleDateString()}</p>

        <h2>🌱 ${t('plants')} (${selectedPlants.length})</h2>
        <div class="plants-grid">${plantCards}</div>

        <h2>🏠 ${t('terrariumType')}</h2>
        <p class="value">${terrariumTypeLabels[summary.terrariumType]}</p>

        <h2>🧱 ${t('substrate')}</h2>
        ${substrateRecipe ? `<p><strong>${substrateRecipe.name}</strong></p><p class="recipe">${substrateRecipe.recipe}</p>` : '<p>—</p>'}

        <h2>☀️ ${t('lightRequirements')}</h2>
        <p class="value">${summary.unifiedLight}</p>

        <h2>💧 ${t('humidity')}</h2>
        <p class="value">${summary.humidityMin}–${summary.humidityMax}% RH</p>

        <h2>🚿 ${t('watering') || 'Öntözés'}</h2>
        <p class="value">${t(summary.wateringNote as any) || summary.wateringNote}</p>

        ${warningsHtml}

        <div style="page-break-before:always;"></div>
        <h1>📋 ${t('plantProfiles') || 'Növény adatlapok'}</h1>
        ${plantProfilesHtml}
      </body></html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const fileName = `Terrarium_${new Date().toISOString().slice(0, 10)}.pdf`;
      const newUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.moveAsync({ from: uri, to: newUri });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, { 
          mimeType: 'application/pdf', 
          dialogTitle: fileName,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF', t('pdfCreated') || `PDF létrehozva: ${fileName}`);
      }
    } catch (e) {
      console.error('PDF export error:', e);
      Alert.alert('Hiba', 'Nem sikerült a PDF létrehozása.');
    }
  }, [calculateSummary, selectedPlants, substrateRecipe, t]);

  // Render summary step
  const renderSummaryStep = () => {
    const summary = calculateSummary();
    if (!summary) return null;

    const terrariumTypeLabels: Record<string, string> = {
      zart: t('closed'),
      felzart: t('semiClosed'),
      nyitott: t('open'),
    };

    return (
      <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>{t('yourTerrarium')}</Text>

        {/* Selected Plants with Images - 3 column grid */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>
            <Ionicons name="leaf" size={18} color="#388E3C" /> {t('plants')} ({selectedPlants.length})
          </Text>
          <View style={styles.summaryPlantsGrid}>
            {selectedPlants.map((plant, index) => (
              <View key={plant.name} style={styles.summaryPlantGridItem}>
                {plant.image_base64 ? (
                  <Image
                    source={{ uri: plant.image_base64 }}
                    style={styles.summaryPlantImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.summaryPlantImage, styles.plantImagePlaceholder]}>
                    <Ionicons name="leaf" size={24} color="#81C784" />
                  </View>
                )}
                <Text style={styles.summaryPlantCardName} numberOfLines={2}>
                  {index === 0 && '⭐ '}{plant.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Terrarium Type */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>
            <Ionicons name="home" size={18} color="#388E3C" /> {t('terrariumType')}
          </Text>
          <Text style={styles.summaryValue}>{terrariumTypeLabels[summary.terrariumType]}</Text>
        </View>

        {/* Substrate Recipe */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>
            <Ionicons name="layers" size={18} color="#8B4513" /> {t('substrate')}
          </Text>
          {substrateRecipe ? (
            <>
              <Text style={styles.summarySubtitle}>{substrateRecipe.name}</Text>
              <Text style={styles.summaryRecipe}>{substrateRecipe.recipe}</Text>
            </>
          ) : (
            <Text style={styles.summaryValue}>—</Text>
          )}
        </View>

        {/* === UNIFIED ENVIRONMENT PROFILE === */}

        {/* Light — single value */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>
            <Ionicons name="sunny" size={18} color="#FFC107" /> {t('lightRequirements')}
          </Text>
          <Text style={styles.summaryValue}>{summary.unifiedLight}</Text>
        </View>

        {/* Humidity — single range */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>
            <Ionicons name="water" size={18} color="#2196F3" /> {t('humidity')}
          </Text>
          <Text style={styles.summaryValue}>{summary.humidityMin}–{summary.humidityMax}% RH</Text>
        </View>

        {/* Watering — based on terrarium type */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>
            <Ionicons name="rainy" size={18} color="#0288D1" /> {t('watering') || 'Öntözés'}
          </Text>
          <Text style={styles.summaryValue}>{t(summary.wateringNote as any) || summary.wateringNote}</Text>
        </View>

        {/* Warnings — only if a plant significantly deviates */}
        {summary.warnings.length > 0 && (
          <View style={[styles.summarySection, styles.warningSection]}>
            <Text style={styles.summaryLabel}>
              <Ionicons name="alert-circle" size={18} color="#FF5722" /> {t('warning')}
            </Text>
            {summary.warnings.map((warning, i) => (
              <Text key={i} style={styles.warningText}>{warning}</Text>
            ))}
          </View>
        )}

        {/* === PER-PLANT: Care Tips === */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>
            <Ionicons name="hand-left" size={18} color="#9C27B0" /> {t('careTips')}
          </Text>
          {summary.perPlantCare.map((item, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <Text style={styles.perPlantName}>{item.name}</Text>
              <Text style={styles.summaryValue}>{item.tips}</Text>
            </View>
          ))}
          {summary.perPlantCare.length === 0 && (
            <Text style={styles.summaryValue}>—</Text>
          )}
        </View>

        {/* === PER-PLANT: Potential Issues === */}
        {summary.perPlantIssues.length > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryLabel}>
              <Ionicons name="warning" size={18} color="#FF5722" /> {t('watchOut')}
            </Text>
            {summary.perPlantIssues.map((item, i) => (
              <View key={i} style={{ marginBottom: 8 }}>
                <Text style={styles.perPlantName}>{item.name}</Text>
                {item.issues.map((issue, j) => (
                  <Text key={j} style={styles.summaryValueWarning}>• {issue}</Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Save & Export Buttons */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <TouchableOpacity
            style={[styles.continueButton, { flex: 1, backgroundColor: '#1B5E20' }]}
            onPress={saveTerrarium}
          >
            <Ionicons name="bookmark" size={20} color="#fff" />
            <Text style={styles.continueButtonText}>{t('saveTerrarium') || 'Mentés'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.continueButton, { flex: 1, backgroundColor: '#0277BD' }]}
            onPress={exportPDF}
          >
            <Ionicons name="document" size={20} color="#fff" />
            <Text style={styles.continueButtonText}>{t('exportPDF') || 'PDF'}</Text>
          </TouchableOpacity>
        </View>

        {/* Start Over Button */}
        <TouchableOpacity
          style={[styles.continueButton, styles.startOverButton]}
          onPress={() => {
            setStep('container');
            setSelectedPlants([]);
            setConfirmedExtraPlants(false);
            setContainer({ shape: null, opening: null, size: null, terrariumType: null });
          }}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.continueButtonText}>{t('startOver')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // Get step indicator
  const getStepNumber = () => {
    switch (step) {
      case 'container': return 1;
      case 'firstPlant': return 2;
      case 'addPlants': return 3;
      case 'summary': return 4;
      default: return 1;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (step === 'container') {
            router.back();
          } else if (step === 'firstPlant') {
            setStep('container');
          } else if (step === 'addPlants') {
            setStep('firstPlant');
            setSelectedPlants([]);
          } else {
            setStep('addPlants');
          }
        }}>
          <Ionicons name="arrow-back" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('buildTerrarium')}</Text>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepIndicatorText}>{getStepNumber()}/4</Text>
        </View>
      </View>

      {/* Content */}
      {step === 'container' && renderContainerStep()}
      {step === 'firstPlant' && renderFirstPlantStep()}
      {step === 'addPlants' && renderAddPlantsStep()}
      {step === 'summary' && renderSummaryStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
  },
  stepIndicator: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepIndicatorText: {
    color: '#388E3C',
    fontWeight: '600',
  },
  stepContainer: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    minWidth: 80,
    maxWidth: 100,
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  optionButtonSelected: {
    backgroundColor: '#388E3C',
    borderColor: '#388E3C',
  },
  optionLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: '#fff',
  },
  sizeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#388E3C',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#388E3C',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  startOverButton: {
    backgroundColor: '#666',
  },
  loader: {
    marginTop: 40,
  },
  plantScrollView: {
    flex: 1,
  },
  plantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 100,
  },
  plantCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  plantImage: {
    width: '100%',
    height: 100,
  },
  plantImagePlaceholder: {
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plantInfo: {
    padding: 10,
  },
  plantName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  plantCommon: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  scoreContainer: {
    position: 'absolute',
    top: -90,
    right: 8,
    backgroundColor: 'rgba(56, 142, 60, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedPlantsContainer: {
    marginBottom: 16,
  },
  selectedPlantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  selectedPlantName: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
    maxWidth: 150,
  },
  summarySection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 14,
    color: '#555',
    marginLeft: 26,
    marginBottom: 4,
  },
  summaryValueWarning: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 26,
    marginBottom: 4,
  },
  summaryPlants: {
    marginLeft: 26,
  },
  summaryPlantName: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 2,
  },
  summaryPlantsScroll: {
    marginTop: 8,
  },
  summaryPlantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  summaryPlantGridItem: {
    width: '31%',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryPlantCard: {
    width: 100,
    marginRight: 12,
    alignItems: 'center',
  },
  summaryPlantImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  summaryPlantCardName: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
    marginTop: 6,
  },
  perPlantName: {
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#2E7D32',
    marginLeft: 26,
    marginBottom: 2,
  },
  warningSection: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 8,
    marginTop: 4,
  },
  summarySubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5D4037',
    marginLeft: 8,
    marginTop: 4,
  },
  summaryRecipe: {
    fontSize: 14,
    color: '#6D4C41',
    marginLeft: 8,
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
