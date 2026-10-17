
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.document import Document
from app.models.family_member import FamilyMember
from app.models.ocr_result import OCRResult
from app.models.user import User
from app.ocr.pdf_service import extract_pdf_text
from app.ocr.service import ocr_service
from app.schemas.document import (
    DocumentCreate,
    DocumentResponse,
    DocumentUpdate,
    OCRResponse,
)
from app.storage.local import storage


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


OCR_SUPPORTED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp",
    ".pdf",
}


# --------------------------------------------------
# FAMILY PERMISSION HELPERS
# --------------------------------------------------

def get_family_membership(
    family_id: int,
    user_id: int,
    db: Session,
) -> FamilyMember:
    """Return the user's membership or reject access."""
    membership = (
        db.query(FamilyMember)
        .filter(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == user_id,
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this family",
        )

    return membership


def verify_family_membership(
    family_id: int,
    user_id: int,
    db: Session,
) -> None:
    """Allow access to family resources for any family member."""
    get_family_membership(family_id, user_id, db)


def require_family_role(
    family_id: int,
    user_id: int,
    db: Session,
    allowed_roles: set[str],
) -> FamilyMember:
    """Allow an action only to members with an approved role."""
    membership = get_family_membership(
        family_id,
        user_id,
        db,
    )

    user_role = membership.role.strip().lower()

    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action",
        )

    return membership


def find_document(
    family_id: int,
    document_id: int,
    db: Session,
) -> Document:
    """Find a document belonging to the requested family."""
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.family_id == family_id,
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return document


# --------------------------------------------------
# OCR PROCESSING
# --------------------------------------------------

def process_document_ocr(
    document: Document,
    db: Session,
) -> None:
    """Extract text from supported PDFs or images and save the result."""
    file_extension = Path(document.file_name).suffix.lower()

    if file_extension not in OCR_SUPPORTED_EXTENSIONS:
        return

    try:
        if file_extension == ".pdf":
            ocr_result = extract_pdf_text(document.file_path)
        else:
            ocr_result = ocr_service.extract_text(document.file_path)

        extracted_text = ocr_result.get("text", "").strip()

        if not extracted_text:
            print(
                f"No text extracted from document {document.id}. "
                "Scanned PDFs may require OCR on their page images."
            )
            return

        existing_result = (
            db.query(OCRResult)
            .filter(OCRResult.document_id == document.id)
            .first()
        )

        if existing_result:
            existing_result.extracted_text = extracted_text
            existing_result.language = ocr_result.get("language")
            existing_result.confidence = ocr_result.get("confidence")
        else:
            new_ocr_result = OCRResult(
                document_id=document.id,
                extracted_text=extracted_text,
                language=ocr_result.get("language"),
                confidence=ocr_result.get("confidence"),
            )
            db.add(new_ocr_result)

        db.commit()

    except Exception as ocr_error:
        db.rollback()
        print(
            f"OCR processing failed for document "
            f"{document.id}: {ocr_error}"
        )


# --------------------------------------------------
# CREATE DOCUMENT METADATA
# Owner, admin and member can create.
# Viewer cannot create.
# --------------------------------------------------

@router.post(
    "/{family_id}",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_document(
    family_id: int,
    document_data: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_family_role(
        family_id,
        current_user.id,
        db,
        {"owner", "admin", "member"},
    )

    new_document = Document(
        family_id=family_id,
        uploaded_by=current_user.id,
        name=document_data.name,
        category=document_data.category,
        description=document_data.description,
        file_path=document_data.file_path,
        file_name=document_data.file_name,
        file_type=document_data.file_type,
        expiry_date=document_data.expiry_date,
    )

    try:
        db.add(new_document)
        db.commit()
        db.refresh(new_document)
    except Exception:
        db.rollback()
        raise

    return new_document


# --------------------------------------------------
# UPLOAD DOCUMENT
# Owner, admin and member can upload.
# Viewer cannot upload.
# --------------------------------------------------

@router.post(
    "/{family_id}/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    family_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_family_role(
        family_id,
        current_user.id,
        db,
        {"owner", "admin", "member"},
    )

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a filename",
        )

    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    saved_path = storage.save(file_bytes, file.filename)

    new_document = Document(
        family_id=family_id,
        uploaded_by=current_user.id,
        name=file.filename,
        category="Uncategorized",
        description=None,
        file_path=saved_path,
        file_name=file.filename,
        file_type=file.content_type or "application/octet-stream",
        expiry_date=None,
    )

    try:
        db.add(new_document)
        db.commit()
        db.refresh(new_document)
    except Exception:
        db.rollback()
        storage.delete(saved_path)
        raise

    process_document_ocr(new_document, db)

    return new_document


# --------------------------------------------------
# LIST FAMILY DOCUMENTS
# All family roles can view.
# --------------------------------------------------

@router.get(
    "/{family_id}",
    response_model=list[DocumentResponse],
)
def get_family_documents(
    family_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_family_membership(family_id, current_user.id, db)

    return (
        db.query(Document)
        .filter(Document.family_id == family_id)
        .order_by(Document.created_at.desc())
        .all()
    )


# --------------------------------------------------
# GET ONE DOCUMENT
# All family roles can view.
# --------------------------------------------------

@router.get(
    "/{family_id}/{document_id}",
    response_model=DocumentResponse,
)
def get_document(
    family_id: int,
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_family_membership(family_id, current_user.id, db)

    return find_document(family_id, document_id, db)


# --------------------------------------------------
# GET OCR RESULT
# All family roles can view OCR results.
# --------------------------------------------------

@router.get(
    "/{family_id}/{document_id}/ocr",
    response_model=OCRResponse,
)
def get_document_ocr(
    family_id: int,
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_family_membership(family_id, current_user.id, db)

    find_document(family_id, document_id, db)

    ocr_result = (
        db.query(OCRResult)
        .filter(OCRResult.document_id == document_id)
        .first()
    )

    if not ocr_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OCR result not found for this document",
        )

    return ocr_result


# --------------------------------------------------
# DOWNLOAD DOCUMENT
# All family roles can download.
# --------------------------------------------------

@router.get(
    "/{family_id}/{document_id}/download",
)
def download_document(
    family_id: int,
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_family_membership(family_id, current_user.id, db)

    document = find_document(family_id, document_id, db)

    if not storage.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found in storage",
        )

    return FileResponse(
        path=document.file_path,
        filename=document.file_name,
        media_type=document.file_type,
    )


# --------------------------------------------------
# DELETE DOCUMENT
# Only the family owner can delete.
# --------------------------------------------------

@router.delete(
    "/{family_id}/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_document(
    family_id: int,
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_family_role(
        family_id,
        current_user.id,
        db,
        {"owner"},
    )

    document = find_document(family_id, document_id, db)

    file_path = document.file_path

    try:
        db.delete(document)
        db.commit()
    except Exception:
        db.rollback()
        raise

    if storage.exists(file_path):
        storage.delete(file_path)


# --------------------------------------------------
# UPDATE DOCUMENT DETAILS
# Owner, admin and member can update.
# Viewer cannot update.
# --------------------------------------------------

@router.put(
    "/{family_id}/{document_id}",
    response_model=DocumentResponse,
)
def update_document(
    family_id: int,
    document_id: int,
    document_data: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_family_role(
        family_id,
        current_user.id,
        db,
        {"owner", "admin", "member"},
    )

    document = find_document(family_id, document_id, db)

    update_data = document_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(document, field, value)

    try:
        db.commit()
        db.refresh(document)
    except Exception:
        db.rollback()
        raise

    return document
