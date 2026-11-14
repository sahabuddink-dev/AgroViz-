import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_weather_endpoint_full_series():
    response = client.get("/api/weather")
    assert response.status_code == 200
    json_data = response.json()

    # Validate API contract envelope
    assert json_data["provenance"] == "model_estimated"
    assert "NASA POWER" in json_data["source"]
    assert "reanalysis" in json_data["source"].lower()
    assert "°C" in json_data["units"]

    data = json_data["data"]
    assert data["records_count"] == 580
    assert len(data["records"]) == 580
    assert data["date_range"]["start"] == "2023-06-01"
    assert data["date_range"]["end"] == "2024-12-31"

    # Validate latest observation
    latest = data["latest_observation"]
    assert latest["date"] == "2024-12-31"
    assert "t2m" in latest
    assert "t2m_max" in latest
    assert "t2m_min" in latest
    assert "rh2m" in latest
    assert "prectotcorr" in latest

    # Validate statistics
    stats = data["statistics"]
    assert stats["days_count"] == 580
    assert stats["temperature"]["min_c"] < stats["temperature"]["mean_c"] < stats["temperature"]["max_c"]
    assert 0 <= stats["humidity"]["mean_pct"] <= 100
    assert stats["precipitation"]["total_mm"] > 0
    assert stats["precipitation"]["rainy_days_count"] > 0

def test_weather_date_filtering():
    # Filter for August 2023 (31 days)
    response = client.get("/api/weather?start=2023-08-01&end=2023-08-31")
    assert response.status_code == 200
    json_data = response.json()
    data = json_data["data"]

    assert data["records_count"] == 31
    assert len(data["records"]) == 31
    assert data["date_range"]["start"] == "2023-08-01"
    assert data["date_range"]["end"] == "2023-08-31"
    assert data["statistics"]["days_count"] == 31

def test_weather_limit_param():
    response = client.get("/api/weather?limit=15")
    assert response.status_code == 200
    json_data = response.json()
    data = json_data["data"]

    assert data["records_count"] == 580
    assert data["returned_records_count"] == 15
    assert len(data["records"]) == 15

def test_weather_invalid_date_handling():
    # Invalid date format
    res_bad_format = client.get("/api/weather?start=not-a-date")
    assert res_bad_format.status_code == 400
    assert "Invalid date format" in res_bad_format.json()["detail"]

    # Start date after end date
    res_inverted = client.get("/api/weather?start=2024-06-01&end=2023-06-01")
    assert res_inverted.status_code == 400
    assert "cannot be after end date" in res_inverted.json()["detail"]

def test_weather_monthly_summary():
    response = client.get("/api/weather/summary")
    assert response.status_code == 200
    json_data = response.json()

    assert json_data["provenance"] == "model_estimated"
    summaries = json_data["data"]
    # 19 months: Jun 2023 through Dec 2024
    assert len(summaries) == 19

    # June 2023 has 30 days
    jun23 = summaries[0]
    assert jun23["year_month"] == "2023-06"
    assert jun23["days_count"] == 30
    assert jun23["mean_t2m"] > 25.0

    # December 2024 is the final month
    dec24 = summaries[-1]
    assert dec24["year_month"] == "2024-12"
    assert dec24["days_count"] == 31

def test_weather_monthly_summary_filtered():
    response = client.get("/api/weather/summary?start=2024-01-01&end=2024-06-30")
    assert response.status_code == 200
    summaries = response.json()["data"]
    assert len(summaries) == 6
    assert [s["year_month"] for s in summaries] == [
        "2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06"
    ]
