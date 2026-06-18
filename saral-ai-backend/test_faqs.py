import sys
from fastapi.testclient import TestClient
from unittest.mock import patch
import uuid
from datetime import datetime

# Setup database state mock
mock_db = {
    "users": [],
    "faqs": []
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

    def insert(self, data):
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
                record["created_at"] = datetime.utcnow()
            if "updated_at" not in record:
                record["updated_at"] = datetime.utcnow()
            mock_db[self.name].append(record)
            return MockResponse([record])
        
        # 2. Filter existing data
        results = list(mock_db[self.name])
        for field, value in self._filters:
            results = [r for r in results if str(r.get(field)) == str(value)]
        
        # 3. Update mode
        if self._updated_data is not None:
            updated_records = []
            for r in results:
                r.update(self._updated_data)
                updated_records.append(r)
            return MockResponse(updated_records)
            
        # 4. Delete mode
        if self._deleted:
            ids_to_delete = {r["id"] for r in results}
            mock_db[self.name] = [r for r in mock_db[self.name] if r["id"] not in ids_to_delete]
            return MockResponse(results)
            
        # 5. Select mode (return filtered results)
        if self._select_fields != "*":
            fields = [f.strip() for f in self._select_fields.split(",")]
            formatted_results = []
            for r in results:
                formatted_results.append({f: r.get(f) for f in fields})
            return MockResponse(formatted_results)
            
        return MockResponse(results)

class MockSupabaseClient:
    def table(self, table_name):
        return MockTable(table_name)

# Patch get_supabase before importing app to mock database interactions
with patch('app.db.supabase_client.get_supabase', return_value=MockSupabaseClient()):
    from app.main import app

client = TestClient(app)

def test_faqs_flow():
    print("Starting FAQ Endpoints Verification...")

    # ==========================================
    # 1. Verify Authentication Protection (HTTP 401)
    # ==========================================
    print("Testing auth-protection for GET /api/faqs...")
    res = client.get("/api/faqs")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"

    print("Testing auth-protection for POST /api/faqs...")
    res = client.post("/api/faqs", json={"question": "Q", "answer": "A"})
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"

    some_id = str(uuid.uuid4())
    print("Testing auth-protection for PUT /api/faqs/{id}...")
    res = client.put(f"/api/faqs/{some_id}", json={"question": "Q", "answer": "A"})
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"

    print("Testing auth-protection for DELETE /api/faqs/{id}...")
    res = client.delete(f"/api/faqs/{some_id}")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print("OK - All endpoints return HTTP 401 without a valid token")

    # ==========================================
    # 2. Register User A and User B
    # ==========================================
    print("Signing up User A...")
    res = client.post("/api/auth/signup", json={
        "email": "usera@example.com",
        "password": "userapass123",
        "business_name": "Business A"
    })
    assert res.status_code == 200, f"Signup A failed: {res.text}"
    token_a = res.json()["token"]

    print("Signing up User B...")
    res = client.post("/api/auth/signup", json={
        "email": "userb@example.com",
        "password": "userbpass123",
        "business_name": "Business B"
    })
    assert res.status_code == 200, f"Signup B failed: {res.text}"
    token_b = res.json()["token"]

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # ==========================================
    # 3. Create FAQs for User A and User B
    # ==========================================
    print("Testing POST /api/faqs for User A...")
    faq_payload_a = {"question": "What is the cost of service A?", "answer": "$100 per hour"}
    res = client.post("/api/faqs", json=faq_payload_a, headers=headers_a)
    assert res.status_code == 200, f"POST FAQ A failed: {res.text}"
    faq_a = res.json()
    assert "id" in faq_a
    assert faq_a["question"] == faq_payload_a["question"]
    assert faq_a["answer"] == faq_payload_a["answer"]
    faq_a_id = faq_a["id"]
    print(f"OK - FAQ A created: {faq_a_id}")

    print("Testing POST /api/faqs for User B...")
    faq_payload_b = {"question": "What is the cost of service B?", "answer": "$200 per hour"}
    res = client.post("/api/faqs", json=faq_payload_b, headers=headers_b)
    assert res.status_code == 200, f"POST FAQ B failed: {res.text}"
    faq_b = res.json()
    faq_b_id = faq_b["id"]
    print(f"OK - FAQ B created: {faq_b_id}")

    # ==========================================
    # 4. Isolation Check (GET /api/faqs)
    # ==========================================
    print("Testing GET /api/faqs for User A (expect only A's FAQ)...")
    res = client.get("/api/faqs", headers=headers_a)
    assert res.status_code == 200
    faqs_list_a = res.json()
    assert len(faqs_list_a) == 1
    assert faqs_list_a[0]["id"] == faq_a_id
    assert faqs_list_a[0]["question"] == faq_payload_a["question"]

    print("Testing GET /api/faqs for User B (expect only B's FAQ)...")
    res = client.get("/api/faqs", headers=headers_b)
    assert res.status_code == 200
    faqs_list_b = res.json()
    assert len(faqs_list_b) == 1
    assert faqs_list_b[0]["id"] == faq_b_id
    assert faqs_list_b[0]["question"] == faq_payload_b["question"]
    print("OK - GET /api/faqs returns isolated lists per user")

    # ==========================================
    # 5. Update FAQs (PUT /api/faqs/{id})
    # ==========================================
    print("Testing PUT /api/faqs/{id} for User A (valid update)...")
    updated_payload_a = {"question": "What is the cost of service A? (updated)", "answer": "$120 per hour"}
    res = client.put(f"/api/faqs/{faq_a_id}", json=updated_payload_a, headers=headers_a)
    assert res.status_code == 200, f"PUT FAQ A failed: {res.text}"
    updated_faq_a = res.json()
    assert updated_faq_a["id"] == faq_a_id
    assert updated_faq_a["question"] == updated_payload_a["question"]
    assert updated_faq_a["answer"] == updated_payload_a["answer"]
    print("OK - PUT /api/faqs/{id} updates correctly")

    # ==========================================
    # 6. Unauthorized Edits (expect HTTP 404)
    # ==========================================
    print("Testing User B attempting to edit User A's FAQ (expect HTTP 404)...")
    res = client.put(f"/api/faqs/{faq_a_id}", json=updated_payload_a, headers=headers_b)
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    print("OK - Unauthorized edit correctly returned HTTP 404")

    # ==========================================
    # 7. Unauthorized Deletes (expect HTTP 404)
    # ==========================================
    print("Testing User B attempting to delete User A's FAQ (expect HTTP 404)...")
    res = client.delete(f"/api/faqs/{faq_a_id}", headers=headers_b)
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    print("OK - Unauthorized delete correctly returned HTTP 404")

    # ==========================================
    # 8. Delete FAQs (DELETE /api/faqs/{id})
    # ==========================================
    print("Testing DELETE /api/faqs/{id} for User A...")
    res = client.delete(f"/api/faqs/{faq_a_id}", headers=headers_a)
    assert res.status_code == 200
    assert res.json() == {"message": "FAQ deleted"}
    print("OK - DELETE /api/faqs/{id} removes it")

    print("Verifying User A's FAQ is deleted...")
    res = client.get("/api/faqs", headers=headers_a)
    assert res.status_code == 200
    assert len(res.json()) == 0
    print("OK - FAQ list is empty for User A")

    print("Verifying User B's FAQ is still intact...")
    res = client.get("/api/faqs", headers=headers_b)
    assert res.status_code == 200
    assert len(res.json()) == 1
    print("OK - User B's FAQ was isolated and remains untouched")

    # ==========================================
    # 9. Deleting non-existent/deleted FAQ (expect HTTP 404)
    # ==========================================
    print("Testing deleting already deleted FAQ (expect HTTP 404)...")
    res = client.delete(f"/api/faqs/{faq_a_id}", headers=headers_a)
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    print("OK - Non-existent delete correctly returned HTTP 404")

    print("\nALL FAQ ENDPOINT VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    try:
        test_faqs_flow()
    except AssertionError as e:
        print(f"\nFAIL - VERIFICATION FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nFAIL - UNEXPECTED ERROR: {e}")
        sys.exit(1)
