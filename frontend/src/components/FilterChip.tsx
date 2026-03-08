import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}

const FilterChip: React.FC<FilterChipProps> = ({
  label,
  selected,
  onPress,
  color = '#388E3C',
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && { backgroundColor: color, borderColor: color },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  label: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  labelSelected: {
    color: '#fff',
  },
});

export default FilterChip;
