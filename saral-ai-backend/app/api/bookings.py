"""
Bookings Router and Core Service.
Handles appointment booking creation with database-level slot locking.
"""

import logging
from datetime import datetime, timezone
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

    Args:
        user_id (str): UUID string of the business user.
        slot_datetime (str): ISO formatted datetime string for the appointment slot.
        status_str (str): Booking status (default 'confirmed').

    Returns:
        Dict[str, Any]: {"success": True, "data": dict} or {"success": False, "error": "SLOT_TAKEN" | "DB_ERROR"}
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
        # PostgREST unique constraint violation error code is 23505 or duplicate key
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


class BookingRequest(BaseModel):
    slot_datetime: datetime
    status: Optional[str] = "confirmed"


@router.post("/bookings", response_model=Booking)
async def create_booking_endpoint(body: BookingRequest, current_user: dict = Depends(get_current_user)):
    """
    FastAPI endpoint for booking creation. Uses strict database level locking.
    """
    user_id = current_user["id"]
    slot_iso = body.slot_datetime.isoformat()
    
    result = create_booking_slot(user_id=user_id, slot_datetime=slot_iso, status_str=body.status or "confirmed")
    
    if result["success"]:
        return result["data"]
    elif result.get("error") == "SLOT_TAKEN":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This time slot is already booked by another caller."
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database booking failure: {result.get('message')}"
        )
