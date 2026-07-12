"""
Inspects the faqs table schema and checks whether match_faqs RPC exists.
Run from the backend root:
  .venv\Scripts\python.exe scratch\inspect_faqs_schema.py
"""
import os, sys
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.supabase_client import get_supabase

supabase = get_supabase()

# 1. Fetch one row from faqs to see column shape
print("=== faqs table (first row) ===")
try:
    res = supabase.table("faqs").select("*").limit(1).execute()
    if res.data:
        print("Columns:", list(res.data[0].keys()))
        print("Sample:", res.data[0])
    else:
        # Table exists but empty – try schema
        print("Table is empty. Trying information_schema …")
        raise Exception("empty")
except Exception as e:
    print("faqs query error:", e)

# 2. Check the embedding column dimensions via information_schema (if accessible)
print("\n=== information_schema column check ===")
try:
    res2 = supabase.rpc(
        "pg_catalog_columns",
        {"table_name_filter": "faqs"}
    ).execute()
    print(res2.data)
except Exception as e:
    print("RPC not available:", e)

# 3. Try calling match_faqs with a dummy embedding to see the actual error
print("\n=== match_faqs probe ===")
dummy_embedding = [0.0] * 384
try:
    res3 = supabase.rpc(
        "match_faqs",
        {
            "query_embedding": dummy_embedding,
            "match_threshold": 0.7,
            "match_count": 1,
            "filter_user_id": "00000000-0000-0000-0000-000000000000",
        }
    ).execute()
    print("match_faqs exists! Result:", res3.data)
except Exception as e:
    print("match_faqs error:", e)
