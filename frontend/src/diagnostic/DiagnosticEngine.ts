/**
 * Terrárium Növény Diagnosztikai Motor — TypeScript (Offline)
 *
 * Port of diagnostic.py for client-side use in React Native.
 *
 * Usage:
 *   const session = new DiagnosticSession('Nephrolepis cordifolia');
 *   const q = session.getNextQuestion();
 *   session.answer(q.id, 'recent');
 *   const result = session.getDiagnosis();
 */

import engineData from '../data/diagnostic_engine.json';

// ---- Types ----

export interface Answer {
  id: string;
  text_hu: string;
  text_en: string;
  text_el?: string;
  boost_tags?: string[];
  boost?: number;
  penalize_tags?: string[];
  penalize?: number;
}

export interface Question {
  id: string;
  layer: number;
  text_hu: string;
  text_en: string;
  text_el?: string;
  relevant_tags?: string[];
  answers: Answer[];
}

interface RawDisease {
  disease_id: string;
  name: string;
  name_en?: string;
  name_el?: string;
  type: string;
  symptoms_text: string;
  treatment_text: string;
  tags: string[];
}

interface DiseaseScore {
  score: number;
  name: string;
  nameEn: string;
  nameEl: string;
  type: string;
  tags: Set<string>;
  symptomsText: string;
  treatmentText: string;
}

export interface Diagnosis {
  name: string;
  nameEn: string;
  nameEl: string;
  type: string;
  confidence: number;
  symptoms: string;
  treatment: string;
}

export interface DiagnosisResult {
  plantName: string;
  questionsAnswered: number;
  diagnoses: Diagnosis[];
}

export interface QuestionDisplay {
  id: string;
  text_hu: string;
  text_en: string;
  text_el?: string;
  answers: {
    id: string;
    text_hu: string;
    text_en: string;
    text_el?: string;
  }[];
}

// ---- Engine data ----

const allQuestions: Question[] = (engineData as any).questions;
const plantDiseases: Record<string, { diseases: RawDisease[] }> = (engineData as any).plant_diseases;

// ---- Session class ----

export class DiagnosticSession {
  private questions: Question[];
  private diseaseScores: Map<string, DiseaseScore>;
  private answered: Set<string>;
  private currentLayer: number;
  public plantName: string;

  constructor(plantName: string, externalDiagnosis?: string) {
    this.plantName = plantName;
    this.questions = allQuestions;
    this.answered = new Set();
    this.currentLayer = 1;

    const plantData = plantDiseases[plantName];
    if (!plantData) {
      throw new Error(`Plant '${plantName}' not found in diagnostic database`);
    }

    // Initialize disease scores
    this.diseaseScores = new Map();
    for (const d of plantData.diseases) {
      this.diseaseScores.set(d.disease_id, {
        score: 0.5, // neutral starting score
        name: d.name,
        nameEn: d.name_en || d.name,
        nameEl: d.name_el || d.name_en || d.name,
        type: d.type,
        tags: new Set(d.tags),
        symptomsText: d.symptoms_text,
        treatmentText: d.treatment_text,
      });
    }

    // Boost from external diagnosis (e.g. Plant.id API result)
    if (externalDiagnosis) {
      this.applyExternalDiagnosis(externalDiagnosis);
    }
  }

  private applyExternalDiagnosis(externalName: string): void {
    const extLower = externalName.toLowerCase();
    for (const d of this.diseaseScores.values()) {
      if (
        extLower.includes(d.name.toLowerCase()) ||
        d.name.toLowerCase().includes(extLower)
      ) {
        d.score += 0.4;
      }
    }
  }

  private getAllRemainingTags(): Set<string> {
    const tags = new Set<string>();
    for (const d of this.diseaseScores.values()) {
      if (d.score > 0.1) {
        for (const tag of d.tags) {
          tags.add(tag);
        }
      }
    }
    return tags;
  }

  private isQuestionRelevant(question: Question): boolean {
    if (this.answered.has(question.id)) return false;

    // Layer 1 (environment) questions are always relevant
    if (question.layer === 1) return true;

    // Layer 2-3: check if any remaining disease has relevant tags
    const relevantTags = new Set(question.relevant_tags || []);
    const remainingTags = this.getAllRemainingTags();

    for (const tag of relevantTags) {
      if (remainingTags.has(tag)) return true;
    }
    return false;
  }

