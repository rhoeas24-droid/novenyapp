"""
Terrárium Növény Társító App - Backend
"""
import os
import json
import base64
import re
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

app = FastAPI(title="Terrárium Növény API")

# Localized messages
ERROR_MESSAGES = {
    'plant_not_found': {
        'hu': 'Növény nem található',
        'en': 'Plant not found',
        'el': 'Το φυτό δεν βρέθηκε',
    },
    'terrarium_not_recommended': {
        'hu': 'Figyelem: {name} nem ajánlott {type} terráriumban!',
        'en': 'Warning: {name} is not recommended for {type} terrariums!',
        'el': 'Προσοχή: {name} δεν συνιστάται για τεράρια τύπου {type}!',
    },
    'terrarium_better_in': {
        'hu': 'Megjegyzés: {name} jobb lenne {better} terráriumban.',
        'en': 'Note: {name} would do better in a {better} terrarium.',
        'el': 'Σημείωση: {name} θα ήταν καλύτερο σε τεράριο τύπου {better}.',
    },
}

TERRARIUM_TYPE_NAMES = {
    'zart': {'hu': 'zárt', 'en': 'closed', 'el': 'κλειστό'},
    'felzart': {'hu': 'félzárt', 'en': 'semi-closed', 'el': 'ημίκλειστο'},
    'nyitott': {'hu': 'nyitott', 'en': 'open', 'el': 'ανοιχτό'},
}


def get_error(key: str, lang: str = 'hu', **kwargs) -> str:
    """Get localized error/warning message"""
    msg = ERROR_MESSAGES.get(key, {}).get(lang, ERROR_MESSAGES.get(key, {}).get('hu', key))
    return msg.format(**kwargs) if kwargs else msg

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = MongoClient(MONGO_URL)
db = client["terrarium_db"]
plants_collection = db["plants"]

# Data directory
DATA_DIR = Path(__file__).parent.parent
IMAGE_DIR = DATA_DIR / "images_extracted"


def parse_humidity_range(humidity_str: str) -> tuple:
    """Parse humidity string to get min/max values"""
    match = re.search(r'(\d+)[–-](\d+)%', humidity_str)
    if match:
        return int(match.group(1)), int(match.group(2))
    return 50, 70  # default


def parse_light_level(light_str: str) -> str:
    """Categorize light level"""
    light_lower = light_str.lower()
    if 'direct' in light_lower or 'bright' in light_lower:
        return 'high'
    elif 'indirect' in light_lower:
        return 'medium'
    else:
        return 'low'


def are_substrates_compatible(sg1: str, sg2: str) -> bool:
    """Check if two substrate groups are compatible using SUBSTRATE_COMPATIBILITY rules.
    Returns True if either group lists the other as compatible (bidirectional check)."""
    rules1 = SUBSTRATE_COMPATIBILITY.get(sg1, {})
    rules2 = SUBSTRATE_COMPATIBILITY.get(sg2, {})
    return sg2 in rules1.get('compatible_with', []) or sg1 in rules2.get('compatible_with', [])


