
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.family import Family
from app.models.family_member import FamilyMember
from app.models.user import User
from app.schemas.family import FamilyCreate, FamilyResponse


router = APIRouter(
    prefix="/families",
    tags=["Families"],
)


@router.post(
    "/",
    response_model=FamilyResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_family(
    family_data: FamilyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_family = Family(name=family_data.name)

    db.add(new_family)
    db.flush()

    owner_membership = FamilyMember(
        family_id=new_family.id,
        user_id=current_user.id,
        role="owner",
    )

    db.add(owner_membership)
    db.commit()
    db.refresh(new_family)

    return new_family


@router.get(
    "/",
    response_model=list[FamilyResponse],
)
def get_families(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    memberships = (
        db.query(FamilyMember)
        .filter(FamilyMember.user_id == current_user.id)
        .all()
    )

    family_ids = [membership.family_id for membership in memberships]

    if not family_ids:
        return []

    return (
        db.query(Family)
        .filter(Family.id.in_(family_ids))
        .all()
    )
