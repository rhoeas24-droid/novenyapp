import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

  // Load plants for first selection - filtered by terrarium type
  const loadPlantsForFirstSelection = useCallback(async () => {
    setLoading(true);
    try {
      const terrariumType = getTerrariumType();
      // Get plants that are suitable for the selected terrarium type
      const result = await getPlants(undefined, terrariumType);
      
      // Load images for each plant
      const plantsWithImages = await Promise.all(
        result.plants.map(async (plant) => {
          try {
            const imageResponse = await fetch(
              `https://terrarium-builder-1.preview.emergentagent.com/api/plants/${encodeURIComponent(plant.name)}/image`
            );
            if (imageResponse.ok) {
              const imageData = await imageResponse.json();
              return { ...plant, image_base64: imageData.image_base64 };
            }
          } catch {}
          return plant;
        })
      );
      
      setAvailablePlants(plantsWithImages);
    } catch (error) {
      console.error('Error loading plants:', error);
    } finally {
      setLoading(false);
    }
  }, [getTerrariumType]);

  // Load compatible plants after first plant is selected (substrate-based)
  const loadCompatiblePlants = useCallback(async (basePlant: Plant) => {
    setLoading(true);
    try {
      const terrariumType = getTerrariumType();
      const result = await getSubstrateCompatiblePlants(basePlant.name, terrariumType, 50);
      
      // Store warnings and recipe
      setTerrariumWarnings(result.warnings || []);
      setSubstrateRecipe(result.substrate_recipe || null);
      
      // Load images for compatible plants
      const plantsWithImages = await Promise.all(
        result.compatible_plants
          .filter(p => !selectedPlants.some(sp => sp.name === p.name))
          .map(async (plant) => {
            try {
              const imageResponse = await fetch(
                `https://terrarium-builder-1.preview.emergentagent.com/api/plants/${encodeURIComponent(plant.name)}/image`
              );
              if (imageResponse.ok) {
                const imageData = await imageResponse.json();
                return { ...plant, image_base64: imageData.image_base64 };
              }
            } catch {}
            return plant;
          })
      );
      
      setCompatiblePlants(plantsWithImages);
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

  // Handle adding more plants
  const handleAddPlant = useCallback((plant: Plant) => {
    const maxPlants = getMaxPlants();
    if (selectedPlants.length < maxPlants) {
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

  // Calculate summary data
  const calculateSummary = useCallback(() => {
    if (selectedPlants.length === 0) return null;

    // Determine terrarium type based on majority
    const terrariumCounts = { Z: 0, F: 0, N: 0 };
    selectedPlants.forEach(p => {
      if (p.Z === '✓') terrariumCounts.Z++;
      if (p.F === '✓') terrariumCounts.F++;
      if (p.N === '✓') terrariumCounts.N++;
    });

    let recommendedType = 'felzart';
    if (terrariumCounts.Z >= terrariumCounts.F && terrariumCounts.Z >= terrariumCounts.N) {
      recommendedType = 'zart';
    } else if (terrariumCounts.N >= terrariumCounts.F) {
      recommendedType = 'nyitott';
    }

    // Collect unique substrates
    const substrates = new Set<string>();
    selectedPlants.forEach(p => {
      if (p.substrate_notes && p.substrate_notes !== '—') {
        substrates.add(p.substrate_notes);
      } else if (p.substrate_group) {
        substrates.add(p.substrate_group);
      }
    });

    // Calculate average light needs
    const lightNeeds = selectedPlants.map(p => p.light || '').filter(Boolean);
    
    // Calculate humidity range
    const humidityNeeds = selectedPlants.map(p => p.humidity || '').filter(Boolean);

    // Collect care tips
    const careTips = new Set<string>();
    selectedPlants.forEach(p => {
      if (p.maintenance) careTips.add(p.maintenance);
    });

    // Collect potential issues
    const diseases = new Set<string>();
    selectedPlants.forEach(p => {
      if (p.diseases) {
        if (p.diseases.fungal) {
          p.diseases.fungal.forEach(d => diseases.add(d.name));
        }
        if (p.diseases.pests) {
          p.diseases.pests.forEach(d => diseases.add(d.name));
        }
      }
    });

    return {
      terrariumType: recommendedType,
      substrates: Array.from(substrates),
      lightNeeds,
      humidityNeeds,
      careTips: Array.from(careTips),
      potentialIssues: Array.from(diseases).slice(0, 5),
    };
  }, [selectedPlants]);

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
      <Text style={styles.sectionLabel}>{t('terrariumType') || 'Terrárium típusa'}</Text>
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
      <Text style={styles.stepTitle}>{t('selectFirstPlant') || 'Válaszd ki az első növényt'}</Text>
      <Text style={styles.stepSubtitle}>
        {t('firstPlantHint') || 'Ez határozza meg a terrárium alap követelményeit'}
      </Text>
      
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
    const maxPlants = getMaxPlants();
    const canAddMore = selectedPlants.length < maxPlants;

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>{t('addMorePlants') || 'Adj hozzá növényeket'}</Text>
        <Text style={styles.stepSubtitle}>
          {selectedPlants.length}/{maxPlants} {t('plantsSelected') || 'növény kiválasztva'}
        </Text>

        {/* Selected Plants */}
        <View style={styles.selectedPlantsContainer}>
          <Text style={styles.sectionLabel}>{t('selectedPlants') || 'Kiválasztott növények'}</Text>
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

        {/* Compatible Plants */}
        {canAddMore && (
          <>
            <Text style={styles.sectionLabel}>{t('compatiblePlants') || 'Kompatibilis növények'}</Text>
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
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => setStep('summary')}
        >
          <Text style={styles.continueButtonText}>{t('viewSummary') || 'Összesítő megtekintése'}</Text>
          <Ionicons name="document-text" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  // Render summary step
  const renderSummaryStep = () => {
    const summary = calculateSummary();
    if (!summary) return null;

    const terrariumTypeLabels: Record<string, string> = {
      zart: t('closed') || 'Zárt',
      felzart: t('semiClosed') || 'Félzárt',
      nyitott: t('open') || 'Nyitott',
    };

    return (
      <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>{t('yourTerrarium') || 'A Te Terráriumod'}</Text>

        {/* Selected Plants with Images */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>
            <Ionicons name="leaf" size={18} color="#388E3C" /> {t('plants') || 'Növények'} ({selectedPlants.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryPlantsScroll}>
            {selectedPlants.map((plant, index) => (
              <View key={plant.name} style={styles.summaryPlantCard}>
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
          </ScrollView>
        </View>

        {/* Terrarium Type */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>
            <Ionicons name="home" size={18} color="#388E3C" /> {t('terrariumType') || 'Terrárium típusa'}
          </Text>
          <Text style={styles.summaryValue}>{terrariumTypeLabels[summary.terrariumType]}</Text>
        </View>

        {/* Warnings */}
        {terrariumWarnings.length > 0 && (
          <View style={[styles.summarySection, styles.warningSection]}>
            <Text style={styles.summaryLabel}>
              <Ionicons name="alert-circle" size={18} color="#FF5722" /> Figyelmeztetés
            </Text>
            {terrariumWarnings.map((warning, i) => (
              <Text key={i} style={styles.warningText}>{warning}</Text>
            ))}
          </View>
        )}

        {/* Substrate Recipe */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>
            <Ionicons name="layers" size={18} color="#8B4513" /> {t('substrate') || 'Szubsztrát'}
          </Text>
          {substrateRecipe ? (
            <>
              <Text style={styles.summarySubtitle}>{substrateRecipe.name}</Text>
              <Text style={styles.summaryRecipe}>{substrateRecipe.recipe}</Text>
            </>
          ) : (
            summary.substrates.map(sub => (
              <Text key={sub} style={styles.summaryValue}>• {sub}</Text>
            ))
          )}
        </View>

        {/* Light */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>
            <Ionicons name="sunny" size={18} color="#FFC107" /> {t('lightRequirements') || 'Fényigény'}
          </Text>
          {summary.lightNeeds.slice(0, 3).map((light, i) => (
            <Text key={i} style={styles.summaryValue}>• {light}</Text>
          ))}
        </View>

        {/* Humidity */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>
            <Ionicons name="water" size={18} color="#2196F3" /> {t('humidity') || 'Páratartalom'}
          </Text>
          {summary.humidityNeeds.slice(0, 3).map((hum, i) => (
            <Text key={i} style={styles.summaryValue}>• {hum}</Text>
          ))}
        </View>

        {/* Care Tips */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>
            <Ionicons name="hand-left" size={18} color="#9C27B0" /> {t('careTips') || 'Gondozási tippek'}
          </Text>
          {summary.careTips.slice(0, 3).map((tip, i) => (
            <Text key={i} style={styles.summaryValue}>• {tip}</Text>
          ))}
        </View>

        {/* Potential Issues */}
        {summary.potentialIssues.length > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryLabel}>
              <Ionicons name="warning" size={18} color="#FF5722" /> {t('watchOut') || 'Figyelj oda'}
            </Text>
            {summary.potentialIssues.map((issue, i) => (
              <Text key={i} style={styles.summaryValueWarning}>• {issue}</Text>
            ))}
          </View>
        )}

        {/* Start Over Button */}
        <TouchableOpacity
          style={[styles.continueButton, styles.startOverButton]}
          onPress={() => {
            setStep('container');
            setSelectedPlants([]);
            setContainer({ shape: null, opening: null, size: null, terrariumType: null });
          }}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.continueButtonText}>{t('startOver') || 'Újrakezdés'}</Text>
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
        <Text style={styles.headerTitle}>{t('buildTerrarium') || 'Terrárium Építő'}</Text>
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
