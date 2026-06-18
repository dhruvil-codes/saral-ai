"""
Authentication router.
Handles user registration, login, token generation, and password hashing.
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.config import settings
from app.db.supabase_client import get_supabase

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

class SignupRequest(BaseModel):
    email: str
    password: str
    business_name: Optional[str] = None
    whatsapp_number: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode = {
        "sub": str(user_id),
        "exp": expire
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")

@router.post("/signup")
async def signup(body: SignupRequest):
    supabase = get_supabase()
    
    # 1. Check if email already exists in Supabase users
    try:
        response = supabase.table("users").select("id").eq("email", body.email).execute()
        if response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query error: {str(e)}"
        )

    # 2. Hash the password with bcrypt
    password_hash = pwd_context.hash(body.password)

    # 3. Insert new row into users table
    user_data = {
        "email": body.email,
        "password_hash": password_hash,
        "business_name": body.business_name,
        "whatsapp_number": body.whatsapp_number
    }
    
    try:
        insert_response = supabase.table("users").insert(user_data).execute()
        if not insert_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user record"
            )
        user_id = insert_response.data[0]["id"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database insert error: {str(e)}"
        )

    # 4. Generate a JWT (7-day expiry) signed with settings.SECRET_KEY
    token = create_access_token(user_id)

    # 5. Return user_id and token
    return {
        "user_id": str(user_id),
        "token": token
    }

@router.post("/login")
async def login(body: LoginRequest):
    supabase = get_supabase()
    
    # 1. Fetch user from Supabase by email
    try:
        response = supabase.table("users").select("*").eq("email", body.email).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        user = response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query error: {str(e)}"
        )

    # 2. Verify bcrypt password
    if not pwd_context.verify(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # 3. Generate JWT
    token = create_access_token(user["id"])

    # 4. Return user_id and token
    return {
        "user_id": str(user["id"]),
        "token": token
    }

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token structure"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    # fetch user from Supabase
    supabase = get_supabase()
    try:
        response = supabase.table("users").select("*").eq("id", user_id).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
