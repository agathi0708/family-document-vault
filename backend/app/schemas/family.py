from datetime import datetime

from pydantic import BaseModel, Field


class FamilyCreate(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=150,
    )


class FamilyResponse(BaseModel):
    id: int
    name: str
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }