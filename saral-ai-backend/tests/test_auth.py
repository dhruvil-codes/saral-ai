import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncio
import uuid
from datetime import datetime
from unittest.mock import patch
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient

# Setup database state mock with all tables to prevent cross-file KeyError leaks
mock_db = {
    "users": [],
    "faqs": [],
    "bookings": [],
    "call_logs": [],
    "settings": [],
    "leads": []
}

class MockTable:
    def __init__(self, name):
        self.name = name
        self._filters = []
        self._inserted_data = None
        self._update_data = None

    def select(self, fields="*"):
        return self

    def eq(self, field, value):
        self._filters.append((field, value))
        return self

    def order(self, field, desc=False):
        return self

    def insert(self, data):
        self._inserted_data = data
        return self

    def update(self, data):
        self._update_data = data
        return self

    def execute(self):
        class MockResponse:
            def __init__(self, data):
                self.data = data

        if self._inserted_data is not None:
            record = dict(self._inserted_data)
            if "id" not in record or not record["id"]:
                record["id"] = str(uuid.uuid4())
            if "created_at" not in record:
                record["created_at"] = datetime.utcnow()
            mock_db[self.name].append(record)
            return MockResponse([record])

        if self._update_data is not None:
            results = list(mock_db[self.name])
            for field, value in self._filters:
                results = [r for r in results if str(r.get(field)) == str(value)]
            updated = []
            for r in results:
                r.update(self._update_data)
                updated.append(r)
            return MockResponse(updated)

        results = list(mock_db[self.name])
        for field, value in self._filters:
            results = [r for r in results if str(r.get(field)) == str(value)]
        return MockResponse(results)


class MockSupabaseClient:
    def table(self, table_name):
        return MockTable(table_name)

    def rpc(self, fn_name, params):
        class MockResponse:
            def __init__(self, data):
                self.data = data
        return MockResponse([])


FAKE_HASH = "$2b$12$fakehashfornewuseronboardingtests00000000000000000000"
mock_supabase = MockSupabaseClient()

# Patch DB + password hashing before importing app (passlib/bcrypt 5.x breaks hash/verify here)
with patch("app.db.supabase_client.get_supabase", return_value=mock_supabase):
    with patch("app.api.auth.pwd_context.hash", return_value=FAKE_HASH):
        with patch("app.api.auth.pwd_context.verify", return_value=True):
            from app.main import app
            from app.api.auth import get_current_user

client = TestClient(app)


def _with_auth_mocks():
    """Context manager stack for auth routes that hit DB + password helpers."""
    return patch("app.api.auth.get_supabase", return_value=mock_supabase)


