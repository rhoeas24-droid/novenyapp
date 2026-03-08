import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '../src/store/plantStore';
import PlantCard from '../src/components/PlantCard';
import FilterChip from '../src/components/FilterChip';
import SearchBar from '../src/components/SearchBar';
import { Plant } from '../src/api/client';
import { useLanguage } from '../src/i18n/LanguageContext';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const { t, tGroup } = useLanguage();

  const TERRARIUM_TYPES = [
    { id: 'zart', label: t('closed'), color: '#2E7D32' },
    { id: 'felzart', label: t('semiClosed'), color: '#689F38' },
    { id: 'nyitott', label: t('open'), color: '#AFB42B' },
  ] as const;

  const {
    plants,
    groups,
    loading,
    error,
    searchQuery,
    selectedGroup,
    selectedTerrariumType,
    setSearchQuery,
    setSelectedGroup,
    setSelectedTerrariumType,
    fetchPlants,
    fetchGroups,
  } = usePlantStore();

  useEffect(() => {
    fetchGroups();
    fetchPlants();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchPlants();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, selectedGroup, selectedTerrariumType]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPlants();
    setRefreshing(false);
  }, []);

  const handlePlantPress = (plant: Plant) => {
    router.push(`/plant/${encodeURIComponent(plant.name)}`);
  };

  if (loading && plants.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#388E3C" />
        <Text style={styles.loadingText}>{t('loadingPlants')}</Text>
      </View>
    );
  }

  if (error && plants.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('errorLoading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#388E3C']}
          tintColor="#388E3C"
        />
      }
    >
      {/* Header with filters */}
      <View style={styles.header}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('searchPlaceholder')}
        />

        {/* Terrarium Type Filter */}
        <Text style={styles.filterLabel}>{t('terrariumType')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterRowContent}
        >
          <FilterChip
            label={t('all')}
            selected={selectedTerrariumType === null}
            onPress={() => setSelectedTerrariumType(null)}
            color="#666"
          />
          {TERRARIUM_TYPES.map((type) => (
            <FilterChip
              key={type.id}
              label={type.label}
              selected={selectedTerrariumType === type.id}
              onPress={() =>
                setSelectedTerrariumType(
                  selectedTerrariumType === type.id ? null : type.id
                )
              }
              color={type.color}
            />
          ))}
        </ScrollView>

        {/* Group Filter */}
        <Text style={styles.filterLabel}>{t('plantGroup')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterRowContent}
        >
          <FilterChip
            label={t('all')}
            selected={selectedGroup === null}
            onPress={() => setSelectedGroup(null)}
            color="#666"
          />
          {groups.map((group) => (
            <FilterChip
              key={group.id}
              label={tGroup(group.id)}
              selected={selectedGroup === group.id}
              onPress={() =>
                setSelectedGroup(selectedGroup === group.id ? null : group.id)
              }
              color="#388E3C"
            />
          ))}
        </ScrollView>

        <View style={styles.resultCount}>
          <Text style={styles.resultText}>
            {plants.length} {t('plants')}{' '}
            {selectedTerrariumType && (
              <Text style={styles.filterActive}>
                ({TERRARIUM_TYPES.find(type => type.id === selectedTerrariumType)?.label} {t('intoTerrarium')})
              </Text>
            )}
          </Text>
        </View>
      </View>

      {/* Plant Grid */}
      {plants.length > 0 ? (
        <View style={styles.plantsGrid}>
          {plants.map((plant) => (
            <PlantCard
              key={plant._id}
              plant={plant}
              onPress={() => handlePlantPress(plant)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('noResults')}</Text>
          <Text style={styles.emptySubtext}>{t('tryOtherFilters')}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 8,
  },
  filterRow: {
    marginBottom: 4,
  },
  filterRowContent: {
    paddingRight: 16,
  },
  resultCount: {
    marginTop: 16,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#666',
  },
  filterActive: {
    color: '#388E3C',
    fontWeight: '500',
  },
  plantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});
