import os
import threading
from collections import OrderedDict

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


_GEOCODE_CACHE: OrderedDict[str, tuple[float, float]] = OrderedDict()
_GEOCODE_CACHE_MAX = 256


def _fetch_coordinates_uncached(normalized_location: str):
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": normalized_location, "format": "json", "limit": 1}
    headers = {"User-Agent": "wearcast-app"}
    try:
        response = requests.get(
            url, params=params, headers=headers, timeout=HTTP_TIMEOUT
        )
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


def get_weather(lat, lon):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": ["temperature_2m", "weathercode", "windspeed_10m"],
        "temperature_unit": "fahrenheit",
        "windspeed_unit": "mph",
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
    }


def get_outfit(weather, runs_cold=False, gender="woman"):
    client = _get_anthropic()
    preference = "runs cold" if runs_cold else "runs warm"
    prompt = f"""You are a helpful fashion assistant. Based on the following weather conditions, suggest a specific outfit for a {gender} who {preference}.

Weather:
- Temperature: {weather['temperature']}°F
- Wind speed: {weather['windspeed']} mph
- Weather code: {weather['weathercode']} (0-2 = clear, 3 = overcast, 61-67 = rain, 71-77 = snow)

Give a friendly, specific outfit recommendation in 2-3 sentences."""

    message = client.messages.create(
        model=_outfit_model,
        max_tokens=150,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


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
    headers = {"User-Agent": "wearcast-app"}
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

    lat, lon = get_coordinates(location)
    if lat is None:
        return jsonify({"error": "Location not found"}), 400

    try:
        weather = get_weather(lat, lon)
    except (requests.RequestException, KeyError):
        return jsonify({"error": "Weather service unavailable"}), 502

    outfit = get_outfit(weather, runs_cold, gender)

    threading.Thread(
        target=log_recommendation,
        args=(
            location,
            weather["temperature"],
            weather["windspeed"],
            weather["weathercode"],
            runs_cold,
            outfit,
        ),
        daemon=True,
    ).start()

    return jsonify({"weather": weather, "outfit": outfit})


if __name__ == "__main__":
   app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))