
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.family_member import FamilyMember
from app.models.user import User
from app.schemas.family_member import (
    FamilyMemberCreate,
    FamilyMemberResponse,
)


router = APIRouter(
    prefix="/families",
    tags=["Family Members"],
)


@router.post(
    "/{family_id}/members",
    response_model=FamilyMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_family_member(
    family_id: int,
    member_data: FamilyMemberCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check whether the current user belongs to this family.
    current_membership = (
        db.query(FamilyMember)
        .filter(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == current_user.id,
        )
        .first()
    )

    if not current_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this family",
        )

    # Only owners and admins can add members.
    if current_membership.role not in {"owner", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only family owners and admins can add members",
        )

    # Find the registered user by email.
    user = (
        db.query(User)
        .filter(User.email == member_data.email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email does not exist",
        )

    # Prevent duplicate memberships.
    existing_membership = (
        db.query(FamilyMember)
        .filter(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == user.id,
        )
        .first()
    )

    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this family",
        )

    new_membership = FamilyMember(
        family_id=family_id,
        user_id=user.id,
        role=member_data.role,
    )

    db.add(new_membership)
    db.commit()
    db.refresh(new_membership)

    return new_membership


@router.get(
    "/{family_id}/members",
    response_model=list[dict],
)
def get_family_members(
    family_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check family membership.
    current_membership = (
        db.query(FamilyMember)
        .filter(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == current_user.id,
        )
        .first()
    )

    if not current_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this family",
        )

    # Join family memberships with registered users.
    members = (
        db.query(FamilyMember, User)
        .join(User, FamilyMember.user_id == User.id)
        .filter(FamilyMember.family_id == family_id)
        .order_by(FamilyMember.id)
        .all()
    )

    # Return membership information plus the user's name and email.
    return [
        {
            "id": membership.id,
            "family_id": membership.family_id,
            "user_id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": membership.role,
            "joined_at": membership.joined_at,
        }
        for membership, user in members
    ]
