from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.db.models
from app.routers.auth import router as auth_router
from app.routers.document import router as document_router
from app.routers.family import router as family_router
from app.routers.family_member import router as family_member_router


app = FastAPI(
    title="Family Document Vault API",
    description="Secure and intelligent family document management platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(family_router)
app.include_router(family_member_router)
app.include_router(document_router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Family Document Vault API",
    }