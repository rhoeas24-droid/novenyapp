"""
Fix remaining Hungarian words in translations
- height_cm, spread_cm fields
- Failed disease treatments
"""
import asyncio
import os
import re
from pymongo import MongoClient
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

client = MongoClient(MONGO_URL)
db = client["terrarium_db"]
plants_collection = db["plants"]

# Hungarian words that need translation
HU_WORDS = {
    'csüngő': {'en': 'trailing', 'el': 'κρεμαστό'},
    'kúszó': {'en': 'climbing', 'el': 'αναρριχητικό'},
    'ragacslapok': {'en': 'sticky traps', 'el': 'κολλητικές παγίδες'},
    'opt.': {'en': 'opt.', 'el': 'opt.'},
}

# Additional fields that may contain Hungarian
EXTRA_FIELDS = ['height_cm', 'spread_cm', 'temp']

async def translate_text(text: str, target_lang: str, context: str = "") -> str:
    """Translate text to target language"""
    if not text or text == '—' or text.strip() == '':
        return text
    
    lang_name = "English" if target_lang == "en" else "Greek"
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"fix-{target_lang}",
        system_message=f"""You are a professional translator for terrarium/plant care content.
Translate to {lang_name}. Keep numbers, units (cm, %, °C), and scientific terms.
Only return the translation, no explanations.
Common terms:
- csüngő = trailing (for hanging plants)
- kúszó = climbing
- ragacslapok = sticky traps (for pest control)
- opt./optimális = opt./optimal"""
    ).with_model("openai", "gpt-4o")
    
    try:
        response = await chat.send_message(UserMessage(text=f"Translate: {text}"))
        return response.strip()
    except Exception as e:
        print(f"  Error translating: {e}")
        return text

def replace_hu_words(text: str, lang: str) -> str:
    """Quick replacement of known Hungarian words"""
    if not text:
        return text
    result = text
    for hu_word, translations in HU_WORDS.items():
        if hu_word in result.lower():
            result = re.sub(re.escape(hu_word), translations[lang], result, flags=re.IGNORECASE)
    return result

async def fix_plant(plant: dict) -> dict:
    """Fix translations for a plant"""
    translations = plant.get('translations', {})
    updates_made = False
    
    for lang in ['en', 'el']:
        lang_trans = translations.get(lang, {})
        
        # Fix height_cm, spread_cm, temp
        for field in EXTRA_FIELDS:
            original = plant.get(field, '')
            if original and any(hu in original.lower() for hu in ['csüngő', 'kúszó', 'optimális']):
                # First try quick replacement
                translated = replace_hu_words(original, lang)
                if translated != original:
                    lang_trans[field] = translated
                    updates_made = True
                    print(f"    Fixed {field}: {original} -> {translated}")
        
        # Fix disease treatments that failed
        diseases = plant.get('diseases', {})
        lang_diseases = lang_trans.get('diseases', {})
        
        for cat in ['fungal', 'pests', 'other']:
            if cat not in diseases:
                continue
            if cat not in lang_diseases:
                lang_diseases[cat] = []
            
            for i, disease in enumerate(diseases.get(cat, [])):
                if i >= len(lang_diseases.get(cat, [])):
                    continue
                
                lang_disease = lang_diseases[cat][i]
                
                # Check if treatment has error message or Hungarian words
                treatment = lang_disease.get('treatment', '')
                original_treatment = disease.get('treatment', '')
                
                needs_fix = (
                    'non-Latin' in treatment or 
                    'non-recognizable' in treatment or
                    'ragacslapok' in treatment.lower() or
                    'ragacslapok' in original_treatment.lower()
                )
                
                if needs_fix and original_treatment:
                    print(f"    Retranslating treatment: {original_treatment[:50]}...")
                    new_treatment = await translate_text(original_treatment, lang, "pest treatment")
                    lang_diseases[cat][i]['treatment'] = new_treatment
                    updates_made = True
                    await asyncio.sleep(0.3)
        
        if lang_diseases:
            lang_trans['diseases'] = lang_diseases
        translations[lang] = lang_trans
    
    return translations if updates_made else None

async def main():
    print("=" * 60)
    print("FIXING REMAINING HUNGARIAN WORDS")
    print("=" * 60)
    
    plants = list(plants_collection.find({}))
    total = len(plants)
    fixed_count = 0
    
    for i, plant in enumerate(plants):
        plant_name = plant['name']
        
        # Check if this plant needs fixing
        needs_fix = False
        for field in EXTRA_FIELDS:
            val = plant.get(field, '')
            if val and any(hu in val.lower() for hu in ['csüngő', 'kúszó']):
                needs_fix = True
                break
        
        # Check disease treatments
        diseases = plant.get('diseases', {})
        translations = plant.get('translations', {})
        for lang in ['en', 'el']:
            lang_diseases = translations.get(lang, {}).get('diseases', {})
            for cat in lang_diseases:
                for d in lang_diseases.get(cat, []):
                    treatment = d.get('treatment', '')
                    if 'non-Latin' in treatment or 'ragacslapok' in treatment.lower():
                        needs_fix = True
                        break
        
        if not needs_fix:
            continue
        
        print(f"[{i+1}/{total}] Fixing: {plant_name}")
        
        new_translations = await fix_plant(plant)
        
        if new_translations:
            plants_collection.update_one(
                {'_id': plant['_id']},
                {'$set': {'translations': new_translations}}
            )
            fixed_count += 1
    
    print("\n" + "=" * 60)
    print(f"FIXED {fixed_count} plants!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
