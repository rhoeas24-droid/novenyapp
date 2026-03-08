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


def calculate_compatibility_score(plant1: dict, plant2: dict) -> float:
    """Calculate compatibility score between two plants (0-100)"""
    if plant1['name'] == plant2['name']:
        return 0
    
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
        score += humidity_score
    
    # Light compatibility (30 points max)
    l1 = parse_light_level(plant1.get('light', ''))
    l2 = parse_light_level(plant2.get('light', ''))
    
    if l1 == l2:
        score += 30
    elif abs(['low', 'medium', 'high'].index(l1) - ['low', 'medium', 'high'].index(l2)) == 1:
        score += 15
    
    # Substrate group compatibility (30 points max)
    sg1 = plant1.get('substrate_group', '')
    sg2 = plant2.get('substrate_group', '')
    
    if sg1 == sg2:
        score += 30
    elif sg1 in ['foliage', 'moss'] and sg2 in ['foliage', 'moss']:
        score += 20
    
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


@app.get("/api/plants")
async def get_plants(
    group: Optional[str] = None,
    terrarium_type: Optional[str] = None,
    search: Optional[str] = None
):
    """Get all plants with optional filtering"""
    query = {}
    
    if group:
        query['group'] = group
    
    # Build projection (exclude large image data for list view)
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
        'image_base64': 1,
        'substrate_group': 1,
        'humidity_min': 1,
        'humidity_max': 1,
        'light_level': 1
    }
    
    plants = list(plants_collection.find(query, projection))
    
    # Convert ObjectId to string
    for plant in plants:
        plant['_id'] = str(plant['_id'])
    
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
async def get_plant_detail(plant_name: str):
    """Get detailed plant information"""
    plant = plants_collection.find_one({"name": plant_name})
    
    if not plant:
        # Try case-insensitive search
        plant = plants_collection.find_one(
            {"name": {"$regex": f"^{re.escape(plant_name)}$", "$options": "i"}}
        )
    
    if not plant:
        raise HTTPException(status_code=404, detail="Növény nem található")
    
    plant['_id'] = str(plant['_id'])
    return plant


@app.get("/api/plants/{plant_name}/compatible")
async def get_compatible_plants(
    plant_name: str,
    terrarium_type: Optional[str] = None,
    limit: int = Query(default=20, le=50)
):
    """Get plants compatible with the selected plant"""
    # Get the selected plant
    plant = plants_collection.find_one({"name": plant_name})
    
    if not plant:
        plant = plants_collection.find_one(
            {"name": {"$regex": f"^{re.escape(plant_name)}$", "$options": "i"}}
        )
    
    if not plant:
        raise HTTPException(status_code=404, detail="Növény nem található")
    
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
        
        score = calculate_compatibility_score(plant, other)
        if score >= 30:  # Minimum compatibility threshold
            other['_id'] = str(other['_id'])
            other['compatibility_score'] = score
            compatible.append(other)
    
    # Sort by compatibility score
    compatible.sort(key=lambda x: x['compatibility_score'], reverse=True)
    
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
