import json
import os
import re
import threading
from collections import OrderedDict
from datetime import datetime, timedelta

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


def get_weather(lat, lon, forecast_date=None, forecast_hour=None):
    url = "https://api.open-meteo.com/v1/forecast"
    today = datetime.now().strftime("%Y-%m-%d")
    target_date = forecast_date if forecast_date else today

    if forecast_hour is not None:
        params = {
            "latitude": lat, "longitude": lon,
            "hourly": ["temperature_2m", "weathercode", "windspeed_10m"],
            "temperature_unit": "fahrenheit", "windspeed_unit": "mph",
            "timezone": "auto", "start_date": target_date, "end_date": target_date,
        }
        response = requests.get(url, params=params, timeout=HTTP_TIMEOUT)
        response.raise_for_status()
        data = response.json()
        hourly = data["hourly"]
        idx = forecast_hour
        return {
            "temperature": hourly["temperature_2m"][idx],
            "windspeed": hourly["windspeed_10m"][idx],
            "weathercode": hourly["weathercode"][idx],
            "timezone": data.get("timezone", "UTC"),
            "is_forecast": True,
            "forecast_date": target_date,
            "forecast_hour": forecast_hour,
        }
    elif forecast_date and forecast_date != today:
        params = {
            "latitude": lat, "longitude": lon,
            "daily": ["temperature_2m_max", "temperature_2m_min", "weathercode", "windspeed_10m_max"],
            "temperature_unit": "fahrenheit", "windspeed_unit": "mph",
            "timezone": "auto", "start_date": forecast_date, "end_date": forecast_date,
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
            "forecast_hour": None,
        }
    else:
        params = {
            "latitude": lat, "longitude": lon,
            "current": ["temperature_2m", "weathercode", "windspeed_10m"],
            "temperature_unit": "fahrenheit", "windspeed_unit": "mph",
            "timezone": "auto", "forecast_days": 1,
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
            "forecast_date": None,
            "forecast_hour": None,
        }


def get_trip_weather(lat, lon, start_date, end_date):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat, "longitude": lon,
        "daily": ["temperature_2m_max", "temperature_2m_min", "weathercode", "windspeed_10m_max", "precipitation_sum"],
        "temperature_unit": "fahrenheit", "windspeed_unit": "mph",
        "timezone": "auto", "start_date": start_date, "end_date": end_date,
    }
    response = requests.get(url, params=params, timeout=HTTP_TIMEOUT)
    response.raise_for_status()
    data = response.json()
    daily = data["daily"]
    days = []
    for i in range(len(daily["time"])):
        days.append({
            "date": daily["time"][i],
            "temp_max": daily["temperature_2m_max"][i],
            "temp_min": daily["temperature_2m_min"][i],
            "weathercode": daily["weathercode"][i],
            "windspeed": daily["windspeed_10m_max"][i],
            "precipitation": daily["precipitation_sum"][i],
        })
    return days, data.get("timezone", "UTC")


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
    text = message.content[0].text.strip()
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        text = match.group(0)
    try:
        return json.loads(text)
    except Exception:
        return {"top": text, "bottoms": "", "shoes": "", "accessories": ""}


def get_packing_list(destination, days, runs_cold, gender, trip_duration):
    client = _get_anthropic()
    preference = "runs cold" if runs_cold else "runs warm"

    weather_summary = []
    for d in days:
        code = d['weathercode'] or 0
        if 61 <= code <= 67:
            cond = "rain"
        elif 71 <= code <= 77:
            cond = "snow"
        elif code <= 2:
            cond = "clear"
        else:
            cond = "overcast"
        weather_summary.append(
            f"- {d['date']}: {d['temp_min']}-{d['temp_max']}F, {cond}, wind {d['windspeed']} mph"
        )

    prompt = f"""You are a smart travel packing assistant. Create a practical packing list for a {gender} who {preference} traveling to {destination} for {trip_duration} days.

Weather forecast for the trip:
{chr(10).join(weather_summary)}

Create a packing list that is:
- Practical and specific to this exact weather
- Optimized for the trip length (don't over-pack)
- Organized by category
- Focused on clothing and weather-related items only (no toiletries, documents, etc.)

Return ONLY a raw JSON object, no markdown:
{{
  "tops": ["item 1", "item 2"],
  "bottoms": ["item 1", "item 2"],
  "shoes": ["item 1"],
  "layers": ["item 1"],
  "accessories": ["item 1"],
  "weather_notes": "one sentence about key weather pattern to know"
}}"""

    message = client.messages.create(
        model=_outfit_model,
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )
    text = message.content[0].text.strip()
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        text = match.group(0)
    try:
        return json.loads(text)
    except Exception:
        return {"tops": [], "bottoms": [], "shoes": [], "layers": [], "accessories": [], "weather_notes": ""}


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
    forecast_hour = data.get("forecast_hour", None)

    lat, lon = get_coordinates(location)
    if lat is None:
        return jsonify({"error": "Location not found"}), 400

    try:
        weather = get_weather(lat, lon, forecast_date, forecast_hour)
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


@app.route("/pack", methods=["POST"])
def pack():
    data = request.json
    destination = data.get("destination")
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    runs_cold = data.get("runs_cold", True)
    gender = data.get("gender", "woman")

    if not destination or not start_date or not end_date:
        return jsonify({"error": "Please fill in all fields"}), 400

    lat, lon = get_coordinates(destination)
    if lat is None:
        return jsonify({"error": "Destination not found"}), 400

    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        trip_duration = (end - start).days + 1
        if trip_duration < 1:
            return jsonify({"error": "End date must be after start date"}), 400
        if trip_duration > 16:
            return jsonify({"error": "Trip must be 16 days or less"}), 400
    except ValueError:
        return jsonify({"error": "Invalid dates"}), 400

    try:
        days, timezone = get_trip_weather(lat, lon, start_date, end_date)
    except Exception:
        return jsonify({"error": "Weather service unavailable"}), 502

    packing_list = get_packing_list(destination, days, runs_cold, gender, trip_duration)

    return jsonify({
        "destination": destination,
        "start_date": start_date,
        "end_date": end_date,
        "trip_duration": trip_duration,
        "days": days,
        "packing_list": packing_list,
        "timezone": timezone,
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))