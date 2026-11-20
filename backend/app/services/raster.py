"""
Raster processing service for AgroViz.
Validates uploaded GeoTIFF files, inspects geospatial metadata (CRS, dimensions, bands, bounds),
and computes multispectral vegetation indices (NDVI, NDRE, NDMI) with robust zero-division
and NoData handling.
"""

import io
import json
import math
import logging
import hashlib
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple

import numpy as np
import tifffile

from app.config import DATA_UPLOADS_DIR

logger = logging.getLogger(__name__)

# Standard GeoTIFF magic numbers
TIFF_LITTLE_ENDIAN = b"II*\x00"
TIFF_BIG_ENDIAN = b"MM\x00*"
BIGTIFF_LITTLE = b"II+\x00"
BIGTIFF_BIG = b"MM\x00+"

# GeoKey IDs
KEY_GT_MODEL_TYPE = 1024
KEY_GEOGRAPHIC_TYPE = 2048
KEY_PROJECTED_CS_TYPE = 3072


def _parse_geokeys(geokeys_raw: Tuple[int, ...]) -> Dict[int, int]:
    """Parses GeoKeyDirectoryTag tuple into key_id -> value dict."""
    if not geokeys_raw or len(geokeys_raw) < 4:
        return {}
    num_keys = geokeys_raw[3]
    keys_dict = {}
    idx = 4
    for _ in range(num_keys):
        if idx + 4 > len(geokeys_raw):
            break
        key_id = geokeys_raw[idx]
        tag_loc = geokeys_raw[idx + 1]
        val_offset = geokeys_raw[idx + 3]
        if tag_loc == 0:
            keys_dict[key_id] = val_offset
        idx += 4
    return keys_dict


def _resolve_crs_string(geokeys: Dict[int, int]) -> str:
    """Derives a human-readable CRS / EPSG string from parsed GeoKeys."""
    if KEY_PROJECTED_CS_TYPE in geokeys:
        epsg = geokeys[KEY_PROJECTED_CS_TYPE]
        if epsg != 32767:
            return f"EPSG:{epsg}"
    if KEY_GEOGRAPHIC_TYPE in geokeys:
        epsg = geokeys[KEY_GEOGRAPHIC_TYPE]
        if epsg != 32767:
            return f"EPSG:{epsg}"
    if KEY_GT_MODEL_TYPE in geokeys:
        mtype = geokeys[KEY_GT_MODEL_TYPE]
        if mtype == 1:
            return "Projected Coordinate System (Custom/Unspecified EPSG)"
        elif mtype == 2:
            return "EPSG:4326 (WGS 84 Geographic)"
    return "EPSG:4326 (Default Geographic WGS84)"


def _compute_bounds(
    tiepoint: Optional[Tuple[float, ...]],
    pixel_scale: Optional[Tuple[float, ...]],
    width: int,
    height: int,
) -> Optional[Dict[str, float]]:
    """Calculates spatial bounding box [min_x, min_y, max_x, max_y] from tiepoint and scale."""
    if not tiepoint or not pixel_scale or len(tiepoint) < 6 or len(pixel_scale) < 2:
        return None
    origin_x = float(tiepoint[3])
    origin_y = float(tiepoint[4])
    scale_x = float(pixel_scale[0])
    scale_y = float(pixel_scale[1])

    min_x = origin_x
    max_x = origin_x + width * scale_x
    max_y = origin_y
    min_y = origin_y - height * scale_y

    return {
        "min_x": round(min_x, 4),
        "min_y": round(min_y, 4),
        "max_x": round(max_x, 4),
        "max_y": round(max_y, 4),
    }


