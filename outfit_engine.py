"""Deterministic outfit copy from weather — no external AI or tokens required."""

# ─── Structured per-category items ───────────────────────────────────────────
_STRUCTURED_ITEMS = {
    "hot":      dict(
        top="Tank top or loose linen shirt", top_opts="cotton tee, breezy button-down, or sundress",
        bottom="Shorts or flowy skirt", bottom_opts="linen shorts, mini skirt, or loose trousers",
        shoe="Sandals or breathable sneakers", shoe_opts="slides, strappy sandals, or mesh runners",
        accessory="Sunglasses + sun hat", accessory_opts="wide-brim hat, cap, or UV-blocking glasses",
    ),
    "warm":     dict(
        top="T-shirt or lightweight top", top_opts="cotton crew, polo, tank, or short-sleeve button-down",
        bottom="Shorts or light pants", bottom_opts="chino shorts, linen trousers, or a casual skirt",
        shoe="Sneakers or loafers", shoe_opts="canvas sneakers, slip-ons, or leather loafers",
        accessory="Sunglasses", accessory_opts="sunscreen if spending time outside",
    ),
    "mild":     dict(
        top="Light top + packable jacket", top_opts="cotton tee with a zip-up, denim jacket, or overshirt",
        bottom="Jeans or chinos", bottom_opts="straight-leg jeans, slim chinos, or casual trousers",
        shoe="Sneakers or casual shoes", shoe_opts="white sneakers, loafers, or low-top boots",
        accessory="Light layer for evenings", accessory_opts="cardigan, light scarf, or packable jacket",
    ),
    "cool":     dict(
        top="Sweater or long-sleeve tee", top_opts="crewneck sweater, henley, or knit pullover",
        bottom="Jeans or chinos", bottom_opts="dark-wash jeans, corduroy, or straight-leg trousers",
        shoe="Sneakers or ankle boots", shoe_opts="leather sneakers, Chelsea boots, or low-profile boots",
        accessory="Light scarf", accessory_opts="knit scarf, neck gaiter, or a beanie if windy",
    ),
    "cold":     dict(
        top="Warm sweater or fleece + coat", top_opts="wool sweater, fleece pullover, or quilted vest over a base layer",
        bottom="Jeans or lined trousers", bottom_opts="thick denim, corduroy, or fleece-lined leggings",
        shoe="Ankle boots or warm sneakers", shoe_opts="leather ankle boots, insulated sneakers, or short boots",
        accessory="Scarf + light gloves", accessory_opts="wool scarf, knit gloves, and a warm beanie",
    ),
    "freezing": dict(
        top="Thermal base layer + heavy insulated coat", top_opts="merino wool base layer under a down coat or parka",
        bottom="Warm lined trousers", bottom_opts="fleece-lined leggings, thermal pants, or thick corduroy",
        shoe="Insulated waterproof boots", shoe_opts="duck boots, snow boots, or insulated Chelsea boots",
        accessory="Warm hat + gloves + scarf", accessory_opts="chunky knit beanie, insulated gloves, wool or fleece scarf",
    ),
    "rain":     dict(
        top="Waterproof rain jacket or shell", top_opts="hooded trench coat, waterproof parka, or packable rain shell",
        bottom="Quick-dry pants or jeans", bottom_opts="treated denim, joggers, or water-resistant trousers",
        shoe="Water-resistant boots", shoe_opts="rubber rain boots, waterproof Chelsea boots, or Gore-Tex sneakers",
        accessory="Compact umbrella", accessory_opts="packable umbrella, waterproof tote, or hood-friendly headwear",
    ),
    "snow":     dict(
        top="Waterproof parka or ski jacket", top_opts="insulated ski jacket, heavy parka, or waterproof puffer",
        bottom="Warm lined trousers", bottom_opts="snow pants, fleece-lined jeans, or thermal leggings",
        shoe="Insulated snow boots", shoe_opts="waterproof snow boots with traction, duck boots, or insulated tall boots",
        accessory="Warm hat + insulated gloves + scarf", accessory_opts="ski-style beanie, touchscreen gloves, balaclava if very cold",
    ),
    "formal":   dict(
        top="Blazer or tailored jacket", top_opts="fitted blazer, structured dress jacket, or elegant blouse",
        bottom="Tailored trousers or dress", bottom_opts="slim-fit dress pants, A-line skirt, or cocktail dress",
        shoe="Dress shoes or heels", shoe_opts="oxfords, block heels, pointed-toe flats, or leather loafers",
        accessory="Watch or dress jewelry", accessory_opts="minimal watch, stud earrings, delicate necklace, or clutch",
    ),
    "athletic": dict(
        top="Moisture-wicking athletic top", top_opts="performance tee, sports bra + tank, or long-sleeve base layer",
        bottom="Shorts or leggings", bottom_opts="running shorts, compression leggings, or athletic joggers",
        shoe="Running or training shoes", shoe_opts="road running shoes, cross-trainers, or court shoes",
        accessory="Fitness tracker or headband", accessory_opts="sport watch, moisture-wicking headband, or compression socks",
    ),
}


