"""
Generate detailed plant compatibility study using AI
Analyzes all 77 plants and creates compatibility rules
"""
import asyncio
import json
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

client = MongoClient(MONGO_URL)
db = client["terrarium_db"]
plants_collection = db["plants"]

async def analyze_plants():
    """Analyze all plants and generate compatibility study"""
    
    # Get all plants
    plants = list(plants_collection.find({}, {
        'name': 1, 'common': 1, 'group': 1, 'family': 1,
        'light': 1, 'humidity': 1, 'temp': 1,
        'substrate_group': 1, 'substrate_notes': 1,
        'Z': 1, 'F': 1, 'N': 1, 'role': 1
    }))
    
    # Format plant data for AI
    plant_summary = []
    for p in plants:
        plant_summary.append({
            'name': p.get('name'),
            'common': p.get('common'),
            'group': p.get('group'),
            'substrate_group': p.get('substrate_group'),
            'light': p.get('light'),
            'humidity': p.get('humidity'),
            'temp': p.get('temp'),
            'terrarium': f"Z:{p.get('Z','~')} F:{p.get('F','~')} N:{p.get('N','~')}"
        })
    
    print(f"Analyzing {len(plant_summary)} plants...")
    
    # Create AI chat
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id="plant-compatibility-study",
        system_message="""You are an expert botanist specializing in terrariums and vivariums.
Your task is to analyze plant compatibility for terrarium building.

Key factors to consider:
1. SUBSTRATE COMPATIBILITY (most important):
   - succulent substrate: dry, well-draining, mineral-based
   - foliage substrate: moisture-retaining, organic, humus-rich
   - carnivorous substrate: acidic, low-nutrient (peat/sphagnum based)
   - moss substrate: similar to foliage but more moisture
   - tillandsia: NO substrate needed (epiphytic)

2. ENVIRONMENTAL NEEDS:
   - Light requirements must be similar
   - Humidity requirements must overlap
   - Temperature ranges must overlap

3. SPECIAL CONSIDERATIONS:
   - Sphagnum moss acidifies environment - bad for some plants
   - Tillandsia needs air circulation - some more than others
   - Carnivorous plants need low-nutrient environment
   - Some succulents can rot in high humidity

Output your analysis in JSON format."""
    ).with_model("openai", "gpt-4o")
    
    # First, ask for substrate groupings
    prompt1 = f"""Here are {len(plant_summary)} plants from a terrarium database:

{json.dumps(plant_summary, indent=2, ensure_ascii=False)}

Please analyze and create SUBSTRATE COMPATIBILITY GROUPS. 
Which plants can share the same substrate?

Output as JSON:
{{
  "substrate_groups": {{
    "succulent": ["plant names that need succulent substrate"],
    "foliage": ["plant names that need foliage substrate"],
    "carnivorous": ["plant names that need carnivorous substrate"],
    "moss_compatible_with_foliage": ["mosses that work with foliage"],
    "sphagnum_acidic": ["sphagnum types that acidify - keep separate"],
    "tillandsia_no_substrate": ["tillandsia types - mounted, no soil"],
    "special_cases": ["any plants with unusual requirements"]
  }},
  "notes": "any important observations"
}}"""

    print("Step 1: Analyzing substrate groups...")
    response1 = await chat.send_message(UserMessage(text=prompt1))
    print("Substrate analysis complete.")
    
    # Save intermediate result
    with open('/app/backend/compatibility_substrate.json', 'w', encoding='utf-8') as f:
        f.write(response1)
    
    # Second, ask for detailed compatibility rules
    prompt2 = """Now create DETAILED COMPATIBILITY RULES for terrarium building.

For each substrate group, define:
1. Which other groups can be combined
2. Environmental requirements (light, humidity, temp ranges)
3. Special warnings or considerations

Output as JSON:
{
  "compatibility_rules": {
    "succulent": {
      "compatible_with": ["list of compatible substrate groups"],
      "incompatible_with": ["list of incompatible groups"],
      "ideal_terrarium": "open/semi-closed/closed",
      "humidity_range": "20-50%",
      "light_needs": "bright indirect to direct",
      "warnings": ["any warnings"]
    },
    // ... repeat for each group
  },
  "pairing_matrix": {
    "succulent+succulent": "excellent",
    "succulent+foliage": "incompatible - different substrate needs",
    "foliage+moss": "good - similar requirements",
    // ... key pairings
  },
  "tillandsia_special_rules": {
    "high_air_circulation_needed": ["tillandsia species list"],
    "tolerates_enclosed": ["tillandsia species list"],
    "compatible_environments": "description"
  }
}"""

    print("Step 2: Generating compatibility rules...")
    response2 = await chat.send_message(UserMessage(text=prompt2))
    print("Compatibility rules complete.")
    
    # Save result
    with open('/app/backend/compatibility_rules.json', 'w', encoding='utf-8') as f:
        f.write(response2)
    
    # Third, create specific plant pairing recommendations
    prompt3 = """Finally, create SPECIFIC PAIRING RECOMMENDATIONS.

For the TOP 10 most common terrarium plants, list their best companions:

Output as JSON:
{
  "recommended_pairings": {
    "Nephrolepis cordifolia": {
      "excellent_companions": ["list of 5-10 plants"],
      "good_companions": ["list"],
      "avoid_pairing_with": ["list with reason"],
      "terrarium_type": "closed/semi-closed",
      "substrate": "foliage"
    },
    // ... repeat for 10 popular plants
  },
  "quick_terrarium_recipes": [
    {
      "name": "Tropical Fern Paradise",
      "plants": ["3-5 plant names"],
      "terrarium_type": "closed",
      "substrate": "foliage",
      "care_level": "easy/medium/hard"
    },
    // ... 5 recipe ideas
  ]
}"""

    print("Step 3: Creating pairing recommendations...")
    response3 = await chat.send_message(UserMessage(text=prompt3))
    print("Pairing recommendations complete.")
    
    # Save result
    with open('/app/backend/compatibility_pairings.json', 'w', encoding='utf-8') as f:
        f.write(response3)
    
    print("\n" + "=" * 60)
    print("COMPATIBILITY STUDY COMPLETE!")
    print("=" * 60)
    print("Files created:")
    print("  - /app/backend/compatibility_substrate.json")
    print("  - /app/backend/compatibility_rules.json")
    print("  - /app/backend/compatibility_pairings.json")

if __name__ == "__main__":
    asyncio.run(analyze_plants())
