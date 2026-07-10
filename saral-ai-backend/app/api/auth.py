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

import logging
from app.core.config import settings
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

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
    supabase = get_supabase()
    
    # 1. Attempt to authenticate using local custom JWT first
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is not None:
            # fetch user from Supabase public.users table
            response = supabase.table("users").select("*").eq("id", user_id).execute()
            if response.data:
                return response.data[0]
    except Exception:
        # Fallback to Supabase Auth token
        pass

    # 2. Attempt to authenticate using Supabase native JWT
    try:
        auth_resp = supabase.auth.get_user(token)
        if auth_resp and auth_resp.user:
            supabase_user = auth_resp.user
            user_id = str(supabase_user.id)
            
            # Check if this user exists in our public.users table
            response = supabase.table("users").select("*").eq("id", user_id).execute()
            if response.data:
                return response.data[0]
            else:
                # If they are logged in via Supabase but don't have a record in users, create one
                user_data = {
                    "id": user_id,
                    "email": supabase_user.email,
                    "password_hash": "supabase_auth", # placeholder since auth is delegated
                    "business_name": "My Business",
                    "whatsapp_number": "",
                    "saral_active": True
                }
                insert_response = supabase.table("users").insert(user_data).execute()
                if insert_response.data:
                    return insert_response.data[0]
    except Exception as e:
        logger.error(f"Supabase JWT auth failed: {e}")

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token"
    )

class SettingsUpdateRequest(BaseModel):
    business_name: Optional[str] = None
    whatsapp_number: Optional[str] = None
    saral_active: Optional[bool] = None
    vad_threshold_ms: Optional[int] = None
    notification_preference: Optional[str] = None

@router.put("/settings")
async def update_settings(
    body: SettingsUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase()
    update_data = {}
    if body.business_name is not None:
        update_data["business_name"] = body.business_name
    if body.whatsapp_number is not None:
        update_data["whatsapp_number"] = body.whatsapp_number
    if body.saral_active is not None:
        update_data["saral_active"] = body.saral_active
    if body.vad_threshold_ms is not None:
        val = body.vad_threshold_ms
        update_data["vad_threshold_ms"] = max(600, min(2000, val))
    if body.notification_preference is not None:
        val = body.notification_preference
        if val not in ["all", "urgent_only", "digest"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid notification preference. Must be 'all', 'urgent_only', or 'digest'."
            )
        update_data["notification_preference"] = val

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No settings fields provided for update"
        )

    try:
        response = supabase.table("users").update(update_data).eq("id", current_user["id"]).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update settings"
            )
        updated_user = response.data[0]
        return {
            "status": "success",
            "user": {
                "id": str(updated_user["id"]),
                "email": updated_user["email"],
                "business_name": updated_user.get("business_name"),
                "whatsapp_number": updated_user.get("whatsapp_number"),
                "saral_active": updated_user.get("saral_active", True),
                "vad_threshold_ms": updated_user.get("vad_threshold_ms", 1000),
                "notification_preference": updated_user.get("notification_preference", "urgent_only")
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database update error: {str(e)}"
        )

