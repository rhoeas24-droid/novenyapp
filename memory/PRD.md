# Florárium Mester - Product Requirements Document

## Original Problem Statement
A "Florárium Mester" (Florarium Master) mobil alkalmazás, amely terrárium növénytársító útmutatóként szolgál. Az alkalmazás lehetővé teszi a felhasználók számára, hogy megtalálják az egymással kompatibilis növényeket a terrárium típusához.

## Core Features
1. **Növény kompatibilitás**: Amikor a felhasználó kiválaszt egy növényt, az alkalmazás megjeleníti az azzal kompatibilis növényeket (talaj, fény, páratartalom alapján)
2. **Szűrés**: Terrárium típus (zárt, félzárt, nyitott) és növénycsoport szerinti szűrés
3. **Többnyelvűség**: Magyar, angol és görög nyelvi támogatás
4. **Offline mód**: AsyncStorage gyorsítótárazással
5. **Egyedi splash screen és app ikon**

## Technical Stack
- **Frontend**: Expo, React Native, TypeScript, Expo Router, Zustand
- **Backend**: Python, FastAPI, MongoDB
- **i18n**: Custom LanguageContext + translations.ts
- **Translation**: OpenAI GPT-4o via emergentintegrations

## Data
- 77 növény az adatbázisban
- Képek base64 formátumban tárolva
- Fordítások a `translations` mezőben tárolva minden növénynél

## API Endpoints
- `GET /api/plants?lang={hu|en|el}` - Növények listája
- `GET /api/plants/{name}?lang={hu|en|el}` - Növény részletek
- `GET /api/plants/{name}/compatible?lang={hu|en|el}` - Kompatibilis növények
- `GET /api/plants/{name}/image` - Növény képe (lazy loading)
- `GET /api/groups` - Növénycsoportok

## Completed (2025-03-08)
- [x] Core app development (home, detail screen)
- [x] Plant compatibility algorithm
- [x] Terrarium type filtering
- [x] Search functionality
- [x] Animated splash screen
- [x] Custom app icon
- [x] UI translation (HU, EN, EL)
- [x] Language switcher with cache clear
- [x] Backend translation endpoint support
- [x] Database translation script running (77 plants to EN/EL)
- [x] Frontend API calls with language parameter

## In Progress
- None

## Recently Completed (2025-03-08)
- [x] Database content translation - ALL 77 plants translated to EN and EL
- [x] Disease names translation - ALL disease/pest names translated to EN and EL
- [x] Hungarian words fixed (csomó, terítő, Korlátlan, etc.)
- [x] Hypoestes phyllostachya image updated
- [x] Navigation fix with router.replace
- [x] **NEW: Build Your Own Terrarium** feature added
  - Container selection (shape, opening type, size)
  - First plant selection based on terrarium type
  - Compatible plants with compatibility score
  - Summary with substrate, light, humidity, care tips, warnings

## Known Limitations
- Back navigation from compatible plants goes directly to home (not to previous plant) - this is an Expo Router limitation with dynamic routes
https://terrarium-guide-dev.preview.emergentagent.com

## User Language
Hungarian (Magyar)
