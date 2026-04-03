import json
import os
import re
import threading
from collections import OrderedDict
from datetime import datetime

import anthropic
import duckdb
import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

load_dotenv()

app = Flask(__name__)

HTTP_TIMEOUT = 15
_outfit_model = os.getenv("WEARCAST_MODEL", "claude-haiku-4-5-20251001")
_anthropic_client = None


def _get_anthropic():
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _anthropic_client


def log_recommendation(location, temperature, windspeed, weathercode, runs_cold, outfit):
    try:
        con = duckdb.connect("wearcast.duckdb")
        con.execute("""
            CREATE TABLE IF NOT EXISTS recommendations (
                location VARCHAR,
                temperature FLOAT,
                windspeed FLOAT,
                weathercode INTEGER,
                runs_cold BOOLEAN,
                outfit TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        con.execute("""
            INSERT INTO recommendations (location, temperature, windspeed, weathercode, runs_cold, outfit)
            VALUES (?, ?, ?, ?, ?, ?)
        """, [location, temperature, windspeed, weathercode, runs_cold, outfit])
        con.close()
    except Exception:
        pass


_GEOCODE_CACHE: OrderedDict[str, tuple[float, float]] = OrderedDict()
_GEOCODE_CACHE_MAX = 256


def _fetch_coordinates_uncached(normalized_location: str):
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": normalized_location, "format": "json", "limit": 1}
    headers = {"User-Agent": "fitforecast-app"}
    try:
        response = requests.get(url, params=params, headers=headers, timeout=HTTP_TIMEOUT)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException:
        return None, None
    if not data:
        return None, None
    return float(data[0]["lat"]), float(data[0]["lon"])


def get_coordinates(location):
    if not location or not str(location).strip():
        return None, None
    key = str(location).strip().lower()
    if key in _GEOCODE_CACHE:
        _GEOCODE_CACHE.move_to_end(key)
        return _GEOCODE_CACHE[key]
    lat, lon = _fetch_coordinates_uncached(key)
    if lat is not None:
        _GEOCODE_CACHE[key] = (lat, lon)
        _GEOCODE_CACHE.move_to_end(key)
        while len(_GEOCODE_CACHE) > _GEOCODE_CACHE_MAX:
            _GEOCODE_CACHE.popitem(last=False)
    return lat, lon


def get_weather(lat, lon, forecast_date=None):
    url = "https://api.open-meteo.com/v1/forecast"
    today = datetime.now().strftime("%Y-%m-%d")

    if forecast_date and forecast_date != today:
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": ["temperature_2m_max", "temperature_2m_min", "weathercode", "windspeed_10m_max"],
            "temperature_unit": "fahrenheit",
            "windspeed_unit": "mph",
            "timezone": "auto",
            "start_date": forecast_date,
            "end_date": forecast_date,
        }
        response = requests.get(url, params=params, timeout=HTTP_TIMEOUT)
        response.raise_for_status()
        data = response.json()
        daily = data["daily"]
        avg_temp = (daily["temperature_2m_max"][0] + daily["temperature_2m_min"][0]) / 2
        return {
            "temperature": round(avg_temp, 1),
            "temperature_max": daily["temperature_2m_max"][0],
            "temperature_min": daily["temperature_2m_min"][0],
            "windspeed": daily["windspeed_10m_max"][0],
            "weathercode": daily["weathercode"][0],
            "timezone": data.get("timezone", "UTC"),
            "is_forecast": True,
            "forecast_date": forecast_date,
        }
    else:
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": ["temperature_2m", "weathercode", "windspeed_10m"],
            "temperature_unit": "fahrenheit",
            "windspeed_unit": "mph",
            "timezone": "auto",
            "forecast_days": 1,
        }
        response = requests.get(url, params=params, timeout=HTTP_TIMEOUT)
        response.raise_for_status()
        data = response.json()
        current = data["current"]
        return {
            "temperature": current["temperature_2m"],
            "windspeed": current["windspeed_10m"],
            "weathercode": current["weathercode"],
            "timezone": data.get("timezone", "UTC"),
            "is_forecast": False,
        }


def get_outfit(weather, runs_cold=False, gender="woman"):
    client = _get_anthropic()
    preference = "runs cold" if runs_cold else "runs warm"
    temp = weather["temperature"]

    prompt = f"""You are a helpful weather-to-outfit advisor. Based on the weather, tell a {gender} who {preference} what TYPE of clothing to wear — not specific items or colors.

Current weather:
- Temperature: {temp}°F
- Wind speed: {weather['windspeed']} mph  
- Sky: {weather['weathercode']} (0=sunny, 1-2=mostly clear, 3=overcast, 61-67=rain, 71-77=snow)

Guidelines:
- Recommend clothing weight and coverage (e.g. "short sleeve top", "light jacket", "breathable pants or shorts")
- Give options where it makes sense (e.g. "jeans or casual pants")
- Factor in sun vs overcast — sunny and 70F feels warmer than overcast and 70F
- Factor in wind — above 15mph adds a chill, suggest a light layer to throw on
- Above 75F and sunny: short sleeves, breathable bottoms, no heavy layers
- 65-75F sunny: short or light long sleeve, option to bring a light layer for wind
- 65-75F overcast: light layer recommended
- Below 65F: jacket appropriate
- "runs cold" = suggest one layer warmer than average in the 60-72F range only
- "runs warm" = suggest one step lighter than average in the 55-68F range only
- For accessories, focus on practical items like sunglasses, umbrella, or light scarf

Return ONLY a raw JSON object, no markdown:
{{"top": "garment type guidance", "bottoms": "garment type guidance", "shoes": "footwear guidance", "accessories": "practical accessories or none needed"}}"""
    message = client.messages.create(
        model=_outfit_model,
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )
    import json
    text = message.content[0].text.strip()
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        text = match.group(0)
    try:
        return json.loads(text)
    except Exception:
        return {"top": text, "bottoms": "", "shoes": "", "accessories": ""}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/autocomplete")
def autocomplete():
    query = request.args.get("q", "")
    if not query or len(query) < 2:
        return jsonify([])
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": query, "format": "json", "limit": 5, "addressdetails": 1}
    headers = {"User-Agent": "fitforecast-app"}
    try:
        response = requests.get(url, params=params, headers=headers, timeout=5)
        data = response.json()
        suggestions = [item["display_name"] for item in data]
        return jsonify(suggestions)
    except Exception:
        return jsonify([])


@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.json
    location = data.get("location")
    runs_cold = data.get("runs_cold", True)
    gender = data.get("gender", "woman")
    forecast_date = data.get("forecast_date", None)

    lat, lon = get_coordinates(location)
    if lat is None:
        return jsonify({"error": "Location not found"}), 400

    try:
        weather = get_weather(lat, lon, forecast_date)
    except (requests.RequestException, KeyError):
        return jsonify({"error": "Weather service unavailable"}), 502

    outfit = get_outfit(weather, runs_cold, gender)

    threading.Thread(
        target=log_recommendation,
        args=(location, weather["temperature"], weather["windspeed"],
              weather["weathercode"], runs_cold, str(outfit)),
        daemon=True,
    ).start()

    return jsonify({"weather": weather, "outfit": outfit})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))