def calculate_compatibility_score(plant1: dict, plant2: dict, terrarium_type: Optional[str] = None) -> float:
    """Calculate compatibility score between two plants (0-100).
    Returns -1 if plants are fundamentally incompatible (substrate conflict)."""
    if plant1['name'] == plant2['name']:
        return 0
    
    # --- Substrate compatibility gate ---
    sg1 = plant1.get('substrate_group', '')
    sg2 = plant2.get('substrate_group', '')
    
    if sg1 and sg2 and not are_substrates_compatible(sg1, sg2):
        return -1  # Hard incompatibility
    
    score = 0
    
    # Humidity compatibility (40 points max)
    h1_min, h1_max = parse_humidity_range(plant1.get('humidity', '50-70%'))
    h2_min, h2_max = parse_humidity_range(plant2.get('humidity', '50-70%'))
    
    # Check overlap
    overlap_min = max(h1_min, h2_min)
    overlap_max = min(h1_max, h2_max)
    
    if overlap_min <= overlap_max:
        overlap_range = overlap_max - overlap_min
        avg_range = ((h1_max - h1_min) + (h2_max - h2_min)) / 2
        if avg_range > 0:
            humidity_score = min(40, (overlap_range / avg_range) * 40)
        else:
            humidity_score = 40
        
        # Narrow overlap penalty: if the usable overlap is < 15% RH,
        # reduce the score — less margin for error in practice
        if overlap_range < 15:
            humidity_score *= (overlap_range / 15)
        
        score += humidity_score
    
    # Light compatibility (30 points max)
    l1 = parse_light_level(plant1.get('light', ''))
    l2 = parse_light_level(plant2.get('light', ''))
    
    if l1 == l2:
        score += 30
    elif abs(['low', 'medium', 'high'].index(l1) - ['low', 'medium', 'high'].index(l2)) == 1:
        score += 15
    
    # Substrate group compatibility (30 points max)
    if sg1 == sg2:
        score += 30
    elif are_substrates_compatible(sg1, sg2):
        score += 20
    
    # Terrarium fit bonus (up to 5 bonus points)
    # Reward plants that both thrive (✓) in the chosen terrarium type
    if terrarium_type:
        type_map = {'zart': 'Z', 'felzart': 'F', 'nyitott': 'N'}
        field = type_map.get(terrarium_type.lower(), 'Z')
        v1 = plant1.get(field, '~')
        v2 = plant2.get(field, '~')
        if v1 == '✓' and v2 == '✓':
            score += 5
        elif v1 == '✓' or v2 == '✓':
            score += 2
        # No bonus if both are only '~' (tolerable)
    
    return round(score, 1)


def get_terrarium_compatibility(plant: dict, terrarium_type: str) -> bool:
    """Check if plant is compatible with terrarium type"""
    type_map = {'zart': 'Z', 'felzart': 'F', 'nyitott': 'N'}
    field = type_map.get(terrarium_type.lower(), 'Z')
    value = plant.get(field, '~')
    return value == '✓' or value == '~'


def init_database():
    """Initialize database with plant data"""
    # Check if already initialized
    if plants_collection.count_documents({}) > 0:
        print("Database already initialized")
        return
    
    # Load plant data
    data_file = DATA_DIR / "plant_database_with_images.json"
    if not data_file.exists():
        data_file = DATA_DIR / "plant_database.json"
    
    with open(data_file, 'r', encoding='utf-8') as f:
        plants = json.load(f)
    
    # Process each plant
    for plant in plants:
        # Load image as base64
        image_file = plant.get('image_file')
        if image_file:
            image_path = IMAGE_DIR / image_file
            if image_path.exists():
                with open(image_path, 'rb') as img_f:
                    img_data = img_f.read()
                    ext = image_path.suffix.lower()
                    mime_type = {
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.png': 'image/png',
                        '.webp': 'image/webp'
                    }.get(ext, 'image/jpeg')
                    plant['image_base64'] = f"data:{mime_type};base64,{base64.b64encode(img_data).decode()}"
            else:
                plant['image_base64'] = None
        else:
            plant['image_base64'] = None
        
        # Add computed fields
        plant['humidity_min'], plant['humidity_max'] = parse_humidity_range(plant.get('humidity', '50-70%'))
        plant['light_level'] = parse_light_level(plant.get('light', ''))
    
    # Insert all plants
    plants_collection.insert_many(plants)
    print(f"Initialized database with {len(plants)} plants")


# Initialize on startup
@app.on_event("startup")
async def startup_event():
    init_database()


# API Endpoints
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "plants_count": plants_collection.count_documents({})}


def apply_translations(plant: dict, lang: str) -> dict:
    """Apply translations to a plant based on language"""
    if lang == 'hu' or 'translations' not in plant:
        return plant
    
    translations = plant.get('translations', {}).get(lang, {})
    if not translations:
        return plant
    
    # Apply translations to fields
    for field, translated_value in translations.items():
        if translated_value and field in plant:
            plant[field] = translated_value
    
    return plant


