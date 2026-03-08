"""
Complete Hungarian word replacement in all translations
"""
import asyncio
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

client = MongoClient(MONGO_URL)
db = client["terrarium_db"]
plants = db["plants"]

# Direct replacements for known Hungarian words
REPLACEMENTS = {
    # Plant structure
    'csomó': {'en': 'clump', 'el': 'συστάδα'},
    'csüngő': {'en': 'trailing', 'el': 'κρεμαστό'},
    'kúszó': {'en': 'climbing', 'el': 'αναρριχητικό'},
    'korlátlan': {'en': 'unlimited', 'el': 'απεριόριστο'},
    'Korlátlan': {'en': 'Unlimited', 'el': 'Απεριόριστο'},
    'sziklaborítás': {'en': 'rock cover', 'el': 'κάλυψη βράχων'},
    'szín': {'en': 'color', 'el': 'χρώμα'},
    
    # Growth rate
    'Lassú': {'en': 'Slow', 'el': 'Αργός'},
    'lassú': {'en': 'slow', 'el': 'αργός'},
    'Λασσú': {'en': 'Slow', 'el': 'Αργός'},  # Greek typo
    
    # Disease related
    'Puha tő': {'en': 'Soft base', 'el': 'Μαλακή βάση'},
    'Puha bázis': {'en': 'Soft base', 'el': 'Μαλακή βάση'},
    'Virágszáron': {'en': 'On flower stalk', 'el': 'Στο άνθος'},
    'Kézi eltávolítás': {'en': 'Manual removal', 'el': 'Χειροκίνητη αφαίρεση'},
    'Pajzstetű': {'en': 'Scale', 'el': 'Ψώρα'},
    'pajzstetű': {'en': 'scale', 'el': 'ψώρα'},
    
    # Treatment
    'ragacslapok': {'en': 'sticky traps', 'el': 'κολλητικές παγίδες'},
    'Ragacslapok': {'en': 'Sticky traps', 'el': 'Κολλητικές παγίδες'},
}

def replace_hungarian(text: str, lang: str) -> str:
    """Replace all known Hungarian words in text"""
    if not text or not isinstance(text, str):
        return text
    
    result = text
    for hu_word, translations in REPLACEMENTS.items():
        if hu_word in result:
            result = result.replace(hu_word, translations.get(lang, hu_word))
    
    return result

def fix_dict_recursive(obj, lang: str):
    """Recursively fix Hungarian words in dict/list structures"""
    if isinstance(obj, str):
        return replace_hungarian(obj, lang)
    elif isinstance(obj, dict):
        return {k: fix_dict_recursive(v, lang) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [fix_dict_recursive(item, lang) for item in obj]
    return obj

async def translate_remaining(text: str, lang: str) -> str:
    """Translate remaining Hungarian text using LLM"""
    lang_name = "English" if lang == "en" else "Greek"
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"final-fix-{lang}",
        system_message=f"""Translate this plant care text to {lang_name}. 
Keep numbers, units, scientific names. Only return the translation."""
    ).with_model("openai", "gpt-4o")
    
    try:
        response = await chat.send_message(UserMessage(text=f"Translate: {text}"))
        return response.strip()
    except:
        return text

async def main():
    print("=" * 60)
    print("COMPREHENSIVE HUNGARIAN WORD FIX")
    print("=" * 60)
    
    all_plants = list(plants.find({}))
    fixed_count = 0
    
    for i, plant in enumerate(all_plants):
        translations = plant.get('translations', {})
        original = plant.get('spread_cm', '')  # Check original field too
        updated = False
        
        for lang in ['en', 'el']:
            lang_trans = translations.get(lang, {})
            
            # Fix all string fields
            for field in list(lang_trans.keys()):
                value = lang_trans[field]
                if isinstance(value, str):
                    new_value = replace_hungarian(value, lang)
                    if new_value != value:
                        lang_trans[field] = new_value
                        updated = True
                        print(f"[{i+1}] {plant['name']} [{lang}] {field}: {value[:50]} -> {new_value[:50]}")
                elif isinstance(value, dict):
                    # Handle nested structures like diseases
                    new_value = fix_dict_recursive(value, lang)
                    if new_value != value:
                        lang_trans[field] = new_value
                        updated = True
                        print(f"[{i+1}] {plant['name']} [{lang}] {field}: fixed nested structure")
            
            # Add missing field translations from original
            for field in ['height_cm', 'spread_cm', 'temp']:
                orig_val = plant.get(field, '')
                if orig_val and field not in lang_trans:
                    translated = replace_hungarian(orig_val, lang)
                    if translated != orig_val:
                        lang_trans[field] = translated
                        updated = True
                        print(f"[{i+1}] {plant['name']} [{lang}] {field} (new): {orig_val} -> {translated}")
                elif orig_val and field in lang_trans:
                    # Also check existing translations
                    current = lang_trans[field]
                    fixed = replace_hungarian(current, lang)
                    if fixed != current:
                        lang_trans[field] = fixed
                        updated = True
                        print(f"[{i+1}] {plant['name']} [{lang}] {field}: {current[:50]} -> {fixed[:50]}")
            
            translations[lang] = lang_trans
        
        if updated:
            plants.update_one({'_id': plant['_id']}, {'$set': {'translations': translations}})
            fixed_count += 1
    
    print(f"\n{'=' * 60}")
    print(f"Fixed {fixed_count} plants")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
