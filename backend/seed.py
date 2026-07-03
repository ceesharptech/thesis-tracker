from database import SessionLocal
from models import User, UserRole, Student
from auth import hash_password

db = SessionLocal()

# ─── Supervisor ───
sup = db.query(User).filter(User.identifier == "supervisor").first()
if not sup:
    sup = User(
        name="Dr. Adebayo",
        identifier="supervisor",
        hashed_password=hash_password("password123"),
        role=UserRole.SUPERVISOR,
        is_first_login=False,
    )
    db.add(sup)
    print("Supervisor created: supervisor / password123")
else:
    print("Supervisor already exists")

# ─── Students ───
students_data = [
    {
        "name": "Israel Johnson",
        "matric": "22/11220",
        "project": "Ensemble Learning-Based Intrusion Detection System",
        "dept": "Computer Science",
    },
    {
        "name": "Chinaza Okonkwo",
        "matric": "21/9567",
        "project": "Blockchain-Based Voting System for Student Elections",
        "dept": "Computer Science",
    },
    {
        "name": "Fatima Bello",
        "matric": "23/10451",
        "project": "Machine Learning Approach to Malware Detection",
        "dept": "Cyber Security",
    },
    {
        "name": "Emmanuel Osei",
        "matric": "22/8890",
        "project": "IoT-Based Smart Home Security System",
        "dept": "Computer Science",
    },
    {
        "name": "Amina Yusuf",
        "matric": "21/7234",
        "project": "Cloud Computing Security: A Comparative Analysis",
        "dept": "Information Technology",
    },
]

for s in students_data:
    existing = db.query(User).filter(User.identifier == s["matric"]).first()
    if not existing:
        user = User(
            name=s["name"],
            identifier=s["matric"],
            hashed_password=hash_password("Caleb123"),
            role=UserRole.STUDENT,
            is_first_login=False,
        )
        db.add(user)
        db.flush()

        student = Student(
            user_id=user.id,
            name=s["name"],
            matric_number=s["matric"],
            project_title=s["project"],
            department=s["dept"],
        )
        db.add(student)
        print(f"Student created: {s['matric']} / Caleb123  ({s['name']})")
    else:
        print(f"Student {s['matric']} already exists")

db.commit()
db.close()
print("\nDone. All test users ready.")
