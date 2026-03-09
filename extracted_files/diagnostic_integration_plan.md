# Diagnosztikai Motor — Integrációs terv

## Jelenlegi állapot

**Kész:**
- `diagnostic_engine.json` — 11 kérdés, 84 növény betegségadatai, tag-alapú pontozás
- `diagnostic.py` — Python session motor (score-olás, kérdésszűrés, diagnózis)
- `diagnostic_routes.py` — FastAPI endpointok
- `terrariums_sample.json` — QR kód minta adat

**Kell még:**
- Frontend oldal(ak) a diagnosztikai flow-hoz
- Offline kliens-oldali motor (az app OFFLINE módban fut, nincs backend!)
- i18n támogatás a kérdésekhez
- Navigáció beépítése a meglévő appba
- (Opcionális) QR szkenner integráció

---

## FONTOS: Az app OFFLINE módban fut!

A `client.ts` mutatja, hogy az app **nem használ backend API-t** — a `plants.json` be van bundle-olva, 
és minden logika kliens-oldalon fut. Tehát:

- ❌ A `diagnostic_routes.py` (FastAPI) NEM használható közvetlenül
- ✅ A `diagnostic.py` logikáját **TypeScript-re kell portolni**
- ✅ A `diagnostic_engine.json` **be kell bundle-olni** az appba (mint a `plants.json`)

---

## Szükséges új fájlok

### 1. `frontend/src/data/diagnostic_engine.json`
A meglévő fájl másolata, beBundle-olva.

### 2. `frontend/src/diagnostic/DiagnosticEngine.ts`
A `diagnostic.py` TypeScript portja. Offline session kezelés.

```
Fő osztály: DiagnosticSession
- constructor(plantName, externalDiagnosis?)
- getNextQuestion() → Question | null
- answer(questionId, answerId)
- getDiagnosis() → DiagnosisResult
```

### 3. `frontend/app/diagnostic.tsx`
Új Expo Router oldal — a diagnosztikai UI.

**3 lépéses flow:**

```
┌─────────────────────────────────┐
│  STEP 1: Növény kiválasztása    │
│                                 │
│  [Növénylista / keresés]        │
│  VAGY                           │
│  [QR scan → terrárium növényei] │
│  → beteg növény kiválasztása    │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│  STEP 2: Kérdések               │
│                                 │
│  "Mikor öntözted utoljára?"     │
│  [Nemrég] [Normálisan] [Régen]  │
│                                 │
│  ┌──────────────────┐           │
│  │ Top diagnózis:   │           │
│  │ Gyökérrot 62%    │           │
│  │ Botrytis  23%    │           │
│  └──────────────────┘           │
│                                 │
│  Kérdés 3/11  [■■■░░░░░░░░]    │
└────────────┬────────────────────┘
             │ (confidence > 85% VAGY nincs több kérdés)
┌────────────▼────────────────────┐
│  STEP 3: Eredmény               │
│                                 │
│  🔴 Gyökérrothadás (78%)        │
│    Tünetek: Puha, barna gyök... │
│    Kezelés: Drenázs javítása... │
│                                 │
│  🟡 Botrytis (15%)              │
│    Tünetek: Szürke penész...    │
│    Kezelés: Szellőztetés...     │
│                                 │
│  [Újra] [Vissza a növényhez]    │
└─────────────────────────────────┘
```

### 4. `frontend/src/i18n/translations.ts` bővítés
Új kulcsok a diagnosztikai UI-hoz:

```
diagnosticTitle: 'Növény diagnózis'
selectPlant: 'Válaszd ki a beteg növényt'
diagnosing: 'Diagnosztizálás...'
topDiagnosis: 'Legvalószínűbb'
confidence: 'Valószínűség'
diagnosisResult: 'Diagnózis eredmény'
symptoms: 'Tünetek' (ez már megvan)
treatment: 'Kezelés' (ez már megvan)
startNewDiagnosis: 'Új diagnózis'
questionProgress: 'Kérdés {n}/{total}'
```

