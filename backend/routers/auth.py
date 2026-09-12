import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.user import User
from backend.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse
from backend.security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=TokenResponse)
def register_passenger(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Public registration endpoint.
    Strictly forces role='PASSENGER'. Admin/Driver/Responder roles cannot be registered publicly.
    """
    if payload.role and payload.role.upper() != "PASSENGER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public registration is restricted to passengers only. Administrative or staff roles must be provisioned by an Admin."
        )

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Generate sequential passenger code: PAX-XXX
    pax_count = db.query(User).filter(User.role == "PASSENGER").count() + 1
    user_code = f"PAX-{pax_count:03d}"

    new_user = User(
        user_code=user_code,
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
        role="PASSENGER",  # Enforce PASSENGER only
        phone=payload.phone.strip() if payload.phone else None,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role, "email": new_user.email})

    user_dict = {
        "id": new_user.id,
        "user_code": new_user.user_code,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role,
        "phone": new_user.phone
    }

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        id=new_user.id,
        user_code=new_user.user_code,
        name=new_user.name,
        email=new_user.email,
        role=new_user.role,
        user=user_dict
    )

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact administrator."
        )

    user.last_login = datetime.datetime.now(datetime.timezone.utc)
    db.commit()

    token = create_access_token(data={"sub": str(user.id), "role": user.role, "email": user.email})

    user_dict = {
        "id": user.id,
        "user_code": user.user_code,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "phone": user.phone
    }

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        id=user.id,
        user_code=user.user_code,
        name=user.name,
        email=user.email,
        role=user.role,
        user=user_dict
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user
