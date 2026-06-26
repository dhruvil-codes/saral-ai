"""
FAQ router.
Handles CRUD operations for MSME business FAQs used by the AI receptionist.
"""

import logging
from datetime import datetime, timezone
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.auth import get_current_user
from app.db.supabase_client import get_supabase
from app.services.intent_cache import semantic_cache

logger = logging.getLogger(__name__)

router = APIRouter()

class FAQCreate(BaseModel):
    question: str
    answer: str

class FAQUpdate(BaseModel):
    question: str
    answer: str

class FAQResponse(BaseModel):
    id: UUID
    question: str
    answer: str

@router.get("/faqs", response_model=List[FAQResponse])
async def get_faqs(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    try:
        response = supabase.table("faqs").select("id, question, answer").eq("user_id", current_user["id"]).execute()
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query error: {str(e)}"
        )

@router.post("/faqs", response_model=FAQResponse)
async def create_faq(body: FAQCreate, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Generate question embedding for pgvector RAG
    try:
        emb = await semantic_cache.embed_text(body.question)
        embedding_list = emb.tolist()
    except Exception as e:
        logger.warning(f"Could not generate embedding for FAQ creation: {e}")
        embedding_list = None

    faq_data = {
        "user_id": current_user["id"],
        "question": body.question,
        "answer": body.answer
    }
    if embedding_list is not None:
        faq_data["embedding"] = embedding_list

    try:
        response = supabase.table("faqs").insert(faq_data).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create FAQ record"
            )
        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database insert error: {str(e)}"
        )

@router.put("/faqs/{id}", response_model=FAQResponse)
async def update_faq(id: UUID, body: FAQUpdate, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    # 1. Fetch FAQ by id to check existence and ownership
    try:
        response = supabase.table("faqs").select("*").eq("id", str(id)).execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query error: {str(e)}"
        )
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FAQ not found"
        )
    
    faq = response.data[0]
    if str(faq["user_id"]) != str(current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FAQ not found"
        )
    
    # 2. Update question, answer, and updated_at
    try:
        emb = await semantic_cache.embed_text(body.question)
        embedding_list = emb.tolist()
    except Exception as e:
        logger.warning(f"Could not generate embedding for FAQ update: {e}")
        embedding_list = None

    update_data = {
        "question": body.question,
        "answer": body.answer,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if embedding_list is not None:
        update_data["embedding"] = embedding_list
    
    try:
        update_response = supabase.table("faqs").update(update_data).eq("id", str(id)).execute()
        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update FAQ record"
            )
        return update_response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database update error: {str(e)}"
        )

@router.delete("/faqs/{id}")
async def delete_faq(id: UUID, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    # 1. Fetch FAQ by id to check existence and ownership
    try:
        response = supabase.table("faqs").select("*").eq("id", str(id)).execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query error: {str(e)}"
        )
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FAQ not found"
        )
    
    faq = response.data[0]
    if str(faq["user_id"]) != str(current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FAQ not found"
        )
    
    # 2. Delete the FAQ
    try:
        supabase.table("faqs").delete().eq("id", str(id)).execute()
        return {"message": "FAQ deleted"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database delete error: {str(e)}"
        )