def _outfit_type(weather: dict, event_type: str = "casual") -> str:
    """Mirror the getOutfitType() logic from OutfitScene.js."""
    if event_type == "formal":   return "formal"
    if event_type == "athletic": return "athletic"
    temp = float(weather.get("temperature", 68))
    code = int(weather.get("weathercode", 0))
    if (71 <= code <= 77) or code in (85, 86): return "snow"
    if (51 <= code <= 67) or (80 <= code <= 82): return "rain"
    if temp >= 82: return "hot"
    if temp >= 70: return "warm"
    if temp >= 57: return "mild"
    if temp >= 44: return "cool"
    if temp >= 28: return "cold"
    return "freezing"


_WHY = {
    "hot":      "It's {temp}°F — lightweight, breathable fabrics will keep you from overheating.",
    "warm":     "At {temp}°F it's comfortably warm — a light outfit with sun protection is all you need.",
    "mild":     "It's {temp}°F with variable conditions — a packable jacket covers every scenario.",
    "cool":     "At {temp}°F you'll feel the chill — a solid mid-layer makes all the difference.",
    "cold":     "It's {temp}°F — warm layers and closed-toe shoes are non-negotiable.",
    "freezing": "It's {temp}°F — full winter gear, no shortcuts.",
    "rain":     "Rain in the forecast — a waterproof outer layer and sealed footwear are key.",
    "snow":     "Snow expected — insulated and waterproof from head to toe.",
    "formal":   "Dressed for a formal occasion — structured, polished pieces are the move.",
    "athletic": "Active day ahead — prioritize moisture-wicking fabrics and supportive footwear.",
}

_AVOID = {
    "hot":      "Dark colors and synthetic fabrics — they trap heat fast.",
    "warm":     "Heavy jeans or long sleeves unless you'll be indoors most of the day.",
    "mild":     "Leaving home without a layer — temps can shift more than the forecast shows.",
    "cool":     "Thin fabrics that let wind through — windchill will catch you off guard.",
    "cold":     "Cotton as a base layer — it holds moisture and gets cold fast.",
    "freezing": "Anything not insulated or windproof — exposed skin loses heat quickly.",
    "rain":     "Canvas sneakers, suede, or open-toe shoes — they'll be soaked in minutes.",
    "snow":     "Regular boots or loose pants — snow creeps in at every gap.",
    "formal":   "Casual sneakers or relaxed-fit pieces — they'll undercut the whole look.",
    "athletic": "Cotton tees — they stay damp and heavy when you sweat.",
}

_STYLE = {
    "hot":      "Light colors (white, sky blue, pastel yellow) reflect heat and look fresh.",
    "warm":     "Bright, bold colors work well — this weather is made for statement pieces.",
    "mild":     "Earthy tones — olive, rust, camel — complement overcast natural light beautifully.",
    "cool":     "Rich mid-tones like burgundy, forest green, or navy feel right for the season.",
    "cold":     "Deep, warm shades (charcoal, navy, dark burgundy) with textured knits.",
    "freezing": "Pops of color against dark outerwear — cobalt, red, or hunter green stand out.",
    "rain":     "Dark wash denim and grey tones are practical — water spots barely show.",
    "snow":     "Rich contrast colors against white — red, cobalt, or hunter green look great.",
    "formal":   "Classic neutrals — black, navy, ivory — are timeless and always work.",
    "athletic": "Contrast color blocking is both visible and gives a polished athletic look.",
}


