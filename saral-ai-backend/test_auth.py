import sys
from fastapi.testclient import TestClient
from unittest.mock import patch
import uuid
from datetime import datetime

# Setup database state mock
mock_db = {
    "users": []
}

class MockTable:
    def __init__(self, name):
        self.name = name
        self._filters = []
        self._inserted_data = None

    def select(self, fields="*"):
        return self

    def eq(self, field, value):
        self._filters.append((field, value))
        return self

    def insert(self, data):
        self._inserted_data = data
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
        
        results = list(mock_db[self.name])
        for field, value in self._filters:
            results = [r for r in results if str(r.get(field)) == str(value)]
        return MockResponse(results)

class MockSupabaseClient:
    def table(self, table_name):
        return MockTable(table_name)

# Patch get_supabase before importing app to mock database interactions
with patch('app.db.supabase_client.get_supabase', return_value=MockSupabaseClient()):
    from app.main import app

client = TestClient(app)

def test_flow():
    print("Starting Auth Endpoints Verification...")

    # Case 1: Sign up new user
    signup_payload = {
        "email": "test@example.com",
        "password": "securepassword123",
        "business_name": "Test Business",
        "whatsapp_number": "+1234567890"
    }
    print("Testing POST /api/auth/signup with new email...")
    res = client.post("/api/auth/signup", json=signup_payload)
    assert res.status_code == 200, f"Signup failed: {res.text}"
    data = res.json()
    assert "user_id" in data, "user_id missing from signup response"
    assert "token" in data, "token missing from signup response"
    user_id = data["user_id"]
    token = data["token"]
    print(f"OK - Signup success: user_id={user_id}")

    # Case 2: Sign up same email again -> HTTP 400
    print("Testing POST /api/auth/signup with duplicate email...")
    res = client.post("/api/auth/signup", json=signup_payload)
    assert res.status_code == 400, f"Duplicate signup did not return 400: {res.status_code}"
    print("OK - Duplicate signup correctly returned 400")

    # Case 3: Login with correct credentials -> returns token
    print("Testing POST /api/auth/login with correct credentials...")
    login_payload = {
        "email": "test@example.com",
        "password": "securepassword123"
    }
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
        "password": "wrongpassword"
    }
    res = client.post("/api/auth/login", json=wrong_login_payload)
    assert res.status_code == 401, f"Expected 401, got: {res.status_code}"
    print("OK - Login with wrong password correctly returned 401")

    # Case 5: Use token in header on protected route -> succeeds
    print("Testing protected route /api/auth/me with valid token...")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200, f"Protected route failed: {res.text}"
    protected_data = res.json()
    assert "user" in protected_data, "user key missing"
    assert protected_data["user"]["email"] == "test@example.com", "user email mismatch"
    print("OK - Accessing protected route with valid token succeeded")

    # Case 6: Access protected route with tampered token -> HTTP 401
    print("Testing protected route with tampered token...")
    tampered_headers = {"Authorization": f"Bearer {token}tampered"}
    res = client.get("/api/auth/me", headers=tampered_headers)
    assert res.status_code == 401, f"Expected 401 for tampered token, got: {res.status_code}"
    print("OK - Accessing protected route with tampered token correctly returned 401")

    # Case 7: Access protected route with missing authorization header -> HTTP 401 or 403
    print("Testing protected route with missing token...")
    res = client.get("/api/auth/me")
    assert res.status_code in (401, 403), f"Expected 401 or 403 for missing credentials, got: {res.status_code}"
    print("OK - Accessing protected route with missing token correctly returned HTTP 401/403")

    print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    try:
        test_flow()
    except AssertionError as e:
        print(f"\nFAIL - VERIFICATION FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nFAIL - UNEXPECTED ERROR: {e}")
        sys.exit(1)
