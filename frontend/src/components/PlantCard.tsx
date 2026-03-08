import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Plant } from '../api/client';

interface PlantCardProps {
  plant: Plant;
  onPress: () => void;
  showCompatibility?: boolean;
}

const groupColors: Record<string, string> = {
  'Ferns & Foliage': '#2E7D32',
  'Peperomia & Pilea': '#558B2F',
  'Aroids & Tropicals': '#1B5E20',
  'Moss & Selaginella': '#33691E',
  'Succulents & Cacti': '#BF360C',
  'Carnivorous': '#6A1B9A',
  'Tillandsia': '#00838F',
};

const PlantCard: React.FC<PlantCardProps> = ({ plant, onPress, showCompatibility }) => {
  const groupColor = groupColors[plant.group] || '#388E3C';
  
  const renderTerrarium = (type: string, value: string) => {
    const isCompatible = value === '✓';
    const isPartial = value === '~';
    const color = isCompatible ? '#4CAF50' : isPartial ? '#FFC107' : '#E57373';
    
    return (
      <View key={type} style={[styles.terrariumBadge, { backgroundColor: color }]}>
        <Text style={styles.terrariumText}>{type}</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        {plant.image_base64 ? (
          <Image
            source={{ uri: plant.image_base64 }}
            style={styles.image}
            resizeMode="cover"
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
          {renderTerrarium('Z', plant.Z)}
          {renderTerrarium('F', plant.F)}
          {renderTerrarium('N', plant.N)}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
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
    fontStyle: 'italic',
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