@app.get("/api/plants")
async def get_plants(
    group: Optional[str] = None,
    terrarium_type: Optional[str] = None,
    search: Optional[str] = None,
    include_images: bool = False,
    lang: str = "hu"
):
    """Get all plants with optional filtering"""
    query = {}
    
    if group:
        query['group'] = group
    
    # Build projection - exclude large image data for list view by default
    projection = {
        'name': 1,
        'common': 1,
        'group': 1,
        'light': 1,
        'humidity': 1,
        'Z': 1,
        'F': 1,
        'N': 1,
        'role': 1,
        'substrate_group': 1,
        'humidity_min': 1,
        'humidity_max': 1,
        'light_level': 1,
        'translations': 1
    }
    
    # Only include images if explicitly requested
    if include_images:
        projection['image_base64'] = 1
    
    plants = list(plants_collection.find(query, projection))
    
    # Convert ObjectId to string and apply translations
    for plant in plants:
        plant['_id'] = str(plant['_id'])
        apply_translations(plant, lang)
        # Remove translations field from response
        plant.pop('translations', None)
    
    # Filter by terrarium type
    if terrarium_type:
        plants = [p for p in plants if get_terrarium_compatibility(p, terrarium_type)]
    
    # Search filter
    if search:
        search_lower = search.lower()
        plants = [p for p in plants 
                  if search_lower in p.get('name', '').lower() 
                  or search_lower in p.get('common', '').lower()]
    
    return {"plants": plants, "total": len(plants)}


@app.get("/api/plants/{plant_name}")
async def get_plant_detail(plant_name: str, lang: str = "hu"):
    """Get detailed plant information"""
    plant = plants_collection.find_one({"name": plant_name})
    
    if not plant:
        # Try case-insensitive search
        plant = plants_collection.find_one(
            {"name": {"$regex": f"^{re.escape(plant_name)}$", "$options": "i"}}
        )
    
    if not plant:
        raise HTTPException(status_code=404, detail=get_error("plant_not_found", lang))
    
    plant['_id'] = str(plant['_id'])
    apply_translations(plant, lang)
    plant.pop('translations', None)
    return plant


@app.get("/api/plants/{plant_name}/image")
async def get_plant_image(plant_name: str):
    """Get only the image for a plant (for lazy loading)"""
    plant = plants_collection.find_one(
        {"name": plant_name},
        {"image_base64": 1, "name": 1}
    )
    
    if not plant:
        plant = plants_collection.find_one(
            {"name": {"$regex": f"^{re.escape(plant_name)}$", "$options": "i"}},
            {"image_base64": 1, "name": 1}
        )
    
    if not plant:
        raise HTTPException(status_code=404, detail=get_error("plant_not_found"))
    
    return {
        "name": plant.get("name"),
        "image_base64": plant.get("image_base64")
    }


@app.get("/api/plants/{plant_name}/compatible")
async def get_compatible_plants(
    plant_name: str,
    terrarium_type: Optional[str] = None,
    limit: int = Query(default=20, le=50),
    lang: str = "hu"
):
    """Get plants compatible with the selected plant"""
    # Get the selected plant
    plant = plants_collection.find_one({"name": plant_name})
    
    if not plant:
        plant = plants_collection.find_one(
            {"name": {"$regex": f"^{re.escape(plant_name)}$", "$options": "i"}}
        )
    
    if not plant:
        raise HTTPException(status_code=404, detail=get_error("plant_not_found", lang))
    
    # Get all other plants
    all_plants = list(plants_collection.find({"name": {"$ne": plant['name']}}))
    
    # Calculate compatibility scores
    compatible = []
    for other in all_plants:
        # Filter by terrarium type if specified
        if terrarium_type:
            if not get_terrarium_compatibility(other, terrarium_type):
                continue
            if not get_terrarium_compatibility(plant, terrarium_type):
                continue
        
        score = calculate_compatibility_score(plant, other, terrarium_type)
        if score >= 30:  # Minimum compatibility threshold (-1 = incompatible, filtered here)
            other['_id'] = str(other['_id'])
            other['compatibility_score'] = score
            apply_translations(other, lang)
            other.pop('translations', None)
            compatible.append(other)
    
    # Sort by compatibility score
    compatible.sort(key=lambda x: x['compatibility_score'], reverse=True)
    
    # Apply translations to main plant
    apply_translations(plant, lang)
    plant.pop('translations', None)
    
    return {
        "plant": {
            "_id": str(plant['_id']),
            "name": plant['name'],
            "common": plant.get('common', ''),
            "Z": plant.get('Z', '~'),
            "F": plant.get('F', '~'),
            "N": plant.get('N', '~')
        },
        "compatible_plants": compatible[:limit],
        "total": len(compatible)
    }


