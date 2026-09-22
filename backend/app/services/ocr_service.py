import os
import logging
from pathlib import Path
from PIL import Image
import pytesseract

logger = logging.getLogger("ocr_service")

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Common default Tesseract paths on Windows
TESSERACT_WINDOWS_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe")
]

for p in TESSERACT_WINDOWS_PATHS:
    if os.path.exists(p):
        pytesseract.pytesseract.tesseract_cmd = p
        break

def extract_text_from_image(rel_image_path: str) -> str:
    """Extract handwritten or printed text from uploaded image answer using pytesseract.
    Returns extracted text string, or a clear diagnostic if Tesseract binary is not installed.
    """
    # Resolve absolute path from relative storage path
    clean_path = rel_image_path.lstrip("/\\")
    full_path = BASE_DIR / clean_path

    if not full_path.exists():
        logger.warning(f"OCR target image not found at {full_path}")
        return ""

    try:
        image = Image.open(full_path)
        # Preprocessing: Convert to grayscale for better OCR accuracy on handwritten text
        gray_image = image.convert("L")
        text = pytesseract.image_to_string(gray_image)
        extracted = text.strip()
        if not extracted:
            return "[OCR: No legible text identified in image]"
        return extracted
    except pytesseract.TesseractNotFoundError:
        logger.warning("Tesseract binary not found on host system.")
        return "[OCR Engine Note: Tesseract binary not installed on host. Image saved for manual examiner review.]"
    except Exception as e:
        logger.error(f"Error during OCR extraction: {e}")
        return f"[OCR Error: {str(e)}]"
