"""
Apply migration via direct psycopg2 connection to Supabase.
Tries multiple connection strings including the Supabase transaction pooler.

Run from backend root:
  .venv\Scripts\python.exe scratch\apply_migration_psycopg2.py YOUR_DB_PASSWORD
  
Or without password argument (will try common defaults and prompt).
"""
import os, sys
from pathlib import Path

# Try to get password from args, env, or prompt
db_password = None
if len(sys.argv) > 1:
    db_password = sys.argv[1]
else:
    db_password = os.environ.get("SUPABASE_DB_PASSWORD", "")
    if not db_password:
        db_password = input("Enter your Supabase DB password (from dashboard > Settings > Database): ").strip()

if not db_password:
    print("No password provided. Cannot connect directly to Postgres.")
    sys.exit(1)

from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
PROJECT_REF  = SUPABASE_URL.replace("https://", "").split(".")[0]

migration_path = Path(__file__).parent.parent / "app" / "db" / "migrations" / "07_faqs_pgvector_rag.sql"
sql = migration_path.read_text(encoding="utf-8")

print(f"Project ref: {PROJECT_REF}")
print(f"Migration  : {migration_path.name}\n")

try:
    import psycopg2
except ImportError:
    print("Installing psycopg2...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
    import psycopg2

connection_strings = [
    # Session pooler (port 5432) – supports DDL
    f"postgresql://postgres.{PROJECT_REF}:{db_password}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres",
    # Transaction pooler (port 6543)
    f"postgresql://postgres.{PROJECT_REF}:{db_password}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres",
    # Direct connection
    f"postgresql://postgres:{db_password}@db.{PROJECT_REF}.supabase.co:5432/postgres",
]

def try_apply(conn_str, label):
    try:
        print(f"Trying {label}...")
        conn = psycopg2.connect(conn_str, connect_timeout=15, sslmode="require")
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(sql)
        cur.close()
        conn.close()
        print(f"  SUCCESS via {label}")
        return True
    except psycopg2.OperationalError as e:
        print(f"  Connection failed: {e}")
        return False
    except Exception as e:
        print(f"  Error: {type(e).__name__}: {e}")
        return False

for i, cs in enumerate(connection_strings):
    label = ["session-pooler:5432", "transaction-pooler:6543", "direct:5432"][i]
    if try_apply(cs, label):
        break
else:
    print("\nAll connections failed.")
    sys.exit(1)

# Verify
print("\nVerifying match_faqs function via supabase-py...")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.db.supabase_client import get_supabase
supabase = get_supabase()

dummy = [0.0] * 384
try:
    res = supabase.rpc("match_faqs", {
        "query_embedding": dummy,
        "match_threshold": 0.7,
        "match_count": 1,
        "filter_user_id": "00000000-0000-0000-0000-000000000000",
    }).execute()
    print(f"match_faqs: LIVE - returned {len(res.data)} rows (expected 0 for dummy UUID)")
    print("\nMigration 07 applied successfully!")
except Exception as e:
    print(f"match_faqs probe failed: {e}")
    print("The schema cache may need a moment to refresh. Try again in 10 seconds.")
