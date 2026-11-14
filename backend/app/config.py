from pathlib import Path

# Base directories
BACKEND_DIR = Path(__file__).resolve().parent.parent
BASE_DIR = BACKEND_DIR.parent
DATA_DIR = BASE_DIR / "data"
DATA_RAW_DIR = DATA_DIR / "raw"
DATA_UPLOADS_DIR = DATA_DIR / "uploads"

# API settings
APP_TITLE = "AgroViz API"
APP_DESCRIPTION = (
    "Research prototype API for crop condition, soil moisture, and "
    "Pink Bollworm thermal development monitoring in Akola, Maharashtra."
)
APP_VERSION = "0.1.0"

# CORS configuration
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
]
