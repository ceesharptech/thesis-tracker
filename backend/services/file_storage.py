import os
import uuid
from fastapi import UploadFile

UPLOAD_DIR = "uploads/submissions"
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def save_upload_file(file: UploadFile) -> tuple[str, str, int]:
    ext = os.path.splitext(file.filename or "")[1].lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, unique_name)
    
    content = await file.read()
    size = len(content)
    
    with open(path, "wb") as f:
        f.write(content)
    
    # Return URL path, original filename, size
    return f"/uploads/submissions/{unique_name}", file.filename or "unknown", size