def structured_outfit(weather: dict, runs_cold: bool = False, event_type: str = "casual", gender: str = "neutral") -> dict:
    """Return outfit as { top, bottom, shoe, accessory, why, avoid, layering, style }."""
    kind = _outfit_type(weather, event_type)
    items = dict(_STRUCTURED_ITEMS.get(kind, _STRUCTURED_ITEMS["mild"]))

    # Work / travel: keep temperature-based items but override top for polish
    if event_type == "work":
        if kind in ("warm", "hot"):
            items["top"] = "Lightweight button-down or polished blouse"
            items["top_opts"] = "linen shirt, fitted polo, or breathable blouse"
            items["shoe"] = "Loafers or clean leather shoes"
            items["shoe_opts"] = "leather loafers, ballet flats, or low-profile oxfords"
        elif kind in ("mild", "cool", "cold"):
            items["top"] = "Collared shirt or blouse + light blazer"
            items["top_opts"] = "button-down under a structured blazer or knit jacket"

    # Gender nuances
    if gender == "womens":
        if kind in ("mild", "cool"):
            items["bottom"] = "Jeans, chinos, or midi skirt"
            items["bottom_opts"] = "straight-leg jeans, tailored chinos, or a midi wrap skirt"
        elif kind in ("warm", "hot"):
            items["bottom"] = "Shorts, skirt, or light dress"
            items["bottom_opts"] = "linen shorts, flowy midi skirt, or a breezy sundress"
        if kind == "formal":
            items["top"] = "Elegant blouse or dress jacket"
            items["top_opts"] = "silk blouse, tailored blazer, or structured dress top"
            items["bottom"] = "Tailored trousers or formal dress"
            items["bottom_opts"] = "wide-leg trousers, pencil skirt, or cocktail dress"
    elif gender == "mens" and kind == "formal":
        items["top"] = "Dress shirt with blazer"
        items["top_opts"] = "crisp white or light blue shirt under a navy or charcoal blazer"
        items["bottom"] = "Tailored trousers"
        items["bottom_opts"] = "slim-fit dress pants in charcoal, navy, or black"

    # Insight fields
    temp = round(float(weather.get("temperature", 68)))
    items["why"]   = _WHY.get(kind, "").replace("{temp}", str(temp))
    items["avoid"] = _AVOID.get(kind, "")
    items["style"] = _STYLE.get(kind, "")

    # Layering tip — only when there's a meaningful temp swing
    temp_min = weather.get("temp_min", temp)
    temp_max = weather.get("temp_max", temp)
    swing = float(temp_max) - float(temp_min)
    if swing >= 10:
        items["layering"] = (
            f"Starts at {round(float(temp_min))}°F, climbs to {round(float(temp_max))}°F — "
            f"dress for the cool start and make your outer layer easy to remove."
        )
    elif kind in ("cold", "cool") and event_type not in ("formal", "athletic"):
        items["layering"] = "Evenings drop fast — keep a layer in your bag even if it feels fine at noon."
    else:
        items["layering"] = None

    return items


def _precip_kind(weathercode: int) -> str:
    if weathercode is None:
        return "dry"
    c = int(weathercode)
    if 71 <= c <= 77 or 85 <= c <= 86:
        return "snow"
    if (51 <= c <= 67) or (80 <= c <= 82) or (95 <= c <= 99) or (56 <= c <= 57):
        return "rain"
    if 45 <= c <= 48:
        return "fog"
    return "dry"


def _temp_band(temp_f: float, runs_cold: bool) -> str:
    adj = 6 if runs_cold else 0
    t = float(temp_f) - adj
    if t < 28:
        return "freezing"
    if t < 45:
        return "cold"
    if t < 58:
        return "cool"
    if t < 72:
        return "mild"
    if t < 82:
        return "warm"
    return "hot"


_GENDER_CONTEXT = {
    "neutral": "",
    "womens": (
        " Lean into womenswear options: a blouse, tailored trousers, a midi skirt, or a dress "
        "work well here, with flats, block heels, or ankle boots depending on formality."
    ),
    "mens": (
        " Lean into menswear staples: a button-down or polo, chinos or trousers, "
        "and clean sneakers or leather shoes depending on the occasion."
    ),
}