def validate_and_save_geotiff(contents: bytes, filename: str) -> Dict[str, Any]:
    """
    Validates an uploaded GeoTIFF raster:
    - Verifies file format and TIFF magic headers.
    - Inspects dimensions (width, height, bands).
    - Extracts CRS and spatial bounding coordinates.
    - Detects NoData value and suggested band mappings.
    - Saves raster file and JSON metadata sidecar to data/uploads/.
    """
    if not contents or len(contents) == 0:
        raise ValueError("Uploaded file is empty (0 bytes).")

    if len(contents) < 8:
        raise ValueError("File too small to be a valid TIFF/GeoTIFF raster.")

    # Check magic bytes
    header = contents[:4]
    if header not in (TIFF_LITTLE_ENDIAN, TIFF_BIG_ENDIAN, BIGTIFF_LITTLE, BIGTIFF_BIG):
        raise ValueError(
            "Invalid file signature. File does not contain valid TIFF or BigTIFF magic bytes."
        )

    # Use tifffile to inspect metadata
    try:
        with tifffile.TiffFile(io.BytesIO(contents)) as tf:
            if len(tf.pages) == 0:
                raise ValueError("Corrupted TIFF file: no image pages found.")

            first_page = tf.pages[0]
            tags = {tag.code: tag.value for tag in first_page.tags}

            # Determine raster dimensions and band count
            if len(tf.pages) > 1:
                band_count = len(tf.pages)
                height, width = first_page.shape[:2]
            else:
                shape = first_page.shape
                if len(shape) == 2:
                    height, width = shape
                    band_count = 1
                elif len(shape) == 3:
                    if shape[0] in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16):
                        band_count, height, width = shape
                    else:
                        height, width, band_count = shape
                else:
                    raise ValueError(f"Unsupported raster array shape: {shape}")

            data_type = str(first_page.dtype)

            # Extract GeoTIFF specific tags
            pixel_scale = tags.get(33550)  # ModelPixelScaleTag
            tiepoint = tags.get(33922)    # ModelTiepointTag
            geokeys_raw = tags.get(34735) # GeoKeyDirectoryTag
            nodata_tag = tags.get(42113)  # GDAL_NODATA

            geokeys = _parse_geokeys(geokeys_raw) if geokeys_raw else {}
            crs = _resolve_crs_string(geokeys)
            bounds = _compute_bounds(tiepoint, pixel_scale, width, height)

            nodata_val = None
            if nodata_tag:
                try:
                    nodata_val = float(str(nodata_tag).strip().replace("\x00", ""))
                except (ValueError, TypeError):
                    nodata_val = None

    except Exception as e:
        logger.error("GeoTIFF parsing failed: %s", str(e))
        raise ValueError(f"Corrupted or invalid GeoTIFF raster: {str(e)}")

    # Compute SHA-256 hash
    file_hash = hashlib.sha256(contents).hexdigest()

    # Determine default suggested band mapping
    suggested_mapping = {}
    if band_count == 3:
        suggested_mapping = {"red": 1, "green": 2, "blue": 3}
    elif band_count == 4:
        suggested_mapping = {"red": 1, "green": 2, "blue": 3, "nir": 4}
    elif band_count >= 5:
        suggested_mapping = {"blue": 1, "green": 2, "red": 3, "red_edge": 4, "nir": 5}
        if band_count >= 6:
            suggested_mapping["swir"] = 6

    # Save to data/uploads/
    DATA_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    clean_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", filename)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    saved_filename = f"geotiff_{timestamp}_{clean_name}"
    saved_path = DATA_UPLOADS_DIR / saved_filename

    with open(saved_path, "wb") as f:
        f.write(contents)

    metadata = {
        "upload_id": saved_filename,
        "original_filename": filename,
        "saved_filename": saved_filename,
        "saved_path": str(saved_path),
        "file_hash_sha256": file_hash,
        "uploaded_at": datetime.now().isoformat(),
        "width": int(width),
        "height": int(height),
        "total_pixels": int(width * height),
        "band_count": int(band_count),
        "data_type": data_type,
        "crs": crs,
        "bounds": bounds,
        "nodata_value": nodata_val,
        "suggested_band_mapping": suggested_mapping,
        "provenance": "user_provided",
    }

    # Save JSON sidecar
    meta_path = DATA_UPLOADS_DIR / f"{saved_filename}.meta.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Validated and stored GeoTIFF upload: %s (%dx%d, %d bands)", saved_filename, width, height, band_count)
    return metadata


def _load_raster_bands(file_path: Path) -> np.ndarray:
    """Loads TIFF file and returns a 3D numpy array of shape (bands, height, width)."""
    with tifffile.TiffFile(file_path) as tf:
        if len(tf.pages) > 1:
            bands = [p.asarray() for p in tf.pages]
            return np.stack(bands, axis=0)

        data = tf.pages[0].asarray()
        if data.ndim == 2:
            return np.expand_dims(data, axis=0)
        elif data.ndim == 3:
            if data.shape[0] in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16):
                return data
            else:
                return np.transpose(data, (2, 0, 1))
        else:
            raise ValueError(f"Unsupported array dimension: {data.ndim}")


