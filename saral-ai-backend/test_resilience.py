import os
import sys
import unittest
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

# Ensure backend app is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Define in-memory mock database state
mock_db = {
    "users": [
        {"id": "user-uuid-123", "email": "test@business.com", "whatsapp_number": "+919999999999"}
    ],
    "bookings": [],
    "call_logs": []
}

class MockTable:
    def __init__(self, name):
        self.name = name
        self._filters = []
        self._inserted_data = None
        self._updated_data = None
        self._deleted = False
        self._select_fields = "*"

    def select(self, fields="*"):
        self._select_fields = fields
        return self

    def eq(self, field, value):
        self._filters.append((field, value))
        return self

    def lt(self, field, value):
        self._filters.append((field, value, "lt"))
        return self

    def gt(self, field, value):
        self._filters.append((field, value, "gt"))
        return self

    def insert(self, data):
        self._inserted_data = data
        return self

    def upsert(self, data):
        self._inserted_data = data
        return self

    def update(self, data):
        self._updated_data = data
        return self


    def delete(self):
        self._deleted = True
        return self

    def execute(self):
        class MockResponse:
            def __init__(self, data):
                self.data = data

        # 1. Insert mode
        if self._inserted_data is not None:
            record = dict(self._inserted_data)
            if "id" not in record or not record["id"]:
                record["id"] = str(uuid.uuid4())
            if "created_at" not in record:
                record["created_at"] = datetime.now(timezone.utc).isoformat()
            mock_db[self.name].append(record)
            return MockResponse([record])

        # 2. Filter existing data
        results = list(mock_db[self.name])
        for filter_item in self._filters:
            if len(filter_item) == 2:
                field, value = filter_item
                results = [r for r in results if str(r.get(field)) == str(value)]
            elif len(filter_item) == 3:
                field, value, op = filter_item
                if op == "lt":
                    results = [r for r in results if r.get(field) is not None and r.get(field) < value]
                elif op == "gt":
                    results = [r for r in results if r.get(field) is not None and r.get(field) > value]

        # 3. Update mode
        if self._updated_data is not None:
            updated_records = []
            for r in results:
                # Find matching record in mock_db
                for db_record in mock_db[self.name]:
                    if db_record.get("id") == r.get("id"):
                        db_record.update(self._updated_data)
                        updated_records.append(db_record)
            return MockResponse(updated_records)

        # 4. Delete mode
        if self._deleted:
            ids_to_delete = {r["id"] for r in results if "id" in r}
            mock_db[self.name] = [r for r in mock_db[self.name] if r.get("id") not in ids_to_delete]
            return MockResponse(results)

        # 5. Select mode (return filtered results)
        if self._select_fields != "*":
            # For simplicity, extract fields
            fields = [f.strip() for f in self._select_fields.split(",")]
            formatted_results = []
            for r in results:
                item = {}
                for f in fields:
                    if f == "users(whatsapp_number)":
                        item[f] = {"whatsapp_number": "+919999999999"}
                    else:
                        item[f] = r.get(f)
                formatted_results.append(item)
            return MockResponse(formatted_results)

        return MockResponse(results)

class MockSupabaseClient:
    def table(self, table_name):
        return MockTable(table_name)

# Patch get_supabase and Twilio calls before importing the app
import app.db.supabase_client
with patch('app.db.supabase_client.get_supabase', return_value=MockSupabaseClient()):
    from app.main import app
    from app.api.bookings import hold_booking_slot, confirm_booking_slot
    from fastapi.testclient import TestClient

