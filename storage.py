"""Append-only recommendation logging: PostgreSQL in production, DuckDB locally."""

import os
import threading

import duckdb

try:
    import fcntl
except ImportError:
    fcntl = None

try:
    import psycopg2
except ImportError:
    psycopg2 = None

_duck_lock = threading.Lock()


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


def _log_postgres(
    location,
    temperature,
    windspeed,
    weathercode,
    runs_cold,
    outfit,
    database_url: str,
):
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is required when DATABASE_URL is set")
    conn = psycopg2.connect(_normalize_database_url(database_url))
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS recommendations (
                    id SERIAL PRIMARY KEY,
                    location VARCHAR,
                    temperature DOUBLE PRECISION,
                    windspeed DOUBLE PRECISION,
                    weathercode INTEGER,
                    runs_cold BOOLEAN,
                    outfit TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            cur.execute(
                """
                INSERT INTO recommendations
                    (location, temperature, windspeed, weathercode, runs_cold, outfit)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    location,
                    temperature,
                    windspeed,
                    weathercode,
                    runs_cold,
                    outfit,
                ),
            )
        conn.commit()
    finally:
        conn.close()


def _log_duckdb(
    location,
    temperature,
    windspeed,
    weathercode,
    runs_cold,
    outfit,
    path: str,
):
    def write():
        con = duckdb.connect(path)
        try:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS recommendations (
                    location VARCHAR,
                    temperature FLOAT,
                    windspeed FLOAT,
                    weathercode INTEGER,
                    runs_cold BOOLEAN,
                    outfit TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            con.execute(
                """
                INSERT INTO recommendations
                    (location, temperature, windspeed, weathercode, runs_cold, outfit)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    location,
                    temperature,
                    windspeed,
                    weathercode,
                    runs_cold,
                    outfit,
                ],
            )
        finally:
            con.close()

    lock_path = path + ".lock"
    if fcntl is not None:
        with open(lock_path, "a") as lockf:
            fcntl.flock(lockf.fileno(), fcntl.LOCK_EX)
            try:
                write()
            finally:
                fcntl.flock(lockf.fileno(), fcntl.LOCK_UN)
    else:
        with _duck_lock:
            write()


def log_recommendation(
    location,
    temperature,
    windspeed,
    weathercode,
    runs_cold,
    outfit,
):
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        _log_postgres(
            location,
            temperature,
            windspeed,
            weathercode,
            runs_cold,
            outfit,
            database_url,
        )
        return

    path = os.getenv("DUCKDB_PATH", "wearcast.duckdb")
    _log_duckdb(
        location,
        temperature,
        windspeed,
        weathercode,
        runs_cold,
        outfit,
        path,
    )
