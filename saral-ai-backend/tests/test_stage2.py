#!/usr/bin/env python3
"""
test_stage2.py
Tests the Stage 2 triage post-call extraction service on 3 sample transcripts.
"""

import os
import sys
import json

# Ensure backend root is in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.stage2_triage import extract_case_summary

# 1. Urgent Case Transcript
TRANSCRIPT_URGENT = """
Assistant: Hello, thank you for calling Saral clinic. How can I help you today?
User: Hi, I need to see a doctor. I have very severe lower back pain since yesterday evening and I cannot even sit down properly.
Assistant: I am sorry to hear that. Have you been to our clinic before?
User: No, I am a new patient. My name is Amit Patel. Can you book me for today please?
Assistant: Let me check the schedule for today.
"""

# 2. Routine Case Transcript
TRANSCRIPT_ROUTINE = """
Assistant: Welcome to Saral Physiotherapy and Dental clinic. How can I assist you?
User: Hello, I am an existing patient. I would like to book a routine physiotherapy session for next Monday, July 13th in the morning, around 10 AM.
Assistant: Sure, let me check the slot for Monday at 10 AM. Yes, that slot is available.
User: Great, please book that for me. My name is Rajesh Sharma.
Assistant: Thank you, Rajesh. I have booked it.
"""

# 3. FAQ Case Transcript
TRANSCRIPT_FAQ = """
Assistant: Hello, Saral clinic. How can I help you?
User: Yes, I wanted to ask what are your consultation fees for a first checkup? And what are your opening hours?
Assistant: Our consultation fee is 500 rupees, and we are open from 9 AM to 8 PM Monday to Saturday.
User: Okay, thank you. That is all I wanted to know. Bye.
Assistant: You're welcome! Goodbye.
"""

# 4. Tomorrow Slot Case Transcript
TRANSCRIPT_TOMORROW = """
Assistant: Hello, thank you for calling Saral clinic. How can I help you today?
User: Hi, I'd like to book an appointment for tomorrow afternoon, say around 3 PM, if possible.
Assistant: Let me check our schedule for tomorrow at 3 PM. Yes, we have a slot available. What is your name?
User: I am Amit Patel. I am an existing patient.
Assistant: Okay Amit, I have put you down for tomorrow at 3 PM.
"""

def run_test(case_name: str, transcript: str):
    print("=" * 60)
    print(f"TEST CASE: {case_name}")
    print("=" * 60)
    print("Transcript:")
    print(transcript.strip())
    print("-" * 60)
    
    # Run triage
    result = extract_case_summary(transcript)
    
    # Pretty print JSON output
    print("Triage Extraction Output:")
    print(json.dumps(result, indent=2))
    print("=" * 60 + "\n")

if __name__ == "__main__":
    print("Starting Stage 2 Clinic Triage Extraction Smoke Test\n")
    
    run_test("Urgent - Severe Back Pain (Since Yesterday)", TRANSCRIPT_URGENT)
    run_test("Routine - Appointment Booking Request", TRANSCRIPT_ROUTINE)
    run_test("FAQ Only - Consultation Fees & Hours", TRANSCRIPT_FAQ)
    run_test("Tomorrow Slot - Relative Date Math Verification", TRANSCRIPT_TOMORROW)
    
    print("Verification complete.")
