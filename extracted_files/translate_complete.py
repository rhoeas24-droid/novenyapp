"""
Florárium Mester — Complete Plant Database Translator
=====================================================
Translates ALL remaining Hungarian text in plant_database.json to EN and EL.

Two modes:
1. DICTIONARY mode (default): Uses built-in dictionaries for common terms
2. API mode (--api): Uses Anthropic Claude API for perfect translations

Usage:
    python3 translate_complete.py                    # Dictionary only
    python3 translate_complete.py --api              # Use Claude API  
    python3 translate_complete.py --api --dry-run    # Preview API calls without running

Requirements for API mode:
    pip install anthropic
    export ANTHROPIC_API_KEY=sk-ant-...
"""

import json
import re
import os
import sys
import time
import argparse

# ============================================================
# GROWTH RATE — complete lookup table
# ============================================================
GROWTH_RATE_TR = {
    "Lassú":                    {"en": "Slow",                      "el": "Αργός"},
    "Nagyon lassú":             {"en": "Very slow",                 "el": "Πολύ αργός"},
    "Lassú–közepes":            {"en": "Slow–moderate",             "el": "Αργός–μέτριος"},
    "Közepes":                  {"en": "Moderate",                  "el": "Μέτριος"},
    "Közepes (magról: gyors)":  {"en": "Moderate (fast from seed)", "el": "Μέτριος (γρήγορος από σπόρο)"},
    "Közepes–gyors":            {"en": "Moderate–fast",             "el": "Μέτριος–γρήγορος"},
    "Gyors":                    {"en": "Fast",                      "el": "Γρήγορος"},
    "Nagyon gyors":             {"en": "Very fast",                 "el": "Πολύ γρήγορος"},
}

# ============================================================
# COMMON TERM REPLACEMENTS (HU → EN)
# ============================================================
HU_TO_EN = {
    # Humidity descriptions
    "hagyni felszínét megszáradni öntözések között": "allow surface to dry between waterings",
    "hagyni felszínét megszáradni": "allow surface to dry",
    "egyenletesen nedves szubsztrát": "evenly moist substrate",
    "substrate egyenletesen nedves": "substrate evenly moist",
    "egyenletesen nedves": "evenly moist",
    "szubsztrát nagyon nedves, akár félig vízben": "substrate very wet, even partially submerged",
    "szubsztrát nagyon nedves": "substrate very wet",
    "nagyon nedves / félig vízi": "very wet / semi-aquatic",
    "nagyon nedves": "very wet",
    "enyhén nedves": "slightly moist",
    "minimális öntözés": "minimal watering",
    "ritkán öntözni": "water rarely",
    "nagyon száraz": "very dry",
    "száraz tartás": "keep dry",
    "permetezés helyett párakamra": "humidity chamber instead of misting",
    "permetezés": "misting",
    # General terms used across fields
    "sziklaborítás": "rock cover",
    "textúra": "texture",
    "háttér accent": "background accent",
    "szín": "color",
    "zárt terrárium": "closed terrarium",
    "nyitott terrárium dekor": "open terrarium decoration",
    "nyitott terrárium": "open terrarium",
    "húsevő társítás": "carnivorous pairing",
    "páfrányszerű textúra": "fern-like texture",
    "dekoratív szín-akcentus": "decorative color accent",
    "párna-domb hatás": "cushion-mound effect",
}


def replace_known_terms(text, mapping):
    """Replace known terms in text using a mapping dict"""
    if not text:
        return text
    result = text
    for src, dst in sorted(mapping.items(), key=lambda x: len(x[0]), reverse=True):
        result = result.replace(src, dst)
    return result


def has_hungarian(text):
    """Check if text contains Hungarian-specific characters"""
    if not text:
        return False
    return bool(re.search(r'[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]', text))


def translate_with_api(texts_to_translate, target_lang):
    """
    Translate a batch of texts using Anthropic Claude API.
    texts_to_translate: list of (key, hungarian_text) tuples
    target_lang: 'en' or 'el'
    Returns: dict of key → translated_text
    """
    try:
        import anthropic
    except ImportError:
        print("ERROR: 'anthropic' package not installed. Run: pip install anthropic")
        sys.exit(1)
    
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY environment variable not set")
        sys.exit(1)
    
    client = anthropic.Anthropic(api_key=api_key)
    lang_name = "English" if target_lang == "en" else "Greek"
    
    results = {}
    
    # Process in batches of 20
    batch_size = 20
    for i in range(0, len(texts_to_translate), batch_size):
        batch = texts_to_translate[i:i+batch_size]
        
        # Build prompt
        items = "\n".join(f'{j+1}. [{key}] {text}' for j, (key, text) in enumerate(batch))
        
        prompt = f"""Translate these Hungarian plant/terrarium care texts to {lang_name}.

Rules:
- Keep scientific names (Latin) unchanged
- Keep numbers, units (cm, %, °C, RH), symbols (✓, ⚠, ~)
- Keep abbreviations like RO (reverse osmosis), AC (air conditioning)
- Use proper botanical terminology
- Return ONLY a JSON object mapping the number to the translation

Texts:
{items}

Return JSON like: {{"1": "translation", "2": "translation", ...}}"""

        try:
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = message.content[0].text
            # Extract JSON from response
            json_match = re.search(r'\{[^{}]*\}', response_text, re.DOTALL)
            if json_match:
                translations = json.loads(json_match.group())
                for j, (key, _) in enumerate(batch):
                    idx = str(j + 1)
                    if idx in translations:
                        results[key] = translations[idx]
            
            print(f"  Batch {i//batch_size + 1}: translated {len(batch)} texts to {lang_name}")
            time.sleep(1)  # Rate limiting
            
        except Exception as e:
            print(f"  ERROR in batch {i//batch_size + 1}: {e}")
    
    return results


