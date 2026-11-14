from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import APP_TITLE, APP_DESCRIPTION, APP_VERSION, ALLOWED_ORIGINS
from .routers import health, datasets

app = FastAPI(
    title=APP_TITLE,
    description=APP_DESCRIPTION,
    version=APP_VERSION,
)

# Enable CORS for local React frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(datasets.router)

@app.get("/")
def root():
    return {
        "message": "AgroViz API is active. See /api/health for system status and /docs for API documentation.",
        "version": APP_VERSION,
    }
