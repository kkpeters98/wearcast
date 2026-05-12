import datetime
import os
import sys
import threading
from collections import OrderedDict

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

from outfit_engine import outfit_from_rules, detailed_packing
from storage import log_recommendation

load_dotenv()

app = Flask(__name__)
HTTP_TIMEOUT = 15

_outfit_model = os.getenv("WEARCAST_MODEL", "claude-haiku-4-5-20251001")
_anthropic_client = None


def _get_anthropic():
    global _anthropic_client
    if _anthropic_client is None:
        try:
            import anthropic
        except ImportError as exc:
            raise RuntimeError("Install the anthropic package: pip install anthropic") from exc
        key = os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set")
        _anthropic_client = anthropic.Anthropic(api_key=key)
    return _anthropic_client


def _get_outfit_anthropic(weather, runs_cold=False, event_type="casual"):
    client = _get_anthropic()
    preference = "runs cold" if runs_cold else "runs warm"
    event_note = f" The occasion is {event_type}." if event_type != "casual" else ""
    prompt = (
        f"You are a helpful fashion assistant. Suggest a specific outfit for these conditions.\n"
        f"Temperature: {weather['temperature']}°F, Wind: {weather['windspeed']} mph, "
        f"Weather code: {weather['weathercode']}. The person {preference}.{event_note} "
        f"Give a friendly recommendation in 2-3 sentences."
    )
    message = client.messages.create(
        model=_outfit_model,
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def resolve_outfit(weather, runs_cold, event_type="casual"):
    mode = os.getenv("OUTFIT_MODE", "auto").lower().strip()
    has_key = bool(os.getenv("ANTHROPIC_API_KEY"))

    if mode == "rules":
        return outfit_from_rules(weather, runs_cold, event_type), "rules"
    if mode == "anthropic":
        if not has_key:
            raise ValueError("OUTFIT_MODE=anthropic requires ANTHROPIC_API_KEY")
        return _get_outfit_anthropic(weather, runs_cold, event_type), "anthropic"
    if mode != "auto":
        return outfit_from_rules(weather, runs_cold, event_type), "rules"
    if has_key:
        try:
            return _get_outfit_anthropic(weather, runs_cold, event_type), "anthropic"
        except Exception:
            pass
    return outfit_from_rules(weather, runs_cold, event_type), "rules"


_GEOCODE_CACHE: OrderedDict[str, tuple[float, float]] = OrderedDict()
_GEOCODE_CACHE_MAX = 256


def get_coordinates(location):
    if not location or not str(location).strip():
        return None, None
    key = str(location).strip().lower()
    if key in _GEOCODE_CACHE:
        _GEOCODE_CACHE.move_to_end(key)
        return _GEOCODE_CACHE[key]
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": key, "format": "json", "limit": 1}
    headers = {"User-Agent": "WearCast/1.0"}
    try:
        r = requests.get(url, params=params, headers=headers, timeout=HTTP_TIMEOUT)
        r.raise_for_status()
        data = r.json()
    except requests.RequestException:
        return None, None
    if not data:
        return None, None
    lat, lon = float(data[0]["lat"]), float(data[0]["lon"])
    _GEOCODE_CACHE[key] = (lat, lon)
    _GEOCODE_CACHE.move_to_end(key)
    while len(_GEOCODE_CACHE) > _GEOCODE_CACHE_MAX:
        _GEOCODE_CACHE.popitem(last=False)
    return lat, lon


def get_current_weather(lat, lon):
    params = {
        "latitude": lat, "longitude": lon,
        "current": ["temperature_2m", "weathercode", "windspeed_10m"],
        "temperature_unit": "fahrenheit", "windspeed_unit": "mph", "forecast_days": 1,
    }
    r = requests.get("https://api.open-meteo.com/v1/forecast", params=params, timeout=HTTP_TIMEOUT)
    r.raise_for_status()
    c = r.json()["current"]
    return {"temperature": c["temperature_2m"], "windspeed": c["windspeed_10m"], "weathercode": c["weathercode"]}


def get_hourly_for_date(lat, lon, date_str, hour_start=0, hour_end=24):
    """Fetch hourly weather for a specific date and hour window. Returns (hours_list, summary_dict)."""
    today = datetime.date.today()
    target = datetime.date.fromisoformat(date_str)
    days_ahead = (target - today).days
    if days_ahead < 0 or days_ahead > 15:
        return None, None

    params = {
        "latitude": lat, "longitude": lon,
        "hourly": ["temperature_2m", "weathercode", "windspeed_10m"],
        "temperature_unit": "fahrenheit", "windspeed_unit": "mph",
        "forecast_days": days_ahead + 1,
    }
    r = requests.get("https://api.open-meteo.com/v1/forecast", params=params, timeout=HTTP_TIMEOUT)
    r.raise_for_status()
    hourly = r.json()["hourly"]

    hours = []
    for i, ts in enumerate(hourly["time"]):
        h_date, h_time = ts[:10], ts[11:13]
        h = int(h_time)
        if h_date == date_str and hour_start <= h < hour_end:
            hours.append({
                "hour": h,
                "temperature": hourly["temperature_2m"][i],
                "windspeed": hourly["windspeed_10m"][i],
                "weathercode": hourly["weathercode"][i],
            })

    if not hours:
        return None, None

    from outfit_engine import _precip_kind
    # Summary: coldest temp (dress for cold), worst precip, max wind
    worst_code = max(hours, key=lambda h: (
        3 if _precip_kind(h["weathercode"]) == "snow"
        else 2 if _precip_kind(h["weathercode"]) == "rain"
        else 1 if _precip_kind(h["weathercode"]) == "fog"
        else 0
    ))["weathercode"]

    summary = {
        "temperature": min(h["temperature"] for h in hours),
        "windspeed": max(h["windspeed"] for h in hours),
        "weathercode": worst_code,
        "temp_min": min(h["temperature"] for h in hours),
        "temp_max": max(h["temperature"] for h in hours),
    }
    return hours, summary


def get_forecast_range(lat, lon, days):
    params = {
        "latitude": lat, "longitude": lon,
        "daily": ["temperature_2m_max", "temperature_2m_min", "weathercode", "windspeed_10m_max"],
        "temperature_unit": "fahrenheit", "windspeed_unit": "mph",
        "forecast_days": min(days, 16),
    }
    r = requests.get("https://api.open-meteo.com/v1/forecast", params=params, timeout=HTTP_TIMEOUT)
    r.raise_for_status()
    daily = r.json()["daily"]
    return [
        {
            "temperature": (daily["temperature_2m_max"][i] + daily["temperature_2m_min"][i]) / 2,
            "windspeed": daily["windspeed_10m_max"][i],
            "weathercode": daily["weathercode"][i],
        }
        for i in range(len(daily["time"]))
    ]


@app.after_request
def _cors(resp):
    origin = os.getenv("CORS_ORIGIN", "*").strip()
    resp.headers["Access-Control-Allow-Origin"] = origin
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return resp


@app.route("/recommend", methods=["OPTIONS"])
@app.route("/trip", methods=["OPTIONS"])
def preflight():
    return "", 204


@app.route("/health")
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.json or {}
    location = data.get("location")
    runs_cold = data.get("runs_cold", False)
    event_type = data.get("event_type", "casual")
    date_str = data.get("date")
    hour_start = int(data.get("time_start", 0))
    hour_end = int(data.get("time_end", 24))

    lat, lon = get_coordinates(location)
    if lat is None:
        return jsonify({"error": "Location not found"}), 400

    try:
        if date_str and date_str != datetime.date.today().isoformat():
            hours, weather = get_hourly_for_date(lat, lon, date_str, hour_start, hour_end)
            if weather is None:
                return jsonify({"error": "Date out of forecast range (max 15 days)"}), 400
        elif date_str:
            # Today with time window
            hours, weather = get_hourly_for_date(lat, lon, date_str, hour_start, hour_end)
            if weather is None:
                weather = get_current_weather(lat, lon)
                hours = []
        else:
            weather = get_current_weather(lat, lon)
            hours = []
    except (requests.RequestException, KeyError):
        return jsonify({"error": "Weather service unavailable"}), 502

    try:
        outfit, source = resolve_outfit(weather, runs_cold, event_type)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    def _safe_log():
        try:
            log_recommendation(location, weather["temperature"], weather["windspeed"],
                               weather["weathercode"], runs_cold, outfit)
        except Exception as exc:
            print("log_recommendation failed:", exc, file=sys.stderr)

    threading.Thread(target=_safe_log, daemon=True).start()

    return jsonify({"weather": weather, "hourly": hours, "outfit": outfit, "source": source})


@app.route("/trip", methods=["POST"])
def trip():
    data = request.json or {}
    location = data.get("location")
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    runs_cold = data.get("runs_cold", False)
    trip_type = data.get("trip_type", "leisure")

    lat, lon = get_coordinates(location)
    if lat is None:
        return jsonify({"error": "Location not found"}), 400

    try:
        start = datetime.date.fromisoformat(start_date)
        end = datetime.date.fromisoformat(end_date)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid dates"}), 400

    num_days = max(1, (end - start).days + 1)

    try:
        forecast = get_forecast_range(lat, lon, num_days)
    except (requests.RequestException, KeyError):
        return jsonify({"error": "Weather service unavailable"}), 502

    packing = detailed_packing(forecast[:num_days], runs_cold, trip_type)
    return jsonify({"packing": packing, "days": num_days})


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(debug=os.getenv("FLASK_DEBUG") == "1", host="0.0.0.0", port=port)
