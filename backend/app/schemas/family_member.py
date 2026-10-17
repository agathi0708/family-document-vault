from datetime import datetime

from pydantic import BaseModel, Field


class FamilyMemberCreate(BaseModel):
    email: str = Field(
        min_length=5,
        max_length=255,
    )

    role: str = Field(
        default="member",
        pattern="^(admin|member|viewer)$",
    )


class FamilyMemberResponse(BaseModel):
    id: int
    family_id: int
    user_id: int
    role: str
    joined_at: datetime

    model_config = {
        "from_attributes": True,
    }