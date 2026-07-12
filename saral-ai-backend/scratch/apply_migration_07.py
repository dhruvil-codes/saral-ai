"""
Apply migration 07_faqs_pgvector_rag.sql to Supabase via the REST management API.

Run from backend root:
  .venv\Scripts\python.exe scratch\apply_migration_07.py
"""
import os, sys, requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SUPABASE_URL = os.environ["SUPABASE_URL"]          # e.g. https://xxx.supabase.co
SUPABASE_KEY = os.environ["SUPABASE_KEY"]          # service_role JWT

# Read SQL
migration_path = Path(__file__).parent.parent / "app" / "db" / "migrations" / "07_faqs_pgvector_rag.sql"
sql = migration_path.read_text(encoding="utf-8")

print(f"Applying migration: {migration_path.name}")
print(f"SQL length: {len(sql)} chars")

# Supabase exposes a /rest/v1/rpc/... and a raw SQL endpoint via the
# Postgres REST management plane at /pg/query  (service_role only)
# Alternatively we can use the PostgREST SQL execution endpoint.
# The cleanest documented way is POST to /rest/v1/ with Content-Type text/plain
# But the most reliable is the pg extension endpoint or psql.
# Let's use the management API sql endpoint (available for service_role):
# POST https://<ref>.supabase.co/rest/v1/  doesn't work for DDL.
# We'll use: POST https://<ref>.supabase.co/pg/query  (experimental but works)
# Fallback: chunked execution via supabase-py rpc("exec_sql", ...)

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# Split into individual statements (split on semicolons keeping comments)
import re

def split_sql(sql_text):
    """Split SQL into individual statements, skipping comment-only chunks."""
    # Split on semicolons not inside strings
    raw_statements = re.split(r';\s*\n', sql_text)
    stmts = []
    for s in raw_statements:
        s = s.strip()
        # Remove pure comment lines to check if statement is non-empty
        non_comment = re.sub(r'--[^\n]*', '', s).strip()
        if non_comment:
            stmts.append(s)
    return stmts

statements = split_sql(sql)
print(f"\nFound {len(statements)} SQL statements to execute.\n")

# Try using the supabase-py client to run DDL via rpc if possible,
# otherwise use direct HTTP to /pg/query
from app.db.supabase_client import get_supabase
supabase = get_supabase()

successes = 0
errors = 0

for i, stmt in enumerate(statements, 1):
    # Truncate for display
    display = stmt[:80].replace('\n', ' ')
    print(f"[{i}/{len(statements)}] {display}...")
    
    try:
        # Use the pg_query function if available, else try raw HTTP
        # PostgREST doesn't allow arbitrary DDL, so we must use the
        # Supabase Management API or a deployed Edge Function.
        # Best documented approach: POST /rest/v1/rpc/exec_sql
        # (requires exec_sql function to be pre-deployed)
        # 
        # Alternative that works: HTTP POST to the DB directly via
        # Supabase's internal REST proxy:
        # https://supabase.com/docs/guides/database/extensions
        
        # Use the management API
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/",
            headers={**headers, "Content-Type": "application/json", "Prefer": ""},
            json={"query": stmt},
            timeout=30
        )
        
        if resp.status_code < 300:
            print(f"    OK (HTTP {resp.status_code})")
            successes += 1
        else:
            # Try pg endpoint
            resp2 = requests.post(
                f"{SUPABASE_URL}/pg/query",
                headers=headers,
                json={"query": stmt},
                timeout=30
            )
            if resp2.status_code < 300:
                print(f"    OK via /pg/query (HTTP {resp2.status_code})")
                successes += 1
            else:
                print(f"    WARN: /rest/v1/ → {resp.status_code}, /pg/query → {resp2.status_code}: {resp2.text[:200]}")
                errors += 1
    except Exception as e:
        print(f"    ERROR: {e}")
        errors += 1

print(f"\n{'='*50}")
print(f"Done: {successes} OK, {errors} errors")
print(f"\nVerifying match_faqs function exists...")

# Final verification: probe match_faqs
dummy = [0.0] * 384
try:
    res = supabase.rpc("match_faqs", {
        "query_embedding": dummy,
        "match_threshold": 0.7,
        "match_count": 1,
        "filter_user_id": "00000000-0000-0000-0000-000000000000"
    }).execute()
    print(f"match_faqs probe: OK - returned {len(res.data)} rows (expected 0 for dummy UUID)")
except Exception as e:
    print(f"match_faqs probe FAILED: {e}")
    print("\nThe migration needs to be applied via the Supabase SQL Editor.")
    print(f"Open: https://supabase.com/dashboard/project/phmqhjeozldkslopvytc/sql/new")
    print("And paste the contents of: app/db/migrations/07_faqs_pgvector_rag.sql")
