# Florárium Mester — Fordítási audit

## Összefoglaló

Az app **i18n rendszere** (`translations.ts` + `LanguageContext.tsx`) jól van kialakítva, de **számos helyen** maradtak hard-coded magyar szövegek, felesleges fallback-ek, és a backend sem kezeli a nyelvet következetesen.

---

## 1. `builder.tsx` — Felesleges magyar fallback-ek

A `builder.tsx` fájlban **~20 helyen** van `t('key') || 'Magyar szöveg'` minta. Ezek feleslegesek, mert a `t()` függvény mindig visszaad értéket (a `translations.ts`-ben minden kulcs megvan mindhárom nyelven). A fallback-ek viszont **elfedhetnek hiányzó fordításokat**, mert mindig a magyar szöveget mutatják, ha bármi hiba van.

**Érintett sorok (builder.tsx):**
- 310, 390, 392, 412, 414, 419, 439, 455, 468-470, 475, 480, 507, 527, 544, 554, 564, 575, 593, 630

**Javítás:** Mindenhol eltávolítani az `|| 'magyar szöveg'` részt.

### Ráadásul: hard-coded magyar szó

- **516. sor:** `Figyelmeztetés` — ez **teljesen hard-coded**, nem megy át a `t()` függvényen!
  - Javítás: `{t('warning')}` használata

---

## 2. `SplashScreen.tsx` — Hard-coded magyar felirat

A splash screen tartalmaz egy `subtitles` objektumot (16-18. sor) a három nyelven, de **a 132. sorban hard-coded a magyar szöveg:**

```tsx
// 132. sor — mindig magyarul jelenik meg:
Találd meg a tökéletes növénytársakat
```

**Javítás:** A `SplashScreen` komponensnek fogadnia kellene a nyelvet a `LanguageContext`-ből, vagy prop-ként, és a `subtitles` objektumból kellene kiválasztani a megfelelő szöveget.

---

## 3. Backend (`server.py`) — Hard-coded magyar hibaüzenetek és figyelmeztetések

### 3.1 HTTP hibák (4 helyen)
```python
raise HTTPException(status_code=404, detail="Növény nem található")
```
Sorok: 290, 313, 338, 512

**Javítás:** A `lang` query paraméter alapján kell visszaadni a hibaüzenetet:
```python
msg = {"hu": "Növény nem található", "en": "Plant not found", "el": "Το φυτό δεν βρέθηκε"}
raise HTTPException(status_code=404, detail=msg.get(lang, msg["hu"]))
```

### 3.2 Terrárium figyelmeztetések (535-540. sor)
A `get_substrate_compatible_plants` endpointban a warning üzenetek csak magyarul és angolul vannak kezelve, görög nincs:
```python
if lang == 'hu':
    warnings.append(f"Figyelem: ...")
else:
    warnings.append(f"Warning: ...")  # Ez az angol és görög is!
```

**Javítás:** `hu`/`en`/`el` mindhárom nyelvet kezelni.

### 3.3 `/api/groups` endpoint — Nem fogad `lang` paramétert
A csoportneveket mindig a hard-coded `group_translations` dict-ből adja vissza magyarul. Nincs nyelvi paraméter, nem használja a frontend i18n rendszerét (a frontend `tGroup()`-ot használ, szóval ez végeredményben nem okoz problémát, de a backend inkonzisztens).

---

## 4. Backend szubsztrát receptek — Csak magyar és angol

A `SUBSTRATE_RECIPES` dict-ben (`server.py`) minden receptnek van `name_hu`, `name_en`, `recipe_hu`, `recipe_en` kulcsa, de **görög nincs** (`name_el`, `recipe_el` hiányzik).

---

## 5. Kisebb problémák

| Hol | Probléma |
|-----|----------|
| `translations.ts` 75. sor | `'Tillandsia': 'Tillandsia (Légynövények)'` — a helyes magyar: **Léggyökér növények** vagy egyszerűen **Légbrokák** (a Tillandsia nem légy-növény) |
| `PlantCard.tsx` | A terrárium badge-ek (`Z`, `F`, `N`) mindig rövidítéssel jelennek meg — nem lokalizált, de ez valószínűleg szándékos |
| `_layout.tsx` | A Builder screen-nek nincs saját `Stack.Screen` beállítása a layout-ban, ezért a header-je máshogyan viselkedik |

---

## Javítandó fájlok prioritás szerint

1. **`builder.tsx`** — legtöbb probléma (hard-coded fallback-ek + 1 teljesen hard-coded szó)
2. **`SplashScreen.tsx`** — hard-coded magyar subtitle
3. **`server.py`** — backend hibaüzenetek és figyelmeztetések lokalizálása
4. **`server.py`** — görög szubsztrát receptek hozzáadása
