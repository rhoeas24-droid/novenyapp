// Internationalization (i18n) support for Florarium World
// Languages: Hungarian (hu), English (en), Greek (el)

export type Language = 'hu' | 'en' | 'el';

export const translations = {
  hu: {
    // App
    appName: 'Florarium World',
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
      'Tillandsia': 'Tillandsia',
    },
    
    // Terrarium badge abbreviations (shown on plant cards)
    badgeClosed: 'Z',
    badgeSemiClosed: 'F',
    badgeOpen: 'N',
    
    // Settings
    language: 'Nyelv',
    hungarian: 'Magyar',
    english: 'English',
    greek: 'Ελληνικά',
    
    // Builder
    buildTerrarium: 'Terrárium Építő',
    selectContainer: 'Válaszd ki az üvegedényt',
    shape: 'Forma',
    cylinder: 'Henger',
    bottle: 'Palack',
    sphere: 'Gömb',
    cube: 'Kocka',
    opening: 'Nyílás',
    narrowMouth: 'Keskeny',
    wideMouth: 'Széles',
    mediumMouth: 'Közepes',
    small: 'Kicsi',
    medium: 'Közepes',
    large: 'Nagy',
    continue: 'Tovább',
    selectFirstPlant: 'Válaszd ki az első növényt',
    firstPlantHint: 'Ez határozza meg a terrárium alap követelményeit',
    addMorePlants: 'Adj hozzá növényeket',
    plantsSelected: 'növény kiválasztva',
    selectedPlants: 'Kiválasztott növények',
    compatiblePlants: 'Kompatibilis növények',
    viewSummary: 'Összesítő megtekintése',
    yourTerrarium: 'A Te Terráriumod',
    lightRequirements: 'Fényigény',
    careTips: 'Gondozási tippek',
    watchOut: 'Figyelj oda',
    startOver: 'Újrakezdés',
    watering: 'Öntözés',
    wateringClosed: 'Zárt rendszer – minimális öntözés szükséges; a páralecsapódás visszajuttatja a vizet. Csak ha a szubsztrát felszíne száraz.',
    wateringSemiClosed: 'Félzárt rendszer – hetente ellenőrizd a szubsztrát nedvességét. Permetezz ha a páratartalom csökken.',
    wateringOpen: 'Nyitott rendszer – rendszeres öntözés szükséges. A szubsztrát legyen egyenletesen nedves, de ne vízben álló.',
    softLimitReached: 'Elérted a javasolt növényszámot. Szeretnél még hozzáadni?',
    yesAddMore: 'Igen, adj hozzá',
    noGoToSummary: 'Nem, összesítő',
    overcrowdingWarning: 'A terrárium zsúfolt lehet. A mohák kevés helyet foglalnak, de a nagyobb növényeknek több tér kell a gyökereiknek és a lombjuknak.',
    saveTerrarium: 'Mentés',
    exportPDF: 'PDF export',
    myTerrariums: 'Terráriumaim',
    saved: 'Mentve',
    terrariumSaved: 'A terrárium elmentve a Terráriumaim listába.',
    noSavedTerrariums: 'Még nincs mentett terráriumod.',
    deleteTerrarium: 'Törlés',
    confirmDelete: 'Biztosan törlöd ezt a terráriumot?',
    cancel: 'Mégsem',
    delete: 'Törlés',
    plantProfiles: 'Növény adatlapok',
    
    // Diagnostic
    diagnosticTitle: 'Növény diagnózis',
    selectPlantForDiagnosis: 'Melyik növény beteg?',
    selectPlantHint: 'Válaszd ki a terráriumodból',
    diagnoseThisPlant: 'Diagnosztika',
    topDiagnosis: 'Legvalószínűbb',
    diagnosisResult: 'Diagnózis eredmény',
    startNewDiagnosis: 'Új diagnózis',
    backToPlant: 'Vissza a növényhez',
    questionProgress: 'Kérdés {n}/{total}',
    questionsAnsweredLabel: 'kérdés megválaszolva',
  },
  
  en: {
    // App
    appName: 'Florarium World',
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
    
    // Terrarium badge abbreviations (shown on plant cards)
    badgeClosed: 'C',
    badgeSemiClosed: 'S',
    badgeOpen: 'O',
    
    // Settings
    language: 'Language',
    hungarian: 'Magyar',
    english: 'English',
    greek: 'Ελληνικά',
    
    // Builder
    buildTerrarium: 'Terrarium Builder',
    selectContainer: 'Select your container',
    shape: 'Shape',
    cylinder: 'Cylinder',
    bottle: 'Bottle',
    sphere: 'Sphere',
    cube: 'Cube',
    opening: 'Opening',
    narrowMouth: 'Narrow',
    wideMouth: 'Wide',
    mediumMouth: 'Medium',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    continue: 'Continue',
    selectFirstPlant: 'Select your first plant',
    firstPlantHint: 'This will set the base requirements for your terrarium',
    addMorePlants: 'Add more plants',
    plantsSelected: 'plants selected',
    selectedPlants: 'Selected plants',
    compatiblePlants: 'Compatible plants',
    viewSummary: 'View Summary',
    yourTerrarium: 'Your Terrarium',
    lightRequirements: 'Light Requirements',
    careTips: 'Care Tips',
    watchOut: 'Watch Out For',
    startOver: 'Start Over',
    watering: 'Watering',
    wateringClosed: 'Closed system – minimal watering needed; condensation recycles moisture. Only water if the substrate surface is dry.',
    wateringSemiClosed: 'Semi-closed system – check substrate moisture weekly. Mist if humidity drops.',
    wateringOpen: 'Open system – regular watering required. Keep substrate evenly moist but not waterlogged.',
    softLimitReached: 'You\'ve reached the recommended plant count. Would you like to add more?',
    yesAddMore: 'Yes, add more',
    noGoToSummary: 'No, view summary',
    overcrowdingWarning: 'The terrarium may be overcrowded. Mosses take minimal space, but larger plants need room for their roots and foliage.',
    saveTerrarium: 'Save',
    exportPDF: 'PDF export',
    myTerrariums: 'My Terrariums',
    saved: 'Saved',
    terrariumSaved: 'Terrarium saved to My Terrariums list.',
    noSavedTerrariums: 'You don\'t have any saved terrariums yet.',
    deleteTerrarium: 'Delete',
    confirmDelete: 'Are you sure you want to delete this terrarium?',
    cancel: 'Cancel',
    delete: 'Delete',
    plantProfiles: 'Plant Profiles',
    
    // Diagnostic
    diagnosticTitle: 'Plant Diagnosis',
    selectPlantForDiagnosis: 'Which plant is sick?',
    selectPlantHint: 'Select from your terrarium',
    diagnoseThisPlant: 'Diagnose',
    topDiagnosis: 'Most likely',
    diagnosisResult: 'Diagnosis Result',
    startNewDiagnosis: 'New Diagnosis',
    backToPlant: 'Back to Plant',
    questionProgress: 'Question {n}/{total}',
    questionsAnsweredLabel: 'questions answered',
  },
  
  el: {
    // App
    appName: 'Florarium World',
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
      'Tillandsia': 'Tillandsia (Αερόφυτα)',
    },
    
    // Terrarium badge abbreviations (shown on plant cards)
    badgeClosed: 'Κ',
    badgeSemiClosed: 'Η',
    badgeOpen: 'Α',
    
    // Settings
    language: 'Γλώσσα',
    hungarian: 'Magyar',
    english: 'English',
    greek: 'Ελληνικά',
    
    // Builder
    buildTerrarium: 'Κατασκευαστής Τεραρίου',
    selectContainer: 'Επιλέξτε το δοχείο σας',
    shape: 'Σχήμα',
    cylinder: 'Κύλινδρος',
    bottle: 'Μπουκάλι',
    sphere: 'Σφαίρα',
    cube: 'Κύβος',
    opening: 'Άνοιγμα',
    narrowMouth: 'Στενό',
    wideMouth: 'Φαρδύ',
    mediumMouth: 'Μεσαίο',
    small: 'Μικρό',
    medium: 'Μεσαίο',
    large: 'Μεγάλο',
    continue: 'Συνέχεια',
    selectFirstPlant: 'Επιλέξτε το πρώτο φυτό',
    firstPlantHint: 'Αυτό θα καθορίσει τις βασικές απαιτήσεις του τεραρίου',
    addMorePlants: 'Προσθέστε περισσότερα φυτά',
    plantsSelected: 'φυτά επιλεγμένα',
    selectedPlants: 'Επιλεγμένα φυτά',
    compatiblePlants: 'Συμβατά φυτά',
    viewSummary: 'Προβολή Σύνοψης',
    yourTerrarium: 'Το Τεράριό Σας',
    lightRequirements: 'Απαιτήσεις Φωτός',
    careTips: 'Συμβουλές Φροντίδας',
    watchOut: 'Προσοχή',
    startOver: 'Ξεκινήστε Ξανά',
    watering: 'Πότισμα',
    wateringClosed: 'Κλειστό σύστημα – ελάχιστο πότισμα χρειάζεται· η συμπύκνωση ανακυκλώνει την υγρασία. Μόνο αν η επιφάνεια του υποστρώματος είναι στεγνή.',
    wateringSemiClosed: 'Ημίκλειστο σύστημα – ελέγχετε την υγρασία του υποστρώματος εβδομαδιαία. Ψεκάστε αν η υγρασία πέσει.',
    wateringOpen: 'Ανοιχτό σύστημα – απαιτείται τακτικό πότισμα. Το υπόστρωμα να παραμένει ομοιόμορφα υγρό αλλά όχι πλημμυρισμένο.',
    softLimitReached: 'Φτάσατε τον προτεινόμενο αριθμό φυτών. Θέλετε να προσθέσετε ακόμα;',
    yesAddMore: 'Ναι, πρόσθεσε',
    noGoToSummary: 'Όχι, σύνοψη',
    overcrowdingWarning: 'Το τεράριο μπορεί να είναι υπερπλήρες. Τα βρύα καταλαμβάνουν ελάχιστο χώρο, αλλά τα μεγαλύτερα φυτά χρειάζονται χώρο για τις ρίζες και το φύλλωμά τους.',
    saveTerrarium: 'Αποθήκευση',
    exportPDF: 'Εξαγωγή PDF',
    myTerrariums: 'Τα Τεράριά μου',
    saved: 'Αποθηκεύτηκε',
    terrariumSaved: 'Το τεράριο αποθηκεύτηκε στη λίστα.',
    noSavedTerrariums: 'Δεν έχετε αποθηκευμένα τεράρια ακόμα.',
    deleteTerrarium: 'Διαγραφή',
    confirmDelete: 'Θέλετε σίγουρα να διαγράψετε αυτό το τεράριο;',
    cancel: 'Ακύρωση',
    delete: 'Διαγραφή',
    plantProfiles: 'Προφίλ Φυτών',
    
    // Diagnostic
    diagnosticTitle: 'Διάγνωση φυτού',
    selectPlantForDiagnosis: 'Ποιο φυτό είναι άρρωστο;',
    selectPlantHint: 'Επιλέξτε από το τεράριό σας',
    diagnoseThisPlant: 'Διάγνωση',
    topDiagnosis: 'Πιθανότερο',
    diagnosisResult: 'Αποτέλεσμα διάγνωσης',
    startNewDiagnosis: 'Νέα διάγνωση',
    backToPlant: 'Πίσω στο φυτό',
    questionProgress: 'Ερώτηση {n}/{total}',
    questionsAnsweredLabel: 'ερωτήσεις απαντήθηκαν',
  },
};

export type TranslationKeys = keyof typeof translations.hu;

export const getTranslation = (lang: Language, key: TranslationKeys): string => {
  return translations[lang][key] as string || translations.hu[key] as string || key;
};

export const getGroupTranslation = (lang: Language, groupId: string): string => {
  return translations[lang].groups[groupId as keyof typeof translations.hu.groups] || groupId;
};
