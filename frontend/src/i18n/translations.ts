// Internationalization (i18n) support for Florárium Mester
// Languages: Hungarian (hu), English (en), Greek (el)

export type Language = 'hu' | 'en' | 'el';

export const translations = {
  hu: {
    // App
    appName: 'Florárium Mester',
    splashSubtitle: 'Találd meg a tökéletes növénytársakat',
    
    // Home screen
    searchPlaceholder: 'Növény keresése...',
    terrariumType: 'Terrárium típus',
    plantGroup: 'Növénycsoport',
    all: 'Mind',
    closed: 'Zárt',
    semiClosed: 'Félzárt',
    open: 'Nyitott',
    plants: 'növény',
    intoTerrarium: 'terráriumba',
    noResults: 'Nincs találat',
    tryOtherFilters: 'Próbálj más keresési feltételeket',
    loadingPlants: 'Növények betöltése...',
    errorLoading: 'Hiba történt az adatok betöltésekor. Próbáld újra később.',
    
    // Plant detail
    plantDetails: 'Növény részletek',
    back: 'Vissza',
    terrariumCompatibility: 'Terrárium kompatibilitás',
    information: 'Információk',
    compatible: 'Társítható',
    
    // Care info
    basicCare: 'Alapvető gondozás',
    lightRequirement: 'Fényigény',
    humidity: 'Páratartalom',
    temperature: 'Hőmérséklet',
    substrate: 'Szubsztrát',
    
    // Growth info
    growth: 'Növekedés',
    size: 'Méret',
    height: 'magasság',
    width: 'szélesség',
    growthRate: 'Növekedési ütem',
    propagation: 'Szaporítás',
    roleInTerrarium: 'Szerep a terráriumban',
    
    // Warnings & maintenance
    warning: 'Figyelmeztetés',
    maintenance: 'Karbantartás',
    
    // Diseases
    diseasesAndPests: 'Betegségek és kártevők',
    fungalDiseases: 'Gombás betegségek',
    pests: 'Kártevők',
    otherProblems: 'Egyéb problémák',
    symptoms: 'Tünetek',
    treatment: 'Kezelés',
    
    // Compatible plants
    filterByTerrarium: 'Szűrés terrárium típus szerint:',
    compatibilityInfo: 'A kompatibilitás a páratartalom, fényigény és szubsztrát igények alapján kerül kiszámításra.',
    noCompatiblePlants: 'Nincs megfelelő kompatibilitású növény a szűrési feltételekkel.',
    
    // Plant groups
    groups: {
      'Ferns & Foliage': 'Páfrányok és Lombnövények',
      'Peperomia & Pilea': 'Peperomia és Pilea',
      'Aroids & Tropicals': 'Aroidok és Trópusi növények',
      'Moss & Selaginella': 'Mohák és Selaginella',
      'Succulents & Cacti': 'Pozsgások és Kaktuszok',
      'Carnivorous': 'Húsevő növények',
      'Tillandsia': 'Tillandsia (Légynövények)',
    },
    
    // Settings
    language: 'Nyelv',
    hungarian: 'Magyar',
    english: 'English',
    greek: 'Ελληνικά',
  },
  
  en: {
    // App
    appName: 'Florarium Master',
    splashSubtitle: 'Find the perfect plant companions',
    
    // Home screen
    searchPlaceholder: 'Search plant...',
    terrariumType: 'Terrarium type',
    plantGroup: 'Plant group',
    all: 'All',
    closed: 'Closed',
    semiClosed: 'Semi-closed',
    open: 'Open',
    plants: 'plants',
    intoTerrarium: 'terrarium',
    noResults: 'No results',
    tryOtherFilters: 'Try different search filters',
    loadingPlants: 'Loading plants...',
    errorLoading: 'Error loading data. Please try again later.',
    
    // Plant detail
    plantDetails: 'Plant details',
    back: 'Back',
    terrariumCompatibility: 'Terrarium compatibility',
    information: 'Information',
    compatible: 'Compatible',
    
    // Care info
    basicCare: 'Basic care',
    lightRequirement: 'Light requirement',
    humidity: 'Humidity',
    temperature: 'Temperature',
    substrate: 'Substrate',
    
    // Growth info
    growth: 'Growth',
    size: 'Size',
    height: 'height',
    width: 'width',
    growthRate: 'Growth rate',
    propagation: 'Propagation',
    roleInTerrarium: 'Role in terrarium',
    
    // Warnings & maintenance
    warning: 'Warning',
    maintenance: 'Maintenance',
    
    // Diseases
    diseasesAndPests: 'Diseases and pests',
    fungalDiseases: 'Fungal diseases',
    pests: 'Pests',
    otherProblems: 'Other problems',
    symptoms: 'Symptoms',
    treatment: 'Treatment',
    
    // Compatible plants
    filterByTerrarium: 'Filter by terrarium type:',
    compatibilityInfo: 'Compatibility is calculated based on humidity, light and substrate requirements.',
    noCompatiblePlants: 'No compatible plants found with the current filters.',
    
    // Plant groups
    groups: {
      'Ferns & Foliage': 'Ferns & Foliage',
      'Peperomia & Pilea': 'Peperomia & Pilea',
      'Aroids & Tropicals': 'Aroids & Tropicals',
      'Moss & Selaginella': 'Moss & Selaginella',
      'Succulents & Cacti': 'Succulents & Cacti',
      'Carnivorous': 'Carnivorous Plants',
      'Tillandsia': 'Tillandsia (Air Plants)',
    },
    
    // Settings
    language: 'Language',
    hungarian: 'Magyar',
    english: 'English',
    greek: 'Ελληνικά',
  },
  
  el: {
    // App
    appName: 'Florarium Master',
    splashSubtitle: 'Βρες τους τέλειους συντρόφους φυτών',
    
    // Home screen
    searchPlaceholder: 'Αναζήτηση φυτού...',
    terrariumType: 'Τύπος τεραρίου',
    plantGroup: 'Ομάδα φυτών',
    all: 'Όλα',
    closed: 'Κλειστό',
    semiClosed: 'Ημίκλειστο',
    open: 'Ανοιχτό',
    plants: 'φυτά',
    intoTerrarium: 'τεράριο',
    noResults: 'Δεν βρέθηκαν αποτελέσματα',
    tryOtherFilters: 'Δοκίμασε διαφορετικά φίλτρα αναζήτησης',
    loadingPlants: 'Φόρτωση φυτών...',
    errorLoading: 'Σφάλμα κατά τη φόρτωση δεδομένων. Δοκίμασε ξανά αργότερα.',
    
    // Plant detail
    plantDetails: 'Λεπτομέρειες φυτού',
    back: 'Πίσω',
    terrariumCompatibility: 'Συμβατότητα τεραρίου',
    information: 'Πληροφορίες',
    compatible: 'Συμβατά',
    
    // Care info
    basicCare: 'Βασική φροντίδα',
    lightRequirement: 'Απαίτηση φωτός',
    humidity: 'Υγρασία',
    temperature: 'Θερμοκρασία',
    substrate: 'Υπόστρωμα',
    
    // Growth info
    growth: 'Ανάπτυξη',
    size: 'Μέγεθος',
    height: 'ύψος',
    width: 'πλάτος',
    growthRate: 'Ρυθμός ανάπτυξης',
    propagation: 'Πολλαπλασιασμός',
    roleInTerrarium: 'Ρόλος στο τεράριο',
    
    // Warnings & maintenance
    warning: 'Προειδοποίηση',
    maintenance: 'Συντήρηση',
    
    // Diseases
    diseasesAndPests: 'Ασθένειες και παράσιτα',
    fungalDiseases: 'Μυκητιακές ασθένειες',
    pests: 'Παράσιτα',
    otherProblems: 'Άλλα προβλήματα',
    symptoms: 'Συμπτώματα',
    treatment: 'Θεραπεία',
    
    // Compatible plants
    filterByTerrarium: 'Φιλτράρισμα ανά τύπο τεραρίου:',
    compatibilityInfo: 'Η συμβατότητα υπολογίζεται με βάση τις απαιτήσεις υγρασίας, φωτός και υποστρώματος.',
    noCompatiblePlants: 'Δεν βρέθηκαν συμβατά φυτά με τα τρέχοντα φίλτρα.',
    
    // Plant groups
    groups: {
      'Ferns & Foliage': 'Φτέρες & Φυλλώματα',
      'Peperomia & Pilea': 'Πεπερόμια & Πιλέα',
      'Aroids & Tropicals': 'Αροειδή & Τροπικά',
      'Moss & Selaginella': 'Βρύα & Σελαγινέλλα',
      'Succulents & Cacti': 'Παχύφυτα & Κάκτοι',
      'Carnivorous': 'Σαρκοφάγα Φυτά',
      'Tillandsia': 'Τιλάντσια (Αερόφυτα)',
    },
    
    // Settings
    language: 'Γλώσσα',
    hungarian: 'Magyar',
    english: 'English',
    greek: 'Ελληνικά',
  },
};

export type TranslationKeys = keyof typeof translations.hu;

export const getTranslation = (lang: Language, key: TranslationKeys): string => {
  return translations[lang][key] as string || translations.hu[key] as string || key;
};

export const getGroupTranslation = (lang: Language, groupId: string): string => {
  return translations[lang].groups[groupId as keyof typeof translations.hu.groups] || groupId;
};
