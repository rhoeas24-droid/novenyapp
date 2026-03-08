import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlantStore } from '../../src/store/plantStore';
import PlantCard from '../../src/components/PlantCard';
import FilterChip from '../../src/components/FilterChip';
import { useLanguage } from '../../src/i18n/LanguageContext';

const HERO_HEIGHT = 250;

export default function PlantDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'info' | 'compatible'>('info');
  const [compatTerrariumType, setCompatTerrariumType] = useState<string | null>(null);
  const { t } = useLanguage();

  const TERRARIUM_TYPES = [
    { id: 'zart', label: t('closed'), field: 'Z', color: '#2E7D32' },
    { id: 'felzart', label: t('semiClosed'), field: 'F', color: '#689F38' },
    { id: 'nyitott', label: t('open'), field: 'N', color: '#AFB42B' },
  ] as const;

  const {
    selectedPlant,
    compatiblePlants,
    loading,
    error,
    fetchPlantDetail,
    fetchCompatiblePlants,
    clearSelectedPlant,
    setSelectedTerrariumType,
  } = usePlantStore();

  useEffect(() => {
    if (name) {
      const decodedName = decodeURIComponent(name);
      fetchPlantDetail(decodedName);
      fetchCompatiblePlants(decodedName);
    }

    return () => {
      clearSelectedPlant();
    };
  }, [name]);

  useEffect(() => {
    if (name && activeTab === 'compatible') {
      const decodedName = decodeURIComponent(name);
      usePlantStore.setState({ selectedTerrariumType: compatTerrariumType as any });
      fetchCompatiblePlants(decodedName);
    }
  }, [compatTerrariumType, activeTab]);

  const handleCompatiblePlantPress = (plantName: string) => {
    router.push(`/plant/${encodeURIComponent(plantName)}`);
  };

  const getCompatibilityIcon = (value: string) => {
    if (value === '✓') return { name: 'checkmark-circle', color: '#4CAF50' };
    if (value === '~') return { name: 'remove-circle', color: '#FFC107' };
    return { name: 'close-circle', color: '#E57373' };
  };

  if (loading && !selectedPlant) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#388E3C" />
        <Text style={styles.loadingText}>{t('loadingPlants')}</Text>
      </View>
    );
  }

  if (error || !selectedPlant) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || t('errorLoading')}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: selectedPlant.name,
          headerBackTitle: t('back'),
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          {selectedPlant.image_base64 ? (
            <Image
              source={{ uri: selectedPlant.image_base64 }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="leaf" size={80} color="rgba(255,255,255,0.5)" />
            </View>
          )}
        </View>

        {/* Plant Info Header */}
        <View style={styles.headerSection}>
          <Text style={styles.plantName}>{selectedPlant.name}</Text>
          <Text style={styles.commonName}>{selectedPlant.common}</Text>
          <Text style={styles.family}>{selectedPlant.family}</Text>

          {/* Terrarium Compatibility */}
          <View style={styles.terrariumSection}>
            <Text style={styles.sectionTitle}>{t('terrariumCompatibility')}</Text>
            <View style={styles.terrariumRow}>
              {TERRARIUM_TYPES.map((type) => {
                const value = selectedPlant[type.field as keyof typeof selectedPlant] as string;
                const icon = getCompatibilityIcon(value);
                return (
                  <View key={type.id} style={styles.terrariumItem}>
                    <Ionicons
                      name={icon.name as any}
                      size={28}
                      color={icon.color}
                    />
                    <Text style={styles.terrariumLabel}>{type.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'info' && styles.activeTab]}
            onPress={() => setActiveTab('info')}
          >
            <Ionicons
              name="information-circle"
              size={20}
              color={activeTab === 'info' ? '#388E3C' : '#999'}
              style={styles.tabIcon}
            />
            <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
              {t('information')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'compatible' && styles.activeTab]}
            onPress={() => setActiveTab('compatible')}
          >
            <Ionicons
              name="git-compare"
              size={20}
              color={activeTab === 'compatible' ? '#388E3C' : '#999'}
              style={styles.tabIcon}
            />
            <Text style={[styles.tabText, activeTab === 'compatible' && styles.activeTabText]}>
              {t('compatible')} ({compatiblePlants.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'info' ? (
          <View style={styles.infoSection}>
            {/* Basic Care */}
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>{t('basicCare')}</Text>
              
              <View style={styles.infoRow}>
                <Ionicons name="sunny" size={20} color="#FFA726" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('lightRequirement')}</Text>
                  <Text style={styles.infoValue}>{selectedPlant.light}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="water" size={20} color="#42A5F5" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('humidity')}</Text>
                  <Text style={styles.infoValue}>{selectedPlant.humidity}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="thermometer" size={20} color="#EF5350" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('temperature')}</Text>
                  <Text style={styles.infoValue}>{selectedPlant.temp}</Text>
                </View>
              </View>

              {selectedPlant.substrate_notes && selectedPlant.substrate_notes !== '—' && (
                <View style={styles.infoRow}>
                  <Ionicons name="layers" size={20} color="#8D6E63" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{t('substrate')}</Text>
                    <Text style={styles.infoValue}>{selectedPlant.substrate_notes}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Growth Info */}
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>{t('growth')}</Text>
              
              <View style={styles.infoRow}>
                <Ionicons name="resize" size={20} color="#66BB6A" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('size')}</Text>
                  <Text style={styles.infoValue}>
                    {selectedPlant.height_cm} cm ({t('height')}) × {selectedPlant.spread_cm} cm ({t('width')})
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="trending-up" size={20} color="#26A69A" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('growthRate')}</Text>
                  <Text style={styles.infoValue}>{selectedPlant.growth_rate}</Text>
                </View>
              </View>

              {selectedPlant.propagation && (
                <View style={styles.infoRow}>
                  <Ionicons name="git-branch" size={20} color="#7E57C2" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{t('propagation')}</Text>
                    <Text style={styles.infoValue}>{selectedPlant.propagation}</Text>
                  </View>
                </View>
              )}

              {selectedPlant.role && (
                <View style={styles.infoRow}>
                  <Ionicons name="locate" size={20} color="#5C6BC0" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{t('roleInTerrarium')}</Text>
                    <Text style={styles.infoValue}>{selectedPlant.role}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Warnings */}
            {selectedPlant.avoid && (
              <View style={[styles.infoCard, styles.warningCard]}>
                <Text style={[styles.cardTitle, styles.warningTitle]}>
                  <Ionicons name="warning" size={18} color="#F57C00" /> {t('warning')}
                </Text>
                <Text style={styles.warningText}>{selectedPlant.avoid}</Text>
              </View>
            )}

            {/* Maintenance */}
            {selectedPlant.maintenance && (
              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>{t('maintenance')}</Text>
                <Text style={styles.maintenanceText}>{selectedPlant.maintenance}</Text>
              </View>
            )}

            {/* Diseases */}
            {selectedPlant.diseases && (
              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>{t('diseasesAndPests')}</Text>
                
                {selectedPlant.diseases.fungal?.length > 0 && (
                  <View style={styles.diseaseSection}>
                    <Text style={styles.diseaseType}>{t('fungalDiseases')}</Text>
                    {selectedPlant.diseases.fungal.map((d, i) => (
                      <View key={i} style={styles.diseaseItem}>
                        <Text style={styles.diseaseName}>{d.name}</Text>
                        <Text style={styles.diseaseSymptoms}>{t('symptoms')}: {d.symptoms}</Text>
                        <Text style={styles.diseaseTreatment}>{t('treatment')}: {d.treatment}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {selectedPlant.diseases.pests?.length > 0 && (
                  <View style={styles.diseaseSection}>
                    <Text style={styles.diseaseType}>{t('pests')}</Text>
                    {selectedPlant.diseases.pests.map((d, i) => (
                      <View key={i} style={styles.diseaseItem}>
                        <Text style={styles.diseaseName}>{d.name}</Text>
                        <Text style={styles.diseaseSymptoms}>{t('symptoms')}: {d.symptoms}</Text>
                        <Text style={styles.diseaseTreatment}>{t('treatment')}: {d.treatment}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {selectedPlant.diseases.other?.length > 0 && (
                  <View style={styles.diseaseSection}>
                    <Text style={styles.diseaseType}>{t('otherProblems')}</Text>
                    {selectedPlant.diseases.other.map((d, i) => (
                      <View key={i} style={styles.diseaseItem}>
                        <Text style={styles.diseaseName}>{d.name}</Text>
                        <Text style={styles.diseaseSymptoms}>{t('symptoms')}: {d.symptoms}</Text>
                        <Text style={styles.diseaseTreatment}>{t('treatment')}: {d.treatment}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.compatibleSection}>
            {/* Filter for compatible plants */}
            <View style={styles.compatFilterSection}>
              <Text style={styles.compatFilterLabel}>{t('filterByTerrarium')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.compatFilterRow}
              >
                <FilterChip
                  label={t('all')}
                  selected={compatTerrariumType === null}
                  onPress={() => setCompatTerrariumType(null)}
                  color="#666"
                />
                {TERRARIUM_TYPES.map((type) => (
                  <FilterChip
                    key={type.id}
                    label={type.label}
                    selected={compatTerrariumType === type.id}
                    onPress={() =>
                      setCompatTerrariumType(
                        compatTerrariumType === type.id ? null : type.id
                      )
                    }
                    color={type.color}
                  />
                ))}
              </ScrollView>
            </View>

            <Text style={styles.compatInfo}>
              {t('compatibilityInfo')}
            </Text>

            {/* Compatible Plants Grid */}
            <View style={styles.compatGrid}>
              {compatiblePlants.length > 0 ? (
                compatiblePlants.map((plant) => (
                  <PlantCard
                    key={plant._id}
                    plant={plant}
                    onPress={() => handleCompatiblePlantPress(plant.name)}
                    showCompatibility
                  />
                ))
              ) : (
                <View style={styles.noCompatible}>
                  <Ionicons name="leaf-outline" size={48} color="#ccc" />
                  <Text style={styles.noCompatibleText}>
                    {t('noCompatiblePlants')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },
  errorText: {
    fontSize: 15,
    color: '#d32f2f',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  imageContainer: {
    height: HERO_HEIGHT,
    backgroundColor: '#388E3C',
  },
  image: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#388E3C',
  },
  headerSection: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  plantName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  commonName: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  family: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  terrariumSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  terrariumRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  terrariumItem: {
    alignItems: 'center',
  },
  terrariumLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#388E3C',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#388E3C',
  },
  tabIcon: {
    marginRight: 8,
  },
  infoSection: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#F57C00',
  },
  warningTitle: {
    color: '#E65100',
  },
  warningText: {
    fontSize: 14,
    color: '#BF360C',
    lineHeight: 20,
  },
  maintenanceText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  diseaseSection: {
    marginBottom: 16,
  },
  diseaseType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  diseaseItem: {
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
  },
  diseaseName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  diseaseSymptoms: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  diseaseTreatment: {
    fontSize: 12,
    color: '#388E3C',
  },
  compatibleSection: {
    padding: 16,
  },
  compatFilterSection: {
    marginBottom: 12,
  },
  compatFilterLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  compatFilterRow: {
    marginBottom: 4,
  },
  compatInfo: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  compatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  noCompatible: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 40,
  },
  noCompatibleText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
});
