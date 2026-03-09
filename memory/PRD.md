# Florárium Mester - Product Requirements Document

## Original Problem Statement
A "Florárium Mester" (Florarium Master) mobil alkalmazás, amely terrárium növénytársító útmutatóként szolgál. Az alkalmazás lehetővé teszi a felhasználók számára, hogy megtalálják az egymással kompatibilis növényeket a terrárium típusához.

## Core Features
1. **Növény kompatibilitás**: Amikor a felhasználó kiválaszt egy növényt, az alkalmazás megjeleníti az azzal kompatibilis növényeket (talaj, fény, páratartalom alapján)
2. **Szűrés**: Terrárium típus (zárt, félzárt, nyitott) és növénycsoport szerinti szűrés
3. **Többnyelvűség**: Magyar, angol és görög nyelvi támogatás
4. **OFFLINE MÓD**: Teljes offline működés - minden adat (84 növény + képek) be van csomagolva az alkalmazásba
5. **Egyedi splash screen és app ikon**
6. **Terrárium Építő**: Lépésről lépésre segít felépíteni a terráriumod
7. **Növény Diagnózis**: Kérdőív alapú diagnosztikai eszköz betegségek/kártevők azonosítására

## Technical Stack
- **Frontend**: Expo, React Native, TypeScript, Expo Router, Zustand
- **Backend**: Python, FastAPI, MongoDB (csak fejlesztéshez, az app teljesen offline működik)
- **i18n**: Custom LanguageContext + translations.ts
- **Data**: Minden adat `frontend/src/data/plants.json` és `frontend/src/data/diagnostic_engine.json` fájlokban

## Data
- 84 növény az adatbázisban
- Képek base64 formátumban tárolva inline a JSON-ban
- Fordítások 3 nyelven (HU, EN, EL)
- Diagnosztikai motor 11 kérdéssel és betegség/kártevő adatbázissal

## Key Files
- `frontend/src/data/plants.json` - Növények adatbázisa képekkel
- `frontend/src/data/diagnostic_engine.json` - Diagnosztikai motor adatai
- `frontend/src/data/confirmed_translations.json` - Megerősített fordítások
- `frontend/src/diagnostic/DiagnosticEngine.ts` - Diagnosztikai logika
- `frontend/app/diagnostic.tsx` - Diagnosztikai UI
- `frontend/app/builder.tsx` - Terrárium Építő
- `frontend/src/i18n/translations.ts` - UI fordítások

## Completed Features

### 2025-03-09
- [x] **TELJES OFFLINE MÓD** implementálva
  - Minden növényadat (84 db) becsomagolva az alkalmazásba
  - Base64 képek beágyazva a JSON-ba
  - Nincs szükség backend kapcsolatra
- [x] **Növény Diagnózis modul** implementálva
  - 11 kérdéses diagnosztikai kérdőív
  - Valószínűség alapú diagnózis
  - Magyar nyelvű kérdések és válaszok
  - Betegségek és kártevők azonosítása
- [x] **Bővített fordítások**
  - Diagnosztikai UI kulcsok (hu, en, el)
  - Badge rövidítések nyelvfüggően (Z/F/N, C/S/O, Κ/Η/Α)

### 2025-03-08
- [x] Core app development (home, detail screen)
- [x] Plant compatibility algorithm
- [x] Terrarium type filtering
- [x] Search functionality
- [x] Animated splash screen with t() for subtitle
- [x] Custom app icon
- [x] UI translation (HU, EN, EL)
- [x] Language switcher
- [x] Database content translation - ALL 84 plants translated
- [x] **Build Your Own Terrarium** feature
  - Container selection (shape, opening type, size, terrarium type)
  - First plant selection based on terrarium type
  - Compatible plants with compatibility score
  - Summary with substrate recipe, light, humidity, care tips, warnings

## APK Build
Az alkalmazás teljesen offline működik, ezért az APK build-hez:
1. `cd frontend`
2. `npm install` vagy `yarn install`
3. `eas build -p android --profile preview`

## Known Limitations
- Language selector nem működik web preview-ban (csak a mobil alkalmazásban)
- Back navigation from compatible plants goes directly to home (Expo Router limitation)

## Future Tasks (Backlog)
- [ ] AI-alapú képelemzés a növény diagnózishoz (fénykép feltöltéssel)
- [ ] Push értesítések öntözési emlékeztetőkhez
- [ ] Közösségi funkciók (terrárium megosztás)

## User Language
Hungarian (Magyar)

## Preview URL
https://plant-matcher.preview.emergentagent.com