def test_flow():
    print("Starting Auth Endpoints Verification...")
    mock_db["users"].clear()

    # Case 1: Sign up new user
    signup_payload = {
        "email": "test@example.com",
        "password": "securepassword123",
        "business_name": "Test Business",
        "whatsapp_number": "+1234567890",
    }
    print("Testing POST /api/auth/signup with new email...")
    with _with_auth_mocks():
        with patch("app.api.auth.pwd_context.hash", return_value=FAKE_HASH):
            res = client.post("/api/auth/signup", json=signup_payload)
    assert res.status_code == 200, f"Signup failed: {res.text}"
    data = res.json()
    assert "user_id" in data, "user_id missing from signup response"
    assert "token" in data, "token missing from signup response"
    user_id = data["user_id"]
    token = data["token"]
    created = next(u for u in mock_db["users"] if str(u["id"]) == str(user_id))
    assert created.get("saral_active") is False, (
        f"Expected signup saral_active=False, got {created.get('saral_active')}"
    )
    print(f"OK - Signup success: user_id={user_id}, saral_active=False")

    # Case 2: Sign up same email again -> HTTP 400
    print("Testing POST /api/auth/signup with duplicate email...")
    with _with_auth_mocks():
        with patch("app.api.auth.pwd_context.hash", return_value=FAKE_HASH):
            res = client.post("/api/auth/signup", json=signup_payload)
    assert res.status_code == 400, f"Duplicate signup did not return 400: {res.status_code}"
    print("OK - Duplicate signup correctly returned 400")

    # Case 3: Login with correct credentials -> returns token
    print("Testing POST /api/auth/login with correct credentials...")
    login_payload = {
        "email": "test@example.com",
        "password": "securepassword123",
    }
    with _with_auth_mocks():
        with patch("app.api.auth.pwd_context.verify", return_value=True):
            res = client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 200, f"Login failed: {res.text}"
    login_data = res.json()
    assert "user_id" in login_data, "user_id missing from login response"
    assert "token" in login_data, "token missing from login response"
    assert login_data["user_id"] == user_id, "user_id mismatch"
    token = login_data["token"]
    print("OK - Login success with correct credentials")

    # Case 4: Login with wrong password -> HTTP 401
    print("Testing POST /api/auth/login with wrong password...")
    wrong_login_payload = {
        "email": "test@example.com",
        "password": "wrongpassword",
    }
    with _with_auth_mocks():
        with patch("app.api.auth.pwd_context.verify", return_value=False):
            res = client.post("/api/auth/login", json=wrong_login_payload)
    assert res.status_code == 401, f"Expected 401, got: {res.status_code}"
    print("OK - Login with wrong password correctly returned 401")

    # Case 5: Use token in header on protected route -> succeeds
    print("Testing protected route /api/auth/me with valid token...")
    headers = {"Authorization": f"Bearer {token}"}
    with _with_auth_mocks():
        res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200, f"Protected route failed: {res.text}"
    protected_data = res.json()
    assert "user" in protected_data, "user key missing"
    assert protected_data["user"]["email"] == "test@example.com", "user email mismatch"
    assert protected_data["user"].get("saral_active") is False, (
        f"Expected new user saral_active=False, got {protected_data['user'].get('saral_active')}"
    )
    print("OK - Accessing protected route with valid token succeeded")
    print("OK - New user is provisioned with saral_active=False (needs onboarding)")

    # Case 6: Access protected route with tampered token -> HTTP 401
    print("Testing protected route with tampered token...")
    tampered_headers = {"Authorization": f"Bearer {token}tampered"}
    with _with_auth_mocks():
        res = client.get("/api/auth/me", headers=tampered_headers)
    assert res.status_code == 401, f"Expected 401 for tampered token, got: {res.status_code}"
    print("OK - Accessing protected route with tampered token correctly returned 401")

    # Case 7: Access protected route with missing authorization header -> HTTP 401 or 403
    print("Testing protected route with missing token...")
    res = client.get("/api/auth/me")
    assert res.status_code in (401, 403), (
        f"Expected 401 or 403 for missing credentials, got: {res.status_code}"
    )
    print("OK - Accessing protected route with missing token correctly returned HTTP 401/403")

    # Case 8: Completing onboarding activates the agent (saral_active=true)
    print("Testing PUT /api/auth/settings to activate agent after onboarding...")
    with _with_auth_mocks():
        res = client.put(
            "/api/auth/settings",
            headers=headers,
            json={"saral_active": True},
        )
    assert res.status_code == 200, f"Settings update failed: {res.text}"
    settings_data = res.json()
    assert settings_data["user"]["saral_active"] is True, (
        "Expected saral_active=True after onboarding"
    )
    with _with_auth_mocks():
        res = client.get("/api/auth/me", headers=headers)
    assert res.json()["user"]["saral_active"] is True, (
        "me endpoint should reflect activated state"
    )
    print("OK - Onboarding activation sets saral_active=True")

    # Case 9: Supabase Auth first-login provisions inactive empty profile
    print("Testing Supabase-native first login provisions inactive empty profile...")
    mock_db["users"].clear()
    new_supabase_id = str(uuid.uuid4())

    class FakeSupabaseUser:
        def __init__(self):
            self.id = new_supabase_id
            self.email = "new-oauth@example.com"

    class FakeAuthResp:
        def __init__(self):
            self.user = FakeSupabaseUser()

    class SupabaseClientWithAuth(MockSupabaseClient):
        class Auth:
            def get_user(self, _token):
                return FakeAuthResp()

        def __init__(self):
            super().__init__()
            self.auth = self.Auth()

    oauth_client = SupabaseClientWithAuth()

    async def run_get_user():
        creds = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="fake-supabase-jwt"
        )
        with patch("app.api.auth.get_supabase", return_value=oauth_client):
            return await get_current_user(creds)

    provisioned = asyncio.run(run_get_user())
    assert provisioned["email"] == "new-oauth@example.com"
    assert provisioned.get("saral_active") is False, (
        f"Expected OAuth new user saral_active=False, got {provisioned.get('saral_active')}"
    )
    assert provisioned.get("business_name") in (None, ""), (
        f"Expected empty business_name for new OAuth user, got {provisioned.get('business_name')!r}"
    )
    assert provisioned.get("business_name") != "My Business"
    print("OK - Supabase first login creates inactive user without pre-filled business name")

    print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    try:
        test_flow()
    except AssertionError as e:
        print(f"\nFAIL - VERIFICATION FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nFAIL - UNEXPECTED ERROR: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
