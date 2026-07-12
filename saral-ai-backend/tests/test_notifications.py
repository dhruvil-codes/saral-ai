import unittest
import sys
import os
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

# Ensure backend app is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock settings before any other imports
with patch.dict("os.environ", {
    "SUPABASE_URL": "https://fake.supabase.co",
    "SUPABASE_KEY": "fake-key",
    "REDIS_URL": "redis://localhost:6379/0",
    "SARVAM_API_KEY": "fake",
    "FIREWORKS_API_KEY": "fake",
    "TWILIO_ACCOUNT_SID": "fake",
    "TWILIO_AUTH_TOKEN": "fake",
    "TWILIO_PHONE_NUMBER": "fake",
    "TWILIO_WHATSAPP_FROM": "fake",
    "SECRET_KEY": "fake"
}):
    from app.services.fireworks_llm import is_valid_iso_datetime
    from app.workers.digest_worker import get_seconds_until_8pm_ist

class TestSafeguardsAndNotifications(unittest.TestCase):

    def test_is_valid_iso_datetime(self):
        # Precise ISO-8601 strings
        self.assertTrue(is_valid_iso_datetime("2026-07-06T10:00:00Z"))
        self.assertTrue(is_valid_iso_datetime("2026-07-06T10:00:00+05:30"))
        self.assertTrue(is_valid_iso_datetime("2026-07-06 10:00:00"))

        # Vague/literal inputs
        self.assertFalse(is_valid_iso_datetime("morning"))
        self.assertFalse(is_valid_iso_datetime("afternoon"))
        self.assertFalse(is_valid_iso_datetime("tomorrow"))
        self.assertFalse(is_valid_iso_datetime("kal subah"))
        self.assertFalse(is_valid_iso_datetime("2026-07-06"))  # Date-only, vague time
        self.assertFalse(is_valid_iso_datetime("2026-07-06Tmorning"))
        self.assertFalse(is_valid_iso_datetime(123456))

    def test_get_seconds_until_8pm_ist(self):
        sec = get_seconds_until_8pm_ist()
        self.assertGreater(sec, 0)
        self.assertLessEqual(sec, 86400)

if __name__ == "__main__":
    unittest.main()
