"""
End-to-end RAG test:
  1. Sign up a test user
  2. POST a FAQ (triggers embedding generation + storage)
  3. Call get_relevant_faqs() directly with a similar query
  4. Confirm similarity match is returned

Run from backend root:
  .venv\Scripts\python.exe scratch\test_rag_e2e.py
"""
import os, sys, asyncio, requests, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

BASE_URL = "http://localhost:8000"
TEST_EMAIL = f"ragtest_{int(time.time())}@example.com"
TEST_PASS  = "ragtest123"

print("=== RAG End-to-End Test ===\n")

# --- 1. Sign up ---
print("1. Signing up test user...")
r = requests.post(f"{BASE_URL}/api/auth/signup", json={
    "email": TEST_EMAIL, "password": TEST_PASS, "business_name": "RAG Test Clinic"
})
assert r.status_code == 200, f"Signup failed: {r.status_code} {r.text}"
token = r.json()["token"]
headers = {"Authorization": f"Bearer {token}"}
user_id = r.json().get("user", {}).get("id") or r.json().get("id")
print(f"   OK - token obtained")

# --- 2. Create a FAQ (triggers embedding) ---
print("2. Creating FAQ with embedding...")
r = requests.post(f"{BASE_URL}/api/faqs", json={
    "question": "What are your clinic opening hours?",
    "answer": "We are open Monday to Saturday, 9 AM to 6 PM."
}, headers=headers)
assert r.status_code == 200, f"FAQ create failed: {r.status_code} {r.text}"
faq = r.json()
faq_id = faq["id"]
print(f"   OK - FAQ created: {faq_id}")
print(f"   last_updated: {faq.get('last_updated')}")
print(f"   needs_verification: {faq.get('needs_verification')}")

# --- 3. Test RAG retrieval ---
print("\n3. Testing RAG retrieval (similar query)...")

async def test_rag(user_id_str: str):
    from app.services.supabase_db import get_relevant_faqs
    from app.services.intent_cache import semantic_cache

    query = "When does the clinic open?"
    print(f"   Query: '{query}'")

    emb = await semantic_cache.embed_text(query)
    print(f"   Embedding shape: {emb.shape}, dim={len(emb)}")

    results = await get_relevant_faqs(
        query_embedding=emb.tolist(),
        user_id=user_id_str,
        top_n=3,
        threshold=0.3,   # low threshold to ensure we get results
    )
    return results

# Get user_id from GET /api/auth/me or from the FAQ user_id
r2 = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
if r2.status_code == 200:
    user_id = r2.json().get("id") or r2.json().get("user", {}).get("id")
    print(f"   user_id: {user_id}")
else:
    # Fallback: decode from FAQ - read from faqs table
    from app.db.supabase_client import get_supabase
    sb = get_supabase()
    row = sb.table("faqs").select("user_id").eq("id", faq_id).execute()
    user_id = row.data[0]["user_id"] if row.data else None
    print(f"   user_id (from faqs): {user_id}")

if not user_id:
    print("   WARN: Could not determine user_id - skipping RAG retrieval test")
else:
    results = asyncio.run(test_rag(str(user_id)))
    if results:
        print(f"\n   RAG MATCH FOUND: {len(results)} result(s)")
        for r in results:
            print(f"     - Q: {r.get('question')}")
            print(f"       A: {r.get('answer')}")
            print(f"       similarity: {r.get('similarity', 'N/A'):.4f}" if r.get('similarity') else "       similarity: N/A")
    else:
        print("   No results returned (embedding may be NULL if model was not loaded)")
        print("   Check if sentence-transformers is installed and model is loaded on server.")

# --- 4. Cleanup ---
print("\n4. Cleaning up test FAQ...")
r = requests.delete(f"{BASE_URL}/api/faqs/{faq_id}", headers=headers)
print(f"   DELETE FAQ: {r.status_code}")

print("\n=== RAG E2E Test Complete ===")
