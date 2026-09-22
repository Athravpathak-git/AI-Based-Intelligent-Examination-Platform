import os
import uuid
import io
from pathlib import Path
from typing import Tuple
from PIL import Image
from fastapi import HTTPException, status, UploadFile

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads" / "answers"

def save_and_thumbnail_image(
    session_id: int,
    question_id: int,
    file: UploadFile
) -> Tuple[str, str]:
    """Validate uploaded answer image, save securely under backend/uploads/answers/{session_id}/
    and generate a 200x200 Pillow thumbnail preserving aspect ratio.
    Returns (image_path, thumbnail_path) as relative paths for database storage.
    """
    # 1. Validate MIME type
    content_type = file.content_type
    if not content_type or content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image format '{content_type}'. Allowed types: JPEG, PNG, WEBP."
        )

    # 2. Read and validate file size
    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image file size exceeds maximum limit of 5 MB (Found: {len(contents) / (1024 * 1024):.2f} MB)."
        )

    # 3. Ensure target directory exists
    session_upload_dir = UPLOAD_DIR / str(session_id)
    session_upload_dir.mkdir(parents=True, exist_ok=True)

    # 4. Generate secure unique filename
    unique_id = uuid.uuid4().hex
    filename = f"{question_id}_{unique_id}.jpg"
    thumb_filename = f"{question_id}_{unique_id}_thumb.jpg"

    file_path = session_upload_dir / filename
    thumb_path = session_upload_dir / thumb_filename

    # 5. Open and process with Pillow
    try:
        image = Image.open(io.BytesIO(contents))
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")

        # Save full image as high-quality JPEG
        image.save(file_path, "JPEG", quality=90)

        # 6. Generate 200x200 thumbnail preserving aspect ratio
        thumb_image = image.copy()
        thumb_image.thumbnail((200, 200), Image.Resampling.LANCZOS)
        thumb_image.save(thumb_path, "JPEG", quality=85)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process image: {str(e)}"
        )

    rel_image_path = f"/uploads/answers/{session_id}/{filename}"
    rel_thumb_path = f"/uploads/answers/{session_id}/{thumb_filename}"

    return rel_image_path, rel_thumb_path
