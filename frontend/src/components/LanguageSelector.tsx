import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
}

const languages: { id: Language; name: string; flag: string }[] = [
  { id: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { id: 'en', name: 'English', flag: '🇬🇧' },
  { id: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
];

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ visible, onClose }) => {
  const { language, setLanguage, t } = useLanguage();

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('language')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.id}
              style={[
                styles.option,
                language === lang.id && styles.optionSelected,
              ]}
              onPress={() => handleSelect(lang.id)}
            >
              <Text style={styles.flag}>{lang.flag}</Text>
              <Text style={[
                styles.optionText,
                language === lang.id && styles.optionTextSelected,
              ]}>
                {lang.name}
              </Text>
              {language === lang.id && (
                <Ionicons name="checkmark" size={24} color="#388E3C" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '80%',
    maxWidth: 300,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  optionSelected: {
    backgroundColor: '#E8F5E9',
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  optionTextSelected: {
    color: '#388E3C',
    fontWeight: '600',
  },
});

export default LanguageSelector;
