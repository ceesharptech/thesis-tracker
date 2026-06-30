from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, student, supervisor

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ThesisFlow API", version="1.0.0")

# CORS for your React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Routers
app.include_router(auth.router)
app.include_router(student.router)
app.include_router(supervisor.router)

@app.get("/health")
def health():
    return {"status": "ok"}

# ─── Seed data for testing ───
@app.on_event("startup")
def seed():
    from sqlalchemy.orm import Session
    from database import SessionLocal
    from models import User, UserRole
    from auth import hash_password
    
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.identifier == "supervisor").first():
            sup = User(
                name="Dr. Supervisor",
                identifier="supervisor",
                hashed_password=hash_password("password123"),
                role=UserRole.SUPERVISOR,
                is_first_login=False,
            )
            db.add(sup)
            db.commit()
            print("✅ Seeded supervisor: supervisor / password123")
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
