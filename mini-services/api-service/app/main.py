from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, users, review_logs

app = FastAPI(
    title="LearnHub API",
    description="Backend API for LearnHub self-learning platform",
    version="1.0.0",
)

# CORS middleware – allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(review_logs.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "learnhub-api", "version": "1.0.0"}
