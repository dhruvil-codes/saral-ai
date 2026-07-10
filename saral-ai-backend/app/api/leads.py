"""
Leads router.
Handles listing captured Stage 2 patient case cards.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.api.auth import get_current_user
from app.db.supabase_client import get_supabase

router = APIRouter()


class LeadResponse(BaseModel):
    id: str
    caller_number: str
    name: Optional[str] = None
    interest: Optional[str] = None
    urgency_level: Optional[str] = None
    patient_type: Optional[str] = None
    requested_slot: Optional[str] = None
    recommended_action: Optional[str] = None
    language: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[str] = None


@router.get("/leads", response_model=list[LeadResponse])
async def get_leads(current_user: dict = Depends(get_current_user)):
    """Return Stage 2 case cards using dedicated triage columns only."""
    supabase = get_supabase()
    try:
        response = (
            supabase.table("leads")
            .select(
                "id, caller_number, name, interest, urgency_level, "
                "patient_type, requested_slot, recommended_action, "
                "language, status, created_at"
            )
            .eq("user_id", current_user["id"])
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch case cards: {str(e)}",
        )
