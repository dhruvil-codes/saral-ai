import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel
from app.api.auth import get_current_user
from app.db.supabase_client import get_supabase
from app.services.sarvam import text_to_speech

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["agents"])

# Pydantic models for request bodies
class AgentCreateRequest(BaseModel):
    name: str

class AgentUpdateRequest(BaseModel):
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    voice_id: Optional[str] = None
    status: Optional[str] = None
    languages: Optional[List[str]] = None
    working_hours: Optional[dict] = None
    appointment_duration: Optional[int] = None
    escalation_rules: Optional[str] = None

class CreatePromptVersionRequest(BaseModel):
    prompt: str

class TTSPreviewRequest(BaseModel):
    text: str
    language: str = "hi-IN"
    speaker: str = "shruti"

@router.get("", response_model=list)
def list_agents(current_user: dict = Depends(get_current_user)):
    """List all agents managed by the current user."""
    supabase = get_supabase()
    try:
        res = supabase.table("agents").select("*").eq("user_id", current_user["id"]).order("created_at").execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Failed to list agents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.post("", status_code=status.HTTP_201_CREATED)
def create_agent(body: AgentCreateRequest, current_user: dict = Depends(get_current_user)):
    """Create a new agent in 'Draft' status."""
    supabase = get_supabase()
    agent_data = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "name": body.name,
        "status": "Draft",
        "system_prompt": "You are a friendly AI receptionist for City Physiotherapy Clinic. Your name is Shruti. Always be warm, professional, and speak in a mix of Hindi and English (Hinglish) when appropriate.",
        "voice_id": "shruti",
        "languages": ["en-IN", "hi-IN"],
        "working_hours": {"start": "09:00", "end": "20:00"},
        "appointment_duration": 30,
        "escalation_rules": "If the patient has a severe emergency, instruct them to visit the nearest hospital or contact the manager immediately."
    }
    try:
        res = supabase.table("agents").insert(agent_data).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create agent"
            )
        # Create initial prompt version
        version_data = {
            "agent_id": agent_data["id"],
            "prompt": agent_data["system_prompt"],
            "version": 1
        }
        supabase.table("agent_prompt_versions").insert(version_data).execute()
        return res.data[0]
    except Exception as e:
        logger.error(f"Failed to create agent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.get("/{agent_id}")
def get_agent(agent_id: str, current_user: dict = Depends(get_current_user)):
    """Retrieve details for a specific agent."""
    supabase = get_supabase()
    try:
        res = supabase.table("agents").select("*").eq("id", agent_id).eq("user_id", current_user["id"]).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get agent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.put("/{agent_id}")
def update_agent(agent_id: str, body: AgentUpdateRequest, current_user: dict = Depends(get_current_user)):
    """Update configurations of an agent."""
    supabase = get_supabase()
    update_data = {}
    if body.name is not None:
        update_data["name"] = body.name
    if body.system_prompt is not None:
        update_data["system_prompt"] = body.system_prompt
    if body.voice_id is not None:
        update_data["voice_id"] = body.voice_id
    if body.status is not None:
        if body.status not in ["Draft", "Configured", "Running", "Paused", "Stopped"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status"
            )
        update_data["status"] = body.status
    if body.languages is not None:
        update_data["languages"] = body.languages
    if body.working_hours is not None:
        update_data["working_hours"] = body.working_hours
    if body.appointment_duration is not None:
        update_data["appointment_duration"] = body.appointment_duration
    if body.escalation_rules is not None:
        update_data["escalation_rules"] = body.escalation_rules

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update fields provided"
        )
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        # Check ownership first
        check_res = supabase.table("agents").select("id, system_prompt").eq("id", agent_id).eq("user_id", current_user["id"]).execute()
        if not check_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found or unauthorized"
            )
        
        # If prompt is updated, automatically check if we want to update status to Configured (if it was Draft)
        current_agent = check_res.data[0]
        if current_agent.get("status") == "Draft" and body.system_prompt is not None:
            update_data["status"] = "Configured"

        res = supabase.table("agents").update(update_data).eq("id", agent_id).execute()
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update agent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.delete("/{agent_id}")
def delete_agent(agent_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an agent."""
    supabase = get_supabase()
    try:
        res = supabase.table("agents").delete().eq("id", agent_id).eq("user_id", current_user["id"]).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found or unauthorized"
            )
        return {"status": "success", "message": "Agent deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete agent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.post("/{agent_id}/deploy")
def deploy_agent(agent_id: str, current_user: dict = Depends(get_current_user)):
    """
    Simulate full Deploy workflow:
    1. Validates configuration.
    2. Provisions mock phone/WhatsApp numbers.
    3. Triggers telephony setup.
    4. Sets status to 'Running'.
    """
    supabase = get_supabase()
    try:
        # Check ownership and configurations
        res = supabase.table("agents").select("*").eq("id", agent_id).eq("user_id", current_user["id"]).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        agent = res.data[0]
        
        # Validation checks
        if not agent.get("system_prompt") or len(agent["system_prompt"].strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agent configuration failed: System prompt must be at least 10 characters."
            )
            
        if not agent.get("voice_id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agent configuration failed: A voice speaker must be selected."
            )

        # Set status to Running and save mock telephony data
        mock_number = f"+1 (555) 019-{uuid.uuid4().int % 10000:04d}"
        update_data = {
            "status": "Running",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        supabase.table("agents").update(update_data).eq("id", agent_id).execute()
        
        return {
            "status": "success",
            "message": "Agent successfully provisioned and deployed",
            "phone_number": mock_number,
            "whatsapp_status": "Connected"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to deploy agent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.post("/{agent_id}/pause")
def pause_agent(agent_id: str, current_user: dict = Depends(get_current_user)):
    """Pause a running agent."""
    supabase = get_supabase()
    try:
        res = supabase.table("agents").update({"status": "Paused", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", agent_id).eq("user_id", current_user["id"]).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found or unauthorized"
            )
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to pause agent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.post("/{agent_id}/resume")
def resume_agent(agent_id: str, current_user: dict = Depends(get_current_user)):
    """Resume a paused agent back to running."""
    supabase = get_supabase()
    try:
        res = supabase.table("agents").update({"status": "Running", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", agent_id).eq("user_id", current_user["id"]).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found or unauthorized"
            )
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resume agent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.post("/{agent_id}/stop")
def stop_agent(agent_id: str, current_user: dict = Depends(get_current_user)):
    """Stop an agent."""
    supabase = get_supabase()
    try:
        res = supabase.table("agents").update({"status": "Stopped", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", agent_id).eq("user_id", current_user["id"]).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found or unauthorized"
            )
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to stop agent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.get("/{agent_id}/versions")
def get_prompt_versions(agent_id: str, current_user: dict = Depends(get_current_user)):
    """Retrieve version history for an agent's prompt."""
    supabase = get_supabase()
    try:
        # Check ownership
        check_res = supabase.table("agents").select("id").eq("id", agent_id).eq("user_id", current_user["id"]).execute()
        if not check_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found or unauthorized"
            )
        res = supabase.table("agent_prompt_versions").select("*").eq("agent_id", agent_id).order("version", desc=True).execute()
        return res.data or []
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get prompt versions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.post("/{agent_id}/versions")
def create_prompt_version(agent_id: str, body: CreatePromptVersionRequest, current_user: dict = Depends(get_current_user)):
    """Create a new version checkpoint for the agent's prompt."""
    supabase = get_supabase()
    try:
        # Check ownership
        check_res = supabase.table("agents").select("id").eq("id", agent_id).eq("user_id", current_user["id"]).execute()
        if not check_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found or unauthorized"
            )
        
        # Get current max version
        ver_res = supabase.table("agent_prompt_versions").select("version").eq("agent_id", agent_id).order("version", desc=True).limit(1).execute()
        next_ver = 1
        if ver_res.data:
            next_ver = ver_res.data[0]["version"] + 1

        version_data = {
            "id": str(uuid.uuid4()),
            "agent_id": agent_id,
            "prompt": body.prompt,
            "version": next_ver
        }
        res = supabase.table("agent_prompt_versions").insert(version_data).execute()
        
        # Also update agent's current prompt
        supabase.table("agents").update({"system_prompt": body.prompt, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", agent_id).execute()
        
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save prompt version: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.post("/preview-tts")
def preview_tts(body: TTSPreviewRequest, current_user: dict = Depends(get_current_user)):
    """Generate audio bytes dynamically using Sarvam TTS and return MP3 stream."""
    try:
        audio_bytes = text_to_speech(
            text=body.text,
            language_code=body.language,
            speech_sample_rate=16000,
            output_format="mp3",
            speaker=body.speaker
        )
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"TTS preview failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"TTS Generation failed: {str(e)}"
        )