### 5. Navigáció módosítások

**`app/index.tsx`** — Új gomb a főoldalon (a "Terrárium Építő" mellé):
```tsx
<TouchableOpacity onPress={() => router.push('/diagnostic')}>
  <Ionicons name="medkit" />
  <Text>{t('diagnosticTitle')}</Text>
</TouchableOpacity>
```

**`app/_layout.tsx`** — Új Stack.Screen:
```tsx
<Stack.Screen name="diagnostic" options={{ title: t('diagnosticTitle') }} />
```

**`app/plant/[name].tsx`** — "Diagnosztika" gomb a növény részletek oldalon:
```tsx
<TouchableOpacity onPress={() => router.push(`/diagnostic?plant=${name}`)}>
  <Text>{t('diagnoseThisPlant')}</Text>
</TouchableOpacity>
```

---

## A DiagnosticEngine.ts logikája (a diagnostic.py portja)

```typescript
import engineData from '../data/diagnostic_engine.json';

interface DiseaseScore {
  score: number;
  name: string;
  type: string;
  tags: Set<string>;
  symptomsText: string;
  treatmentText: string;
}

export class DiagnosticSession {
  private questions: Question[];
  private diseaseScores: Map<string, DiseaseScore>;
  private answered: Set<string>;
  private currentLayer: number;
  plantName: string;

  constructor(plantName: string, externalDiagnosis?: string) {
    // Load questions and plant diseases from bundled JSON
    // Initialize scores, apply external diagnosis boost
    // Same logic as diagnostic.py
  }

  getNextQuestion(): Question | null {
    // Check confidence threshold (85%)
    // Find next relevant question by layer
    // Filter by remaining disease tags
  }

  answer(questionId: string, answerId: string): void {
    // Apply boosts and penalties to disease scores
    // Auto-advance layer if needed
  }

  getDiagnosis(topN = 3): DiagnosisResult {
    // Sort by score, normalize to confidence %
    // Return top N diagnoses with symptoms + treatment
  }
}
```

---

## Opcionális: QR szkenner

A `terrariums_sample.json` mutatja a QR struktúrát. 
A QR szkenner az `expo-camera` vagy `expo-barcode-scanner` package-gel valósítható meg.

**Flow:**
1. QR scan → JSON parse → terrárium növénylista
2. Növénylista megjelenítése
3. User kiválasztja a beteg növényt
4. → Diagnosztikai flow indul

Ez bonyolultabb, és külön package-eket igényel. Javaslom **első körben kihagyni** 
és a QR-t egy későbbi verzióban hozzáadni. A növényt egyszerűen a meglévő 
keresővel/listából is ki lehet választani.

---

## Implementáció sorrendje

1. **`DiagnosticEngine.ts`** — a Python logika TypeScript portja
2. **`diagnostic_engine.json`** → `src/data/` — bundle-olás
3. **`translations.ts`** — új i18n kulcsok (HU/EN/EL)
4. **`diagnostic.tsx`** — a UI oldal (3 lépéses flow)
5. **`_layout.tsx`** + **`index.tsx`** — navigáció bekötése
6. **`plant/[name].tsx`** — "Diagnózis" gomb hozzáadása
7. (Később) QR szkenner

---

## Fájlstruktúra változások

```
frontend/
├── app/
│   ├── _layout.tsx          ← módosítás (új Screen)
│   ├── index.tsx            ← módosítás (új gomb)
│   ├── builder.tsx
│   ├── diagnostic.tsx       ← ÚJ
│   └── plant/
│       └── [name].tsx       ← módosítás (diagnózis gomb)
├── src/
│   ├── data/
│   │   ├── plants.json
│   │   └── diagnostic_engine.json  ← ÚJ
│   ├── diagnostic/
│   │   └── DiagnosticEngine.ts     ← ÚJ
│   ├── i18n/
│   │   └── translations.ts        ← módosítás
│   └── ...
```