  /** Get the next question to ask. Returns null if done. */
  getNextQuestion(): QuestionDisplay | null {
    // Check if we already have a confident diagnosis
    const top = this.getDiagnosis();
    if (top.diagnoses.length > 0 && top.diagnoses[0].confidence > 0.85) {
      return null;
    }

    // Find next relevant question, preferring current layer
    for (
      let layer = this.currentLayer;
      layer <= Math.min(this.currentLayer + 2, 3);
      layer++
    ) {
      for (const q of this.questions) {
        if (q.layer === layer && this.isQuestionRelevant(q)) {
          return {
            id: q.id,
            text_hu: q.text_hu,
            text_en: q.text_en,
            text_el: q.text_el,
            answers: q.answers.map((a) => ({
              id: a.id,
              text_hu: a.text_hu,
              text_en: a.text_en,
              text_el: a.text_el,
            })),
          };
        }
      }
    }

    // Advance layer
    if (this.currentLayer < 3) {
      this.currentLayer++;
      return this.getNextQuestion();
    }

    return null; // No more questions
  }

  /** Process a user's answer to a question. */
  answer(questionId: string, answerId: string): void {
    const question = this.questions.find((q) => q.id === questionId);
    if (!question) throw new Error(`Unknown question: ${questionId}`);

    const answer = question.answers.find((a) => a.id === answerId);
    if (!answer) throw new Error(`Unknown answer: ${answerId}`);

    this.answered.add(questionId);

    const boostTags = new Set(answer.boost_tags || []);
    const boostValue = answer.boost || 0;
    const penalizeTags = new Set(answer.penalize_tags || []);
    const penalizeValue = answer.penalize || 0;

    for (const d of this.diseaseScores.values()) {
      let boosted = false;

      // Boost if disease has any of the boosted tags
      if (boostValue > 0) {
        let overlap = 0;
        for (const tag of boostTags) {
          if (d.tags.has(tag)) overlap++;
        }
        if (overlap > 0) {
          d.score += boostValue * overlap;
          boosted = true;
        }
      }

      // Penalize if disease has any of the penalized tags
      if (penalizeValue > 0) {
        let overlap = 0;
        for (const tag of penalizeTags) {
          if (d.tags.has(tag)) overlap++;
        }
        if (overlap > 0) {
          d.score -= penalizeValue * overlap;
        }
      }

      // Mild penalty for diseases NOT matching any boosted tag
      if (boostTags.size > 0 && !boosted && boostValue > 0) {
        d.score -= boostValue * 0.3;
      }

      // Clamp score
      d.score = Math.max(0.0, Math.min(1.0, d.score));
    }

    // Auto-advance layer if all questions in current layer are answered
    const layerQuestions = this.questions.filter(
      (q) => q.layer === this.currentLayer
    );
    const allAnswered = layerQuestions.every((q) => this.answered.has(q.id));
    if (allAnswered && this.currentLayer < 3) {
      this.currentLayer++;
    }
  }

  /** Get the current top diagnoses. */
  getDiagnosis(topN = 3): DiagnosisResult {
    const sorted = Array.from(this.diseaseScores.values())
      .filter((d) => d.score > 0.05)
      .sort((a, b) => b.score - a.score);

    const totalScore = sorted.reduce((sum, d) => sum + d.score, 0);

    const diagnoses: Diagnosis[] = sorted.slice(0, topN).map((d) => ({
      name: d.name,
      nameEn: d.nameEn,
      nameEl: d.nameEl,
      type: d.type,
      confidence: Math.min(
        0.95,
        totalScore > 0 ? Math.round((d.score / totalScore) * 100) / 100 : 0
      ),
      symptoms: d.symptomsText,
      treatment: d.treatmentText,
    }));

    return {
      plantName: this.plantName,
      questionsAnswered: this.answered.size,
      diagnoses,
    };
  }

  /** Get progress info */
  getProgress(): { answered: number; total: number } {
    const relevantQuestions = this.questions.filter((q) =>
      this.isQuestionRelevant(q) || this.answered.has(q.id)
    );
    return {
      answered: this.answered.size,
      total: Math.max(relevantQuestions.length, this.answered.size),
    };
  }

  /** Check if a plant exists in the diagnostic database */
  static hasPlant(plantName: string): boolean {
    return plantName in plantDiseases;
  }

  /** Get all plants that have diagnostic data */
  static getAvailablePlants(): string[] {
    return Object.keys(plantDiseases);
  }
}
