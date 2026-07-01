"""
Bookings Router and Core Service.
Handles appointment booking creation with database-level slot locking.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.auth import get_current_user
from app.db.supabase_client import get_supabase
from app.db.models import BookingCreate, Booking

logger = logging.getLogger(__name__)

router = APIRouter()


def create_booking_slot(user_id: str, slot_datetime: str, status_str: str = "confirmed") -> Dict[str, Any]:
    """
    Attempts to insert a booking record into Supabase.
    Relying on the UNIQUE constraint on (user_id, slot_datetime) to safely catch
    and handle collisions if a slot is already taken by a concurrent request.
    """
    supabase = get_supabase()
    booking_data = {
        "user_id": str(user_id),
        "slot_datetime": slot_datetime,
        "status": status_str
    }
    
    try:
        response = supabase.table("bookings").insert(booking_data).execute()
        if response.data:
            logger.info(f"Booking slot successfully created: {booking_data}")
            return {"success": True, "data": response.data[0]}
        return {"success": False, "error": "DB_ERROR", "message": "No data returned from insert"}
    except Exception as exc:
        err_msg = str(exc)
        logger.warning(f"Error inserting booking slot: {err_msg}")
        if "23505" in err_msg or "duplicate key" in err_msg.lower() or "unique_user_slot" in err_msg.lower():
            logger.warning(f"Slot collision detected for user {user_id} at {slot_datetime}")
            return {
                "success": False,
                "error": "SLOT_TAKEN",
                "message": "This time slot is already booked."
            }
        return {
            "success": False,
            "error": "DB_ERROR",
            "message": err_msg
        }


def hold_booking_slot(user_id: str, slot_datetime: str, call_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Holds a booking slot as 'pending' for 10 minutes.
    First cleans up any expired pending slots.
    """
    supabase = get_supabase()
    
    # 1. Clean up expired pending slots
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        supabase.table("bookings").delete().eq("status", "pending").lt("expires_at", now_iso).execute()
    except Exception as exc:
        logger.warning(f"Error cleaning up expired bookings: {exc}")

    # 2. Insert new pending slot
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    booking_data = {
        "user_id": str(user_id),
        "slot_datetime": slot_datetime,
        "status": "pending",
        "expires_at": expires_at
    }
    if call_id:
        booking_data["call_id"] = str(call_id)
        
    try:
        response = supabase.table("bookings").insert(booking_data).execute()
        if response.data:
            logger.info(f"Booking slot held: {booking_data}")
            return {"success": True, "data": response.data[0]}
        return {"success": False, "error": "DB_ERROR", "message": "No data returned from insert"}
    except Exception as exc:
        err_msg = str(exc)
        logger.warning(f"Error holding booking slot: {err_msg}")
        if "23505" in err_msg or "duplicate key" in err_msg.lower() or "unique_user_slot" in err_msg.lower():
            logger.warning(f"Slot collision detected for user {user_id} at {slot_datetime}")
            return {
                "success": False,
                "error": "SLOT_TAKEN",
                "message": "This time slot is already booked or held."
            }
        return {
            "success": False,
            "error": "DB_ERROR",
            "message": err_msg
        }


def confirm_booking_slot(user_id: str, slot_datetime: str) -> Dict[str, Any]:
    """
    Confirms a previously held pending booking slot by setting status='confirmed'
    and clearing expires_at.
    """
    supabase = get_supabase()
    try:
        response = supabase.table("bookings")\
            .update({"status": "confirmed", "expires_at": None})\
            .eq("user_id", str(user_id))\
            .eq("slot_datetime", slot_datetime)\
            .eq("status", "pending")\
            .execute()
            
        if response.data:
            logger.info(f"Booking slot confirmed: {response.data[0]}")
            return {"success": True, "data": response.data[0]}
        else:
            logger.warning(f"No pending booking slot found to confirm for user {user_id} at {slot_datetime}")
            return {
                "success": False,
                "error": "NO_PENDING_SLOT",
                "message": "No pending reservation was found for this time slot. It may have expired."
            }
    except Exception as exc:
        err_msg = str(exc)
        logger.error(f"Error confirming booking slot: {err_msg}", exc_info=True)
        return {
            "success": False,
            "error": "DB_ERROR",
            "message": err_msg
        }


class BookingRequest(BaseModel):
    slot_datetime: datetime
    status: Optional[str] = "confirmed"


@router.post("/bookings", response_model=Booking)
async def create_booking_endpoint(body: BookingRequest, current_user: dict = Depends(get_current_user)):
    """
    FastAPI endpoint for booking creation or confirmation.
    """
    user_id = current_user["id"]
    slot_iso = body.slot_datetime.isoformat()
    status_str = body.status or "confirmed"
    
    if status_str == "pending":
        result = hold_booking_slot(user_id=user_id, slot_datetime=slot_iso)
    else:
        # Try confirming a pending booking first
        result = confirm_booking_slot(user_id=user_id, slot_datetime=slot_iso)
        if not result["success"] and result.get("error") == "NO_PENDING_SLOT":
            # If no pending slot exists, create a confirmed booking directly
            result = create_booking_slot(user_id=user_id, slot_datetime=slot_iso, status_str="confirmed")
            
    if result["success"]:
        return result["data"]
    elif result.get("error") == "SLOT_TAKEN":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This time slot is already booked or held."
        )
    elif result.get("error") == "NO_PENDING_SLOT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending reservation was found for this time slot."
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database booking failure: {result.get('message')}"
        )