@app.get("/api/groups")
async def get_groups():
    """Get all plant groups"""
    groups = plants_collection.distinct("group")
    
    # Hungarian translations
    group_translations = {
        "Ferns & Foliage": "Páfrányok és Lombnövények",
        "Peperomia & Pilea": "Peperomia és Pilea",
        "Aroids & Tropicals": "Aroidok és Trópusi növények",
        "Moss & Selaginella": "Mohák és Selaginella",
        "Succulents & Cacti": "Pozsgások és Kaktuszok",
        "Carnivorous": "Húsevő növények",
        "Tillandsia": "Tillandsia (Légynövények)"
    }
    
    return {
        "groups": [
            {"id": g, "name": group_translations.get(g, g)}
            for g in groups
        ]
    }


@app.post("/api/reset")
async def reset_database():
    """Reset and reinitialize database"""
    plants_collection.delete_many({})
    init_database()
    return {"status": "reset", "plants_count": plants_collection.count_documents({})}


# Substrate compatibility rules
# Keys MUST match the substrate_group values in plant_database.json
SUBSTRATE_COMPATIBILITY = {
    "succulent": {
        "compatible_with": ["succulent", "tillandsia"],
        "ideal_terrarium": ["nyitott"],
        "acceptable_terrarium": ["felzart"],
        "avoid_terrarium": ["zart"]
    },
    "foliage": {
        "compatible_with": ["foliage", "moss_both", "tillandsia"],
        "ideal_terrarium": ["zart", "felzart"],
        "acceptable_terrarium": ["nyitott"],
        "avoid_terrarium": []
    },
    "carnivorous": {
        "compatible_with": ["carnivorous", "sphagnum_acidic"],
        "ideal_terrarium": ["zart"],
        "acceptable_terrarium": ["felzart"],
        "avoid_terrarium": ["nyitott"]
    },
    "moss_both": {
        "compatible_with": ["foliage", "moss_both"],
        "ideal_terrarium": ["zart"],
        "acceptable_terrarium": ["felzart"],
        "avoid_terrarium": ["nyitott"]
    },
    "sphagnum_acidic": {
        "compatible_with": ["carnivorous", "sphagnum_acidic"],
        "ideal_terrarium": ["zart"],
        "acceptable_terrarium": [],
        "avoid_terrarium": ["felzart", "nyitott"]
    },
    "tillandsia": {
        "compatible_with": ["tillandsia", "succulent", "foliage"],
        "ideal_terrarium": ["felzart", "nyitott"],
        "acceptable_terrarium": ["zart"],
        "avoid_terrarium": []
    }
}

