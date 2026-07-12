"""
Apply migration 07_faqs_pgvector_rag.sql to Supabase via the
Supabase Management API  (POST /v1/projects/{ref}/database/query).

Docs: https://api.supabase.com/api/v1#tag/projects/POST/v1/projects/{ref}/database/query
Requires: SUPABASE_ACCESS_TOKEN env var (Personal Access Token from
          https://supabase.com/dashboard/account/tokens)

Run from backend root:
  .venv\Scripts\python.exe scratch\apply_migration_07_mgmt.py
"""
import os, sys, requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SUPABASE_URL = os.environ["SUPABASE_URL"]  # https://xxx.supabase.co
SUPABASE_KEY = os.environ["SUPABASE_KEY"]  # service_role JWT
PROJECT_REF  = SUPABASE_URL.replace("https://", "").split(".")[0]

# Read SQL
migration_path = Path(__file__).parent.parent / "app" / "db" / "migrations" / "07_faqs_pgvector_rag.sql"
sql = migration_path.read_text(encoding="utf-8")

print(f"Project ref : {PROJECT_REF}")
print(f"Migration   : {migration_path.name}")
print(f"SQL length  : {len(sql)} chars\n")

# ------------------------------------------------------------------
# Strategy 1: Supabase Management API (requires Personal Access Token)
# ------------------------------------------------------------------
access_token = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
if access_token:
    print("Strategy 1: Management API /v1/projects/{ref}/database/query")
    resp = requests.post(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        json={"query": sql},
        timeout=60,
    )
    if resp.status_code < 300:
        print(f"OK (HTTP {resp.status_code}): {resp.text[:300]}")
    else:
        print(f"FAILED ({resp.status_code}): {resp.text[:400]}")
else:
    print("Strategy 1 skipped: SUPABASE_ACCESS_TOKEN not set.\n")

# ------------------------------------------------------------------
# Strategy 2: Execute each statement via supabase-py + exec_sql helper
#             (only works if exec_sql function is already deployed)
# ------------------------------------------------------------------
print("\nStrategy 2: supabase-py rpc('exec_sql', {sql})")
from app.db.supabase_client import get_supabase
supabase = get_supabase()

try:
    res = supabase.rpc("exec_sql", {"sql": sql}).execute()
    print("exec_sql RPC OK:", res.data)
except Exception as e:
    print(f"exec_sql not available: {e}")

# ------------------------------------------------------------------
# Final verification probe
# ------------------------------------------------------------------
print("\nFinal verification: probing match_faqs...")
dummy = [0.0] * 384
try:
    res = supabase.rpc("match_faqs", {
        "query_embedding": dummy,
        "match_threshold": 0.7,
        "match_count": 1,
        "filter_user_id": "00000000-0000-0000-0000-000000000000",
    }).execute()
    print(f"match_faqs: LIVE - returned {len(res.data)} rows")
except Exception as e:
    print(f"match_faqs: still missing - {e}")
    print()
    print("ACTION REQUIRED: Apply the migration manually.")
    print(f"  1. Open: https://supabase.com/dashboard/project/{PROJECT_REF}/sql/new")
    print(f"  2. Paste: app/db/migrations/07_faqs_pgvector_rag.sql")
    print(f"  3. Click Run")
    print()
    print("  OR set SUPABASE_ACCESS_TOKEN in .env from:")
    print("  https://supabase.com/dashboard/account/tokens")