def _calculate_index_stats(
    index_array: np.ndarray,
    valid_mask: np.ndarray,
) -> Dict[str, Any]:
    """Computes descriptive zonal statistics and histogram over valid index pixels."""
    valid_pixels = index_array[valid_mask]
    total_pixels = int(index_array.size)
    valid_count = int(valid_pixels.size)

    if valid_count == 0:
        return {
            "status": "unavailable",
            "reason": "Zero valid pixels available for calculation (all pixels are NoData or invalid).",
            "valid_pixel_count": 0,
            "total_pixel_count": total_pixels,
            "valid_percentage": 0.0,
        }

    # Calculate statistics
    val_min = float(np.min(valid_pixels))
    val_max = float(np.max(valid_pixels))
    val_mean = float(np.mean(valid_pixels))
    val_std = float(np.std(valid_pixels))
    val_median = float(np.median(valid_pixels))

    # Calculate 10-bin histogram between -1.0 and 1.0 (or min and max)
    hist_min = max(-1.0, math.floor(val_min * 10) / 10)
    hist_max = min(1.0, math.ceil(val_max * 10) / 10)
    if hist_min >= hist_max:
        hist_min = -1.0
        hist_max = 1.0

    counts, bin_edges = np.histogram(valid_pixels, bins=10, range=(hist_min, hist_max))
    histogram = [
        {
            "bin_start": round(float(bin_edges[i]), 2),
            "bin_end": round(float(bin_edges[i + 1]), 2),
            "count": int(counts[i]),
        }
        for i in range(len(counts))
    ]

    return {
        "status": "calculated",
        "mean": round(val_mean, 4),
        "min": round(val_min, 4),
        "max": round(val_max, 4),
        "std": round(val_std, 4),
        "median": round(val_median, 4),
        "valid_pixel_count": valid_count,
        "total_pixel_count": total_pixels,
        "valid_percentage": round((valid_count / total_pixels) * 100.0, 2),
        "histogram": histogram,
    }


