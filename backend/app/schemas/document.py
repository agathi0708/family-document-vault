from datetime import datetime

from pydantic import BaseModel, Field


class DocumentCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=255,
    )

    category: str = Field(
        min_length=1,
        max_length=100,
    )

    description: str | None = None

    file_path: str = Field(
        min_length=1,
        max_length=500,
    )

    file_name: str = Field(
        min_length=1,
        max_length=255,
    )

    file_type: str = Field(
        min_length=1,
        max_length=100,
    )

    expiry_date: datetime | None = None


class DocumentUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )

    category: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    description: str | None = None

    expiry_date: datetime | None = None


class DocumentResponse(BaseModel):
    id: int
    family_id: int
    uploaded_by: int
    name: str
    category: str
    description: str | None
    file_path: str
    file_name: str
    file_type: str
    expiry_date: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class OCRResponse(BaseModel):
    id: int
    document_id: int
    extracted_text: str
    language: str | None
    confidence: float | None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }