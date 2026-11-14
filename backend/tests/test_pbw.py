import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.pbw import single_sine_horizontal_cutoff, PARAMETER_SETS

client = TestClient(app)

def test_single_sine_lower_threshold_zero():
    """Verify that when Tmax is at or below the lower threshold, degree-days equal zero."""
    # Set A: lower=13.4, upper=35.5
    assert single_sine_horizontal_cutoff(tmin=5.0, tmax=13.4, lower_threshold=13.4, upper_threshold=35.5) == 0.0
    assert single_sine_horizontal_cutoff(tmin=8.0, tmax=12.0, lower_threshold=13.4, upper_threshold=35.5) == 0.0

def test_single_sine_tmin_greater_than_tmax_rejected():
    """Verify that Tmin > Tmax raises ValueError."""
    with pytest.raises(ValueError):
        single_sine_horizontal_cutoff(tmin=25.0, tmax=20.0, lower_threshold=13.4, upper_threshold=35.5)

def test_single_sine_upper_cutoff_capping():
    """Verify horizontal upper cutoff capping behavior."""
    # When both min and max exceed upper threshold, heat is capped at U - L
    dd = single_sine_horizontal_cutoff(tmin=36.0, tmax=42.0, lower_threshold=13.4, upper_threshold=35.5)
    assert abs(dd - (35.5 - 13.4)) < 1e-4

    # When max exceeds U, it produces less than an uncapped simple mean
    tmin, tmax = 20.0, 42.0
    capped_dd = single_sine_horizontal_cutoff(tmin, tmax, 13.4, 35.5)
    simple_uncapped = ((tmax + tmin) / 2.0) - 13.4
    assert capped_dd < simple_uncapped

def test_degree_days_monotonic_accumulation():
    """Verify that accumulated degree-days are strictly monotonic non-decreasing."""
    res = client.get("/api/analysis/degree-days?param_set=both&start=2023-06-01")
    assert res.status_code == 200
    json_data = res.json()
    daily = json_data["data"]["daily_series"]
    
    assert len(daily) > 0
    cum_a = [d["cum_dd_a"] for d in daily]
    cum_b = [d["cum_dd_b"] for d in daily]

    # Monotonicity checks
    for i in range(1, len(cum_a)):
        assert cum_a[i] >= cum_a[i - 1]
        assert cum_b[i] >= cum_b[i - 1]

def test_degree_days_sets_a_and_b_produce_different_results():
    """Verify that Parameter Sets A and B produce quantitatively different results."""
    res = client.get("/api/analysis/degree-days?param_set=both&start=2023-06-15")
    assert res.status_code == 200
    json_data = res.json()
    summary = json_data["data"]["summary"]

    cum_a = summary["set_A"]["accumulated_degree_days"]
    cum_b = summary["set_B"]["accumulated_degree_days"]
    assert cum_a != cum_b
    assert abs(cum_a - cum_b) > 50.0  # Significant divergence due to thresholds

def test_degree_days_mandatory_notices_and_provenance():
    """Verify that API response includes all mandatory notices and provenance."""
    res = client.get("/api/analysis/degree-days?param_set=A&start=2023-06-01")
    assert res.status_code == 200
    json_data = res.json()

    assert json_data["provenance"] == "model_estimated"
    notes = " ".join(json_data["notes"])
    assert "Thermal development potential, not an observation of pests" in notes
    assert "NASA POWER is reanalysis, not a station" in notes
    assert "Parameters are literature values from other regions" in notes
    assert "Scientific Reports" in notes

def test_pbw_context_endpoint_and_separation():
    """Verify Annexure 3 and 4 data are returned with strict separation."""
    res = client.get("/api/pbw/context")
    assert res.status_code == 200
    json_data = res.json()
    assert json_data["provenance"] == "measured"

    data = json_data["data"]
    # Annexure 3 checks
    annex3 = data["annexure_3"]
    assert annex3["published_5season_bt_mean"] == 21.602
    assert len(annex3["akola_seasons"]) == 5
    assert "NBt is presumed non-Bt" in annex3["nbt_disclaimer"]

    # Annexure 4 checks
    annex4 = data["annexure_4"]
    assert annex4["total_surveyed_locations"] == 63
    paras = annex4["akola_paras_record"]
    assert paras["district"] == "Akola"
    assert paras["location"] == "Paras"
    assert paras["yield_loss_pbw_pct"] == 4.428
    assert paras["yield_loss_boll_rot_pct"] == 10.689
    assert "must never be conflated or averaged" in paras["caveat"]

def test_pbw_status_endpoint():
    """Verify PBW status returns unavailable with full requirements."""
    res = client.get("/api/pbw/status")
    assert res.status_code == 200
    json_data = res.json()
    assert json_data["provenance"] == "unavailable"
    assert json_data["data"]["status"] == "unavailable"
    assert "No dated pest observations" in json_data["data"]["message"]
    assert len(json_data["data"]["requirements_to_enable_risk_validation"]) >= 3

def test_pbw_csv_template():
    """Verify PBW CSV template contains exact required columns."""
    res = client.get("/api/pbw/template")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    first_line = res.text.strip().split("\n")[0]
    expected_cols = "date,latitude,longitude,location_name,observation_type,value,unit,crop_stage,source,method"
    assert first_line == expected_cols

def test_pbw_upload_validation_rejects_invalid_schema():
    """Verify that uploading a CSV with invalid schema is rejected with clear errors."""
    # CSV missing required 'observation_type' column
    bad_csv = "date,latitude,longitude,location_name,value,unit\n2023-08-15,20.7,77.0,Akola,5,count\n"
    res = client.post(
        "/api/pbw/upload",
        files={"file": ("test_bad.csv", io.BytesIO(bad_csv.encode("utf-8")), "text/csv")}
    )
    assert res.status_code == 400
    assert "Missing required columns" in res.json()["detail"]

def test_pbw_upload_validation_accepts_valid_csv():
    """Verify that uploading a valid observation CSV succeeds and returns preview."""
    valid_csv = (
        "date,latitude,longitude,location_name,observation_type,value,unit,crop_stage,source,method\n"
        "2023-08-15,20.7069,77.0022,Central Farm,trap_count,7,moths/trap,flowering,Field Scout,Pheromone trap\n"
        "2023-08-22,20.7069,77.0022,Central Farm,boll_damage_pct,4.2,%,boll_formation,Field Scout,20 bolls sampled\n"
    )
    res = client.post(
        "/api/pbw/upload",
        files={"file": ("test_valid.csv", io.BytesIO(valid_csv.encode("utf-8")), "text/csv")}
    )
    assert res.status_code == 200
    json_data = res.json()
    assert json_data["provenance"] == "measured"
    assert json_data["data"]["total_records"] == 2
    assert "trap_count" in json_data["data"]["observation_types"]

def test_pbw_risk_endpoint_locked_as_unavailable():
    """Verify that /api/analysis/pbw-risk always returns unavailable and locked."""
    res = client.get("/api/analysis/pbw-risk")
    assert res.status_code == 200
    json_data = res.json()
    assert json_data["provenance"] == "unavailable"
    assert json_data["data"]["status"] == "locked"
    assert json_data["data"]["risk_score"] is None
    assert json_data["data"]["risk_category"] == "unavailable"
    assert "Missing dated field observations" in json_data["data"]["reason"]