class TestResilienceFeatures(unittest.TestCase):

    def setUp(self):
        # Patch get_supabase during test execution to override any cached imports
        self.patchers = [
            patch('app.db.supabase_client.get_supabase', return_value=MockSupabaseClient()),
            patch('app.api.ws_call.get_supabase', return_value=MockSupabaseClient()),
            patch('app.api.bookings.get_supabase', return_value=MockSupabaseClient()),
            patch('app.api.callback.get_supabase', return_value=MockSupabaseClient()),
            patch('app.services.intent_cache._load_model', return_value=False),
        ]
        for p in self.patchers:
            p.start()

        # Reset database tables
        mock_db["bookings"] = []
        mock_db["call_logs"] = []
        mock_db["users"] = [
            {"id": "user-uuid-123", "email": "test@business.com", "whatsapp_number": "+919999999999"}
        ]

    def tearDown(self):
        for p in self.patchers:
            p.stop()


    def test_hold_and_confirm_booking_logic(self):
        """Test hold_booking_slot writes pending and confirm_booking_slot updates to confirmed."""
        user_id = "user-uuid-123"
        slot_dt = "2026-07-15T10:00:00Z"
        call_id = "call-uuid-999"

        # 1. Hold booking slot
        res_hold = hold_booking_slot(user_id=user_id, slot_datetime=slot_dt, call_id=call_id)
        self.assertTrue(res_hold["success"])
        self.assertEqual(len(mock_db["bookings"]), 1)
        self.assertEqual(mock_db["bookings"][0]["status"], "pending")
        self.assertEqual(mock_db["bookings"][0]["call_id"], call_id)
        self.assertIsNotNone(mock_db["bookings"][0]["expires_at"])

        # 2. Confirm booking slot
        res_confirm = confirm_booking_slot(user_id=user_id, slot_datetime=slot_dt)
        self.assertTrue(res_confirm["success"])
        self.assertEqual(mock_db["bookings"][0]["status"], "confirmed")
        self.assertIsNone(mock_db["bookings"][0]["expires_at"])

    @patch("app.api.ws_call.speech_to_text")
    @patch("app.api.ws_call.get_response")
    @patch("app.api.ws_call.text_to_speech_stream")
    @patch("app.workers.tasks.send_whatsapp_message")
    def test_websocket_dropped_call_recovery(self, mock_send_whatsapp, mock_tts_stream, mock_llm, mock_stt):
        """Test WebSocket disconnect fires background Twilio worker if pending slot is present."""
        call_id = "call-uuid-888"
        user_id = "user-uuid-123"
        caller_number = "+919820112233"

        # Setup call log
        mock_db["call_logs"].append({
            "id": call_id,
            "user_id": user_id,
            "caller_number": caller_number,
            "status": "ongoing"
        })

        # Mocks setup
        mock_stt.return_value = "book Tuesday at 10am"
        
        # Simulating LLM calling hold_appointment_slot tool
        def mock_get_response(msg, history, system_prompt=None, uid=None, cid=None):
            if "Summarize" in msg:
                return "Call summary."
            hold_booking_slot(user_id=uid or user_id, slot_datetime="2026-07-16T10:00:00Z", call_id=cid)
            return "Held Tuesday 10am as requested."
        mock_llm.side_effect = mock_get_response




        async def mock_stream(text, language_code):
            yield b"audio-chunk"
        mock_tts_stream.side_effect = mock_stream

        # TestClient
        client = TestClient(app)
        
        # Connect & disconnect to trigger finally block
        with client.websocket_connect(f"/ws/call?language=en-IN&call_id={call_id}&user_id={user_id}") as ws:
            ws.send_bytes(b"dummy-audio")
            ws.receive_json() # status transcribed
            ws.receive_json() # status tts_start
            ws.receive_bytes() # tts audio
            ws.receive_json() # status tts_end
        
        # Check that hold was created
        self.assertEqual(len(mock_db["bookings"]), 1)
        self.assertEqual(mock_db["bookings"][0]["status"], "pending")
        self.assertEqual(mock_db["bookings"][0]["call_id"], call_id)

        # Allow background tasks to run (wait briefly or trigger task manually if async task isn't awaited)
        import asyncio
        # We run the pending tasks on event loop
        loop = asyncio.get_event_loop()
        # Wait a tiny fraction to allow scheduled asyncio tasks to run
        loop.run_until_complete(asyncio.sleep(0.1))

        # Assert WhatsApp recovery message sent to caller
        mock_send_whatsapp.assert_called_once()
        whatsapp_args = mock_send_whatsapp.call_args[0]
        self.assertEqual(whatsapp_args[0], caller_number)
        self.assertIn("looks like we got cut off", whatsapp_args[1])
        self.assertIn("held for the next 10 minutes", whatsapp_args[1])

    def test_whatsapp_webhook_yes_confirmation(self):
        """Test WhatsApp webhook confirms booking when user replies YES."""
        call_id = "call-uuid-777"
        user_id = "user-uuid-123"
        caller_number = "+919820123456"
        slot_dt = "2026-07-17T11:00:00Z"

        # 1. Setup DB state
        mock_db["call_logs"].append({
            "id": call_id,
            "user_id": user_id,
            "caller_number": caller_number,
            "status": "completed"
        })
        
        # Set hold expiry in future
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        mock_db["bookings"].append({
            "id": "booking-uuid-777",
            "user_id": user_id,
            "slot_datetime": slot_dt,
            "status": "pending",
            "expires_at": expires_at,
            "call_id": call_id
        })

        # 2. Call WhatsApp callback endpoint with YES reply
        client = TestClient(app)
        response = client.post(
            "/api/callback/whatsapp",
            data={
                "From": f"whatsapp:{caller_number}",
                "Body": "YES"
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("confirmed", response.text)
        
        # Verify status updated to confirmed in DB
        self.assertEqual(mock_db["bookings"][0]["status"], "confirmed")
        self.assertIsNone(mock_db["bookings"][0]["expires_at"])

if __name__ == "__main__":
    unittest.main()
