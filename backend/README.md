# ThesisFlow Backend

FastAPI backend for the ThesisFlow final-year project submission tracker.

## Tech Stack

- **Framework:** FastAPI
- **ORM:** SQLAlchemy 2.x
- **Database:** SQLite (`thesisflow.db`)
- **Auth:** JWT (python-jose) + bcrypt (passlib)
- **Server:** Uvicorn

## Prerequisites

- Python 3.10+
- `pip` or `uv`

## Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:

   ```bash
   python -m venv .venv
   source .venv/bin/activate   # Linux/macOS
   # .venv\Scripts\activate   # Windows
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

## Running the Server

### Development (with auto-reload)

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or directly:

```bash
python main.py
```

### Production-style

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.

Interactive API docs (Swagger UI) are available at:

```
http://localhost:8000/docs
```

## Database

The app uses SQLite. The database file `thesisflow.db` is created automatically on first run. Tables are created via `Base.metadata.create_all()` at startup.

To reset the database, simply delete `thesisflow.db` and restart the server.

## Seed Data

Default supervisor accounts are seeded automatically on startup if they do not already exist:

| Identifier | Password | Role |
|------------|----------|------|
| `supervisor` | `password123` | Supervisor |
| `supervisor@university.edu` | `password123` | Supervisor |

Supervisors can log in with either identifier above.

Students are imported via the **Upload Students** page in the frontend, using the `students.xlsx` file in the project root. Imported students receive the default password `Caleb123` and are flagged for first-login password change.

## File Uploads

Student submissions are stored in the `uploads/submissions/` directory. This directory is created automatically if it does not exist and is served statically at `/uploads`.

## Environment Variables

Create a `.env` file in the backend root if you want to override defaults:

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT signing secret | `dev-secret-key-change-in-production` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT expiry time | `10080` (7 days) |

> **Note:** The default `SECRET_KEY` is for development only. Change it in production.

## API Overview

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with identifier + password |
| POST | `/auth/change-password` | Change current user's password |

All protected endpoints expect an `Authorization: Bearer <token>` header.

### Supervisor Routes (`Authorization: Bearer <supervisor-token>`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/supervisor/dashboard` | Dashboard stats |
| GET | `/supervisor/students` | List all students |
| GET | `/supervisor/student/{student_id}` | Get single student detail |
| POST | `/supervisor/upload-students` | Bulk-import students from Excel (.xlsx/.xls) |

### Student Routes (`Authorization: Bearer <student-token>`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/student/submissions` | List own submissions |
| POST | `/student/submissions` | Upload a new submission (PDF/DOCX) |
| GET | `/student/submissions/{submission_id}` | Get submission detail |
| GET | `/student/submissions/{submission_id}/comments` | Get comments for a submission |

## Excel Import Format

The `/supervisor/upload-students` endpoint accepts `.xlsx` or `.xls` files with a header row and the following columns:

| Column | Accepted Variants |
|--------|-------------------|
| Name | `name`, `full name`, `student name` |
| Matric Number | `matric`, `matric number`, `matriculation number`, `reg no` |
| Project Title | `project title`, `title`, `project` |
| Department | `department`, `dept` |

Imported students receive the default password `Caleb123` and are flagged for first-login password change.

## Project Structure

```
backend/
├── main.py                 # FastAPI app entry point
├── database.py             # SQLAlchemy engine & session
├── models.py               # Database models
├── schemas.py              # Pydantic request/response schemas
├── auth.py                 # Password hashing & JWT helpers
├── dependencies.py         # Auth dependencies & role guards
├── seed.py                 # Standalone demo data seeder
├── requirements.txt        # Python dependencies
├── routers/
│   ├── auth.py             # Auth endpoints
│   ├── supervisor.py       # Supervisor endpoints
│   └── student.py          # Student endpoints
└── services/
    └── file_storage.py     # File upload helper
```
