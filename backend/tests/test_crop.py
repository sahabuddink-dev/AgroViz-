"""
Automated unit and integration tests for Crop Health & Multispectral Raster Engine (Phase 7).
Tests Sentinel-2 daily indices (NDVI, NDRE, NDMI), July monsoon cloud gaps,
GeoTIFF upload validation (magic bytes, dimensions, CRS, bounds), and
multispectral index calculation with zero-division and NoData handling.
"""

import io
import pytest
import numpy as np
import tifffile
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# 1. Sentinel-2 Akola Daily Indices Tests
# ---------------------------------------------------------------------------

def test_crop_indices_endpoint_all_records():
    """Verify GET /api/crop/indices returns 80 valid dates with NDVI, NDRE, NDMI."""
    resp = client.get("/api/crop/indices")
    assert resp.status_code == 200
    data = resp.json()

    assert data["provenance"] == "calculated"
    assert "Sentinel-2" in data["source"]
    assert data["units"] == "index_ratio (-1.0 to 1.0)"

    body = data["data"]
    assert body["total_observation_dates"] == 80
    assert body["start_date"] == "2023-06-05"
    assert body["end_date"] == "2024-12-31"

    # Verify statistics structure
    stats = body["statistics"]
    for idx_name in ["ndvi", "ndre", "ndmi"]:
        assert idx_name in stats
        s = stats[idx_name]
        assert -1.0 <= s["min"] <= 1.0
        assert -1.0 <= s["max"] <= 1.0
        assert s["min"] <= s["mean"] <= s["max"]

    # Verify coverage info
    assert "coverage" in stats
    assert stats["coverage"]["average_valid_pixels_per_date"] > 0

    # Verify records sample
    records = body["records"]
    assert len(records) == 80
    first = records[0]
    assert "date" in first
    assert "ndvi" in first
    assert "ndre" in first
    assert "ndmi" in first
    assert "cloud_percentage" in first
    assert "tile_count" in first
    assert "valid_pixels" in first


def test_crop_indices_explicit_july_gaps():
    """Verify July 2023 and July 2024 monsoon cloud gaps are explicitly reported and contain 0 records."""
    resp = client.get("/api/crop/indices")
    assert resp.status_code == 200
    data = resp.json()["data"]

    # Check explicit july_cloud_gaps in response
    gaps = data["july_cloud_gaps"]
    assert len(gaps) == 2
    assert gaps[0]["period"] == "July 2023"
    assert gaps[0]["valid_optical_observations"] == 0
    assert gaps[1]["period"] == "July 2024"
    assert gaps[1]["valid_optical_observations"] == 0

    # Verify no records in records array have date in July
    july_records = [r for r in data["records"] if "-07-" in r["date"]]
    assert len(july_records) == 0


def test_crop_indices_date_filtering():
    """Verify date filtering on Sentinel-2 time series."""
    resp = client.get("/api/crop/indices?start=2023-08-01&end=2023-10-31")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["total_observation_dates"] > 0
    for r in data["records"]:
        assert "2023-08-01" <= r["date"] <= "2023-10-31"


def test_crop_indices_invalid_date_range():
    """Verify 400 error when date filter contains no observations."""
    resp = client.get("/api/crop/indices?start=2023-07-01&end=2023-07-31")
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# 2. GeoTIFF Upload Validation Tests
# ---------------------------------------------------------------------------

def _create_synthetic_geotiff(
    bands=4,
    height=40,
    width=50,
    dtype=np.uint16,
    with_geokeys=True,
    with_nodata=True,
    nodata_val=0,
):
    """Helper to generate an in-memory synthetic GeoTIFF with tags."""
    data = (np.random.rand(bands, height, width) * 5000 + 100).astype(dtype)
    if with_nodata:
        data[:, :5, :5] = nodata_val

    extra_tags = []
    if with_geokeys:
        pixel_scale = (10.0, 10.0, 0.0)
        tiepoint = (0.0, 0.0, 0.0, 700000.0, 2290000.0, 0.0)
        geokeys = (1, 1, 0, 2, 1024, 0, 1, 1, 3072, 0, 1, 32643)  # UTM 43N
        extra_tags.extend([
            (33550, "d", 3, pixel_scale, False),
            (33922, "d", 6, tiepoint, False),
            (34735, "H", len(geokeys), geokeys, False),
        ])
    if with_nodata:
        extra_tags.append((42113, "s", len(str(nodata_val)) + 1, f"{nodata_val}\x00", False))

    bio = io.BytesIO()
    with tifffile.TiffWriter(bio) as tw:
        tw.write(data, extratags=extra_tags if extra_tags else None)
    return bio.getvalue()


def test_geotiff_upload_valid_4band():
    """Verify uploading a valid 4-band GeoTIFF with CRS and bounds."""
    content = _create_synthetic_geotiff(bands=4, height=40, width=50)
    files = {"file": ("farm_sentinel_clip.tif", io.BytesIO(content), "image/tiff")}
    resp = client.post("/api/imagery/upload", files=files)
    assert resp.status_code == 200
    data = resp.json()

    assert data["provenance"] == "user_provided"
    body = data["data"]
    assert body["width"] == 50
    assert body["height"] == 40
    assert body["band_count"] == 4
    assert "EPSG:32643" in body["crs"]
    assert body["bounds"] is not None
    assert body["bounds"]["min_x"] == 700000.0
    assert body["bounds"]["max_x"] == 700500.0
    assert body["nodata_value"] == 0.0