# Substrate recipes
SUBSTRATE_RECIPES = {
    "succulent": {
        "name_hu": "Szukkulens szubsztrát",
        "name_en": "Succulent substrate",
        "name_el": "Υπόστρωμα παχύφυτων",
        "recipe_hu": "40% perlit/pumice + 30% durva homok + 20% akvárium kavics + 10% kókuszrost",
        "recipe_en": "40% perlite/pumice + 30% coarse sand + 20% aquarium gravel + 10% coco coir",
        "recipe_el": "40% περλίτης/ελαφρόπετρα + 30% χοντρή άμμος + 20% χαλίκι ενυδρείου + 10% ίνες καρύδας"
    },
    "foliage": {
        "name_hu": "Lombos szubsztrát",
        "name_en": "Foliage substrate",
        "name_el": "Υπόστρωμα φυλλώματος",
        "recipe_hu": "40% kókuszrost + 30% sphagnum tőzeg + 20% perlit + 10% aktív szén",
        "recipe_en": "40% coco coir + 30% sphagnum peat + 20% perlite + 10% activated charcoal",
        "recipe_el": "40% ίνες καρύδας + 30% τύρφη σφάγνου + 20% περλίτης + 10% ενεργός άνθρακας"
    },
    "carnivorous": {
        "name_hu": "Húsevő szubsztrát",
        "name_en": "Carnivorous substrate",
        "name_el": "Υπόστρωμα σαρκοφάγων",
        "recipe_hu": "60% sphagnum tőzeg + 40% perlit (NE használj trágyát!)",
        "recipe_en": "60% sphagnum peat + 40% perlite (NO fertilizer!)",
        "recipe_el": "60% τύρφη σφάγνου + 40% περλίτης (ΧΩΡΙΣ λίπασμα!)"
    },
    "moss_both": {
        "name_hu": "Moha szubsztrát",
        "name_en": "Moss substrate",
        "name_el": "Υπόστρωμα βρύων",
        "recipe_hu": "50% sphagnum tőzeg + 30% kókuszrost + 20% perlit",
        "recipe_en": "50% sphagnum peat + 30% coco coir + 20% perlite",
        "recipe_el": "50% τύρφη σφάγνου + 30% ίνες καρύδας + 20% περλίτης"
    },
    "sphagnum_acidic": {
        "name_hu": "Savas moha szubsztrát",
        "name_en": "Acidic sphagnum substrate",
        "name_el": "Όξινο υπόστρωμα σφάγνου",
        "recipe_hu": "80% élő/száraz sphagnum + 20% perlit",
        "recipe_en": "80% live/dried sphagnum + 20% perlite",
        "recipe_el": "80% ζωντανό/αποξηραμένο σφάγνο + 20% περλίτης"
    },
    "tillandsia": {
        "name_hu": "Tillandsia (szubsztrát nélkül)",
        "name_en": "Tillandsia (no substrate)",
        "name_el": "Τιλάντσια (χωρίς υπόστρωμα)",
        "recipe_hu": "Nincs szükség - rögzítsd fára, kőre vagy dróthoz",
        "recipe_en": "No substrate - mount on wood, rock or wire",
        "recipe_el": "Δεν χρειάζεται - στερεώστε σε ξύλο, πέτρα ή σύρμα"
    }
}


