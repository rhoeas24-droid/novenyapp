"""
Plant Database Translator
Translates all plant data from Hungarian to English and Greek using GPT-4o
"""
import asyncio
import json
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY", "sk-emergent-1B9D0941f064b0a001")
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

# Connect to MongoDB
client = MongoClient(MONGO_URL)
db = client["terrarium_db"]
plants_collection = db["plants"]

# Fields to translate
FIELDS_TO_TRANSLATE = [
    'common',  # Common name
    'light',   # Light requirements
    'temp',    # Temperature
    'humidity',  # Humidity
    'substrate_notes',  # Substrate notes
    'propagation',  # Propagation
    'avoid',   # Warnings
    'maintenance',  # Maintenance
    'role',    # Role in terrarium
    'growth_rate',  # Growth rate
]

DISEASE_FIELDS = ['symptoms', 'treatment']

async def translate_text(text: str, target_lang: str, context: str = "terrarium plant care") -> str:
    """Translate text to target language using GPT-4o"""
    if not text or text == '—' or text.strip() == '':
        return text
    
    lang_name = "English" if target_lang == "en" else "Greek"
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"translate-{target_lang}",
        system_message=f"""You are a professional translator specializing in botanical and terrarium terminology. 
Translate the following text to {lang_name} with:
- Perfect grammar
- Appropriate botanical terminology
- Natural, fluent language
- Preserve any measurements, percentages, and scientific terms
Only return the translation, nothing else."""
    ).with_model("openai", "gpt-4o")
    
    user_message = UserMessage(
        text=f"Translate this {context} text to {lang_name}:\n\n{text}"
    )
    
    try:
        response = await chat.send_message(user_message)
        return response.strip()
    except Exception as e:
        print(f"  Translation error: {e}")
        return text

async def translate_diseases(diseases: dict, target_lang: str) -> dict:
    """Translate disease information"""
    if not diseases:
        return diseases
    
    translated = {}
    
    for category in ['fungal', 'pests', 'other']:
        if category in diseases and diseases[category]:
            translated[category] = []
            for disease in diseases[category]:
                translated_disease = {'name': disease.get('name', '')}
                for field in DISEASE_FIELDS:
                    if field in disease and disease[field]:
                        translated_disease[field] = await translate_text(
                            disease[field], 
                            target_lang, 
                            f"plant disease {field}"
                        )
                    else:
                        translated_disease[field] = disease.get(field, '')
                translated[category].append(translated_disease)
    
    return translated

async def translate_plant(plant: dict, target_lang: str) -> dict:
    """Translate all fields of a plant"""
    translated = {}
    
    for field in FIELDS_TO_TRANSLATE:
        if field in plant and plant[field]:
            translated[field] = await translate_text(
                plant[field], 
                target_lang,
                f"terrarium plant {field.replace('_', ' ')}"
            )
            await asyncio.sleep(0.3)  # Rate limiting
    
    # Translate diseases
    if 'diseases' in plant and plant['diseases']:
        translated['diseases'] = await translate_diseases(plant['diseases'], target_lang)
    
    return translated

async def main():
    print("=" * 60)
    print("PLANT DATABASE TRANSLATOR")
    print("Translating to English and Greek")
    print("=" * 60)
    
    # Get all plants
    plants = list(plants_collection.find({}))
    total = len(plants)
    print(f"\nFound {total} plants to translate\n")
    
    for i, plant in enumerate(plants):
        plant_name = plant['name']
        print(f"[{i+1}/{total}] Translating: {plant_name}")
        
        # Translate to English
        print(f"  → English...")
        en_translations = await translate_plant(plant, 'en')
        
        # Translate to Greek
        print(f"  → Greek...")
        el_translations = await translate_plant(plant, 'el')
        
        # Update plant in database
        update_data = {
            'translations': {
                'en': en_translations,
                'el': el_translations
            }
        }
        
        plants_collection.update_one(
            {'_id': plant['_id']},
            {'$set': update_data}
        )
        
        print(f"  ✓ Done")
        
        # Progress save every 10 plants
        if (i + 1) % 10 == 0:
            print(f"\n--- Progress: {i+1}/{total} plants translated ---\n")
    
    print("\n" + "=" * 60)
    print("TRANSLATION COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
