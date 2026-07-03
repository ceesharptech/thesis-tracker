from database import SessionLocal
from models import User, UserRole
from auth import hash_password

db = SessionLocal()

# ─── Supervisor ───
def ensure_supervisor(identifier: str, name: str):
    sup = db.query(User).filter(User.identifier == identifier).first()
    if not sup:
        sup = User(
            name=name,
            identifier=identifier,
            hashed_password=hash_password("password123"),
            role=UserRole.SUPERVISOR,
            is_first_login=False,
        )
        db.add(sup)
        print(f"Supervisor created: {identifier} / password123")
    else:
        print(f"Supervisor {identifier} already exists")

ensure_supervisor("supervisor", "Dr. Adebayo")
ensure_supervisor("supervisor@university.edu", "Dr. Adebayo")

print("\nStudents are no longer seeded here.")
print("Import them from the students.xlsx file in the project root.")

db.commit()
db.close()
print("\nDone. Supervisors ready.")
