import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Plant } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

const groupColors: Record<string, string> = {
  'Ferns & Foliage': '#2E7D32',
  'Peperomia & Pilea': '#558B2F',
  'Aroids & Tropicals': '#1B5E20',
  'Moss & Selaginella': '#33691E',
  'Succulents & Cacti': '#BF360C',
  'Carnivorous': '#6A1B9A',
  'Tillandsia': '#00838F',
};

interface PlantCardProps {
  plant: Plant;
  onPress: () => void;
  showCompatibility?: boolean;
}

const PlantCard: React.FC<PlantCardProps> = ({ plant, onPress, showCompatibility }) => {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.floor((screenWidth - 48) / 2);
  const groupColor = groupColors[plant.group] || '#388E3C';
  const { t } = useLanguage();
  
  // OFFLINE MODE: Image is already in plant.image_base64
  const imageUri = plant.image_base64 || null;
  
  const renderTerrarium = (badgeKey: 'badgeClosed' | 'badgeSemiClosed' | 'badgeOpen', value: string) => {
    const isCompatible = value === '✓';
    const isPartial = value === '~';
    const color = isCompatible ? '#4CAF50' : isPartial ? '#FFC107' : '#E57373';
    
    return (
      <View key={badgeKey} style={[styles.terrariumBadge, { backgroundColor: color }]}>
        <Text style={styles.terrariumText}>{t(badgeKey)}</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, { width: cardWidth }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
            fadeDuration={0}
          />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: groupColor }]}>
            <Ionicons name="leaf" size={32} color="rgba(255,255,255,0.6)" />
          </View>
        )}
        
        {showCompatibility && plant.compatibility_score !== undefined && (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>
              {Math.round(plant.compatibility_score)}%
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {plant.name}
        </Text>
        <Text style={styles.common} numberOfLines={1}>
          {plant.common}
        </Text>
        
        <View style={styles.terrariumRow}>
          {renderTerrarium('badgeClosed', plant.Z)}
          {renderTerrarium('badgeSemiClosed', plant.F)}
          {renderTerrarium('badgeOpen', plant.N)}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
  },
  imageContainer: {
    height: 120,
    overflow: 'hidden',
  },
  image: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  content: {
    padding: 10,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  common: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    marginBottom: 6,
  },
  terrariumRow: {
    flexDirection: 'row',
  },
  terrariumBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  terrariumText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
  },
});

export default PlantCard;
