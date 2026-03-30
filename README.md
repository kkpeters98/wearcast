# 🌤️ WearCast

An AI-powered outfit recommendation app that combines real-time weather data with Claude AI to tell you exactly what to wear today.

## What it does

Enter any city, tell WearCast whether you run warm or cold, and it will fetch live weather conditions, use Claude AI to generate a personalized outfit recommendation, and log everything to a database modeled with dbt.

## Tech Stack

- **Python + Flask** — web backend and API routing
- **Open-Meteo API** — free real-time weather data, no API key needed
- **Anthropic Claude API** — AI-powered outfit recommendations
- **DuckDB** — lightweight local database for logging recommendations
- **dbt Core** — data transformation and modeling on top of raw logs

## dbt Models

| Model | Description |
|-------|-------------|
| `stg_recommendations` | Cleans raw logs, adds human-readable weather descriptions |
| `mart_city_stats` | Aggregates by city — total searches, avg temp, warm vs cold split |

## Setup

Clone the repo and create a virtual environment:

    git clone https://github.com/kkpeters98/wearcast.git
    cd wearcast
    python3 -m venv venv
    source venv/bin/activate

Install dependencies:

    pip install -r requirements.txt

Create a `.env` file with your Anthropic API key:

    ANTHROPIC_API_KEY=your_key_here

Run the app:

    python3 app.py

Open `http://localhost:5000` in your browser.

To run the dbt models:

    cd wearcast_dbt
    dbt run

## Why I built this

I built WearCast to learn analytics engineering fundamentals — specifically dbt Core, data modeling, and how to build a full data pipeline from raw event capture through to analytics-ready models. The app solves a real personal problem while giving me real data to transform and model.