def test_geotiff_upload_invalid_extension():
    """Verify rejection when file extension is not .tif/.tiff."""
    files = {"file": ("raster.jpg", io.BytesIO(b"fake image data"), "image/jpeg")}
    resp = client.post("/api/imagery/upload", files=files)
    assert resp.status_code == 422
    assert "Only GeoTIFF rasters (.tif, .tiff) are accepted" in resp.json()["detail"]


def test_geotiff_upload_invalid_magic_bytes():
    """Verify rejection when file lacks TIFF magic signature."""
    files = {"file": ("corrupt.tif", io.BytesIO(b"NOT_A_TIFF_HEADER_1234567890"), "image/tiff")}
    resp = client.post("/api/imagery/upload", files=files)
    assert resp.status_code == 422
    assert "Invalid file signature" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# 3. Multispectral Index Computation Tests
# ---------------------------------------------------------------------------

def test_compute_indices_ndvi_ndre_ndmi():
    """Verify NDVI, NDRE, and NDMI computation from uploaded 5-band raster."""
    content = _create_synthetic_geotiff(bands=5, height=30, width=30)
    files = {"file": ("multispectral_5band.tif", io.BytesIO(content), "image/tiff")}
    upload_resp = client.post("/api/imagery/upload", files=files)
    assert upload_resp.status_code == 200
    upload_id = upload_resp.json()["data"]["upload_id"]

    # Compute NDVI, NDRE (bands: blue=1, green=2, red=3, red_edge=4, nir=5)
    compute_payload = {
        "upload_id": upload_id,
        "band_mapping": {"red": 3, "nir": 5, "red_edge": 4},
        "selected_indices": ["NDVI", "NDRE", "NDMI"],
    }
    resp = client.post("/api/imagery/compute-indices", json=compute_payload)
    assert resp.status_code == 200
    data = resp.json()["data"]

    indices = data["indices"]

    # NDVI should be successfully calculated
    assert indices["NDVI"]["status"] == "calculated"
    assert -1.0 <= indices["NDVI"]["mean"] <= 1.0
    assert indices["NDVI"]["valid_pixel_count"] > 0
    assert "histogram" in indices["NDVI"]

    # NDRE should be successfully calculated
    assert indices["NDRE"]["status"] == "calculated"
    assert -1.0 <= indices["NDRE"]["mean"] <= 1.0

    # NDMI should be explicitly marked unavailable because swir band was not provided
    assert indices["NDMI"]["status"] == "unavailable"
    assert "Missing required band mapping" in indices["NDMI"]["reason"]


def test_compute_indices_zero_denominator_safe():
    """Verify zero denominators are masked safely without crashing or returning inf."""
    # Create raster with zeros in both Red and NIR (so NIR + Red == 0)
    height, width = 20, 20
    data = np.zeros((4, height, width), dtype=np.float32)
    # Some pixels with normal values
    data[0, 10:, 10:] = 500.0  # Red
    data[1, 10:, 10:] = 1500.0 # NIR

    bio = io.BytesIO()
    with tifffile.TiffWriter(bio) as tw:
        tw.write(data)

    files = {"file": ("zero_denom.tif", io.BytesIO(bio.getvalue()), "image/tiff")}
    upload_resp = client.post("/api/imagery/upload", files=files)
    assert upload_resp.status_code == 200
    upload_id = upload_resp.json()["data"]["upload_id"]

    compute_payload = {
        "upload_id": upload_id,
        "band_mapping": {"red": 1, "nir": 2},
        "selected_indices": ["NDVI"],
    }
    resp = client.post("/api/imagery/compute-indices", json=compute_payload)
    assert resp.status_code == 200
    ndvi_stats = resp.json()["data"]["indices"]["NDVI"]

    assert ndvi_stats["status"] == "calculated"
    # Expected NDVI on normal pixels: (1500 - 500) / (1500 + 500) = 0.5
    assert 0.49 <= ndvi_stats["mean"] <= 0.51
    # Only 100 pixels out of 400 are valid; the other 300 have denominator 0 and are masked
    assert ndvi_stats["valid_pixel_count"] == 100
    assert ndvi_stats["total_pixel_count"] == 400


def test_compute_indices_nonexistent_upload():
    """Verify 404 error when upload_id is not found."""
    compute_payload = {
        "upload_id": "nonexistent_geotiff_file.tif",
        "band_mapping": {"red": 1, "nir": 2},
    }
    resp = client.post("/api/imagery/compute-indices", json=compute_payload)
    assert resp.status_code == 404


def test_compute_indices_invalid_band_index():
    """Verify 422 error when band mapping specifies band outside raster range."""
    content = _create_synthetic_geotiff(bands=3)
    files = {"file": ("3band.tif", io.BytesIO(content), "image/tiff")}
    upload_resp = client.post("/api/imagery/upload", files=files)
    upload_id = upload_resp.json()["data"]["upload_id"]

    compute_payload = {
        "upload_id": upload_id,
        "band_mapping": {"red": 1, "nir": 8},  # Band 8 does not exist in 3-band raster
    }
    resp = client.post("/api/imagery/compute-indices", json=compute_payload)
    assert resp.status_code == 422
    assert "out of range" in resp.json()["detail"]