def compute_raster_indices(
    upload_id: str,
    band_mapping: Dict[str, int],
    selected_indices: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Computes multispectral indices from an uploaded GeoTIFF raster:
    - NDVI = (NIR - Red) / (NIR + Red)
    - NDRE = (NIR - Red Edge) / (NIR + Red Edge)
    - NDMI = (NIR - SWIR) / (NIR + SWIR)

    Robustly handles zero denominators, NoData pixels, and missing bands without silent resampling.
    """
    clean_id = Path(upload_id).name
    raster_path = DATA_UPLOADS_DIR / clean_id

    if not raster_path.exists():
        raise FileNotFoundError(f"Uploaded raster '{clean_id}' not found in data/uploads/")

    # Read sidecar metadata if available
    meta_path = DATA_UPLOADS_DIR / f"{clean_id}.meta.json"
    meta = {}
    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

    nodata_val = meta.get("nodata_value")

    # Load 3D raster array (bands, height, width)
    try:
        raster_data = _load_raster_bands(raster_path)
    except Exception as e:
        raise ValueError(f"Failed to read raster bands from {clean_id}: {str(e)}")

    num_bands, height, width = raster_data.shape

    # Normalize band keys to lowercase
    mapping = {k.strip().lower(): int(v) for k, v in band_mapping.items()}

    # Validate band indices (1-indexed)
    for b_name, b_idx in mapping.items():
        if b_idx < 1 or b_idx > num_bands:
            raise ValueError(
                f"Band index {b_idx} for '{b_name}' is out of range. "
                f"Raster has {num_bands} bands (valid: 1 to {num_bands})."
            )

    indices_to_compute = [idx.upper() for idx in (selected_indices or ["NDVI", "NDRE", "NDMI"])]
    results = {}

    # Extract band helper
    def get_band(b_name: str) -> Optional[np.ndarray]:
        idx = mapping.get(b_name)
        if idx is None or idx < 1 or idx > num_bands:
            return None
        return raster_data[idx - 1].astype(np.float32)

    # 1. NDVI: (NIR - Red) / (NIR + Red)
    if "NDVI" in indices_to_compute:
        red = get_band("red")
        nir = get_band("nir")

        if red is None or nir is None:
            results["NDVI"] = {
                "name": "Normalized Difference Vegetation Index (NDVI)",
                "formula": "(NIR - Red) / (NIR + Red)",
                "status": "unavailable",
                "reason": "Missing required band mapping: both 'red' and 'nir' bands must be mapped.",
            }
        else:
            denom = nir + red
            valid_mask = np.isfinite(red) & np.isfinite(nir) & (np.abs(denom) > 1e-7)
            if nodata_val is not None:
                valid_mask &= (red != nodata_val) & (nir != nodata_val)

            ndvi_arr = np.full_like(denom, np.nan, dtype=np.float32)
            np.divide(nir - red, denom, out=ndvi_arr, where=valid_mask)
            ndvi_arr = np.clip(ndvi_arr, -1.0, 1.0)

            stats = _calculate_index_stats(ndvi_arr, valid_mask)
            stats.update({
                "name": "Normalized Difference Vegetation Index (NDVI)",
                "formula": "(NIR - Red) / (NIR + Red)",
                "bands_used": {"red_band": mapping.get("red"), "nir_band": mapping.get("nir")},
            })
            results["NDVI"] = stats

    # 2. NDRE: (NIR - RedEdge) / (NIR + RedEdge)
    if "NDRE" in indices_to_compute:
        red_edge = get_band("red_edge")
        nir = get_band("nir")

        if red_edge is None or nir is None:
            results["NDRE"] = {
                "name": "Normalized Difference Red Edge Index (NDRE)",
                "formula": "(NIR - RedEdge) / (NIR + RedEdge)",
                "status": "unavailable",
                "reason": "Missing required band mapping: both 'red_edge' and 'nir' bands must be mapped.",
            }
        else:
            denom = nir + red_edge
            valid_mask = np.isfinite(red_edge) & np.isfinite(nir) & (np.abs(denom) > 1e-7)
            if nodata_val is not None:
                valid_mask &= (red_edge != nodata_val) & (nir != nodata_val)

            ndre_arr = np.full_like(denom, np.nan, dtype=np.float32)
            np.divide(nir - red_edge, denom, out=ndre_arr, where=valid_mask)
            ndre_arr = np.clip(ndre_arr, -1.0, 1.0)

            stats = _calculate_index_stats(ndre_arr, valid_mask)
            stats.update({
                "name": "Normalized Difference Red Edge Index (NDRE)",
                "formula": "(NIR - RedEdge) / (NIR + RedEdge)",
                "bands_used": {"red_edge_band": mapping.get("red_edge"), "nir_band": mapping.get("nir")},
            })
            results["NDRE"] = stats

    # 3. NDMI: (NIR - SWIR) / (NIR + SWIR)
    if "NDMI" in indices_to_compute:
        swir = get_band("swir")
        nir = get_band("nir")

        if swir is None or nir is None:
            results["NDMI"] = {
                "name": "Normalized Difference Moisture Index (NDMI)",
                "formula": "(NIR - SWIR) / (NIR + SWIR)",
                "status": "unavailable",
                "reason": "Missing required band mapping: both 'swir' and 'nir' bands must be mapped.",
            }
        else:
            denom = nir + swir
            valid_mask = np.isfinite(swir) & np.isfinite(nir) & (np.abs(denom) > 1e-7)
            if nodata_val is not None:
                valid_mask &= (swir != nodata_val) & (nir != nodata_val)

            ndmi_arr = np.full_like(denom, np.nan, dtype=np.float32)
            np.divide(nir - swir, denom, out=ndmi_arr, where=valid_mask)
            ndmi_arr = np.clip(ndmi_arr, -1.0, 1.0)

            stats = _calculate_index_stats(ndmi_arr, valid_mask)
            stats.update({
                "name": "Normalized Difference Moisture Index (NDMI)",
                "formula": "(NIR - SWIR) / (NIR + SWIR)",
                "bands_used": {"swir_band": mapping.get("swir"), "nir_band": mapping.get("nir")},
            })
            results["NDMI"] = stats

    return {
        "upload_id": clean_id,
        "raster_dimensions": {"width": width, "height": height, "bands": num_bands},
        "computed_at": datetime.now().isoformat(),
        "indices": results,
        "notes": [
            "Multispectral vegetation indices calculated directly from uploaded raster pixel values.",
            "Zero denominators and NoData pixels safely masked from zonal statistics.",
            "Indices indicate relative canopy vigor and moisture; they do NOT confirm specific crop disease or insect presence."
        ],
    }
