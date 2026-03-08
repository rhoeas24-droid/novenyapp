"""
Translate disease names that were missed in the first translation pass
"""
import asyncio
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY", "sk-emergent-1B9D0941f064b0a001")
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

client = MongoClient(MONGO_URL)
db = client["terrarium_db"]
plants_collection = db["plants"]

async def translate_text(text: str, target_lang: str) -> str:
    """Translate text to target language"""
    if not text or text == '—' or text.strip() == '':
        return text
    
    lang_name = "English" if target_lang == "en" else "Greek"
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"translate-disease-{target_lang}",
        system_message=f"""You are a professional translator specializing in botanical and plant disease terminology.
Translate the following plant disease/pest name to {lang_name}.
Keep scientific names in Latin if present.
Only return the translation, nothing else."""
    ).with_model("openai", "gpt-4o")
    
    response = await chat.send_message(UserMessage(text=f"Translate this plant disease/pest name to {lang_name}: {text}"))
    return response.strip()

async def main():
    print("=" * 60)
    print("TRANSLATING DISEASE NAMES")
    print("=" * 60)
    
    plants = list(plants_collection.find({}))
    total = len(plants)
    
    for i, plant in enumerate(plants):
        plant_name = plant['name']
        translations = plant.get('translations', {})
        diseases = plant.get('diseases', {})
        
        if not diseases:
            continue
            
        print(f"[{i+1}/{total}] {plant_name}")
        
        for lang in ['en', 'el']:
            lang_trans = translations.get(lang, {})
            lang_diseases = lang_trans.get('diseases', {})
            
            if not lang_diseases:
                lang_diseases = {}
            
            updated = False
            for category in ['fungal', 'pests', 'other']:
                if category not in diseases or not diseases[category]:
                    continue
                    
                if category not in lang_diseases:
                    lang_diseases[category] = []
                
                for j, disease in enumerate(diseases[category]):
                    original_name = disease.get('name', '')
                    if not original_name:
                        continue
                    
                    # Check if we already have this disease in translations
                    if j < len(lang_diseases.get(category, [])):
                        existing = lang_diseases[category][j]
                        # Translate the name if it's still in Hungarian
                        if existing.get('name') == original_name:
                            print(f"  Translating '{original_name}' to {lang}...")
                            translated_name = await translate_text(original_name, lang)
                            lang_diseases[category][j]['name'] = translated_name
                            updated = True
                            await asyncio.sleep(0.2)
                    else:
                        # Add missing disease entry
                        print(f"  Adding missing disease '{original_name}' for {lang}...")
                        translated_name = await translate_text(original_name, lang)
                        existing_symptoms = ""
                        existing_treatment = ""
                        if j < len(lang_diseases.get(category, [])):
                            existing_symptoms = lang_diseases[category][j].get('symptoms', '')
                            existing_treatment = lang_diseases[category][j].get('treatment', '')
                        
                        if category not in lang_diseases:
                            lang_diseases[category] = []
                        lang_diseases[category].append({
                            'name': translated_name,
                            'symptoms': existing_symptoms,
                            'treatment': existing_treatment
                        })
                        updated = True
                        await asyncio.sleep(0.2)
            
            if updated:
                lang_trans['diseases'] = lang_diseases
                translations[lang] = lang_trans
        
        # Update in database
        plants_collection.update_one(
            {'_id': plant['_id']},
            {'$set': {'translations': translations}}
        )
    
    print("\n" + "=" * 60)
    print("DISEASE NAME TRANSLATION COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
