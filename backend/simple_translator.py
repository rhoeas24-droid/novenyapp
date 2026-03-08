"""
Simple Plant Translator - translates one field at a time
"""
import asyncio
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY", "sk-emergent-1B9D0941f064b0a001")

client = MongoClient("mongodb://localhost:27017")
db = client["terrarium_db"]
plants_collection = db["plants"]

FIELDS = ['common', 'light', 'temp', 'humidity', 'substrate_notes', 
          'propagation', 'avoid', 'maintenance', 'role', 'growth_rate']

async def translate_single(text: str, target_lang: str) -> str:
    if not text or text == '—' or text.strip() == '':
        return text
    
    lang = "English" if target_lang == "en" else "Greek"
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"tr-{target_lang}",
        system_message=f"Translate to {lang}. Only return the translation, nothing else. Use proper botanical terminology."
    ).with_model("openai", "gpt-4o")
    
    try:
        response = await chat.send_message(UserMessage(text=text))
        return response.strip().strip('"').strip("'")
    except Exception as e:
        print(f"    Error: {e}")
        return text

async def translate_plant(plant_id, plant_name: str, data: dict):
    print(f"Translating: {plant_name}")
    
    en_trans = {}
    el_trans = {}
    
    for field in FIELDS:
        if field in data and data[field] and data[field] != '—':
            original = data[field]
            
            # English
            en_trans[field] = await translate_single(original, "en")
            await asyncio.sleep(0.2)
            
            # Greek
            el_trans[field] = await translate_single(original, "el")
            await asyncio.sleep(0.2)
            
            print(f"  {field}: ✓")
    
    # Translate diseases if present
    if 'diseases' in data and data['diseases']:
        en_diseases = {'fungal': [], 'pests': [], 'other': []}
        el_diseases = {'fungal': [], 'pests': [], 'other': []}
        
        for category in ['fungal', 'pests', 'other']:
            if category in data['diseases'] and data['diseases'][category]:
                for disease in data['diseases'][category]:
                    en_d = {'name': disease.get('name', '')}
                    el_d = {'name': disease.get('name', '')}
                    
                    if 'symptoms' in disease:
                        en_d['symptoms'] = await translate_single(disease['symptoms'], "en")
                        el_d['symptoms'] = await translate_single(disease['symptoms'], "el")
                        await asyncio.sleep(0.2)
                    
                    if 'treatment' in disease:
                        en_d['treatment'] = await translate_single(disease['treatment'], "en")
                        el_d['treatment'] = await translate_single(disease['treatment'], "el")
                        await asyncio.sleep(0.2)
                    
                    en_diseases[category].append(en_d)
                    el_diseases[category].append(el_d)
        
        en_trans['diseases'] = en_diseases
        el_trans['diseases'] = el_diseases
        print(f"  diseases: ✓")
    
    # Save to database
    plants_collection.update_one(
        {'_id': plant_id},
        {'$set': {'translations': {'en': en_trans, 'el': el_trans}}}
    )
    print(f"  SAVED ✓")

async def main():
    plants = list(plants_collection.find({}))
    total = len(plants)
    
    print(f"=" * 50)
    print(f"Translating {total} plants to English and Greek")
    print(f"=" * 50)
    
    for i, plant in enumerate(plants):
        print(f"\n[{i+1}/{total}]", end=" ")
        await translate_plant(plant['_id'], plant['name'], plant)
        
        if (i + 1) % 10 == 0:
            print(f"\n--- Progress: {i+1}/{total} ---\n")
    
    print(f"\n" + "=" * 50)
    print("TRANSLATION COMPLETE!")
    print(f"=" * 50)

if __name__ == "__main__":
    asyncio.run(main())