@app.get("/api/plants/{plant_name}/substrate-compatible")
async def get_substrate_compatible_plants(
    plant_name: str,
    terrarium_type: Optional[str] = None,
    limit: int = Query(default=30, le=77),
    lang: str = "hu"
):
    """Get plants compatible based on substrate requirements and terrarium type"""
    # Get the base plant
    plant = plants_collection.find_one({"name": plant_name})
    if not plant:
        plant = plants_collection.find_one(
            {"name": {"$regex": f"^{re.escape(plant_name)}$", "$options": "i"}}
        )
    
    if not plant:
        raise HTTPException(status_code=404, detail=get_error("plant_not_found", lang))
    
    base_substrate = plant.get('substrate_group', 'foliage')
    substrate_rules = SUBSTRATE_COMPATIBILITY.get(base_substrate, {})
    compatible_substrates = substrate_rules.get('compatible_with', [base_substrate])
    
    # Special case: Tillandsia can be combined with ANY plant that matches
    # its environmental requirements (terrarium type, humidity, light)
    # The substrate will be determined by the first non-Tillandsia plant
    is_tillandsia = base_substrate == 'tillandsia'
    if is_tillandsia:
        # Tillandsia is flexible on substrate - can go with any
        compatible_substrates = list(SUBSTRATE_COMPATIBILITY.keys())
    
    # Check terrarium type compatibility
    warnings = []
    if terrarium_type:
        ideal = substrate_rules.get('ideal_terrarium', [])
        acceptable = substrate_rules.get('acceptable_terrarium', [])
        avoid = substrate_rules.get('avoid_terrarium', [])
        
        if terrarium_type in avoid:
            type_name = TERRARIUM_TYPE_NAMES.get(terrarium_type, {}).get(lang, terrarium_type)
            warnings.append(get_error('terrarium_not_recommended', lang, name=plant['name'], type=type_name))
        elif terrarium_type not in ideal and terrarium_type not in acceptable:
            better_type = 'zart' if 'zart' in ideal else 'nyitott'
            better_name = TERRARIUM_TYPE_NAMES.get(better_type, {}).get(lang, better_type)
            warnings.append(get_error('terrarium_better_in', lang, name=plant['name'], better=better_name))
    
    # Get substrate recipe - for Tillandsia, show info that substrate depends on other plants
    recipe = SUBSTRATE_RECIPES.get(base_substrate, {})
    recipe_name = recipe.get(f'name_{lang}', recipe.get('name_hu', base_substrate))
    recipe_text = recipe.get(f'recipe_{lang}', recipe.get('recipe_hu', ''))
    
    # Find all plants with compatible substrates
    query = {
        "name": {"$ne": plant['name']},
        "substrate_group": {"$in": compatible_substrates}
    }
    
    # Filter by terrarium type
    if terrarium_type:
        terrarium_field = 'Z' if terrarium_type == 'zart' else 'F' if terrarium_type == 'felzart' else 'N'
        # Allow both ✓ (ideal) and ~ (tolerable) - humidity check will filter further
        query[terrarium_field] = {"$in": ['✓', '~']}
    
    all_plants = list(plants_collection.find(query))
    
    # Calculate compatibility scores with additional humidity/light matching
    compatible = []
    base_humidity_min = plant.get('humidity_min', 50)
    base_humidity_max = plant.get('humidity_max', 70)
    base_light = plant.get('light_level', 'medium')
    
    for other in all_plants:
        # For Tillandsia, also check humidity range overlap
        if is_tillandsia:
            other_humidity_min = other.get('humidity_min', 50)
            other_humidity_max = other.get('humidity_max', 70)
            
            # Check if humidity ranges overlap reasonably
            overlap_min = max(base_humidity_min, other_humidity_min)
            overlap_max = min(base_humidity_max, other_humidity_max)
            
            # Skip if no humidity overlap or very small overlap
            if overlap_max - overlap_min < 10:
                continue
        
        score = calculate_compatibility_score(plant, other, terrarium_type)
        if score >= 30:
            other['_id'] = str(other['_id'])
            other['compatibility_score'] = score
            # Remove image for performance
            other.pop('image_base64', None)
            apply_translations(other, lang)
            other.pop('translations', None)
            compatible.append(other)
    
    # Sort by score
    compatible.sort(key=lambda x: x['compatibility_score'], reverse=True)
    
    # Apply translations to main plant
    apply_translations(plant, lang)
    plant.pop('translations', None)
    plant['_id'] = str(plant['_id'])
    
    return {
        "plant": {
            "_id": plant['_id'],
            "name": plant['name'],
            "common": plant.get('common', ''),
            "substrate_group": base_substrate,
            "compatible_substrates": compatible_substrates
        },
        "substrate_recipe": {
            "name": recipe_name,
            "recipe": recipe_text
        },
        "terrarium_compatibility": {
            "ideal": substrate_rules.get('ideal_terrarium', []),
            "acceptable": substrate_rules.get('acceptable_terrarium', []),
            "avoid": substrate_rules.get('avoid_terrarium', [])
        },
        "warnings": warnings,
        "compatible_plants": compatible[:limit],
        "total": len(compatible)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
