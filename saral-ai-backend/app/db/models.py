"""
Database Models.
Defines Pydantic models and data structures for DB serialization/deserialization.

SQL CREATE TABLE Statements:
============================
```sql
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    business_name TEXT,
    whatsapp_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- FAQs Table
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Call Logs Table
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    caller_number TEXT NOT NULL,
    transcript TEXT,
    summary TEXT,
    status TEXT NOT NULL, -- e.g., 'ongoing', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    caller_number TEXT NOT NULL,
    name TEXT,                          -- caller_name from Stage 2 triage
    interest TEXT,                      -- complaint from Stage 2 triage
    urgency TEXT,                       -- urgency_level shorthand (legacy mapping)
    budget TEXT,                        -- DEPRECATED: was used as JSON blob hack; now unused
    -- Stage 2 triage dedicated columns (added via migration 05)
    urgency_level TEXT,                 -- e.g., 'urgent', 'same_day', 'routine', 'faq_only'
    patient_type TEXT,                  -- e.g., 'new', 'existing'
    requested_slot TEXT,                -- ISO datetime string or human text like 'tomorrow 10 AM'
    recommended_action TEXT,            -- e.g., 'callback_now', 'book_appointment', 'send_info', 'no_action'
    language TEXT,                      -- e.g., 'Hindi', 'English', 'Marathi', 'mixed'
    status TEXT NOT NULL,               -- e.g., 'new', 'contacted', 'converted', 'lost'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed', -- e.g., 'confirmed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_slot UNIQUE (user_id, slot_datetime)
);

-- Create index on foreign keys for optimization
CREATE INDEX IF NOT EXISTS idx_faqs_user_id ON faqs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_call_log_id ON leads(call_log_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);

-- Setup automatic updated_at trigger for faqs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_faqs_updated_at
    BEFORE UPDATE ON faqs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class User(BaseModel):
    id: UUID
    email: str
    password_hash: str
    business_name: Optional[str] = None
    whatsapp_number: Optional[str] = None
    vad_threshold_ms: Optional[int] = 1000
    notification_preference: Optional[str] = "urgent_only"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserResponse(BaseModel):
    id: UUID
    email: str
    business_name: Optional[str] = None
    whatsapp_number: Optional[str] = None
    vad_threshold_ms: Optional[int] = 1000
    notification_preference: Optional[str] = "urgent_only"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FAQ(BaseModel):
    id: UUID
    user_id: UUID
    question: str
    answer: str
    created_at: datetime
    updated_at: datetime
    last_updated: datetime
    needs_verification: bool

    model_config = ConfigDict(from_attributes=True)

class CallLog(BaseModel):
    id: UUID
    user_id: UUID
    caller_number: str
    transcript: Optional[str] = None
    summary: Optional[str] = None
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class Lead(BaseModel):
    id: UUID
    call_log_id: Optional[UUID] = None
    user_id: UUID
    caller_number: str
    name: Optional[str] = None
    interest: Optional[str] = None
    urgency: Optional[str] = None
    budget: Optional[str] = None  # deprecated: was used as JSON blob hack
    # Stage 2 triage dedicated columns
    urgency_level: Optional[str] = None
    patient_type: Optional[str] = None
    requested_slot: Optional[str] = None
    recommended_action: Optional[str] = None
    language: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BookingCreate(BaseModel):
    user_id: UUID
    slot_datetime: datetime
    status: Optional[str] = "pending"
    expires_at: Optional[datetime] = None
    call_id: Optional[UUID] = None

class Booking(BaseModel):
    id: UUID
    user_id: UUID
    slot_datetime: datetime
    status: str
    expires_at: Optional[datetime] = None
    call_id: Optional[UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


