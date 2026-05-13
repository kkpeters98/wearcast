"""Deterministic outfit copy from weather — no external AI or tokens required."""


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
