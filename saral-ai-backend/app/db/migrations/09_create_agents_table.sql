-- Migration 09: Create agents and agent_prompt_versions tables, and link call_logs and leads to agents
--
-- This migration sets up multi-agent support for Saral AI.

-- Create dedicated agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    system_prompt TEXT DEFAULT 'You are a friendly AI receptionist for City Physiotherapy Clinic. Your name is Shruti. Always be warm, professional, and speak in a mix of Hindi and English (Hinglish) when appropriate.',
    voice_id TEXT DEFAULT 'shruti',
    status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Configured', 'Running', 'Paused', 'Stopped'
    languages TEXT[] DEFAULT ARRAY['en-IN', 'hi-IN'],
    working_hours JSONB DEFAULT '{"start": "09:00", "end": "20:00"}'::jsonb,
    appointment_duration INT DEFAULT 30, -- in minutes
    escalation_rules TEXT DEFAULT 'If the patient has a severe emergency, instruct them to visit the nearest hospital or contact the manager immediately.',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create prompt versions table
CREATE TABLE IF NOT EXISTS agent_prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    version INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add agent_id referencing agents to call_logs
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;

-- Add agent_id referencing agents to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;

-- Create indexes for optimization
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_prompt_versions_agent_id ON agent_prompt_versions(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_agent_id ON call_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON leads(agent_id);
