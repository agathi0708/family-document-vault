from pathlib import Path

from paddleocr import PaddleOCR


class OCRService:
    def __init__(self):
        self.engine = PaddleOCR(
            lang="en",
        )

    def extract_text(self, file_path: str) -> dict:
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(
                f"Document file not found: {file_path}"
            )

        result = self.engine.predict(
            str(path),
        )

        extracted_lines = []
        confidence_scores = []

        for page_result in result:
            try:
                texts = page_result["rec_texts"]
                scores = page_result["rec_scores"]
            except (KeyError, TypeError):
                continue

            extracted_lines.extend(texts)
            confidence_scores.extend(scores)

        extracted_text = "\n".join(
            text.strip()
            for text in extracted_lines
            if text and text.strip()
        )

        average_confidence = None

        if confidence_scores:
            average_confidence = round(
                sum(confidence_scores)
                / len(confidence_scores),
                4,
            )

        return {
            "text": extracted_text,
            "language": "en",
            "confidence": average_confidence,
        }


ocr_service = OCRService()