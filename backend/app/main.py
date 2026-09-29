import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.auth import router as auth_router
from app.api.questions import router as questions_router
from app.api.exams import router as exams_router
from app.api.sessions import router as sessions_router
from app.api.results import router as results_router
from app.api.analytics import router as analytics_router
from app.api.exam_access import router as exam_access_router
from app.api.subjects import router as subjects_router
from app.api.notifications import router as notifications_router
from app.api.evaluations import router as evaluations_router
from app.api.monitoring import router as monitoring_router
from app.services.expiry_worker import scheduler, background_expiry_loop

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = None
    if scheduler:
        scheduler.start()
    else:
        task = asyncio.create_task(background_expiry_loop())
    yield
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
    if task:
        task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Intelligent Examination Platform with Automated Proctoring and Candidate Performance Analysis API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Configure CORS for Next.js frontend
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check routes
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend service availability."""
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "version": "1.0.0"
    }

# Include API Routers under /api
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(questions_router, prefix=settings.API_V1_STR)
app.include_router(exams_router, prefix=settings.API_V1_STR)
app.include_router(sessions_router, prefix=settings.API_V1_STR)
app.include_router(results_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(exam_access_router, prefix=settings.API_V1_STR)
app.include_router(subjects_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(evaluations_router, prefix=settings.API_V1_STR)
app.include_router(monitoring_router, prefix=settings.API_V1_STR)
# Allow WebSocket endpoints at root level (/ws/sessions/{id}/heartbeat)
app.include_router(sessions_router)

# Static file serving for answer uploads and thumbnails
from pathlib import Path
from fastapi.staticfiles import StaticFiles
uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
