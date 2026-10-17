from pathlib import Path

import pymupdf

from app.ocr.service import ocr_service


def extract_pdf_text(file_path: str) -> dict:
    """Extract selectable text, falling back to OCR for scanned PDF pages."""
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"PDF file not found: {file_path}")

    extracted_pages = []
    confidence_scores = []

    with pymupdf.open(path) as pdf:
        for page in pdf:
            text = page.get_text("text").strip()

            if text:
                extracted_pages.append(text)
                continue

            # Render scanned PDF pages to images for PaddleOCR.
            pixmap = page.get_pixmap(
                matrix=pymupdf.Matrix(2, 2),
                alpha=False,
            )
            image_path = path.parent / f"{path.stem}_page_{page.number + 1}.png"

            try:
                pixmap.save(image_path)
                result = ocr_service.extract_text(str(image_path))
                page_text = result.get("text", "").strip()

                if page_text:
                    extracted_pages.append(page_text)

                confidence = result.get("confidence")
                if confidence is not None:
                    confidence_scores.append(confidence)
            finally:
                if image_path.exists():
                    image_path.unlink()

    confidence = (
        round(sum(confidence_scores) / len(confidence_scores), 4)
        if confidence_scores
        else (1.0 if extracted_pages else None)
    )

    return {
        "text": "\n\n".join(extracted_pages).strip(),
        "language": "en",
        "confidence": confidence,
    }