def collect_untranslated(plants):
    """Collect all texts that still contain Hungarian after dictionary pass"""
    to_translate = []  # list of (plant_idx, lang, field_path, text)
    
    for idx, plant in enumerate(plants):
        trans = plant.get("translations", {})
        for lang in ["en", "el"]:
            lang_t = trans.get(lang, {})
            for field, value in lang_t.items():
                if isinstance(value, str) and has_hungarian(value):
                    to_translate.append((idx, lang, field, value))
                elif isinstance(value, dict):
                    for cat, items in value.items():
                        if isinstance(items, list):
                            for i, item in enumerate(items):
                                for f, v in item.items():
                                    if isinstance(v, str) and has_hungarian(v):
                                        to_translate.append(
                                            (idx, lang, f"{field}.{cat}.{i}.{f}", v)
                                        )
    
    return to_translate


def apply_translation(plant, lang, field_path, value):
    """Apply a translated value back to the plant's translations"""
    parts = field_path.split(".")
    trans = plant["translations"][lang]
    
    if len(parts) == 1:
        trans[parts[0]] = value
    elif len(parts) == 4:
        # diseases.category.index.field
        field, cat, idx, subfield = parts
        trans[field][cat][int(idx)][subfield] = value


def process_plants(plants):
    """First pass: apply dictionaries"""
    for plant in plants:
        translations = {"en": {}, "el": {}}
        
        # growth_rate: direct lookup
        gr = plant.get("growth_rate", "")
        if gr in GROWTH_RATE_TR:
            translations["en"]["growth_rate"] = GROWTH_RATE_TR[gr]["en"]
            translations["el"]["growth_rate"] = GROWTH_RATE_TR[gr]["el"]
        
        # Fields that need HU→EN translation
        hu_fields = ["humidity", "maintenance", "avoid", "substrate_notes", "cyprus"]
        for field in hu_fields:
            val = plant.get(field, "")
            if val and val != "—":
                en_val = replace_known_terms(val, HU_TO_EN)
                translations["en"][field] = en_val
                # EL will be translated from EN by API, or kept as EN for now
                translations["el"][field] = en_val
        
        # role: mostly EN with some HU in parentheses
        role = plant.get("role", "")
        if role:
            en_role = replace_known_terms(role, HU_TO_EN)
            translations["en"]["role"] = en_role
            translations["el"]["role"] = en_role
        
        # diseases
        diseases = plant.get("diseases", {})
        if diseases:
            for lang in ["en", "el"]:
                lang_diseases = {}
                for cat in ["fungal", "pests", "other"]:
                    if cat in diseases and diseases[cat]:
                        lang_diseases[cat] = []
                        for d in diseases[cat]:
                            new_d = {}
                            for f in ["name", "symptoms", "treatment"]:
                                if f in d:
                                    new_d[f] = replace_known_terms(d[f], HU_TO_EN)
                            lang_diseases[cat].append(new_d)
                translations[lang]["diseases"] = lang_diseases
        
        plant["translations"] = translations
    
    return plants


def main():
    parser = argparse.ArgumentParser(description="Translate plant database")
    parser.add_argument("--api", action="store_true", help="Use Anthropic API for remaining translations")
    parser.add_argument("--dry-run", action="store_true", help="Preview what would be translated (with --api)")
    parser.add_argument("--input", default="/home/claude/novenyapp/plant_database.json", help="Input file")
    parser.add_argument("--output", default="/home/claude/plant_database_translated.json", help="Output file")
    args = parser.parse_args()
    
    with open(args.input, "r", encoding="utf-8") as f:
        plants = json.load(f)
    
    print(f"Loaded {len(plants)} plants")
    
    # Pass 1: Dictionary-based translation
    print("\nPass 1: Dictionary translation...")
    plants = process_plants(plants)
    
    # Check what's still untranslated
    untranslated = collect_untranslated(plants)
    print(f"  After dictionaries: {len(untranslated)} fields still contain Hungarian")
    
    if args.api and untranslated:
        if args.dry_run:
            print(f"\n[DRY RUN] Would translate {len(untranslated)} fields:")
            for idx, lang, path, text in untranslated[:20]:
                print(f"  [{plants[idx]['name']}] {lang}.{path}: {text[:80]}...")
            if len(untranslated) > 20:
                print(f"  ... and {len(untranslated) - 20} more")
        else:
            print("\nPass 2: API translation...")
            
            # Group by target language
            for target_lang in ["en", "el"]:
                lang_items = [(i, l, p, t) for i, l, p, t in untranslated if l == target_lang]
                if not lang_items:
                    continue
                
                print(f"\n  Translating {len(lang_items)} texts to {target_lang}...")
                
                # Prepare batch
                texts = [(f"{i}:{p}", t) for i, _, p, t in lang_items]
                results = translate_with_api(texts, target_lang)
                
                # Apply results
                applied = 0
                for idx, _, path, _ in lang_items:
                    key = f"{idx}:{path}"
                    if key in results:
                        apply_translation(plants[idx], target_lang, path, results[key])
                        applied += 1
                
                print(f"  Applied {applied} translations for {target_lang}")
            
            # Re-check
            still_untranslated = collect_untranslated(plants)
            print(f"\n  After API: {len(still_untranslated)} fields still contain Hungarian")
    
    # Save
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(plants, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Saved to {args.output}")
    
    # Summary
    print(f"\nSummary:")
    print(f"  Plants: {len(plants)}")
    print(f"  Languages: hu (base), en, el")
    remaining = collect_untranslated(plants)
    if remaining:
        print(f"  ⚠ {len(remaining)} fields still need translation (use --api flag)")
    else:
        print(f"  ✓ All fields translated!")


if __name__ == "__main__":
    main()
