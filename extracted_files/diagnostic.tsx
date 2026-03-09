import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../src/i18n/LanguageContext';
import {
  DiagnosticSession,
  QuestionDisplay,
  DiagnosisResult,
} from '../src/diagnostic/DiagnosticEngine';

// Import plant list for selection
import plantsData from '../src/data/plants.json';
import { Plant } from '../src/api/client';

const allPlants: Plant[] = plantsData as Plant[];

type DiagStep = 'select' | 'questions' | 'result';

export default function DiagnosticScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const params = useLocalSearchParams<{ plant?: string }>();

  // State
  const [step, setStep] = useState<DiagStep>(params.plant ? 'questions' : 'select');
  const [searchQuery, setSearchQuery] = useState('');
  const [session, setSession] = useState<DiagnosticSession | null>(() => {
    if (params.plant) {
      try {
        return new DiagnosticSession(decodeURIComponent(params.plant));
      } catch {
        return null;
      }
    }
    return null;
  });
  const [currentQuestion, setCurrentQuestion] = useState<QuestionDisplay | null>(
    () => (session ? session.getNextQuestion() : null)
  );
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  // Get localized disease name
  const getDiseaseName = useCallback(
    (d: { name: string; nameEn: string; nameEl: string }) => {
      if (language === 'en') return d.nameEn;
      if (language === 'el') return d.nameEl;
      return d.name; // HU (original)
    },
    [language]
  );

  // Get localized text for questions/answers
  const getLocalizedText = useCallback(
    (item: { text_hu: string; text_en: string; text_el?: string }) => {
      if (language === 'en') return item.text_en;
      if (language === 'el') return item.text_el || item.text_en;
      return item.text_hu;
    },
    [language]
  );

  // Filter plants that have diagnostic data
  const availablePlants = useMemo(() => {
    const diagnosticPlants = new Set(DiagnosticSession.getAvailablePlants());
    let filtered = allPlants.filter((p) => diagnosticPlants.has(p.name));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.common.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [searchQuery]);

  // Select a plant and start diagnosis
  const handleSelectPlant = useCallback((plantName: string) => {
    try {
      const newSession = new DiagnosticSession(plantName);
      setSession(newSession);
      const firstQ = newSession.getNextQuestion();
      setCurrentQuestion(firstQ);
      setDiagnosis(newSession.getDiagnosis());
      setStep(firstQ ? 'questions' : 'result');
    } catch (e) {
      console.error('Failed to start diagnostic:', e);
    }
  }, []);

  // Answer a question
  const handleAnswer = useCallback(
    (questionId: string, answerId: string) => {
      if (!session) return;

      setSelectedAnswer(answerId);

      // Brief delay for visual feedback
      setTimeout(() => {
        session.answer(questionId, answerId);
        const nextQ = session.getNextQuestion();
        const currentDiag = session.getDiagnosis();

        setCurrentQuestion(nextQ);
        setDiagnosis(currentDiag);
        setSelectedAnswer(null);

        if (!nextQ) {
          setStep('result');
        }
      }, 300);
    },
    [session]
  );

  // Restart
  const handleRestart = useCallback(() => {
    setSession(null);
    setCurrentQuestion(null);
    setDiagnosis(null);
    setStep('select');
    setSearchQuery('');
  }, []);

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.6) return '#D32F2F';
    if (confidence >= 0.3) return '#F57C00';
    return '#FBC02D';
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fungal':
        return 'cellular-outline';
      case 'pests':
        return 'bug-outline';
      case 'other':
        return 'alert-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  // ---- STEP 1: Plant Selection ----
  const renderSelectStep = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.selectHeader}>
        <Ionicons name="medkit" size={32} color="#D32F2F" />
        <Text style={styles.stepTitle}>{t('selectPlantForDiagnosis')}</Text>
        <Text style={styles.stepSubtitle}>{t('selectPlantHint')}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {/* Plant List */}
      <View style={styles.plantList}>
        {availablePlants.map((plant) => (
          <TouchableOpacity
            key={plant.name}
            style={styles.plantListItem}
            onPress={() => handleSelectPlant(plant.name)}
          >
            <View style={styles.plantListIcon}>
              <Ionicons name="leaf" size={20} color="#388E3C" />
            </View>
            <View style={styles.plantListText}>
              <Text style={styles.plantListName}>{plant.name}</Text>
              <Text style={styles.plantListCommon}>{plant.common}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  // ---- STEP 2: Questions ----
  const renderQuestionsStep = () => {
    if (!currentQuestion || !session) return null;

    const progress = session.getProgress();

    return (
      <View style={styles.stepContainer}>
        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {t('questionProgress')
              .replace('{n}', String(progress.answered + 1))
              .replace('{total}', String(progress.total))}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    100,
                    ((progress.answered + 1) / Math.max(progress.total, 1)) * 100
                  )}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>
            {getLocalizedText(currentQuestion)}
          </Text>

          <View style={styles.answersContainer}>
            {currentQuestion.answers.map((answer) => (
              <TouchableOpacity
                key={answer.id}
                style={[
                  styles.answerButton,
                  selectedAnswer === answer.id && styles.answerButtonSelected,
                ]}
                onPress={() => handleAnswer(currentQuestion.id, answer.id)}
                disabled={selectedAnswer !== null}
              >
                <Text
                  style={[
                    styles.answerText,
                    selectedAnswer === answer.id && styles.answerTextSelected,
                  ]}
                >
                  {getLocalizedText(answer)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Live diagnosis preview */}
        {diagnosis && diagnosis.diagnoses.length > 0 && (
          <View style={styles.livePreview}>
            <Text style={styles.livePreviewTitle}>{t('topDiagnosis')}</Text>
            {diagnosis.diagnoses.slice(0, 2).map((d, i) => (
              <View key={i} style={styles.livePreviewItem}>
                <Ionicons
                  name={getTypeIcon(d.type) as any}
                  size={16}
                  color={getConfidenceColor(d.confidence)}
                />
                <Text style={styles.livePreviewName}>{getDiseaseName(d)}</Text>
                <Text
                  style={[
                    styles.livePreviewScore,
                    { color: getConfidenceColor(d.confidence) },
                  ]}
                >
                  {Math.round(d.confidence * 100)}%
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ---- STEP 3: Result ----
  const renderResultStep = () => {
    if (!diagnosis) return null;

    return (
      <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.resultHeader}>
          <Ionicons name="clipboard" size={32} color="#1B5E20" />
          <Text style={styles.stepTitle}>{t('diagnosisResult')}</Text>
          <Text style={styles.resultPlantName}>{diagnosis.plantName}</Text>
          <Text style={styles.resultMeta}>
            {diagnosis.questionsAnswered} {t('questionsAnsweredLabel')}
          </Text>
        </View>

        {/* Diagnosis cards */}
        {diagnosis.diagnoses.map((d, i) => (
          <View
            key={i}
            style={[
              styles.diagnosisCard,
              i === 0 && styles.diagnosisCardPrimary,
            ]}
          >
            {/* Header */}
            <View style={styles.diagnosisHeader}>
              <View style={styles.diagnosisIconContainer}>
                <Ionicons
                  name={getTypeIcon(d.type) as any}
                  size={24}
                  color={i === 0 ? '#fff' : getConfidenceColor(d.confidence)}
                />
              </View>
              <View style={styles.diagnosisHeaderText}>
                <Text
                  style={[
                    styles.diagnosisName,
                    i === 0 && styles.diagnosisNamePrimary,
                  ]}
                >
                  {getDiseaseName(d)}
                </Text>
                <Text style={[styles.diagnosisType, i === 0 && { color: 'rgba(255,255,255,0.7)' }]}>
                  {d.type === 'fungal'
                    ? t('fungalDiseases')
                    : d.type === 'pests'
                    ? t('pests')
                    : t('otherProblems')}
                </Text>
              </View>
              <View
                style={[
                  styles.confidenceBadge,
                  i === 0 && styles.confidenceBadgePrimary,
                ]}
              >
                <Text
                  style={[
                    styles.confidenceText,
                    i === 0 && styles.confidenceTextPrimary,
                  ]}
                >
                  {Math.round(d.confidence * 100)}%
                </Text>
              </View>
            </View>

            {/* Symptoms */}
            <View style={styles.diagnosisSection}>
              <Text
                style={[
                  styles.diagnosisSectionTitle,
                  i === 0 && { color: 'rgba(255,255,255,0.85)' },
                ]}
              >
                {t('symptoms')}
              </Text>
              <Text
                style={[
                  styles.diagnosisSectionText,
                  i === 0 && { color: 'rgba(255,255,255,0.95)' },
                ]}
              >
                {d.symptoms}
              </Text>
            </View>

            {/* Treatment */}
            <View style={styles.diagnosisSection}>
              <Text
                style={[
                  styles.diagnosisSectionTitle,
                  i === 0 && { color: 'rgba(255,255,255,0.85)' },
                ]}
              >
                {t('treatment')}
              </Text>
              <Text
                style={[
                  styles.diagnosisSectionText,
                  i === 0 && { color: 'rgba(255,255,255,0.95)' },
                ]}
              >
                {d.treatment}
              </Text>
            </View>
          </View>
        ))}

        {/* Action buttons */}
        <View style={styles.resultActions}>
          <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.restartButtonText}>{t('startNewDiagnosis')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToPlantButton}
            onPress={() =>
              router.push(
                `/plant/${encodeURIComponent(diagnosis.plantName)}` as any
              )
            }
          >
            <Ionicons name="leaf" size={20} color="#388E3C" />
            <Text style={styles.backToPlantText}>{t('backToPlant')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ---- Header ----
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (step === 'select') {
              router.back();
            } else if (step === 'questions') {
              handleRestart();
            } else {
              setStep('questions');
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#D32F2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('diagnosticTitle')}</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>
            {step === 'select' ? '1' : step === 'questions' ? '2' : '3'}/3
          </Text>
        </View>
      </View>

      {/* Content */}
      {step === 'select' && renderSelectStep()}
      {step === 'questions' && renderQuestionsStep()}
      {step === 'result' && renderResultStep()}
    </View>
  );
}

// ---- Styles ----
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
    color: '#D32F2F',
  },
  stepBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepBadgeText: {
    color: '#D32F2F',
    fontWeight: '600',
    fontSize: 13,
  },
  stepContainer: {
    flex: 1,
    padding: 16,
  },

  // ---- Select Step ----
  selectHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1B5E20',
    marginTop: 12,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  plantList: {
    gap: 2,
  },
  plantListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
  },
  plantListIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  plantListText: {
    flex: 1,
  },
  plantListName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  plantListCommon: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },

  // ---- Questions Step ----
  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D32F2F',
    borderRadius: 3,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 24,
    lineHeight: 26,
    textAlign: 'center',
  },
  answersContainer: {
    gap: 10,
  },
  answerButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  answerButtonSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#388E3C',
  },
  answerText: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  answerTextSelected: {
    color: '#1B5E20',
    fontWeight: '600',
  },

  // Live preview
  livePreview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  livePreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  livePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  livePreviewName: {
    flex: 1,
    fontSize: 13,
    color: '#555',
  },
  livePreviewScore: {
    fontSize: 14,
    fontWeight: '700',
  },

  // ---- Result Step ----
  resultHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  resultPlantName: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#388E3C',
    marginTop: 8,
  },
  resultMeta: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  diagnosisCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    elevation: 1,
  },
  diagnosisCardPrimary: {
    backgroundColor: '#C62828',
    elevation: 4,
  },
  diagnosisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  diagnosisIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  diagnosisHeaderText: {
    flex: 1,
  },
  diagnosisName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  diagnosisNamePrimary: {
    color: '#fff',
  },
  diagnosisType: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
  },
  confidenceBadgePrimary: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  confidenceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E65100',
  },
  confidenceTextPrimary: {
    color: '#fff',
  },
  diagnosisSection: {
    marginBottom: 12,
  },
  diagnosisSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  diagnosisSectionText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  resultActions: {
    marginTop: 8,
    gap: 10,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D32F2F',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  restartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backToPlantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  backToPlantText: {
    color: '#388E3C',
    fontSize: 16,
    fontWeight: '600',
  },
});
