import requests

def get_weather(lat, lon):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": ["temperature_2m", "weathercode", "windspeed_10m"],
        "temperature_unit": "fahrenheit",
        "windspeed_unit": "mph",
        "forecast_days": 1
    }
    response = requests.get(url, params=params)
    data = response.json()
    current = data["current"]
    return {
        "temperature": current["temperature_2m"],
        "windspeed": current["windspeed_10m"],
        "weathercode": current["weathercode"]
    }

if __name__ == "__main__":
    # Denver coordinates
    weather = get_weather(39.7392, -104.9903)
    print(weather)
import requests
import anthropic
import os
from dotenv import load_dotenv

load_dotenv()

def get_weather(lat, lon):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": ["temperature_2m", "weathercode", "windspeed_10m"],
        "temperature_unit": "fahrenheit",
        "windspeed_unit": "mph",
        "forecast_days": 1
    }
    response = requests.get(url, params=params)
    data = response.json()
    current = data["current"]
    return {
        "temperature": current["temperature_2m"],
        "windspeed": current["windspeed_10m"],
        "weathercode": current["weathercode"]
    }

def get_outfit(weather, runs_cold=False):
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    preference = "runs cold" if runs_cold else "runs warm"
    
    prompt = f"""You are a helpful fashion assistant. Based on the following weather conditions, suggest a specific outfit.

Weather:
- Temperature: {weather['temperature']}°F
- Wind speed: {weather['windspeed']} mph
- Weather code: {weather['weathercode']} (0-2 = clear, 3 = overcast, 61-67 = rain, 71-77 = snow)

The person {preference}. Give a friendly, specific outfit recommendation in 3-4 sentences."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text

if __name__ == "__main__":
    weather = get_weather(39.7392, -104.9903)
    print("Weather:", weather)
    print("\nOutfit recommendation:")
    print(get_outfit(weather, runs_cold=False))