_EVENT_CONTEXT = {
    "casual": "",
    "work": (
        " For a work or office setting, choose business-casual: "
        "a neat collared shirt or polished blouse, tailored trousers or chinos, "
        "and closed-toe shoes. Skip athletic wear and distressed pieces."
    ),
    "formal": (
        " For a formal occasion or dinner, elevate with a blazer or dress jacket, "
        "a dress shirt or elegant blouse, tailored trousers or a formal dress, "
        "and dress shoes."
    ),
    "athletic": (
        " Since you're being active, go with moisture-wicking performance wear, "
        "supportive athletic footwear, and breathable fabrics that move with you."
    ),
    "travel": (
        " For travel, prioritize wrinkle-resistant fabrics, easy layers you can "
        "adjust at security, and comfortable shoes built for long walks."
    ),
}


def outfit_from_rules(weather: dict, runs_cold: bool = False, event_type: str = "casual", gender: str = "neutral") -> str:
    temp = float(weather["temperature"])
    wind = float(weather["windspeed"])
    code = int(weather["weathercode"])
    precip = _precip_kind(code)
    band = _temp_band(temp, runs_cold)
    windy = wind >= 18
    breezy = 10 <= wind < 18

    # Check if we have a temperature range (time-window forecast)
    temp_min = weather.get("temp_min", temp)
    temp_max = weather.get("temp_max", temp)
    has_range = (temp_max - temp_min) >= 10

    inner = {
        "freezing": (
            "Start with a thermal base layer and fleece or wool mid-layer; "
            "add warm socks and insulated bottoms if you'll be outside more than a few minutes."
        ),
        "cold": (
            "Wear a warm sweater or fleece over a long-sleeve tee, with jeans or lined trousers "
            "and sturdy closed-toe shoes."
        ),
        "cool": (
            "A long-sleeve shirt plus a light sweater or overshirt works well with jeans or chinos."
        ),
        "mild": (
            "Light pants or jeans with a breathable top; bring a jacket you can remove indoors."
        ),
        "warm": (
            "Breathable shorts or lightweight pants with a tee or tank and comfortable sneakers."
        ),
        "hot": (
            "Choose loose linen or cotton, shorts or a breezy dress, plus a hat and sunglasses."
        ),
    }[band]

    chunks = []

    if precip == "snow":
        chunks.append(
            "For snow, wear insulated waterproof boots with good tread, wool or thermal socks, "
            "and a waterproof parka or ski jacket with a hood. Add insulated gloves and a hat."
        )
        chunks.append(inner)
    elif precip == "rain":
        chunks.append(
            "For rain, layer under a waterproof shell or trench with a hood; "
            "pick quick-dry pants or treated denim and water-resistant footwear."
        )
        if band in ("freezing", "cold"):
            chunks.append(
                "Use a warm mid-layer under the shell so cold rain doesn't chill you."
            )
        else:
            chunks.append(inner)
    elif precip == "fog":
        chunks.append(
            "In foggy, damp air, prefer breathable layers you can adjust and consider "
            "reflective details if you're near traffic."
        )
        chunks.append(inner)
    else:
        chunks.append(inner)

    if windy:
        chunks.append(
            "It's windy — add a wind-blocking shell or dense outer layer."
        )
    elif breezy and band in ("cool", "cold", "freezing"):
        chunks.append("It's a bit breezy — a zipped collar or light scarf cuts the chill.")

    if has_range:
        band_max = _temp_band(temp_max, runs_cold)
        chunks.append(
            f"Temperature climbs from {round(temp_min)}°F to {round(temp_max)}°F during your window — "
            f"dress for the cooler start and plan to peel off a layer as it warms toward {band_max} conditions."
        )
    elif runs_cold:
        chunks.append(
            "Since you tend to run cold, bring one extra thin layer for aggressive indoor AC."
        )
    else:
        chunks.append(
            "Since you run warm, favor breathable pieces you can peel off instead of one heavy coat."
        )

    event_note = _EVENT_CONTEXT.get(event_type, "")
    if event_note:
        chunks.append(event_note.strip())

    gender_note = _GENDER_CONTEXT.get(gender, "")
    if gender_note:
        chunks.append(gender_note.strip())

    text = " ".join(chunks)
    while "  " in text:
        text = text.replace("  ", " ")
    return text.strip()


