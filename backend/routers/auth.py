from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import LoginRequest, LoginResponse, ChangePasswordRequest, AuthUser
from auth import verify_password, hash_password, create_access_token
from dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    identifier = (req.identifier or "").strip()
    password = (req.password or "").strip()
    print(f"[LOGIN ATTEMPT] identifier={identifier!r} password_len={len(password)}")
    user = db.query(User).filter(User.identifier == identifier).first()
    if not user:
        print(f"[LOGIN FAIL] user not found for identifier={identifier!r}")
        raise HTTPException(status_code=401, detail="Incorrect credentials")
    if not verify_password(password, user.hashed_password):
        print(f"[LOGIN FAIL] wrong password for identifier={identifier!r}")
        raise HTTPException(status_code=401, detail="Incorrect credentials")
    
    token = create_access_token({"sub": user.id})
    return LoginResponse(
        access_token=token,
        user=AuthUser.model_validate(user)
    )

@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    current_user.hashed_password = hash_password(req.new_password)
    current_user.is_first_login = False
    db.commit()
    return {"success": True}