def detailed_packing(forecast_days: list, runs_cold: bool = False, trip_type: str = "leisure") -> dict:
    """Return specific item descriptions per packing category for a multi-day trip."""
    n = len(forecast_days)
    precip_kinds = [_precip_kind(d["weathercode"]) for d in forecast_days]
    bands = [_temp_band(d["temperature"], runs_cold) for d in forecast_days]

    has_rain = "rain" in precip_kinds
    has_snow = "snow" in precip_kinds
    has_freezing = "freezing" in bands
    has_cold = has_freezing or "cold" in bands
    has_cool = "cool" in bands
    has_mild = "mild" in bands
    has_warm = "warm" in bands or "hot" in bands
    is_hot = "hot" in bands
    varied = (max(d["temperature"] for d in forecast_days) - min(d["temperature"] for d in forecast_days)) >= 15

    tops, bottoms, underwear, jackets, shoes, accessories = [], [], [], [], [], []

    # Tops
    if has_warm or is_hot:
        n_tees = max(2, round(n * 0.6))
        tops.append(f"{n_tees} t-shirts or lightweight tops")
    if has_cool or has_cold or has_freezing or varied:
        n_ls = max(1, round(n * 0.4)) if has_warm else max(2, round(n * 0.7))
        tops.append(f"{n_ls} long-sleeve shirt{'s' if n_ls > 1 else ''} or light sweater{'s' if n_ls > 1 else ''}")
    if has_cold or has_freezing:
        tops.append("1 warm sweater or fleece pullover")
    if has_freezing:
        tops.append("1 thermal base layer top")
    if varied:
        tops.append("1 versatile layering piece (cardigan or overshirt)")
    if trip_type == "business":
        tops.append("1–2 wrinkle-resistant dress shirts or blouses")
    if trip_type == "beach":
        tops.append("2 swimsuit tops or rash guards")
    if not tops:
        tops.append(f"{n + 1} everyday tops")

    # Bottoms
    if is_hot and trip_type != "business":
        n_sh = max(1, n // 2)
        bottoms.append(f"{n_sh} pair{'s' if n_sh > 1 else ''} of shorts or lightweight pants")
    n_pants = max(1, (n + 1) // 3)
    bottoms.append(f"{n_pants} pair{'s' if n_pants > 1 else ''} of jeans or casual pants")
    if has_cold or has_freezing:
        bottoms.append("1 pair of warmer trousers or lined pants")
    if has_freezing:
        bottoms.append("1 thermal base layer bottom")
    if trip_type == "beach":
        bottoms.append("1–2 pairs of swim shorts or swimsuit bottoms")
    if trip_type == "business":
        bottoms.append("1–2 pairs of dress trousers or tailored pants")
    if trip_type == "adventure":
        bottoms.append("1 pair of hiking pants or convertible trousers")

    # Underwear & socks
    underwear.append(f"{n + 1} pairs of underwear")
    underwear.append(f"{n + 1} pairs of everyday socks")
    if has_cold or has_freezing:
        underwear.append("2 pairs of warm wool or thermal socks")
    if has_rain or has_snow:
        underwear.append("2 extra pairs of socks for wet days")

    # Jackets / layers
    if has_freezing:
        jackets.append("1 heavy winter coat or insulated parka")
    elif has_cold:
        jackets.append("1 warm insulated jacket or down coat")
    if has_cool or has_mild or (varied and has_warm):
        jackets.append("1 light jacket, zip-up, or cardigan")
    if has_rain or has_snow:
        jackets.append("1 waterproof rain jacket or shell")
    if not jackets:
        jackets.append("1 light layer for cool evenings")

    # Shoes
    shoes.append("1 pair of comfortable walking shoes or sneakers")
    if has_rain or has_snow:
        shoes.append("1 pair of waterproof boots or weather-resistant shoes")
    if is_hot and trip_type not in ("business", "adventure") and n > 2:
        shoes.append("1 pair of sandals or casual flip-flops")
    if trip_type == "business":
        shoes.append("1 pair of dress shoes")
    if trip_type == "adventure":
        shoes.append("1 pair of hiking boots or trail shoes")

    # Accessories
    if has_cold or has_freezing:
        accessories += ["Warm hat or beanie", "Scarf", "Gloves or mittens"]
    if has_rain or has_snow:
        accessories.append("Compact travel umbrella")
    if has_warm or is_hot:
        accessories += ["Sunglasses", "Sun hat or baseball cap"]
    if not accessories:
        accessories.append("Sunglasses for bright days")

    return {
        "tops": tops,
        "bottoms": bottoms,
        "underwear": underwear,
        "jackets": jackets,
        "shoes": shoes,
        "accessories": accessories,
    }
